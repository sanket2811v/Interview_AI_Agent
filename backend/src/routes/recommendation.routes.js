import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  listRecommendations,
  acceptRecommendation,
  dismissRecommendation
} from '../controllers/recommendation.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', listRecommendations);
router.post('/:id/accept', acceptRecommendation);
router.post('/:id/dismiss', dismissRecommendation);

export default router;

