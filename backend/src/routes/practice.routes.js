import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getPracticeSessionById,
  resumePracticeSession,
  completePracticeSession,
  saveAnswerDraft,
  submitAnswerAttempt,
  revealHint,
  getPracticeHistory,
  getPracticeStats
} from '../controllers/practice.controller.js';

const router = Router();

// All practice endpoints require authentication
router.use(requireAuth);

// 1. Practice History & Statistics
router.get('/history', getPracticeHistory);
router.get('/stats', getPracticeStats);

// 2. Active Session Management
router.get('/sessions/:sessionId', getPracticeSessionById);
router.post('/sessions/:sessionId/resume', resumePracticeSession);
router.post('/sessions/:sessionId/complete', completePracticeSession);

// 3. Question Interactions within Session
router.put('/sessions/:sessionId/questions/:questionId/draft', saveAnswerDraft);
router.patch('/sessions/:sessionId/questions/:questionId/draft', saveAnswerDraft);
router.post('/sessions/:sessionId/questions/:questionId/attempts', submitAnswerAttempt);
router.post('/sessions/:sessionId/questions/:questionId/hints/reveal', revealHint);

export default router;

