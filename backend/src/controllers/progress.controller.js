import { ProgressService } from '../services/analytics/progress.service.js';
import { AnalyticsService } from '../services/analytics/analytics.service.js';

export const getProgressOverview = async (req, res, next) => {
  try {
    const overview = await ProgressService.getProgressOverview(req.user.id);
    res.status(200).json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
};

export const getProgressHistory = async (req, res, next) => {
  try {
    const history = await ProgressService.getProgressHistory(req.user.id);
    res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

export const getSkillProgress = async (req, res, next) => {
  try {
    const progress = await ProgressService.getSkillProgress(req.user.id);
    res.status(200).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

export const getProgressActivity = async (req, res, next) => {
  try {
    const activity = await AnalyticsService.getActivity(req.user.id, req.query);
    res.status(200).json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
};

