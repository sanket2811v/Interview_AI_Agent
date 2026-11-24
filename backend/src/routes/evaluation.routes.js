import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  evaluateAnswer,
  getAnswerEvaluation,
  evaluateCoding,
  getCodingEvaluation,
  evaluateInterview,
  getInterviewEvaluation,
  listEvaluations,
  getEvaluationById,
  regenerateEvaluation
} from '../controllers/evaluation.controller.js';

const router = Router();

router.use(requireAuth);

// Answer evaluations (Phase 8)
router.post('/answers/:attemptId', evaluateAnswer);
router.get('/answers/:attemptId', getAnswerEvaluation);

// Coding evaluations (Phase 9)
router.post('/coding/:submissionId', evaluateCoding);
router.get('/coding/:submissionId', getCodingEvaluation);

// Mock Interview evaluations (Phase 10)
router.post('/interviews/:interviewId', evaluateInterview);
router.get('/interviews/:interviewId', getInterviewEvaluation);

// General evaluations
router.get('/', listEvaluations);
router.get('/:evaluationId', getEvaluationById);
router.post('/:evaluationId/regenerate', regenerateEvaluation);

export default router;

