import { env } from '../config/env.js';
import { db } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import {
  JOB_ANALYSIS_PROMPT_VERSION,
  getJobAnalysisSystemPrompt,
  buildJobAnalysisUserPrompt
} from '../prompts/jobAnalysis.prompt.js';
import { validateJobAnalysisOutput } from '../validators/analysis.validator.js';
import { validateGeneratedQuestionsOutput } from '../validators/question.validator.js';

/**
 * Service encapsulating OpenAI API communication, prompt versioning,
 * retry backoff, timeouts, usage tracking, and structured response validation.
 */
export class OpenAIService {
  // Test hook for intercepting API calls in automated test suites
  static _mockHandler = null;

  /**
   * Set mock handler for unit and integration testing
   * @param {Function|null} fn
   */
  static __setMockHandler(fn) {
    this._mockHandler = fn;
  }

  /**
   * Performs AI-powered analysis of a job description with profile comparison.
   *
   * @param {string} rawJobDescription - Full raw job description text
   * @param {object|null} candidateProfile - Candidate's skills, experience, and role
   * @param {object} context - Additional metadata (userId, preparationSessionId)
   * @returns {Promise<object>} Validated structured analysis object
   */
  static async analyzeJobDescription(rawJobDescription, candidateProfile = null, context = {}) {
    const { userId, preparationSessionId } = context;

    // 1. Input length validation
    if (!rawJobDescription || typeof rawJobDescription !== 'string') {
      const err = new Error('Job description text is missing or invalid');
      err.status = 400;
      throw err;
    }

    const trimmedText = rawJobDescription.trim();
    if (trimmedText.length < 20) {
      const err = new Error('Job description must be at least 20 characters for meaningful analysis');
      err.status = 400;
      throw err;
    }

    if (trimmedText.length > env.OPENAI_MAX_INPUT_CHARS) {
      const err = new Error(
        `Job description exceeds maximum supported length (${trimmedText.length} / ${env.OPENAI_MAX_INPUT_CHARS} characters)`
      );
      err.status = 400;
      throw err;
    }

    // 2. Allow mock handler if installed (for automated testing)
    if (this._mockHandler) {
      return await this._mockHandler(trimmedText, candidateProfile, context);
    }

    // 3. Verify API key is configured
    const apiKey = (env.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || '').replace(/^['"]|['"]$/g, '');
    if (!apiKey) {
      const err = new Error(
        'OpenAI API key is not configured. Please set OPENAI_API_KEY in the backend environment variables.'
      );
      err.status = 503;
      err.code = 'OPENAI_KEY_MISSING';
      throw err;
    }

    // 4. Build prompt messages
    const systemPrompt = getJobAnalysisSystemPrompt();
    const userPrompt = buildJobAnalysisUserPrompt(trimmedText, candidateProfile);

    const requestPayload = {
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.1, // low temperature for consistent, factual parsing
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };

    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = env.OPENAI_MAX_RETRIES || 2;
    let lastError = null;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutMs = env.OPENAI_TIMEOUT_MS || 60000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        logger.info('Calling OpenAI Chat Completions API', {
          model: requestPayload.model,
          attempt: attempt + 1,
          inputLength: trimmedText.length,
          preparationSessionId
        });

        const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          const status = res.status;
          let errorBody = {};
          try {
            errorBody = await res.json();
          } catch {
            // non-json response
          }

          const providerMessage = errorBody?.error?.message || res.statusText || 'Unknown upstream error';

          // Authentication / permissions (do not retry)
          if (status === 401 || status === 403) {
            const err = new Error('Authentication with OpenAI failed. Check OPENAI_API_KEY.');
            err.status = 502;
            err.code = 'OPENAI_AUTH_ERROR';
            await this.logUsage({
              userId,
              preparationSessionId,
              status: 'FAILED',
              errorCode: 'AUTH_FAILED',
              durationMs
            });
            throw err;
          }

          // Quota / Billing error (do not retry)
          if (
            errorBody?.error?.type === 'insufficient_quota' ||
            providerMessage.toLowerCase().includes('insufficient_quota') ||
            providerMessage.toLowerCase().includes('exceeded your current quota') ||
            providerMessage.toLowerCase().includes('billing')
          ) {
            const err = new Error('OpenAI API quota exceeded or billing inactive. Please check your OpenAI account billing.');
            err.status = 502;
            err.code = 'OPENAI_QUOTA_EXCEEDED';
            await this.logUsage({
              userId,
              preparationSessionId,
              status: 'RATE_LIMITED',
              errorCode: 'QUOTA_EXCEEDED',
              durationMs
            });
            throw err;
          }

          // Rate limit (transient: retry with backoff if attempts remain)
          if (status === 429) {
            if (attempt < maxRetries) {
              const backoff = Math.pow(2, attempt) * 1500;
              logger.warn(`OpenAI rate limited (429). Retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`);
              await new Promise((r) => setTimeout(r, backoff));
              attempt++;
              continue;
            }
            const err = new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
            err.status = 429;
            err.code = 'OPENAI_RATE_LIMIT';
            await this.logUsage({
              userId,
              preparationSessionId,
              status: 'RATE_LIMITED',
              errorCode: 'RATE_LIMIT',
              durationMs
            });
            throw err;
          }

          // Server errors (500, 502, 503, 504)
          if (status >= 500 && attempt < maxRetries) {
            const backoff = Math.pow(2, attempt) * 1000;
            logger.warn(`OpenAI server error (${status}). Retrying in ${backoff}ms...`);
            await new Promise((r) => setTimeout(r, backoff));
            attempt++;
            continue;
          }

          const err = new Error(`OpenAI service returned error: ${providerMessage}`);
          err.status = status >= 500 ? 502 : status;
          err.code = 'OPENAI_PROVIDER_ERROR';
          await this.logUsage({
            userId,
            preparationSessionId,
            status: 'FAILED',
            errorCode: `HTTP_${status}`,
            durationMs
          });
          throw err;
        }

        // Parse and validate response
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          const err = new Error('OpenAI returned empty completion content');
          err.status = 502;
          throw err;
        }

        let parsedJson;
        try {
          parsedJson = JSON.parse(content);
        } catch (jsonErr) {
          const err = new Error('Failed to parse OpenAI response as JSON');
          err.status = 502;
          err.details = jsonErr.message;
          throw err;
        }

        // Schema validation
        const validatedOutput = validateJobAnalysisOutput(parsedJson);

        // Record telemetry usage
        const usage = data.usage || {};
        await this.logUsage({
          userId,
          preparationSessionId,
          model: data.model || requestPayload.model,
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          status: 'SUCCESS',
          durationMs
        });

        // Attach operational metadata
        validatedOutput._metadata = {
          provider: 'OpenAI',
          model: data.model || requestPayload.model,
          promptVersion: JOB_ANALYSIS_PROMPT_VERSION,
          durationMs,
          totalTokens: usage.total_tokens || 0,
          completedAt: new Date().toISOString()
        };

        return validatedOutput;
      } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
          const durationMs = Date.now() - startTime;
          logger.error(`OpenAI request timed out after ${timeoutMs}ms`);
          await this.logUsage({
            userId,
            preparationSessionId,
            status: 'TIMEOUT',
            errorCode: 'REQUEST_TIMEOUT',
            durationMs
          });
          const timeoutErr = new Error(`OpenAI request timed out after ${timeoutMs / 1000} seconds`);
          timeoutErr.status = 504;
          timeoutErr.code = 'OPENAI_TIMEOUT';
          throw timeoutErr;
        }

        lastError = err;
        // If it's a known non-retryable error (e.g. 400, 401, 502 schema fail), throw immediately
        if (err.status && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (attempt >= maxRetries) {
          break;
        }

        attempt++;
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }

    throw lastError || new Error('Failed to complete OpenAI request after maximum retries');
  }

  /**
   * Generates tailored interview questions based on structured prompt messages.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {object} context - Metadata (userId, preparationSessionId)
   * @returns {Promise<object>} Validated question output
   */
  static async generateInterviewQuestions(messages, context = {}) {
    const { userId, preparationSessionId } = context;

    // 1. Allow mock handler if installed (for automated testing)
    if (this._mockHandler) {
      return await this._mockHandler(messages, context);
    }

    // 2. Verify API key is configured
    const apiKey = (env.OPENAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || '').replace(/^['"]|['"]$/g, '');
    if (!apiKey) {
      const err = new Error(
        'OpenAI API key is not configured. Please set OPENAI_API_KEY in the backend environment variables.'
      );
      err.status = 503;
      err.code = 'OPENAI_KEY_MISSING';
      throw err;
    }

    const requestPayload = {
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2, // low temperature for consistent, relevant technical output
      response_format: { type: 'json_object' },
      max_tokens: 8192, // Ensure 20 questions + coding challenges never truncate midway
      messages
    };

    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = env.OPENAI_MAX_RETRIES || 2;
    let lastError = null;

    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timeoutMs = Math.max(env.OPENAI_TIMEOUT_MS || 60000, 120000);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        logger.info('Calling OpenAI Chat Completions API for Question Generation', {
          model: requestPayload.model,
          attempt: attempt + 1,
          preparationSessionId
        });

        const res = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const durationMs = Date.now() - startTime;

        if (!res.ok) {
          const status = res.status;
          let errorBody = {};
          try {
            errorBody = await res.json();
          } catch {}

          const providerMessage = errorBody?.error?.message || res.statusText || 'Unknown upstream error';

          if (status === 401 || status === 403) {
            const err = new Error('Authentication with OpenAI failed. Check OPENAI_API_KEY.');
            err.status = 502;
            err.code = 'OPENAI_AUTH_ERROR';
            await this.logUsage({
              userId,
              preparationSessionId,
              operationType: 'QUESTION_GENERATION',
              status: 'FAILED',
              errorCode: 'AUTH_FAILED',
              durationMs
            });
            throw err;
          }

          if (
            errorBody?.error?.type === 'insufficient_quota' ||
            providerMessage.toLowerCase().includes('insufficient_quota') ||
            providerMessage.toLowerCase().includes('exceeded your current quota') ||
            providerMessage.toLowerCase().includes('billing')
          ) {
            const err = new Error('OpenAI API quota exceeded or billing inactive. Please check your OpenAI account billing.');
            err.status = 502;
            err.code = 'OPENAI_QUOTA_EXCEEDED';
            await this.logUsage({
              userId,
              preparationSessionId,
              operationType: 'QUESTION_GENERATION',
              status: 'RATE_LIMITED',
              errorCode: 'QUOTA_EXCEEDED',
              durationMs
            });
            throw err;
          }

          if (status === 429) {
            if (attempt < maxRetries) {
              const backoff = Math.pow(2, attempt) * 1500;
              logger.warn(`OpenAI rate limited (429). Retrying in ${backoff}ms...`);
              await new Promise((r) => setTimeout(r, backoff));
              attempt++;
              continue;
            }
            const err = new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
            err.status = 429;
            err.code = 'OPENAI_RATE_LIMIT';
            await this.logUsage({
              userId,
              preparationSessionId,
              operationType: 'QUESTION_GENERATION',
              status: 'RATE_LIMITED',
              errorCode: 'RATE_LIMIT',
              durationMs
            });
            throw err;
          }

          if (status >= 500 && attempt < maxRetries) {
            const backoff = Math.pow(2, attempt) * 1000;
            logger.warn(`OpenAI server error (${status}). Retrying in ${backoff}ms...`);
            await new Promise((r) => setTimeout(r, backoff));
            attempt++;
            continue;
          }

          const err = new Error(`OpenAI service returned error: ${providerMessage}`);
          err.status = status >= 500 ? 502 : status;
          err.code = 'OPENAI_PROVIDER_ERROR';
          await this.logUsage({
            userId,
            preparationSessionId,
            operationType: 'QUESTION_GENERATION',
            status: 'FAILED',
            errorCode: `HTTP_${status}`,
            durationMs
          });
          throw err;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          const err = new Error('OpenAI returned empty completion content for question generation');
          err.status = 502;
          throw err;
        }

        let rawContent = (content || '').trim();
        if (rawContent.startsWith('```')) {
          rawContent = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }

        let parsedJson;
        try {
          parsedJson = JSON.parse(rawContent);
        } catch (jsonErr) {
          const err = new Error('Failed to parse OpenAI question generation response as JSON');
          err.status = 502;
          err.details = jsonErr.message;
          throw err;
        }

        // Schema validation & resilient normalization
        const validatedOutput = validateGeneratedQuestionsOutput(parsedJson);

        // Record telemetry usage
        const usage = data.usage || {};
        await this.logUsage({
          userId,
          preparationSessionId,
          operationType: 'QUESTION_GENERATION',
          model: data.model || requestPayload.model,
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          status: 'SUCCESS',
          durationMs
        });

        validatedOutput._metadata = {
          provider: 'OpenAI',
          model: data.model || requestPayload.model,
          durationMs,
          totalTokens: usage.total_tokens || 0,
          completedAt: new Date().toISOString()
        };

        return validatedOutput;
      } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
          const durationMs = Date.now() - startTime;
          logger.error(`OpenAI question generation request timed out after ${timeoutMs}ms`);
          await this.logUsage({
            userId,
            preparationSessionId,
            operationType: 'QUESTION_GENERATION',
            status: 'TIMEOUT',
            errorCode: 'REQUEST_TIMEOUT',
            durationMs
          });
          const timeoutErr = new Error(`OpenAI request timed out after ${timeoutMs / 1000} seconds`);
          timeoutErr.status = 504;
          timeoutErr.code = 'OPENAI_TIMEOUT';
          throw timeoutErr;
        }

        lastError = err;
        if (err.status && err.status < 500 && err.status !== 429) {
          throw err;
        }

        if (attempt >= maxRetries) {
          break;
        }

        attempt++;
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }

    throw lastError || new Error('Failed to complete OpenAI question generation after retries');
  }

  /**
   * Safe usage logger to database AIUsageLog table
   */
  static async logUsage(params) {
    try {
      if (!db?.aIUsageLog || !params.userId) return;

      await db.aIUsageLog.create({
        data: {
          userId: params.userId,
          preparationSessionId: params.preparationSessionId || null,
          operationType: params.operationType || 'JOB_ANALYSIS',
          provider: 'OpenAI',
          model: params.model || env.OPENAI_MODEL || 'gpt-4o-mini',
          promptTokens: params.promptTokens || 0,
          completionTokens: params.completionTokens || 0,
          totalTokens: params.totalTokens || 0,
          estimatedCost: ((params.totalTokens || 0) * 0.000001), // Approximate estimation
          status: params.status || 'SUCCESS',
          errorCode: params.errorCode || null,
          durationMs: params.durationMs || 0
        }
      });
    } catch (logErr) {
      logger.warn('Failed to persist AIUsageLog record:', logErr.message);
    }
  }
}

