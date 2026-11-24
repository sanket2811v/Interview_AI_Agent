import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getOverview,
  getCategories,
  getTrends,
  getStrengthsAndWeaknesses
} from '../controllers/performance.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/categories', getCategories);
router.get('/trends', getTrends);
router.get('/strengths', getStrengthsAndWeaknesses);
router.get('/weaknesses', getStrengthsAndWeaknesses);

export default router;

