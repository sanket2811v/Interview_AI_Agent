import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import preparationRoutes from './preparation.routes.js';
import questionRoutes from './question.routes.js';
import challengeRoutes from './challenge.routes.js';
import practiceRoutes from './practice.routes.js';
import codingRoutes from './coding.routes.js';
import mockInterviewRoutes from './mockInterview.routes.js';
import evaluationRoutes from './evaluation.routes.js';
import performanceRoutes from './performance.routes.js';
import reportRoutes from './report.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import analyticsRoutes from './analytics.routes.js';
import skillGapRoutes from './skillGap.routes.js';
import improvementPlanRoutes from './improvementPlan.routes.js';
import learningTaskRoutes from './learningTask.routes.js';
import progressRoutes from './progress.routes.js';
import systemDesignRoutes from './systemDesign.routes.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { runStandaloneCode } from '../controllers/coding.controller.js';

const router = Router();

// Health routes
router.use('/health', healthRoutes);

// Authentication & Session routes
router.use('/auth', authRoutes);

// User & Profile routes
router.use('/users', userRoutes);

// Interview Preparation & Job Description routes
router.use('/preparations', preparationRoutes);

// Phase 7: Question Management & Coding Challenges
router.use('/questions', questionRoutes);
router.use('/coding-challenges', challengeRoutes);

// Phase 8: Interview Practice Engine
router.use('/practice', practiceRoutes);

// Phase 9: Online Coding Practice & Secure Code Execution Engine
router.use('/coding', codingRoutes);
router.post('/run', optionalAuth, runStandaloneCode); // Top-level alias for POST /api/run

// Phase 10: AI Mock Interview Engine
router.use('/mock-interviews', mockInterviewRoutes);

// Phase 11: AI Evaluation, Answer Analysis & Performance Reporting Engine
router.use('/evaluations', evaluationRoutes);
router.use('/performance', performanceRoutes);
router.use('/reports', reportRoutes);
router.use('/improvement-recommendations', recommendationRoutes);

// Phase 12: Analytics, Skill Gap Analysis & Improvement Plan Engine
router.use('/analytics', analyticsRoutes);
router.use('/skill-gaps', skillGapRoutes);
router.use('/improvement-plans', improvementPlanRoutes);
router.use('/learning-tasks', learningTaskRoutes);
router.use('/progress', progressRoutes);

// System Design Interactive Whiteboard & Architecture Engine
router.use('/system-design', systemDesignRoutes);

export default router;
