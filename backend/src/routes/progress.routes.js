import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getProgressOverview,
  getProgressHistory,
  getSkillProgress,
  getProgressActivity
} from '../controllers/progress.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/overview', getProgressOverview);
router.get('/history', getProgressHistory);
router.get('/skills', getSkillProgress);
router.get('/activity', getProgressActivity);

export default router;

