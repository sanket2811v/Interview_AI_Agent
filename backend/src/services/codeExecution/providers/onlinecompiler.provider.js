import { BaseCodeExecutionProvider } from './base.provider.js';
import { getLanguageConfig } from '../languageConfig.js';
import { logger } from '../../../utils/logger.js';

// Official OnlineCompiler.io compiler identifiers verified from API documentation
export const ONLINECOMPILER_COMPILERS = {
  java: { primary: 'openjdk-25', fallback: 'java-25' },
  python: { primary: 'python-3.14', fallback: 'python' },
  javascript: { primary: 'nodejs-24', fallback: 'javascript' },
  typescript: { primary: 'typescript-deno', fallback: 'deno' },
  cpp: { primary: 'g++-15', fallback: 'cpp' },
  c: { primary: 'c-gcc-15', fallback: 'gcc-15' },
  csharp: { primary: 'dotnet-csharp-10', fallback: 'dotnet' },
  go: { primary: 'go-1.26', fallback: 'go' },
  php: { primary: 'php-8.5', fallback: 'php' },
  ruby: { primary: 'ruby-4.0', fallback: 'ruby' }
};

export class OnlineCompilerExecutionProvider extends BaseCodeExecutionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'onlinecompiler';
    this.apiUrl = config.apiUrl || process.env.CODE_EXECUTION_API_URL || 'https://api.onlinecompiler.io';

    // Safely resolve and sanitize API key (stripping quotes and accidental whitespace)
    let rawKey = config.apiKey || process.env.CODE_EXECUTION_API_KEY || '';
    if (typeof rawKey === 'string') {
      rawKey = rawKey.trim().replace(/^['"]|['"]$/g, '').trim();
    }
    this.apiKey = rawKey;

    this.timeoutMs = Number(config.timeoutMs || process.env.CODE_EXECUTION_TIMEOUT_MS || 30000);
  }

  async execute({ language, sourceCode, stdin = '', timeLimit = 5000, memoryLimit = 256 }) {
    if (!this.apiKey) {
      return {
        status: 'PROVIDER_CONFIG_ERROR',
        stdout: '',
        stderr: 'Code execution service authentication failed: Missing CODE_EXECUTION_API_KEY in backend/.env. Please configure your REST API key from https://api.onlinecompiler.io/compilers/api-keys/.',
        compileOutput: '',
        executionTimeMs: 0,
        memoryUsedKb: null,
        exitCode: 1,
        errorType: 'PROVIDER_CONFIG_ERROR'
      };
    }

    const langConfig = getLanguageConfig(language);
    if (!langConfig) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const mapping = ONLINECOMPILER_COMPILERS[langConfig.id] || {
      primary: langConfig.id,
      fallback: langConfig.id
    };

    const baseUrl = this.apiUrl.trim().replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/run-code-sync/`;

    // Official OnlineCompiler.io REST API headers: raw API key in Authorization
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.apiKey,
      'User-Agent': 'InterviewAI-ExecutionEngine/1.0'
    };

    const startTime = Date.now();
    const timeLimitSec = Math.max(1, Math.min(Math.round(timeLimit / 1000), 60));

    // Helper to send execution request to OnlineCompiler.io
    const sendRunRequest = async (compilerId) => {
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

      const payload = {
        compiler: compilerId,
        code: sourceCode,
        input: stdin || '',
        time_limit: timeLimitSec
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutTimer);
        return response;
      } catch (err) {
        clearTimeout(timeoutTimer);
        throw err;
      }
    };

    try {
      let response = await sendRunRequest(mapping.primary);

      // If primary compiler returned 400 Bad Request and fallback differs, retry with fallback compiler ID
      if (response.status === 400 && mapping.primary !== mapping.fallback) {
        logger.warn(
          `OnlineCompiler primary compiler '${mapping.primary}' returned 400, trying fallback '${mapping.fallback}'...`
        );
        response = await sendRunRequest(mapping.fallback);
      }

      const wallTimeMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.warn('OnlineCompiler.io HTTP response not ok', {
          status: response.status,
          statusText: response.statusText,
          response: errorText.slice(0, 300)
        });

        // 400 Bad Request: Unsupported or missing compiler
        if (response.status === 400) {
          let detailMsg = errorText;
          try {
            const parsed = JSON.parse(errorText);
            detailMsg = parsed.error || parsed.message || errorText;
          } catch {}
          return {
            status: 'INVALID_REQUEST',
            stdout: '',
            stderr: `The selected language is not supported by the execution provider (HTTP 400: ${detailMsg || 'Unsupported or missing compiler'}).`,
            compileOutput: '',
            executionTimeMs: 0,
            memoryUsedKb: null,
            exitCode: 1,
            errorType: 'INVALID_REQUEST'
          };
        }

        // 401 Unauthorized: API key invalid or expired
        if (response.status === 401) {
          return {
            status: 'AUTH_ERROR',
            stdout: '',
            stderr: 'Execution provider authentication failed. Check the backend API configuration in backend/.env (ensure CODE_EXECUTION_API_KEY is an active REST API key from https://api.onlinecompiler.io/compilers/api-keys/).',
            compileOutput: '',
            executionTimeMs: 0,
            memoryUsedKb: null,
            exitCode: 1,
            errorType: 'AUTH_ERROR'
          };
        }

        // 403 Forbidden: Account or IP permission restriction
        if (response.status === 403) {
          return {
            status: 'AUTH_ERROR',
            stdout: '',
            stderr: 'OnlineCompiler.io access forbidden (HTTP 403 Forbidden). Please verify account status and API key permissions at https://api.onlinecompiler.io.',
            compileOutput: '',
            executionTimeMs: 0,
            memoryUsedKb: null,
            exitCode: 1,
            errorType: 'AUTH_ERROR'
          };
        }

        // 429 Rate Limited
        if (response.status === 429) {
          return {
            status: 'RATE_LIMIT_ERROR',
            stdout: '',
            stderr: 'Execution limit reached. Please try again later (OnlineCompiler.io HTTP 429).',
            compileOutput: '',
            executionTimeMs: 0,
            memoryUsedKb: null,
            exitCode: 1,
            errorType: 'RATE_LIMIT_ERROR'
          };
        }

        // Provider 5xx or server errors
        return {
          status: 'PROVIDER_ERROR',
          stdout: '',
          stderr: `Code execution service is temporarily unavailable (OnlineCompiler.io HTTP ${response.status} ${response.statusText}).`,
          compileOutput: '',
          executionTimeMs: 0,
          memoryUsedKb: null,
          exitCode: 1,
          errorType: 'PROVIDER_ERROR'
        };
      }

      const data = await response.json();
      return this._normalizeResponse(data, wallTimeMs);
    } catch (err) {
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

      logger.error('OnlineCompiler execution error', { error: err.message, language });
      return {
        status: 'NETWORK_ERROR',
        stdout: '',
        stderr: `Code execution service is temporarily unavailable: ${err.message}.`,
        compileOutput: '',
        executionTimeMs: 0,
        memoryUsedKb: null,
        exitCode: 1,
        errorType: 'NETWORK_ERROR'
      };
    }
  }

  _normalizeResponse(data, wallTimeMs) {
    const output = data.output !== undefined && data.output !== null ? String(data.output) : '';
    const error = data.error !== undefined && data.error !== null ? String(data.error) : '';
    const exitCode = typeof data.exit_code === 'number' ? data.exit_code : 0;
    const executionTimeMs = data.time ? Math.round(Number(data.time) * 1000) : wallTimeMs;
    const memoryUsedKb = typeof data.memory === 'number' ? data.memory : null;

    // 1. Time Limit Exceeded
    if (data.status === 'timeout' || exitCode === 124 || /timed?\s*out/i.test(error)) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        stdout: output,
        stderr: (error || 'Time Limit Exceeded').trim(),
        compileOutput: '',
        executionTimeMs,
        memoryUsedKb,
        exitCode: 124
      };
    }

    // 2. Compilation Error
    const isCompileError =
      data.status === 'compilation_error' ||
      /compilation\s*error|syntaxerror|javac|gcc:\s*error|g\+\+:\s*error|error:\s*cannot\s*find\s*symbol/i.test(
        error
      );

    if (isCompileError) {
      return {
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: error.trim() || 'Compilation failed',
        compileOutput: error.trim(),
        executionTimeMs,
        memoryUsedKb,
        exitCode: exitCode !== 0 ? exitCode : 1
      };
    }

    // 3. Runtime Error
    if (exitCode !== 0 || (error && error.trim().length > 0 && data.status !== 'success')) {
      return {
        status: 'RUNTIME_ERROR',
        stdout: output,
        stderr: error.trim() || `Process exited with code ${exitCode}`,
        compileOutput: '',
        executionTimeMs,
        memoryUsedKb,
        exitCode: exitCode !== 0 ? exitCode : 1
      };
    }

    // 4. Successful Execution
    return {
      status: 'SUCCESS',
      stdout: output,
      stderr: error.trim(),
      compileOutput: '',
      executionTimeMs,
      memoryUsedKb,
      exitCode: 0
    };
  }

  async checkHealth() {
    try {
      const endpoint = `${this.apiUrl.replace(/\/+$/, '')}/api/health/`;
      const response = await fetch(endpoint, { method: 'GET' });
      return {
        isAvailable: response.ok,
        message: response.ok ? 'OnlineCompiler.io API reachable' : `HTTP ${response.status}`
      };
    } catch (err) {
      return {
        isAvailable: false,
        message: err.message
      };
    }
  }
}

export default OnlineCompilerExecutionProvider;
