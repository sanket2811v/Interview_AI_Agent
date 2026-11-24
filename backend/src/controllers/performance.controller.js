import { PerformanceAnalyticsService } from '../services/evaluation/performanceAnalytics.service.js';

export async function getOverview(req, res, next) {
  try {
    const userId = req.user.id;
    const overview = await PerformanceAnalyticsService.getOverview(userId);
    return res.status(200).json({
      success: true,
      data: overview
    });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req, res, next) {
  try {
    const userId = req.user.id;
    const categories = await PerformanceAnalyticsService.getCategoryBreakdown(userId);
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
}

export async function getTrends(req, res, next) {
  try {
    const userId = req.user.id;
    const trends = await PerformanceAnalyticsService.getTrends(userId);
    return res.status(200).json({
      success: true,
      data: trends
    });
  } catch (err) {
    next(err);
  }
}

export async function getStrengthsAndWeaknesses(req, res, next) {
  try {
    const userId = req.user.id;
    const data = await PerformanceAnalyticsService.getStrengthsAndWeaknesses(userId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
}

