import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getPlans,
  getPlanById,
  createPlan,
  generateAIPlan,
  updatePlan,
  updatePlanStatus,
  regeneratePlan,
  deletePlan
} from '../controllers/improvementPlan.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', getPlans);
router.post('/', createPlan);
router.post('/generate', generateAIPlan);
router.get('/:planId', getPlanById);
router.patch('/:planId', updatePlan);
router.patch('/:planId/status', updatePlanStatus);
router.post('/:planId/regenerate', regeneratePlan);
router.delete('/:planId', deletePlan);

export default router;

