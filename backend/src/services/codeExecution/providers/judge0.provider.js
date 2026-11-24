import { BaseCodeExecutionProvider } from './base.provider.js';
import { getLanguageConfig } from '../languageConfig.js';
import { logger } from '../../../utils/logger.js';

export class Judge0ExecutionProvider extends BaseCodeExecutionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'judge0';
    this.apiUrl = config.apiUrl || process.env.CODE_EXECUTION_API_URL || 'https://judge0-ce.p.rapidapi.com';
    this.apiKey = config.apiKey || process.env.CODE_EXECUTION_API_KEY || '';
    this.apiHost = config.apiHost || process.env.CODE_EXECUTION_API_HOST || 'judge0-ce.p.rapidapi.com';
    this.timeoutMs = Number(config.timeoutMs || process.env.CODE_EXECUTION_TIMEOUT_MS || 30000);
  }

  async execute({ language, sourceCode, stdin = '', timeLimit = 3000, memoryLimit = 128 }) {
    const langConfig = getLanguageConfig(language);
    if (!langConfig || !langConfig.judge0) {
      throw new Error(`Unsupported language for Judge0 provider: ${language}`);
    }

    const endpoint = `${this.apiUrl.replace(/\/+$/, '')}/submissions?base64_encoded=false&wait=true`;
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'InterviewAI-ExecutionEngine/1.0'
    };

    if (this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey;
      headers['X-RapidAPI-Host'] = this.apiHost;
    }

    const payload = {
      source_code: sourceCode,
      language_id: langConfig.judge0.languageId,
      stdin: stdin || '',
      cpu_time_limit: Math.max(Math.ceil(timeLimit / 1000), 1),
      max_file_size: 1024,
      memory_limit: memoryLimit > 0 ? memoryLimit * 1024 : 128000
    };

    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutTimer);
      const executionTimeMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error('Judge0 provider HTTP error', {
          status: response.status,
          statusText: response.statusText,
          response: errorText.slice(0, 300)
        });

        if (response.status === 429) {
          const err = new Error('Judge0 execution rate limit exceeded.');
          err.status = 429;
          throw err;
        }

        const err = new Error(`Judge0 provider returned HTTP ${response.status}: ${response.statusText}`);
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
          stderr: `Judge0 execution timed out after ${this.timeoutMs}ms`,
          executionTimeMs: this.timeoutMs,
          memoryUsedKb: 0,
          exitCode: 124
        };
      }

      throw err;
    }
  }

  _normalizeResponse(data, wallTimeMs) {
    const statusId = data.status?.id || 0;
    const stdout = data.stdout || '';
    const stderr = data.stderr || data.compile_output || '';
    const executionTimeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : wallTimeMs;
    const memoryUsedKb = data.memory || 0;

    // Status 3: Accepted
    if (statusId === 3) {
      return {
        status: 'SUCCESS',
        stdout,
        stderr: '',
        executionTimeMs,
        memoryUsedKb,
        exitCode: 0,
        providerSubmissionId: data.token
      };
    }

    // Status 5: Time Limit Exceeded
    if (statusId === 5) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        stdout,
        stderr: stderr || 'Time Limit Exceeded',
        executionTimeMs,
        memoryUsedKb,
        exitCode: 124,
        providerSubmissionId: data.token
      };
    }

    // Status 6: Compilation Error
    if (statusId === 6) {
      return {
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: stderr || 'Compilation Error',
        executionTimeMs,
        memoryUsedKb,
        exitCode: 1,
        providerSubmissionId: data.token
      };
    }

    // Status 7-12: Runtime Errors
    if (statusId >= 7 && statusId <= 12) {
      return {
        status: 'RUNTIME_ERROR',
        stdout,
        stderr: stderr || data.status?.description || 'Runtime Error',
        executionTimeMs,
        memoryUsedKb,
        exitCode: 1,
        providerSubmissionId: data.token
      };
    }

    // Other / Default
    return {
      status: 'SUCCESS',
      stdout,
      stderr,
      executionTimeMs,
      memoryUsedKb,
      exitCode: 0,
      providerSubmissionId: data.token
    };
  }

  async checkHealth() {
    try {
      const endpoint = `${this.apiUrl.replace(/\/+$/, '')}/about`;
      const response = await fetch(endpoint, { method: 'GET' });
      return {
        isAvailable: response.ok,
        message: response.ok ? 'Judge0 API reachable' : `HTTP ${response.status}`
      };
    } catch (err) {
      return {
        isAvailable: false,
        message: err.message
      };
    }
  }
}
