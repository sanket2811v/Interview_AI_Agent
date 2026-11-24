import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getCodingChallengeById } from '../controllers/question.controller.js';

const router = Router();

router.use(requireAuth);

// GET /api/coding-challenges/:challengeId
router.get('/:challengeId', getCodingChallengeById);

export default router;

