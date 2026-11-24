import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import {
  getSupportedLanguages,
  getStandaloneStarterCode,
  runStandaloneCode,
  getChallengeDetails,
  getStarterCode,
  runCode,
  submitSolution,
  getSubmissionDetails,
  getChallengeSubmissions,
  getUserCodingHistory,
  getCodingStats
} from '../controllers/coding.controller.js';

const router = Router();

// Supported languages configuration (public / optional auth)
router.get('/languages', optionalAuth, getSupportedLanguages);

// Standalone code execution & templates (Mode A: No challenge or active login required)
router.get('/starter-code', optionalAuth, getStandaloneStarterCode);
router.post('/run', optionalAuth, runStandaloneCode);

// Global user coding analytics & history (requires login)
router.get('/stats', requireAuth, getCodingStats);
router.get('/submissions/history', requireAuth, getUserCodingHistory);
router.get('/submissions/:submissionId', requireAuth, getSubmissionDetails);

// Challenge-specific endpoints (Mode B: Challenge-based execution - requires login)
router.get('/challenges/:challengeId', requireAuth, getChallengeDetails);
router.get('/challenges/:challengeId/starter-code', requireAuth, getStarterCode);
router.post('/challenges/:challengeId/run', requireAuth, runCode);
router.post('/challenges/:challengeId/submit', requireAuth, submitSolution);
router.get('/challenges/:challengeId/submissions', requireAuth, getChallengeSubmissions);

export default router;
