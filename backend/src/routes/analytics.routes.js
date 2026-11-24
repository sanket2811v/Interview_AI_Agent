import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getOverview,
  getPerformance,
  getCategories,
  getSkills,
  getTrends,
  getActivity,
  getFilters
} from '../controllers/analytics.controller.js';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

router.get('/overview', getOverview);
router.get('/performance', getPerformance);
router.get('/categories', getCategories);
router.get('/skills', getSkills);
router.get('/trends', getTrends);
router.get('/activity', getActivity);
router.get('/filters', getFilters);

export default router;

