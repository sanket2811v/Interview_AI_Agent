import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getQuestionById,
  updateQuestion,
  deleteQuestion
} from "../controllers/question.controller.js";
import {
  getQuestionAttempts,
  submitAnswerAttempt,
  saveAnswerDraft,
  getReferenceAnswer,
  updateQuestionReview
} from "../controllers/practice.controller.js";

const router = Router();

// All question endpoints require authentication
router.use(requireAuth);

// Individual Question endpoints: /api/questions/:questionId
router.get("/:questionId", getQuestionById);
router.patch("/:questionId", updateQuestion);
router.put("/:questionId", updateQuestion);
router.delete("/:questionId", deleteQuestion);

// Phase 8: Practice Engine Question Endpoints
router.get("/:questionId/attempts", getQuestionAttempts);
router.post("/:questionId/attempts", submitAnswerAttempt);
router.put("/:questionId/draft", saveAnswerDraft);
router.patch("/:questionId/draft", saveAnswerDraft);
router.get("/:questionId/reference-answer", getReferenceAnswer);
router.patch("/:questionId/review", updateQuestionReview);
router.put("/:questionId/review", updateQuestionReview);

export default router;
