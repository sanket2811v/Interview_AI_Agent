import { RecommendationService } from '../services/evaluation/recommendation.service.js';

export async function listRecommendations(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await RecommendationService.getUserRecommendations(userId, req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptRecommendation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await RecommendationService.acceptRecommendation(id, userId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function dismissRecommendation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await RecommendationService.dismissRecommendation(id, userId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

