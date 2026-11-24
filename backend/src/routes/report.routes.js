import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  generateReport,
  listReports,
  getReportById,
  downloadReport
} from '../controllers/report.controller.js';

const router = Router();

router.use(requireAuth);

router.post('/generate', generateReport);
router.get('/', listReports);
router.get('/:reportId', getReportById);
router.get('/:reportId/download', downloadReport);

export default router;

