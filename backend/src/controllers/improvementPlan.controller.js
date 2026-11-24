import { ImprovementPlanService } from '../services/analytics/improvementPlan.service.js';
import {
  createImprovementPlanSchema,
  updateImprovementPlanSchema,
  aiPlanGenerationSchema
} from '../validators/analytics.validator.js';

export const getPlans = async (req, res, next) => {
  try {
    const plans = await ImprovementPlanService.getPlans(req.user.id);
    res.status(200).json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await ImprovementPlanService.getPlanById(planId, req.user.id);
    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const validated = createImprovementPlanSchema.parse(req.body);
    const plan = await ImprovementPlanService.createPlan(req.user.id, validated);
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
};

export const generateAIPlan = async (req, res, next) => {
  try {
    const validated = aiPlanGenerationSchema.parse(req.body);
    const plan = await ImprovementPlanService.generateAIPlan(req.user.id, validated);
    res.status(201).json({
      success: true,
      data: plan,
      message: 'Personalized improvement plan successfully synthesized from actual evaluation data.'
    });
  } catch (err) {
    next(err);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const validated = updateImprovementPlanSchema.parse(req.body);
    const updated = await ImprovementPlanService.updatePlan(planId, req.user.id, validated);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const updatePlanStatus = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { status } = req.body;
    const updated = await ImprovementPlanService.updatePlanStatus(planId, req.user.id, status);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const regeneratePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await ImprovementPlanService.regeneratePlan(planId, req.user.id);
    res.status(200).json({ success: true, data: plan, message: 'Plan successfully updated with latest skill gap tasks.' });
  } catch (err) {
    next(err);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const result = await ImprovementPlanService.deletePlan(planId, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

