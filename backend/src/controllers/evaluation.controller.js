import { db } from '../config/prisma.js';
import { AnswerEvaluationService } from '../services/evaluation/answerEvaluation.service.js';
import { CodingEvaluationService } from '../services/evaluation/codingEvaluation.service.js';
import { MockInterviewEvaluationService } from '../services/evaluation/mockInterviewEvaluation.service.js';
import { queryEvaluationsSchema } from '../validators/evaluation.validator.js';

export async function evaluateAnswer(req, res, next) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    const forceRegenerate = req.query.force === 'true' || req.body?.force === true;

    const evaluation = await AnswerEvaluationService.evaluateAttempt(attemptId, userId, { forceRegenerate });
    return res.status(200).json({
      success: true,
      data: { evaluation }
    });
  } catch (err) {
    next(err);
  }
}

export async function getAnswerEvaluation(req, res, next) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;

    const evaluation = await AnswerEvaluationService.getAttemptEvaluation(attemptId, userId);
    return res.status(200).json({
      success: true,
      data: { evaluation }
    });
  } catch (err) {
    next(err);
  }
}

export async function evaluateCoding(req, res, next) {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    const forceRegenerate = req.query.force === 'true' || req.body?.force === true;

    const evaluation = await CodingEvaluationService.evaluateSubmission(submissionId, userId, { forceRegenerate });
    return res.status(200).json({
      success: true,
      data: { evaluation }
    });
  } catch (err) {
    next(err);
  }
}

export async function getCodingEvaluation(req, res, next) {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const evaluation = await CodingEvaluationService.getSubmissionEvaluation(submissionId, userId);
    return res.status(200).json({
      success: true,
      data: { evaluation }
    });
  } catch (err) {
    next(err);
  }
}

export async function evaluateInterview(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const forceRegenerate = req.query.force === 'true' || req.body?.force === true;

    const result = await MockInterviewEvaluationService.evaluateInterview(interviewId, userId, { forceRegenerate });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getInterviewEvaluation(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    const evaluation = await MockInterviewEvaluationService.getInterviewEvaluation(interviewId, userId);
    return res.status(200).json({
      success: true,
      data: { evaluation }
    });
  } catch (err) {
    next(err);
  }
}

export async function listEvaluations(req, res, next) {
  try {
    const userId = req.user.id;
    const parsed = queryEvaluationsSchema.safeParse(req.query);
    const { page = 1, limit = 10, sourceType } = parsed.success ? parsed.data : req.query;

    const where = { userId };
    if (sourceType) where.sourceType = sourceType;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [evaluations, total] = await Promise.all([
      db.interviewEvaluation.findMany({
        where,
        orderBy: { evaluatedAt: 'desc' },
        skip,
        take
      }),
      db.interviewEvaluation.count({ where })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        evaluations,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvaluationById(req, res, next) {
  try {
    const { evaluationId } = req.params;
    const userId = req.user.id;

    const evaluation = await db.interviewEvaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation not found' });
    }

    if (evaluation.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this evaluation' });
    }

    return res.status(200).json({
      success: true,
      data: { evaluation }
    });
  } catch (err) {
    next(err);
  }
}

export async function regenerateEvaluation(req, res, next) {
  try {
    const { evaluationId } = req.params;
    const userId = req.user.id;

    const evaluation = await db.interviewEvaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation not found' });
    }

    if (evaluation.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let updated;
    if (evaluation.sourceType === 'PRACTICE_ANSWER' && evaluation.questionAttemptId) {
      updated = await AnswerEvaluationService.evaluateAttempt(evaluation.questionAttemptId, userId, { forceRegenerate: true });
    } else if (evaluation.sourceType === 'CODING_SUBMISSION' && evaluation.codingSubmissionId) {
      updated = await CodingEvaluationService.evaluateSubmission(evaluation.codingSubmissionId, userId, { forceRegenerate: true });
    } else if (evaluation.mockInterviewId) {
      const resVal = await MockInterviewEvaluationService.evaluateInterview(evaluation.mockInterviewId, userId, { forceRegenerate: true });
      updated = resVal.evaluation;
    } else {
      updated = evaluation;
    }

    return res.status(200).json({
      success: true,
      data: { evaluation: updated }
    });
  } catch (err) {
    next(err);
  }
}

