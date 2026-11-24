import { db } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { InterviewerService } from './interviewer.service.js';

export class MockInterviewService {
  /**
   * Starts a new Mock Interview session and generates the first AI turn
   */
  static async createInterview(userId, payload) {
    const {
      preparationSessionId,
      interviewType = 'TECHNICAL',
      difficulty = 'MEDIUM',
      experienceLevel = 'MID',
      durationMinutes = 30,
      questionLimit = 5,
      interviewerPersonality = 'Professional',
      language = 'English',
      preferences = {}
    } = payload;

    // 1. Verify preparation ownership
    const preparation = await db.preparationSession.findUnique({
      where: { id: preparationSessionId },
      include: {
        jobDescription: true,
        jobAnalysis: true
      }
    });

    if (!preparation) {
      const err = new Error('Preparation session not found');
      err.status = 404;
      throw err;
    }

    if (preparation.userId !== userId) {
      const err = new Error('Access denied: You do not own this preparation session');
      err.status = 403;
      throw err;
    }

    const title = `${interviewType.replace('_', ' ')} Mock Interview - ${preparation.companyName || preparation.jobTitle}`;

    // 2. Create the MockInterview record in IN_PROGRESS state
    const interview = await db.mockInterview.create({
      data: {
        userId,
        preparationSessionId,
        title,
        interviewType,
        difficulty,
        experienceLevel,
        durationMinutes,
        questionLimit,
        interviewerPersonality,
        language,
        preferences,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        currentQuestionIndex: 1,
        totalQuestions: questionLimit
      }
    });

    // 3. Generate initial interviewer greeting and first question
    let initialAIResponse;
    try {
      initialAIResponse = await InterviewerService.generateInterviewerTurn({
        interview,
        preparation,
        conversationHistory: [],
        candidateInput: null,
        actionType: 'START'
      });
    } catch (aiErr) {
      logger.error('Failed to generate initial AI interview turn:', aiErr.message);
      // Fallback greeting if AI service has transient issue
      initialAIResponse = {
        content: `Hello! I am your AI Technical Interviewer for the ${preparation.jobTitle} position at ${preparation.companyName || 'our company'}. Let's begin our interview. To start off, could you briefly introduce yourself and share a challenging technical project you recently worked on?`,
        messageType: 'INTRODUCTION',
        isMainQuestion: true,
        isFollowUp: false,
        detectedTopic: 'Introduction',
        shouldContinue: true
      };
    }

    // 4. Save the initial interviewer message
    const initialMessage = await db.interviewMessage.create({
      data: {
        mockInterviewId: interview.id,
        role: 'ASSISTANT',
        content: initialAIResponse.content,
        messageType: initialAIResponse.messageType === 'INTRODUCTION' ? 'INTRODUCTION' : 'MAIN_QUESTION',
        sequenceNumber: 1,
        metadata: {
          topic: initialAIResponse.detectedTopic,
          isMainQuestion: initialAIResponse.isMainQuestion
        }
      }
    });

    return {
      ...interview,
      interview,
      initialMessage,
      firstMessage: initialMessage
    };
  }

  /**
   * Submits a candidate answer and triggers the next AI interviewer response
   */
  static async submitAnswer(interviewId, userId, { content }) {
    // 1. Fetch interview and verify ownership & state
    const interview = await db.mockInterview.findUnique({
      where: { id: interviewId },
      include: {
        preparationSession: {
          include: { jobDescription: true, jobAnalysis: true }
        },
        messages: {
          orderBy: { sequenceNumber: 'asc' }
        }
      }
    });

    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied: You do not own this mock interview');
      err.status = 403;
      throw err;
    }

    if (interview.status === 'COMPLETED') {
      const err = new Error('This interview is completed and can no longer receive answers');
      err.status = 400;
      throw err;
    }

    if (interview.status === 'PAUSED') {
      const err = new Error('This interview is paused. Please resume the session before submitting answers');
      err.status = 400;
      throw err;
    }

    const currentSeq = interview.messages.length;

    // 2. Persist candidate answer
    const candidateMessage = await db.interviewMessage.create({
      data: {
        mockInterviewId: interview.id,
        role: 'USER',
        content: content.trim(),
        messageType: 'ANSWER',
        sequenceNumber: currentSeq + 1,
        metadata: {
          submittedAt: new Date().toISOString()
        }
      }
    });

    const updatedHistory = [...interview.messages, candidateMessage];

    // 3. Generate interviewer response
    let nextAITurn;
    try {
      nextAITurn = await InterviewerService.generateInterviewerTurn({
        interview,
        preparation: interview.preparationSession,
        conversationHistory: updatedHistory,
        candidateInput: content.trim(),
        actionType: 'ANSWER'
      });
    } catch (aiErr) {
      logger.error('Failed to generate AI interviewer turn on answer:', aiErr.message);
      nextAITurn = {
        content: 'Thank you for providing that explanation. Could you walk me through the key architectural considerations and tradeoffs involved in that approach?',
        messageType: 'FOLLOW_UP',
        isMainQuestion: false,
        isFollowUp: true,
        detectedTopic: 'Technical Follow-up',
        shouldContinue: true
      };
    }

