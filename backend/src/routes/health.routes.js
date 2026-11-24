import { Router } from 'express';
import { getHealth, getDatabaseHealth } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health - Server health status
router.get('/', getHealth);

// GET /api/health/database & /api/health/db - Database connectivity check
router.get('/database', getDatabaseHealth);
router.get('/db', getDatabaseHealth);

export default router;

