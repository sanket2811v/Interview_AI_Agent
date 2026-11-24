import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getSkillGaps,
  getSkillById,
  triggerAnalyze
} from '../controllers/skillGap.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getSkillGaps);
router.get('/:skillId', getSkillById);
router.post('/analyze', triggerAnalyze);

export default router;

