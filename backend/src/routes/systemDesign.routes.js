import { Router } from 'express';
import {
  getProblems,
  getProblemById,
  getDiagram,
  saveDiagram,
  deleteDiagram
} from '../controllers/systemDesign.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public problem metadata
router.get('/problems', optionalAuth, getProblems);
router.get('/problems/:problemId', optionalAuth, getProblemById);

// Authenticated or guest diagram persistence
router.get('/diagrams/:problemId', optionalAuth, getDiagram);
router.post('/diagrams/:problemId', optionalAuth, saveDiagram);
router.delete('/diagrams/:problemId', optionalAuth, deleteDiagram);

export default router;
