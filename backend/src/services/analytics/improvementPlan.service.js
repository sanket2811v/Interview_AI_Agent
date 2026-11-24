import { db } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { SkillGapService } from './skillGap.service.js';

export class ImprovementPlanService {
  static _mockHandler = null;

  static __setMockHandler(fn) {
    this._mockHandler = fn;
  }

  /**
   * List all improvement plans for the authenticated user
   */
  static async getPlans(userId) {
    const plans = await db.improvementPlan.findMany({
      where: { userId },
      include: {
        preparationSession: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return plans.map((plan) => {
      const total = plan.tasks.length;
      const completed = plan.tasks.filter((t) => t.status === 'COMPLETED').length;
      const calculatedPct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        status: plan.status,
        priority: plan.priority,
        startDate: plan.startDate,
        targetDate: plan.targetDate,
        completionPercentage: calculatedPct,
        totalTasks: total,
        completedTasks: completed,
        preparation: plan.preparationSession,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      };
    });
  }

  /**
   * Get single improvement plan with all tasks
   */
  static async getPlanById(planId, userId) {
    const plan = await db.improvementPlan.findUnique({
      where: { id: planId },
      include: {
        preparationSession: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true
          }
        },
        tasks: {
          orderBy: [
            { status: 'asc' },
            { priority: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!plan) {
      const err = new Error('Improvement plan not found');
      err.status = 404;
      throw err;
    }

    if (plan.userId !== userId) {
      const err = new Error('Access denied: You do not own this improvement plan');
      err.status = 403;
      throw err;
    }

    const total = plan.tasks.length;
    const completed = plan.tasks.filter((t) => t.status === 'COMPLETED').length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...plan,
      completionPercentage
    };
  }

  /**
   * Create custom improvement plan
   */
  static async createPlan(userId, planData) {
    const {
      title,
      description,
      preparationSessionId,
      priority = 'MEDIUM',
      targetDate,
      targetSkills = [],
      identifiedWeaknesses = []
    } = planData;

    if (preparationSessionId) {
      const prep = await db.preparationSession.findUnique({
        where: { id: preparationSessionId }
      });
      if (!prep || prep.userId !== userId) {
        const err = new Error('Target preparation session not found or does not belong to user');
        err.status = 404;
        throw err;
      }
    }

    const plan = await db.improvementPlan.create({
      data: {
        userId,
        preparationSessionId: preparationSessionId || null,
        title,
        description: description || '',
        priority,
        targetDate: targetDate ? new Date(targetDate) : null,
        targetSkills: targetSkills || [],
        identifiedWeaknesses: identifiedWeaknesses || [],
        status: 'ACTIVE',
        completionPercentage: 0
      }
    });

    return plan;
  }

  /**
   * AI-Assisted Improvement Plan Generation based on actual evaluation history and skill gaps
   */
  static async generateAIPlan(userId, generationData = {}) {
    const { preparationSessionId, focusAreas = [], durationWeeks = 4, customGoal } = generationData;

    // 1. Gather skill gap data & evaluations
    const skillGapReport = await SkillGapService.getSkillGaps(userId, { preparationSessionId });
    const weakSkills = skillGapReport.skills.filter((s) => s.status === 'NEEDS_IMPROVEMENT' || s.status === 'DEVELOPING');
    const notAssessed = skillGapReport.skills.filter((s) => s.status === 'NOT_ASSESSED');

    const topSkillsToTarget = [
      ...weakSkills.map((s) => s.skillName),
      ...focusAreas,
      ...notAssessed.slice(0, 2).map((s) => s.skillName)
    ].slice(0, 5);

    // 2. Fetch recent evaluations for actual weakness citations
    const recentEvaluations = await db.interviewEvaluation.findMany({
      where: { userId },
      take: 5,
      orderBy: { evaluatedAt: 'desc' },
      select: {
        overallScore: true,
        weaknesses: true,
        missingConcepts: true
      }
    });

    const gatheredWeaknesses = [];
    recentEvaluations.forEach((ev) => {
      if (Array.isArray(ev.weaknesses)) gatheredWeaknesses.push(...ev.weaknesses);
      if (Array.isArray(ev.missingConcepts)) gatheredWeaknesses.push(...ev.missingConcepts);
    });

    const deduplicatedWeaknesses = Array.from(new Set(gatheredWeaknesses)).slice(0, 4);

    let planTitle = `Targeted ${skillGapReport.preparationTitle || 'Interview'} Mastery Plan`;
    if (customGoal) {
      planTitle = customGoal;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + durationWeeks * 7);

    // 3. Generate structured task items (using mock or deterministic AI generator)
    let generatedTasks = [];

    if (this._mockHandler) {
      const mockResult = await this._mockHandler({
        userId,
        topSkillsToTarget,
        deduplicatedWeaknesses,
        durationWeeks
      });
      generatedTasks = mockResult.tasks || [];
    } else {
      // Deterministic generation grounded in real identified gaps
      if (topSkillsToTarget.length > 0) {
        topSkillsToTarget.forEach((skill, idx) => {
          generatedTasks.push({
            title: `Master ${skill} core concepts & architectural tradeoffs`,
            description: `Review fundamental implementation details, concurrency/scaling implications, and common interview questions for ${skill}.`,
            skillName: skill,
            category: 'Technical',
            priority: idx === 0 ? 'HIGH' : 'MEDIUM',
            estimatedMinutes: 45,
            daysOffset: (idx + 1) * 3
          });
          generatedTasks.push({
            title: `Practice 3 realistic scenario/interview questions on ${skill}`,
            description: `Solve targeted questions and benchmark answers against the versioned scoring rubrics.`,
            skillName: skill,
            category: 'Practice',
            priority: 'HIGH',
            estimatedMinutes: 30,
            daysOffset: (idx + 1) * 5
          });
        });
      }

      // Add a full-length mock interview milestone
      generatedTasks.push({
        title: `Complete 1 full-length AI mock interview to measure skill retention`,
        description: `Simulate high-pressure multi-turn conversation and review question-level evaluations.`,
        skillName: 'Interview Readiness',
        category: 'Mock Interview',
        priority: 'HIGH',
        estimatedMinutes: 45,
        daysOffset: durationWeeks * 6
      });
    }

    // 4. Persist Improvement Plan and Tasks in transaction
    const newPlan = await db.$transaction(async (tx) => {
      const plan = await tx.improvementPlan.create({
        data: {
          userId,
          preparationSessionId: preparationSessionId || null,
          title: planTitle,
          description: `Personalized ${durationWeeks}-week roadmap targeting identified gaps in ${topSkillsToTarget.join(', ') || 'core domains'}.`,
          priority: 'HIGH',
          status: 'ACTIVE',
          targetDate,
          targetSkills: topSkillsToTarget,
          identifiedWeaknesses: deduplicatedWeaknesses,
          completionPercentage: 0
        }
      });

      for (const t of generatedTasks) {
        const taskDue = new Date();
        taskDue.setDate(taskDue.getDate() + (t.daysOffset || 7));

        await tx.learningTask.create({
          data: {
            improvementPlanId: plan.id,
            userId,
            preparationSessionId: preparationSessionId || null,
            title: t.title,
            description: t.description || '',
            skillName: t.skillName || null,
            category: t.category || 'General',
            priority: t.priority || 'MEDIUM',
            status: 'PENDING',
            estimatedMinutes: t.estimatedMinutes || 30,
            dueDate: taskDue
          }
        });
      }

      return plan;
    });

    return this.getPlanById(newPlan.id, userId);
  }

  /**
   * Regenerate and append new learning tasks to an existing plan from latest evaluations
   */
  static async regeneratePlan(planId, userId) {
    const plan = await this.getPlanById(planId, userId);

    const skillGapReport = await SkillGapService.getSkillGaps(userId, {
      preparationSessionId: plan.preparationSessionId
    });

    const existingTaskTitles = new Set(plan.tasks.map((t) => t.title.toLowerCase()));
    const weakSkills = skillGapReport.skills.filter((s) => s.status === 'NEEDS_IMPROVEMENT' || s.status === 'DEVELOPING');

    for (const s of weakSkills) {
      const taskTitle = `Remediate ${s.skillName}: Practice targeted interview scenarios`;
      if (!existingTaskTitles.has(taskTitle.toLowerCase())) {
        const due = new Date();
        due.setDate(due.getDate() + 7);
        await db.learningTask.create({
          data: {
            improvementPlanId: plan.id,
            userId,
            preparationSessionId: plan.preparationSessionId,
            title: taskTitle,
            description: s.recommendedLearningAction || `Focus on mastering ${s.skillName} principles.`,
            skillName: s.skillName,
            category: s.category || 'General',
            priority: s.improvementPriority || 'HIGH',
            status: 'PENDING',
            estimatedMinutes: 30,
            dueDate: due
          }
        });
      }
    }

    return this.getPlanById(planId, userId);
  }

  /**
   * Update plan details
   */
  static async updatePlan(planId, userId, updateData) {
    const existing = await db.improvementPlan.findUnique({
      where: { id: planId }
    });

    if (!existing || existing.userId !== userId) {
      const err = new Error('Improvement plan not found or access denied');
      err.status = existing ? 403 : 404;
      throw err;
    }

    const { title, description, status, priority, targetDate, targetSkills, identifiedWeaknesses } = updateData;

    const updated = await db.improvementPlan.update({
      where: { id: planId },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
        ...(targetSkills ? { targetSkills } : {}),
        ...(identifiedWeaknesses ? { identifiedWeaknesses } : {})
      }
    });

    return updated;
  }

  /**
   * Update plan status (ACTIVE, COMPLETED, PAUSED, ARCHIVED)
   */
  static async updatePlanStatus(planId, userId, status) {
    const validStatuses = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }

    return this.updatePlan(planId, userId, { status });
  }

  /**
   * Delete an improvement plan (cascades to tasks)
   */
  static async deletePlan(planId, userId) {
    const existing = await db.improvementPlan.findUnique({
      where: { id: planId }
    });

    if (!existing || existing.userId !== userId) {
      const err = new Error('Improvement plan not found or access denied');
      err.status = existing ? 403 : 404;
      throw err;
    }

    await db.improvementPlan.delete({
      where: { id: planId }
    });

    return { message: 'Improvement plan deleted successfully', planId };
  }
}

