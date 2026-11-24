import { BaseCodeExecutionProvider } from './base.provider.js';

export class MockExecutionProvider extends BaseCodeExecutionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'mock';
    this.forcedScenario = config.forcedScenario || null;
  }

  setScenario(scenario) {
    this.forcedScenario = scenario;
  }

  async execute({ language, sourceCode, stdin = '', timeLimit = 3000, memoryLimit = 128 }) {
    // Check for simulated errors triggered by code keywords or forced scenario
    const code = sourceCode || '';
    const scenario = this.forcedScenario;

    if (scenario === 'COMPILATION_ERROR' || code.includes('// SIMULATE_COMPILATION_ERROR')) {
      return {
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: 'SyntaxError: Unexpected token in source file at line 14:2',
        executionTimeMs: 45,
        memoryUsedKb: 18400,
        exitCode: 1
      };
    }

    if (scenario === 'RUNTIME_ERROR' || code.includes('// SIMULATE_RUNTIME_ERROR')) {
      return {
        status: 'RUNTIME_ERROR',
        stdout: '',
        stderr: 'ZeroDivisionError: division by zero',
        executionTimeMs: 62,
        memoryUsedKb: 24200,
        exitCode: 1
      };
    }

    if (scenario === 'TIME_LIMIT_EXCEEDED' || code.includes('// SIMULATE_TIME_LIMIT_EXCEEDED')) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        stdout: '',
        stderr: 'Execution timed out (Time Limit Exceeded: 2000ms)',
        executionTimeMs: 2000,
        memoryUsedKb: 32000,
        exitCode: 124
      };
    }

    if (scenario === 'RATE_LIMITED' || code.includes('// SIMULATE_RATE_LIMIT')) {
      const err = new Error('Rate limit exceeded from execution provider');
      err.status = 429;
      throw err;
    }

    if (scenario === 'PROVIDER_TIMEOUT' || code.includes('// SIMULATE_TIMEOUT')) {
      const err = new Error('Execution provider gateway timeout');
      err.status = 504;
      throw err;
    }

    // Default simulation: Check if code contains special echo logic or return stdin
    let stdout = stdin;
    if (code.includes('// RETURN_WRONG_ANSWER')) {
      stdout = 'WRONG_UNEXPECTED_OUTPUT_12345';
    }

    return {
      status: 'SUCCESS',
      stdout: stdout || 'Output simulation',
      stderr: '',
      executionTimeMs: 48,
      memoryUsedKb: 16500,
      exitCode: 0,
      providerSubmissionId: `mock-sub-${Date.now()}`
    };
  }

  async checkHealth() {
    return {
      isAvailable: true,
      message: 'Mock execution provider operational'
    };
  }
}

