import { env } from '../../config/env.js';
import { db } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import {
  buildInterviewerSystemPrompt,
  buildInterviewerTurnPrompt,
  MOCK_INTERVIEW_PROMPT_VERSION
} from '../../prompts/mockInterview.prompt.js';

export class InterviewerService {
  // Test mock hook for automated unit/integration tests
  static _mockHandler = null;

  static __setMockHandler(fn) {
    this._mockHandler = fn;
  }

  /**
   * Generates the next interviewer turn using OpenAI or the active mock handler
   */
  static async generateInterviewerTurn({
    interview,
    preparation,
    conversationHistory = [],
    candidateInput = null,
    actionType = null
  }) {
    // 1. Check test mock hook
    if (this._mockHandler) {
      return await this._mockHandler({
        interview,
        preparation,
        conversationHistory,
        candidateInput,
        actionType
      });
    }

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      const err = new Error(
        'OpenAI API Key is not configured. Please add OPENAI_API_KEY to your environment.'
      );
      err.status = 503;
      err.code = 'OPENAI_KEY_MISSING';
      throw err;
    }

    // 2. Build system and turn prompts
    const systemPrompt = buildInterviewerSystemPrompt({
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      experienceLevel: interview.experienceLevel,
      interviewerPersonality: interview.interviewerPersonality,
      language: interview.language,
      durationMinutes: interview.durationMinutes,
      questionLimit: interview.questionLimit,
      companyName: preparation.companyName || 'Target Company',
      jobTitle: preparation.jobTitle || 'Software Engineer'
    });

    const userPrompt = buildInterviewerTurnPrompt({
      jobDescriptionSummary: preparation.jobDescription?.rawText?.slice(0, 1000) || '',
      requiredSkills: Array.isArray(preparation.jobAnalysis?.requiredSkills)
        ? preparation.jobAnalysis.requiredSkills
        : [],
      conversationHistory,
      candidateInput,
      actionType,
      currentQuestionIndex: interview.currentQuestionIndex || 0,
      totalQuestionLimit: interview.questionLimit || 5
    });

    // 3. Construct message array (compaction: take last 10 messages to avoid token blowup)
    const messages = [{ role: 'system', content: systemPrompt }];

    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'USER') {
        messages.push({
          role: 'user',
          content: `<candidate_answer>\n${msg.content}\n</candidate_answer>`
        });
      } else if (msg.role === 'ASSISTANT') {
        messages.push({
          role: 'assistant',
          content: msg.content
        });
      }
    }

    // Add current turn prompt
    messages.push({
      role: 'user',
      content: userPrompt
    });

    const requestPayload = {
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    };

    const startTime = Date.now();
    const controller = new AbortController();
    const turnTimeout = Math.min(Number(env.OPENAI_TIMEOUT_MS) || 45000, 20000);
    const timeoutTimer = setTimeout(() => controller.abort(), turnTimeout);

    try {
      logger.info('Calling OpenAI for Mock Interview turn', {
        interviewId: interview.id,
        actionType,
        model: requestPayload.model
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

      clearTimeout(timeoutTimer);
      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        logger.error('OpenAI Mock Interview upstream error', {
          status: res.status,
          statusText: res.statusText,
          response: errorText.slice(0, 300)
        });

        if (res.status === 429) {
          const err = new Error('AI Interviewer rate limit exceeded. Please wait a moment.');
          err.status = 429;
          await this._logUsage(interview.userId, interview.preparationSessionId, 'RATE_LIMITED', durationMs);
          throw err;
        }

        const err = new Error(`AI service returned HTTP ${res.status}: ${res.statusText}`);
        err.status = 502;
        await this._logUsage(interview.userId, interview.preparationSessionId, 'FAILED', durationMs);
        throw err;
      }

      const data = await res.json();
      const rawContent = data.choices?.[0]?.message?.content || '{}';
      const usage = data.usage || {};

      await this._logUsage(
        interview.userId,
        interview.preparationSessionId,
        'SUCCESS',
        durationMs,
        usage
      );

      return this._parseAndSanitizeResponse(rawContent);
    } catch (err) {
      clearTimeout(timeoutTimer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('AI Interviewer request timed out');
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * Parses JSON output with graceful fallback
   */
  static _parseAndSanitizeResponse(rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      return {
        content: parsed.content || 'Thank you for your response. Let us proceed with our discussion.',
        messageType: parsed.messageType || 'MAIN_QUESTION',
        isMainQuestion: Boolean(parsed.isMainQuestion),
        isFollowUp: Boolean(parsed.isFollowUp),
        detectedTopic: parsed.detectedTopic || 'General Discussion',
        shouldContinue: parsed.shouldContinue !== false,
        transitionReason: parsed.transitionReason || ''
      };
    } catch (jsonErr) {
      logger.warn('Failed to parse AI interviewer JSON, applying safe fallback:', jsonErr.message);
      return {
        content: 'Thank you for explaining your approach. Could you elaborate on the key tradeoffs and operational considerations?',
        messageType: 'FOLLOW_UP',
        isMainQuestion: false,
        isFollowUp: true,
        detectedTopic: 'Technical Follow-up',
        shouldContinue: true,
        transitionReason: 'Fallback response applied due to malformed output'
      };
    }
  }

  /**
   * Logs token usage into AIUsageLog table
   */
  static async _logUsage(userId, preparationSessionId, status, durationMs, usage = {}) {
    try {
      await db.aIUsageLog.create({
        data: {
          userId,
          preparationSessionId: preparationSessionId || null,
          operationType: 'MOCK_INTERVIEW',
          provider: 'OpenAI',
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          status: status === 'SUCCESS' ? 'SUCCESS' : status === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'FAILED',
          durationMs
        }
      });
    } catch (logErr) {
      logger.warn('Failed to record AIUsageLog for mock interview:', logErr.message);
    }
  }
}

