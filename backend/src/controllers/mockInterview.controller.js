import { MockInterviewService } from '../services/mockInterview/mockInterview.service.js';
import {
  createMockInterviewSchema,
  submitAnswerSchema,
  actionSchema,
  queryInterviewsSchema
} from '../validators/mockInterview.validator.js';

export async function createInterview(req, res, next) {
  try {
    const userId = req.user.id;
    const parsed = createMockInterviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const result = await MockInterviewService.createInterview(userId, parsed.data);
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function submitAnswer(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const parsed = submitAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const result = await MockInterviewService.submitAnswer(interviewId, userId, parsed.data);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function handleAction(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const result = await MockInterviewService.performAction(interviewId, userId, parsed.data.actionType);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function pauseInterview(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const interview = await MockInterviewService.pauseInterview(interviewId, userId);
    return res.status(200).json({
      success: true,
      data: { interview }
    });
  } catch (err) {
    next(err);
  }
}

export async function resumeInterview(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const interview = await MockInterviewService.resumeInterview(interviewId, userId);
    return res.status(200).json({
      success: true,
      data: { interview }
    });
  } catch (err) {
    next(err);
  }
}

export async function endInterview(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const result = await MockInterviewService.endInterview(interviewId, userId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getInterviewById(req, res, next) {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;
    const interview = await MockInterviewService.getInterviewById(interviewId, userId);
    return res.status(200).json({
      success: true,
      data: { interview }
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserInterviews(req, res, next) {
  try {
    const userId = req.user.id;
    const query = queryInterviewsSchema.parse(req.query);
    const result = await MockInterviewService.getUserInterviews(userId, query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getInterviewStats(req, res, next) {
  try {
    const userId = req.user.id;
    const stats = await MockInterviewService.getInterviewStats(userId);
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
}