    // 4. Save interviewer response
    const interviewerMessage = await db.interviewMessage.create({
      data: {
        mockInterviewId: interview.id,
        role: 'ASSISTANT',
        content: nextAITurn.content,
        messageType: nextAITurn.messageType || 'MAIN_QUESTION',
        sequenceNumber: currentSeq + 2,
        metadata: {
          topic: nextAITurn.detectedTopic,
          isMainQuestion: nextAITurn.isMainQuestion,
          isFollowUp: nextAITurn.isFollowUp,
          transitionReason: nextAITurn.transitionReason
        }
      }
    });

    // 5. Update interview progress
    let newQuestionIndex = interview.currentQuestionIndex;
    if (nextAITurn.isMainQuestion) {
      newQuestionIndex += 1;
    }

    const isEnding =
      nextAITurn.messageType === 'CLOSING' ||
      !nextAITurn.shouldContinue ||
      newQuestionIndex >= interview.questionLimit;

    const updatedInterview = await db.mockInterview.update({
      where: { id: interview.id },
      data: {
        currentQuestionIndex: newQuestionIndex,
        lastActivityAt: new Date(),
        status: isEnding ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isEnding ? new Date() : null,
        duration: isEnding
          ? Math.round((Date.now() - new Date(interview.startedAt).getTime()) / 1000)
          : interview.duration
      }
    });

