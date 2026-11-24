import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { handleMultipartUpload } from '../middleware/upload.middleware.js';
import {
  createPreparation,
  uploadAndExtractDocument,
  getPreparations,
  getPreparationById,
  updatePreparation,
  archivePreparation,
  restorePreparation,
  deletePreparation,
  getPreparationStats,
  getJobDescription,
  updateJobDescription
} from '../controllers/preparation.controller.js';
import {
  startAnalysis,
  getAnalysis,
  regenerateAnalysis,
  getAnalysisStatus
} from '../controllers/analysis.controller.js';
import {
  generateQuestions,
  getQuestions,
  regenerateCategory,
  getCodingChallenges,
  getCodingChallengeById
} from '../controllers/question.controller.js';
import {
  startPracticeSession,
  getPracticeSessions,
  getPracticeAvailability
} from '../controllers/practice.controller.js';

const router = Router();

// All preparation endpoints require authentication
router.use(requireAuth);

// 1. Preparation Statistics (placed before :id route)
router.get('/stats', getPreparationStats);

// 2. Document upload and extraction
router.post('/upload-doc', handleMultipartUpload, uploadAndExtractDocument);

// 3. Collection endpoints
router.post('/', handleMultipartUpload, createPreparation);
router.get('/', getPreparations);

// 4. Phase 6: AI-Powered Job Description Analysis endpoints
router.post('/:id/analyze', startAnalysis);
router.get('/:id/analysis/status', getAnalysisStatus);
router.get('/:id/analysis', getAnalysis);
router.post('/:id/analysis/regenerate', regenerateAnalysis);

// 5. Phase 7: AI-Powered Question Generation & Management
router.post('/:id/questions/generate', generateQuestions);
router.get('/:id/questions', getQuestions);
router.post('/:id/questions/regenerate', regenerateCategory);
router.get('/:id/coding-challenges', getCodingChallenges);
router.get('/:id/coding-challenges/:challengeId', getCodingChallengeById);

// 6. Phase 8: Interactive Practice Session Management
router.post('/:id/practice/sessions', startPracticeSession);
router.get('/:id/practice/sessions', getPracticeSessions);
router.get('/:id/practice/availability', getPracticeAvailability);

// 5. Individual preparation resource endpoints
router.get('/:id', getPreparationById);
router.patch('/:id', updatePreparation);
router.delete('/:id', archivePreparation); // Soft delete / archive by default

// 6. Restore archived preparation
router.patch('/:id/restore', restorePreparation);

// 7. Hard delete (optional admin/force delete)
router.delete('/:id/permanent', deletePreparation);

// 8. Sub-resource: Job Description
router.get('/:id/description', getJobDescription);
router.patch('/:id/description', updateJobDescription);

export default router;

