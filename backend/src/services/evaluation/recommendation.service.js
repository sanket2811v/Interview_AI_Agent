import { db } from '../../config/prisma.js';

export class RecommendationService {
  /**
   * Retrieves user's personalized recommendations
   */
  static async getUserRecommendations(userId, query = {}) {
    const { status, limit = 20 } = query;
    const where = { userId };
    if (status) where.status = status;

    const recommendations = await db.improvementRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    return { recommendations };
  }

  /**
   * Accepts a recommendation and converts it into a LearningTask in user's ImprovementPlan
   */
  static async acceptRecommendation(recommendationId, userId) {
    const rec = await db.improvementRecommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!rec) {
      const err = new Error('Recommendation not found');
      err.status = 404;
      throw err;
    }

    if (rec.userId !== userId) {
      const err = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    // 1. Update recommendation status to ACCEPTED
    const updatedRec = await db.improvementRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'ACCEPTED' }
    });

    // 2. Find or create an active ImprovementPlan for this user
    let plan = await db.improvementPlan.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

    if (!plan) {
      plan = await db.improvementPlan.create({
        data: {
          userId,
          title: 'Targeted Skill Improvement Plan',
          description: 'Personalized action roadmap generated from evaluation recommendations.',
          status: 'ACTIVE'
        }
      });
    }

    // 3. Create a LearningTask in this plan
    const task = await db.learningTask.create({
      data: {
        improvementPlanId: plan.id,
        userId: plan.userId,
        skillName: rec.skill || null,
        title: rec.recommendedAction.slice(0, 150),
        description: `${rec.weakness}\n\nSuggested Practice: ${rec.practiceActivity || rec.whyItMatters || ''}`,
        category: rec.skill || 'General',
        priority: rec.priority || 'MEDIUM',
        estimatedMinutes: rec.estimatedMinutes || 30,
        status: 'PENDING'
      }
    });

    return {
      recommendation: updatedRec,
      createdTask: task,
      planId: plan.id
    };
  }

  /**
   * Dismisses a recommendation
   */
  static async dismissRecommendation(recommendationId, userId) {
    const rec = await db.improvementRecommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!rec) {
      const err = new Error('Recommendation not found');
      err.status = 404;
      throw err;
    }

    if (rec.userId !== userId) {
      const err = new Error('Access denied');
      err.status = 403;
      throw err;
    }

    const updated = await db.improvementRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'DISMISSED' }
    });

    return { recommendation: updated };
  }
}

