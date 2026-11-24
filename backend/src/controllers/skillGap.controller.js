import { SkillGapService } from '../services/analytics/skillGap.service.js';

export const getSkillGaps = async (req, res, next) => {
  try {
    const { preparationSessionId } = req.query;
    const gaps = await SkillGapService.getSkillGaps(req.user.id, { preparationSessionId });
    res.status(200).json({ success: true, data: gaps });
  } catch (err) {
    next(err);
  }
};

export const getSkillById = async (req, res, next) => {
  try {
    const { skillId } = req.params;
    const { preparationSessionId } = req.query;
    const skill = await SkillGapService.getSkillById(req.user.id, skillId, { preparationSessionId });
    res.status(200).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

export const triggerAnalyze = async (req, res, next) => {
  try {
    const { preparationSessionId } = req.body;
    const gaps = await SkillGapService.getSkillGaps(req.user.id, { preparationSessionId });
    res.status(200).json({ success: true, data: gaps, message: 'Skill gaps successfully evaluated against recent records.' });
  } catch (err) {
    next(err);
  }
};

