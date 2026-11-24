/**
 * Abstract Base Code Execution Provider Interface
 */
export class BaseCodeExecutionProvider {
  /**
   * @param {Object} config
   */
  constructor(config = {}) {
    this.name = 'base';
    this.config = config;
  }

  /**
   * Executes source code against stdin
   * @param {Object} options
   * @param {string} options.language - Language ID
   * @param {string} options.sourceCode - Complete source code to execute
   * @param {string} options.stdin - Standard input
   * @param {number} [options.timeLimit] - Max time limit in ms
   * @param {number} [options.memoryLimit] - Max memory limit in MB
   * @returns {Promise<{
   *   status: 'SUCCESS' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'INTERNAL_ERROR',
   *   stdout: string,
   *   stderr: string,
   *   executionTimeMs: number,
   *   memoryUsedKb: number,
   *   exitCode: number,
   *   providerSubmissionId?: string
   * }>}
   */
  async execute(options) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Checks health and connectivity to provider
   * @returns {Promise<{ isAvailable: boolean, message: string }>}
   */
  async checkHealth() {
    return { isAvailable: false, message: 'Provider not implemented' };
  }
}