    return {
      candidateMessage,
      userMessage: candidateMessage,
      interviewerMessage,
      assistantMessage: interviewerMessage,
      interview: updatedInterview
    };
  }

  /**
   * Performs an interview control action: CLARIFY, HINT, or SKIP
   */
  static async performAction(interviewId, userId, actionPayload) {
    const actionType = typeof actionPayload === 'object' && actionPayload !== null
      ? actionPayload.actionType
      : actionPayload;

    const interview = await db.mockInterview.findUnique({
      where: { id: interviewId },
      include: {
        preparationSession: {
          include: { jobDescription: true, jobAnalysis: true }
        },
        messages: {
          orderBy: { sequenceNumber: 'asc' }
        }
      }
    });

    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied: You do not own this mock interview');
      err.status = 403;
      throw err;
    }

    if (interview.status !== 'IN_PROGRESS') {
      const err = new Error(`Cannot perform ${actionType} on an interview with status ${interview.status}`);
      err.status = 400;
      throw err;
    }

    const currentSeq = interview.messages.length;

    // Record candidate action message
    const actionMessage = await db.interviewMessage.create({
      data: {
        mockInterviewId: interview.id,
        role: 'USER',
        content:
          actionType === 'CLARIFY'
            ? 'Could you please clarify or rephrase the question?'
            : actionType === 'HINT'
            ? 'Could I get a hint or clue for this question?'
            : 'I would like to skip this question and move to the next one.',
        messageType: actionType === 'CLARIFY' ? 'CLARIFICATION' : actionType === 'HINT' ? 'HINT' : 'SYSTEM_EVENT',
        sequenceNumber: currentSeq + 1,
        metadata: { actionType }
      }
    });

    const updatedHistory = [...interview.messages, actionMessage];

    // Generate AI response to action
    let nextAITurn;
    try {
      nextAITurn = await InterviewerService.generateInterviewerTurn({
        interview,
        preparation: interview.preparationSession,
        conversationHistory: updatedHistory,
        candidateInput: null,
        actionType
      });
    } catch (aiErr) {
      nextAITurn = {
        content:
          actionType === 'CLARIFY'
            ? 'Certainly. Let me explain the key requirements in simpler terms: focus on the core algorithms and data flow.'
            : actionType === 'HINT'
            ? 'Consider using a hash map or two-pointer technique to reduce your runtime complexity.'
            : 'No problem at all! Let us move on to our next topic.',
        messageType: actionType === 'HINT' ? 'HINT' : 'MAIN_QUESTION',
        isMainQuestion: actionType === 'SKIP',
        isFollowUp: false,
        detectedTopic: 'Control Action',
        shouldContinue: true
      };
    }

    const interviewerMessage = await db.interviewMessage.create({
      data: {
        mockInterviewId: interview.id,
        role: 'ASSISTANT',
        content: nextAITurn.content,
        messageType: nextAITurn.messageType || 'MAIN_QUESTION',
        sequenceNumber: currentSeq + 2,
        metadata: {
          actionType,
          topic: nextAITurn.detectedTopic
        }
      }
    });

    let newQuestionIndex = interview.currentQuestionIndex;
    if (actionType === 'SKIP' || nextAITurn.isMainQuestion) {
      newQuestionIndex += 1;
    }

    const updatedInterview = await db.mockInterview.update({
      where: { id: interview.id },
      data: {
        currentQuestionIndex: newQuestionIndex,
        lastActivityAt: new Date()
      }
    });

    return {
      actionMessage,
      interviewerMessage,
      assistantMessage: interviewerMessage,
      interview: updatedInterview
    };
  }

  /**
   * Pauses an active interview
   */
  static async pauseInterview(interviewId, userId) {
    const interview = await db.mockInterview.findUnique({ where: { id: interviewId } });
    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    if (interview.status !== 'IN_PROGRESS') {
      const err = new Error(`Only in-progress interviews can be paused (current status: ${interview.status})`);
      err.status = 400;
      throw err;
    }

    return await db.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * Resumes a paused interview
   */
  static async resumeInterview(interviewId, userId) {
    const interview = await db.mockInterview.findUnique({ where: { id: interviewId } });
    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    if (interview.status !== 'PAUSED') {
      const err = new Error(`Only paused interviews can be resumed (current status: ${interview.status})`);
      err.status = 400;
      throw err;
    }

    return await db.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: 'IN_PROGRESS',
        resumedAt: new Date(),
        lastActivityAt: new Date()
      }
    });
  }

  /**
   * Concludes an interview and locks conversation
   */
  static async endInterview(interviewId, userId) {
    const interview = await db.mockInterview.findUnique({
      where: { id: interviewId },
      include: { messages: true }
    });

    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    if (interview.status === 'COMPLETED') {
      return interview;
    }

    const durationSeconds = interview.startedAt
      ? Math.round((Date.now() - new Date(interview.startedAt).getTime()) / 1000)
      : 0;

    // Persist professional closing message
    const closingMessage = await db.interviewMessage.create({
      data: {
        mockInterviewId: interview.id,
        role: 'ASSISTANT',
        content: `Thank you for completing this ${(interview.interviewType || 'TECHNICAL').replace('_', ' ')} mock interview round! You have concluded the conversation. You can now review your complete transcript.`,
        messageType: 'CLOSING',
        sequenceNumber: interview.messages.length + 1,
        metadata: { isClosing: true }
      }
    });

    const updated = await db.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastActivityAt: new Date(),
        duration: durationSeconds,
        durationMinutes: Math.round(durationSeconds / 60)
      }
    });

    return {
      ...updated,
      interview: updated,
      closingMessage
    };
  }

  /**
   * Retrieves single interview with full message history
   */
  static async getInterviewById(interviewId, userId) {
    const interview = await db.mockInterview.findUnique({
      where: { id: interviewId },
      include: {
        preparationSession: {
          select: {
            id: true,
            title: true,
            companyName: true,
            jobTitle: true,
            experienceLevel: true
          }
        },
        messages: {
          orderBy: { sequenceNumber: 'asc' }
        }
      }
    });

    if (!interview) {
      const err = new Error('Mock interview not found');
      err.status = 404;
      throw err;
    }

    if (interview.userId !== userId) {
      const err = new Error('Access denied: You do not own this mock interview');
      err.status = 403;
      throw err;
    }

    return interview;
  }

  /**
   * Retrieves paginated user mock interviews
   */
  static async getUserInterviews(userId, { page = 1, limit = 10, status, interviewType } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.min(Math.max(1, limit), 50);
    const take = Math.min(Math.max(1, limit), 50);

    const where = { userId };
    if (status) where.status = status;
    if (interviewType) where.interviewType = interviewType;

    const [interviews, total] = await Promise.all([
      db.mockInterview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          preparationSession: {
            select: { id: true, title: true, companyName: true, jobTitle: true }
          },
          _count: {
            select: { messages: true }
          }
        }
      }),
      db.mockInterview.count({ where })
    ]);

    return {
      interviews,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  /**
   * Computes accurate mock interview statistics for authenticated user
   */
  static async getInterviewStats(userId) {
    const all = await db.mockInterview.findMany({
      where: { userId },
      select: {
        interviewType: true,
        duration: true,
        durationMinutes: true,
        status: true
      }
    });

    const modeCounts = {};
    let totalMinutes = 0;
    let completed = 0;
    let inProgress = 0;
    let paused = 0;

    for (const item of all) {
      modeCounts[item.interviewType] = (modeCounts[item.interviewType] || 0) + 1;
      if (item.durationMinutes) {
        totalMinutes += item.durationMinutes;
      } else if (item.duration) {
        totalMinutes += Math.round(item.duration / 60);
      }
      if (item.status === 'COMPLETED') completed++;
      if (item.status === 'IN_PROGRESS') inProgress++;
      if (item.status === 'PAUSED') paused++;
    }

    return {
      totalInterviews: all.length,
      completedInterviews: completed,
      inProgressInterviews: inProgress,
      pausedInterviews: paused,
      totalPracticeMinutes: totalMinutes,
      totalMinutesPracticed: totalMinutes,
      modeBreakdown: modeCounts,
      byType: modeCounts
    };
  }
}
