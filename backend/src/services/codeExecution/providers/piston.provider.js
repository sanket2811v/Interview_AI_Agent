import { BaseCodeExecutionProvider } from './base.provider.js';
import { getLanguageConfig } from '../languageConfig.js';
import { logger } from '../../../utils/logger.js';

export class PistonExecutionProvider extends BaseCodeExecutionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'piston';
    const envPistonUrl = process.env.PISTON_API_URL || (process.env.CODE_EXECUTION_API_URL?.includes('piston') ? process.env.CODE_EXECUTION_API_URL : null);
    this.apiUrl = config.apiUrl || envPistonUrl || 'https://emkc.org/api/v2/piston';
    this.apiKey = config.apiKey || process.env.PISTON_API_KEY || (process.env.CODE_EXECUTION_API_KEY?.startsWith('piston') ? process.env.CODE_EXECUTION_API_KEY : '');
    this.timeoutMs = Number(config.timeoutMs || process.env.CODE_EXECUTION_TIMEOUT_MS || 30000);
  }

  async execute({ language, sourceCode, stdin = '', timeLimit = 3000, memoryLimit = 128 }) {
    const langConfig = getLanguageConfig(language);
    if (!langConfig || !langConfig.piston) {
      throw new Error(`Unsupported language for Piston provider: ${language}`);
    }

    const endpoint = `${this.apiUrl.replace(/\/+$/, '')}/execute`;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

    const fileName = langConfig.fileName || (langConfig.id === 'java' ? 'Main.java' : `solution.${langConfig.extension}`);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'InterviewAI-ExecutionEngine/1.0'
    };

    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }

    const payload = {
      language: langConfig.piston.language,
      version: langConfig.piston.version || '*',
      files: [
        {
          name: fileName,
          content: sourceCode
        }
      ],
      stdin: stdin || '',
      args: [],
      compile_timeout: 10000,
      run_timeout: Math.min(Math.max(timeLimit, 1000), 15000),
      compile_memory_limit: -1,
      run_memory_limit: memoryLimit > 0 ? memoryLimit * 1024 * 1024 : -1
    };

    const startTime = Date.now();

    try {
      let response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // If unauthorized with key on public instance, retry once without key
      if (response.status === 401 && this.apiKey) {
        logger.warn('Piston returned 401 with API key, retrying without Authorization header...');
        const retryHeaders = {
          'Content-Type': 'application/json',
          'User-Agent': 'InterviewAI-ExecutionEngine/1.0'
        };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: retryHeaders,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutTimer);
      const executionTimeMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error('Piston provider HTTP error', {
          status: response.status,
          statusText: response.statusText,
          response: errorText.slice(0, 300)
        });

        if (response.status === 429) {
          const err = new Error('Execution provider rate limit exceeded. Please wait a moment.');
          err.status = 429;
          throw err;
        }

        const err = new Error(`Execution provider returned HTTP ${response.status}: ${response.statusText}`);
        err.status = 502;
        throw err;
      }

      const data = await response.json();
      return this._normalizeResponse(data, executionTimeMs);
    } catch (err) {
      clearTimeout(timeoutTimer);

      if (err.name === 'AbortError') {
        return {
          status: 'TIME_LIMIT_EXCEEDED',
          stdout: '',
          stderr: `Execution timed out after ${this.timeoutMs}ms`,
          compileOutput: '',
          executionTimeMs: this.timeoutMs,
          memoryUsedKb: 0,
          exitCode: 124
        };
      }

      throw err;
    }
  }

  _normalizeResponse(data, wallTimeMs) {
    const compile = data.compile || null;
    const run = data.run || {};

    // 1. Compilation Error check
    if (compile && compile.code !== 0 && compile.code !== null) {
      return {
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: (compile.stderr || compile.output || 'Compilation failed').trim(),
        compileOutput: (compile.output || compile.stderr || '').trim(),
        executionTimeMs: wallTimeMs,
        memoryUsedKb: 0,
        exitCode: compile.code || 1
      };
    }

    // 2. Time limit exceeded / kill signal
    const isTimeout =
      run.signal === 'SIGTERM' ||
      run.signal === 'SIGKILL' ||
      (run.output && /timed out/i.test(run.output));

    if (isTimeout) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        stdout: '',
        stderr: (run.stderr || run.output || 'Time Limit Exceeded').trim(),
        compileOutput: compile ? (compile.output || '').trim() : '',
        executionTimeMs: wallTimeMs,
        memoryUsedKb: 0,
        exitCode: 124
      };
    }

    // 3. Runtime Error check
    if (run.code !== 0 && run.code !== null && run.code !== undefined) {
      return {
        status: 'RUNTIME_ERROR',
        stdout: (run.stdout || '').trim(),
        stderr: (run.stderr || run.output || `Process exited with code ${run.code}`).trim(),
        compileOutput: compile ? (compile.output || '').trim() : '',
        executionTimeMs: wallTimeMs,
        memoryUsedKb: 0,
        exitCode: run.code
      };
    }

    // 4. Successful execution
    return {
      status: 'SUCCESS',
      stdout: run.stdout !== undefined ? run.stdout : (run.output || ''),
      stderr: (run.stderr || '').trim(),
      compileOutput: compile ? (compile.output || '').trim() : '',
      executionTimeMs: wallTimeMs,
      memoryUsedKb: 0,
      exitCode: 0
    };
  }

  async checkHealth() {
    try {
      const endpoint = `${this.apiUrl.replace(/\/+$/, '')}/runtimes`;
      const response = await fetch(endpoint, { method: 'GET' });
      return {
        isAvailable: response.ok,
        message: response.ok ? 'Piston API reachable' : `HTTP ${response.status}`
      };
    } catch (err) {
      return {
        isAvailable: false,
        message: err.message
      };
    }
  }
}
