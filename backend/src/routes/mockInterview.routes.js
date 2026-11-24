import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createInterview,
  submitAnswer,
  handleAction,
  pauseInterview,
  resumeInterview,
  endInterview,
  getInterviewById,
  getUserInterviews,
  getInterviewStats
} from '../controllers/mockInterview.controller.js';

const router = Router();

// All Mock Interview routes require authenticated user
router.use(requireAuth);

// Collection routes
router.post('/', createInterview);
router.get('/', getUserInterviews);
router.get('/history', getUserInterviews);
router.get('/stats', getInterviewStats);

// Item routes
router.get('/:interviewId', getInterviewById);
router.get('/:interviewId/messages', getInterviewById);
router.post('/:interviewId/messages', submitAnswer);
router.post('/:interviewId/pause', pauseInterview);
router.post('/:interviewId/resume', resumeInterview);
router.post('/:interviewId/end', endInterview);

// Dedicated action endpoints
router.post('/:interviewId/action', handleAction);
router.post('/:interviewId/clarify', (req, res, next) => {
  req.body.actionType = 'CLARIFY';
  return handleAction(req, res, next);
});
router.post('/:interviewId/hint', (req, res, next) => {
  req.body.actionType = 'HINT';
  return handleAction(req, res, next);
});
router.post('/:interviewId/skip', (req, res, next) => {
  req.body.actionType = 'SKIP';
  return handleAction(req, res, next);
});

export default router;

