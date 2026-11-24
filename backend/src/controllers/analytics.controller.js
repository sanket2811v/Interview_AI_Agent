import { AnalyticsService } from '../services/analytics/analytics.service.js';
import { SkillGapService } from '../services/analytics/skillGap.service.js';
import { analyticsFilterSchema } from '../validators/analytics.validator.js';

export const getOverview = async (req, res, next) => {
  try {
    const validated = analyticsFilterSchema.parse(req.query);
    const overview = await AnalyticsService.getOverview(req.user.id, validated);
    res.status(200).json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
};

export const getPerformance = async (req, res, next) => {
  try {
    const validated = analyticsFilterSchema.parse(req.query);
    const metrics = await AnalyticsService.getPerformanceMetrics(req.user.id, validated);
    res.status(200).json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const validated = analyticsFilterSchema.parse(req.query);
    const categories = await AnalyticsService.getCategoryAnalytics(req.user.id, validated);
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const getSkills = async (req, res, next) => {
  try {
    const validated = analyticsFilterSchema.parse(req.query);
    const skills = await SkillGapService.getSkillGaps(req.user.id, validated);
    res.status(200).json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
};

export const getTrends = async (req, res, next) => {
  try {
    const validated = analyticsFilterSchema.parse(req.query);
    const trends = await AnalyticsService.getHistoricalTrends(req.user.id, validated);
    res.status(200).json({ success: true, data: trends });
  } catch (err) {
    next(err);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const validated = analyticsFilterSchema.parse(req.query);
    const activity = await AnalyticsService.getActivity(req.user.id, validated);
    res.status(200).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

export const getFilters = async (req, res, next) => {
  try {
    const filters = await AnalyticsService.getFilters(req.user.id);
    res.status(200).json({ success: true, data: filters });
  } catch (err) {
    next(err);
  }
};

