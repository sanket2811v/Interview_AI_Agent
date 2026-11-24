import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_LANGUAGES,
  getAvailableLanguages,
  isLanguageSupported,
  getLanguageConfig
} from '../src/services/codeExecution/languageConfig.js';
import { compareOutput, normalizeOutput } from '../src/services/codeExecution/outputComparator.js';
import { MockExecutionProvider } from '../src/services/codeExecution/providers/mock.provider.js';
import { PistonExecutionProvider } from '../src/services/codeExecution/providers/piston.provider.js';
import { OnlineCompilerExecutionProvider, ONLINECOMPILER_COMPILERS } from '../src/services/codeExecution/providers/onlinecompiler.provider.js';
import { CodeExecutionService } from '../src/services/codeExecution/codeExecution.service.js';
import {
  runCodeSchema,
  standaloneRunSchema,
  submitCodeSchema,
  querySubmissionsSchema
} from '../src/validators/coding.validator.js';
import { db } from '../src/config/prisma.js';

describe('InterviewAI Phase 9: Online Coding Practice & Secure Code Execution Engine', () => {
  // Ensure Mock provider is active for unit/integration testing
  CodeExecutionService.setProvider(new MockExecutionProvider());
  // ==========================================
  // 1. Language Configuration & Validation
  // ==========================================
  describe('1. Language Configuration & Specifications', () => {
    test('Configures all 6 required languages with appropriate extensions and limits', () => {
      const required = ['javascript', 'python', 'java', 'cpp', 'c', 'typescript'];
      for (const lang of required) {
        assert.ok(SUPPORTED_LANGUAGES[lang], `Language ${lang} must be configured`);
        assert.ok(SUPPORTED_LANGUAGES[lang].extension, `Language ${lang} must have an extension`);
        assert.ok(SUPPORTED_LANGUAGES[lang].starterCode, `Language ${lang} must include starter code`);
        assert.ok(SUPPORTED_LANGUAGES[lang].timeLimitMs > 0, `Language ${lang} must specify time limit`);
      }
    });

    test('getAvailableLanguages filters only enabled languages without leaking internal keys', () => {
      const available = getAvailableLanguages();
      assert.ok(Array.isArray(available));
      assert.ok(available.length >= 6);
      for (const l of available) {
        assert.ok(l.id);
        assert.ok(l.name);
        assert.ok(l.extension);
        assert.ok(!l.piston); // provider internals not exposed to client
        assert.ok(!l.judge0);
      }
    });

    test('isLanguageSupported accurately verifies supported and unsupported identifiers', () => {
      assert.equal(isLanguageSupported('javascript'), true);
      assert.equal(isLanguageSupported('PYTHON'), true); // case-insensitive
      assert.equal(isLanguageSupported('cpp'), true);
      assert.equal(isLanguageSupported('rust'), false);
      assert.equal(isLanguageSupported(''), false);
      assert.equal(isLanguageSupported(null), false);
    });
  });

  // ==========================================
  // 2. Output Comparator & Normalization
  // ==========================================
  describe('2. Output Normalization & Comparison Invariants', () => {
    test('Normalizes CRLF and trailing whitespaces accurately', () => {
      const actual = 'hello world \r\n42\t \r\n';
      const expected = 'hello world\n42';
      const result = compareOutput(actual, expected);
      assert.equal(result.isMatch, true);
    });

    test('Detects true content mismatch without false positives', () => {
      const actual = '1 2 3\n';
      const expected = '1 2 4\n';
      const result = compareOutput(actual, expected);
      assert.equal(result.isMatch, false);
    });

    test('Preserves essential internal indentation while ignoring trailing EOF newlines', () => {
      const actual = 'line 1\n  indented line 2\n\n';
      const expected = 'line 1\n  indented line 2';
      const result = compareOutput(actual, expected);
      assert.equal(result.isMatch, true);
    });
  });

  // ==========================================
  // 3. Execution Provider Isolation & Edge Cases
  // ==========================================
  describe('3. Execution Provider Isolation & Edge Cases', () => {
    test('Mock provider executes standard code safely with simulated stdout', async () => {
      const provider = new MockExecutionProvider();
      const result = await provider.execute({
        language: 'javascript',
        sourceCode: 'console.log("42");',
        stdin: '42'
      });

      assert.equal(result.status, 'SUCCESS');
      assert.equal(result.stdout, '42');
      assert.ok(result.executionTimeMs >= 0);
      assert.equal(result.exitCode, 0);
    });

    test('Mock provider catches simulated compilation error', async () => {
      const provider = new MockExecutionProvider();
      const result = await provider.execute({
        language: 'java',
        sourceCode: '// SIMULATE_COMPILATION_ERROR'
      });

      assert.equal(result.status, 'COMPILATION_ERROR');
      assert.ok(result.stderr.includes('SyntaxError'));
      assert.equal(result.exitCode, 1);
    });

    test('Mock provider catches simulated runtime error', async () => {
      const provider = new MockExecutionProvider();
      const result = await provider.execute({
        language: 'python',
        sourceCode: '// SIMULATE_RUNTIME_ERROR'
      });

      assert.equal(result.status, 'RUNTIME_ERROR');
      assert.ok(result.stderr.includes('ZeroDivisionError'));
    });

    test('Mock provider catches simulated time limit exceeded', async () => {
      const provider = new MockExecutionProvider();
      const result = await provider.execute({
        language: 'cpp',
        sourceCode: '// SIMULATE_TIME_LIMIT_EXCEEDED'
      });

      assert.equal(result.status, 'TIME_LIMIT_EXCEEDED');
      assert.equal(result.exitCode, 124);
    });
  });

  // ==========================================
  // 4. Request Validation & Schemas
  // ==========================================
  describe('4. Input Validation & Bounds Checking', () => {
    test('runCodeSchema rejects unsupported languages and empty code', () => {
      const empty = runCodeSchema.safeParse({ language: 'javascript', sourceCode: '' });
      assert.equal(empty.success, false);

      const invalidLang = runCodeSchema.safeParse({ language: 'assembly', sourceCode: 'nop;' });
      assert.equal(invalidLang.success, false);

      const valid = runCodeSchema.safeParse({ language: 'python', sourceCode: 'print(1)' });
      assert.equal(valid.success, true);
    });

    test('submitCodeSchema enforces 50,000 character maximum source limit', () => {
      const oversized = 'x'.repeat(50001);
      const parsed = submitCodeSchema.safeParse({ language: 'javascript', sourceCode: oversized });
      assert.equal(parsed.success, false);
      assert.ok(parsed.error.issues[0].message.includes('50,000'));
    });

    test('querySubmissionsSchema validates pagination bounds and defaults', () => {
      const def = querySubmissionsSchema.parse({});
      assert.equal(def.page, 1);
      assert.equal(def.limit, 10);

      const capped = querySubmissionsSchema.safeParse({ page: 1, limit: 100 });
      assert.equal(capped.success, false); // limit max is 50
    });
  });

  // ==========================================
  // 5. CodeExecutionService Core Workflows & Invariants
  // ==========================================
  describe('5. CodeExecutionService Workflows & Security Guards', () => {
    test('runSampleTestCases enforces user challenge ownership', async () => {
      const origFindUnique = db.codingChallenge.findUnique;
      try {
        db.codingChallenge.findUnique = async () => ({
          id: 'chal-1',
          preparationSession: { userId: 'usr-different' },
          testCases: []
        });

        await assert.rejects(
          async () => {
            await CodeExecutionService.runSampleTestCases('chal-1', 'usr-current', {
              language: 'javascript',
              sourceCode: 'console.log(1)'
            });
          },
          (err) => err.status === 403
        );
      } finally {
        db.codingChallenge.findUnique = origFindUnique;
      }
    });

    test('runSampleTestCases evaluates sample test cases and returns match status', async () => {
      const origFindUnique = db.codingChallenge.findUnique;
      try {
        db.codingChallenge.findUnique = async () => ({
          id: 'chal-1',
          timeLimit: 2000,
          memoryLimit: 128,
          preparationSession: { userId: 'usr-1' },
          testCases: [
            {
              id: 'tc-1',
              input: '4 5',
              expectedOutput: '4 5',
              isHidden: false,
              isSample: true
            }
          ]
        });

        const result = await CodeExecutionService.runSampleTestCases('chal-1', 'usr-1', {
          language: 'javascript',
          sourceCode: 'const fs = require("fs"); console.log(fs.readFileSync(0, "utf-8").trim());'
        });

        assert.equal(result.allPassed, true);
        assert.equal(result.verdict, 'ACCEPTED');
        assert.equal(result.passedTestCases, 1);
        assert.equal(result.totalTestCases, 1);
      } finally {
        db.codingChallenge.findUnique = origFindUnique;
      }
    });

    test('submitSolution protects hidden test case contents from leaking', async () => {
      const origFindUnique = db.codingChallenge.findUnique;
      const origCreate = db.codingSubmission.create;

      try {
        db.codingChallenge.findUnique = async () => ({
          id: 'chal-1',
          timeLimit: 2000,
          memoryLimit: 128,
          preparationSession: { userId: 'usr-1' },
          testCases: [
            {
              id: 'tc-pub',
              input: 'visible input',
              expectedOutput: 'visible input',
              isHidden: false,
              isSample: true
            },
            {
              id: 'tc-hidden',
              input: 'SUPER_CONFIDENTIAL_INPUT',
              expectedOutput: 'SUPER_CONFIDENTIAL_OUTPUT',
              isHidden: true,
              isSample: false
            }
          ]
        });

        let savedSubmissionData = null;
        db.codingSubmission.create = async ({ data }) => {
          savedSubmissionData = data;
          return {
            id: 'sub-new-1',
            ...data
          };
        };

        const result = await CodeExecutionService.submitSolution('chal-1', 'usr-1', {
          language: 'python',
          sourceCode: 'import sys; print(sys.stdin.read().strip())'
        });

        assert.ok(result.submissionId);
        assert.equal(result.totalTestCases, 2);

        // Security assertion: Hidden test case input and output MUST NOT be exposed in evaluated results
        const hiddenResult = result.testResults.find((r) => r.isHidden);
        assert.ok(hiddenResult, 'Hidden test case result must be tracked');
        assert.equal(hiddenResult.input, undefined, 'Hidden test case input MUST NOT be present');
        assert.equal(hiddenResult.expectedOutput, undefined, 'Hidden test case expectedOutput MUST NOT be present');
      } finally {
        db.codingChallenge.findUnique = origFindUnique;
        db.codingSubmission.create = origCreate;
      }
    });

    test('getSubmissionById blocks unauthorized cross-user access with 403', async () => {
      const origFindUnique = db.codingSubmission.findUnique;
      try {
        db.codingSubmission.findUnique = async () => ({
          id: 'sub-1',
          userId: 'user-victim',
          sourceCode: 'secret solution'
        });

        await assert.rejects(
          async () => {
            await CodeExecutionService.getSubmissionById('sub-1', 'user-attacker');
          },
          (err) => err.status === 403
        );
      } finally {
        db.codingSubmission.findUnique = origFindUnique;
      }
    });

    test('getCodingStats computes accurate submission and challenge counts without inflation', async () => {
      const origCount = db.codingSubmission.count;
      const origFindMany = db.codingSubmission.findMany;

      try {
        db.codingSubmission.count = async ({ where }) => {
          if (where.executionStatus === 'ACCEPTED') return 3;
          return 5; // total
        };

        db.codingSubmission.findMany = async () => [
          { challengeId: 'c1', executionStatus: 'ACCEPTED', language: 'python', challenge: { difficulty: 'EASY' } },
          { challengeId: 'c1', executionStatus: 'ACCEPTED', language: 'python', challenge: { difficulty: 'EASY' } }, // repeated accept
          { challengeId: 'c2', executionStatus: 'ACCEPTED', language: 'javascript', challenge: { difficulty: 'MEDIUM' } },
          { challengeId: 'c3', executionStatus: 'WRONG_ANSWER', language: 'javascript', challenge: { difficulty: 'HARD' } },
          { challengeId: 'c3', executionStatus: 'WRONG_ANSWER', language: 'javascript', challenge: { difficulty: 'HARD' } }
        ];

        const stats = await CodeExecutionService.getCodingStats('usr-1');

        assert.equal(stats.totalSubmissions, 5);
        assert.equal(stats.acceptedSubmissions, 3);
        assert.equal(stats.rejectedSubmissions, 2);
        assert.equal(stats.challengesAttempted, 3); // c1, c2, c3
        assert.equal(stats.challengesSolved, 2); // c1, c2 (distinct challenges)
        assert.equal(stats.acceptanceRate, 60); // 3 / 5 = 60%
        assert.equal(stats.languageBreakdown.python, 2);
        assert.equal(stats.languageBreakdown.javascript, 3);
      } finally {
        db.codingSubmission.count = origCount;
        db.codingSubmission.findMany = origFindMany;
      }
    });
  });

  // ==========================================
  // 6. Standalone Code Execution (Mode A) Workflows
  // ==========================================
  describe('6. Standalone Code Execution (Mode A) Workflows', () => {
    test('standaloneRunSchema validates language, code length, and optional stdin', () => {
      const valid = standaloneRunSchema.safeParse({
        language: 'java',
        sourceCode: 'public class Main { public static void main(String[] args) { System.out.println("Hello"); } }',
        stdin: 'sample input'
      });
      assert.equal(valid.success, true);

      const empty = standaloneRunSchema.safeParse({
        language: 'javascript',
        sourceCode: ''
      });
      assert.equal(empty.success, false);

      const invalidLang = standaloneRunSchema.safeParse({
        language: 'brainfuck',
        sourceCode: '++++++++++'
      });
      assert.equal(invalidLang.success, false);
    });

    test('getStandaloneStarterCode returns appropriate starter code and Main.java for Java', () => {
      const javaStarter = CodeExecutionService.getStandaloneStarterCode('java');
      assert.equal(javaStarter.language, 'java');
      assert.equal(javaStarter.fileName, 'Main.java');
      assert.ok(javaStarter.starterCode.includes('public class Main'));

      const jsStarter = CodeExecutionService.getStandaloneStarterCode('javascript');
      assert.equal(jsStarter.fileName, 'solution.js');
      assert.ok(jsStarter.starterCode.includes('solve'));

      const pyStarter = CodeExecutionService.getStandaloneStarterCode('python');
      assert.equal(pyStarter.fileName, 'solution.py');
      assert.ok(pyStarter.starterCode.includes('sys.stdin'));
    });

    test('executeStandalone executes Java code in standalone mode and returns normalized result', async () => {
      const result = await CodeExecutionService.executeStandalone({
        userId: 'test-user-1',
        language: 'java',
        sourceCode: 'public class Main { public static void main(String[] args) { System.out.println("Hello World"); } }',
        stdin: 'Hello World'
      });

      assert.equal(result.success, true);
      assert.equal(result.status, 'SUCCESS');
      assert.equal(result.language, 'java');
      assert.equal(result.fileName, 'Main.java');
      assert.equal(result.stdout, 'Hello World');
      assert.equal(result.exitCode, 0);
      assert.ok(result.executionTimeMs >= 0);
    });

    test('executeStandalone correctly delivers custom stdin to the executed program', async () => {
      const result = await CodeExecutionService.executeStandalone({
        userId: 'test-user-2',
        language: 'python',
        sourceCode: 'import sys; print(sys.stdin.read().strip())',
        stdin: '42 99 custom-test-input'
      });

      assert.equal(result.success, true);
      assert.equal(result.stdout, '42 99 custom-test-input');
    });

    test('executeStandalone catches and formats compilation errors without failing silently', async () => {
      const result = await CodeExecutionService.executeStandalone({
        userId: 'test-user-3',
        language: 'java',
        sourceCode: '// SIMULATE_COMPILATION_ERROR'
      });

      assert.equal(result.success, false);
      assert.equal(result.status, 'COMPILATION_ERROR');
      assert.ok(result.stderr.includes('SyntaxError'));
      assert.equal(result.exitCode, 1);
    });

    test('executeStandalone catches and formats runtime errors without throwing unhandled exceptions', async () => {
      const result = await CodeExecutionService.executeStandalone({
        userId: 'test-user-4',
        language: 'python',
        sourceCode: '// SIMULATE_RUNTIME_ERROR'
      });

      assert.equal(result.success, false);
      assert.equal(result.status, 'RUNTIME_ERROR');
      assert.ok(result.stderr.includes('ZeroDivisionError'));
    });

    test('executeStandalone rejects empty source code with 400', async () => {
      await assert.rejects(
        async () => {
          await CodeExecutionService.executeStandalone({
            userId: 'test-user-5',
            language: 'javascript',
            sourceCode: '   '
          });
        },
        (err) => err.status === 400
      );
    });
  });

  // ==========================================
  // 7. Canonical File Naming & Provider Integration
  // ==========================================
  describe('7. Canonical File Naming & Provider Integration', () => {
    test('All 10 required languages define correct file names and Monaco language modes', () => {
      const expectations = {
        java: { fileName: 'Main.java', monaco: 'java' },
        javascript: { fileName: 'solution.js', monaco: 'javascript' },
        python: { fileName: 'solution.py', monaco: 'python' },
        cpp: { fileName: 'main.cpp', monaco: 'cpp' },
        c: { fileName: 'main.c', monaco: 'c' },
        csharp: { fileName: 'Program.cs', monaco: 'csharp' },
        go: { fileName: 'main.go', monaco: 'go' },
        php: { fileName: 'solution.php', monaco: 'php' },
        ruby: { fileName: 'solution.rb', monaco: 'ruby' },
        typescript: { fileName: 'solution.ts', monaco: 'typescript' }
      };

      for (const [langId, exp] of Object.entries(expectations)) {
        const config = getLanguageConfig(langId);
        assert.ok(config, `Language config for ${langId} must exist`);
        assert.equal(config.fileName, exp.fileName, `Expected ${exp.fileName} for ${langId}`);
        assert.equal(config.monacoLanguage, exp.monaco, `Expected Monaco ${exp.monaco} for ${langId}`);
      }
    });

    test('PistonExecutionProvider instantiates with default API URL and timeout', () => {
      const provider = new PistonExecutionProvider();
      assert.equal(provider.name, 'piston');
      assert.ok(provider.apiUrl.includes('piston'));
      assert.ok(provider.timeoutMs > 0);
    });

    test('OnlineCompilerExecutionProvider instantiates without Piston fallback', () => {
      const provider = new OnlineCompilerExecutionProvider();
      assert.equal(provider.name, 'onlinecompiler');
      assert.equal(provider.pistonFallback, undefined, 'Piston fallback must be completely removed');
      assert.ok(provider.timeoutMs > 0);
    });

    test('OnlineCompiler.io has official compiler identifiers mapped', () => {
      assert.equal(ONLINECOMPILER_COMPILERS.java.primary, 'openjdk-25', 'Java must map to openjdk-25');
      assert.equal(ONLINECOMPILER_COMPILERS.python.primary, 'python-3.14', 'Python must map to python-3.14');
      assert.equal(ONLINECOMPILER_COMPILERS.javascript.primary, 'nodejs-24', 'JavaScript must map to nodejs-24');
      assert.equal(ONLINECOMPILER_COMPILERS.cpp.primary, 'g++-15', 'C++ must map to g++-15');
      assert.equal(ONLINECOMPILER_COMPILERS.c.primary, 'c-gcc-15', 'C must map to c-gcc-15');
      assert.equal(ONLINECOMPILER_COMPILERS.csharp.primary, 'dotnet-csharp-10', 'C# must map to dotnet-csharp-10');
      assert.equal(ONLINECOMPILER_COMPILERS.go.primary, 'go-1.26', 'Go must map to go-1.26');
      assert.equal(ONLINECOMPILER_COMPILERS.php.primary, 'php-8.5', 'PHP must map to php-8.5');
      assert.equal(ONLINECOMPILER_COMPILERS.ruby.primary, 'ruby-4.0', 'Ruby must map to ruby-4.0');
      assert.equal(ONLINECOMPILER_COMPILERS.typescript.primary, 'typescript-deno', 'TypeScript must map to typescript-deno');
    });

    test('Java starter code uses class Main and main method', () => {
      const javaConfig = getLanguageConfig('java');
      assert.ok(javaConfig.starterCode.includes('class Main'));
      assert.ok(javaConfig.starterCode.includes('public static void main(String[] args)'));
      assert.ok(javaConfig.starterCode.includes('System.out.println("Hello World")'));
      assert.ok(!javaConfig.starterCode.includes('console.log'));
    });
  });
});
