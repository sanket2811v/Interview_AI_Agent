import { db } from "../../config/prisma.js";
import { AnalyticsService } from "./analytics.service.js";
import { SkillGapService } from "./skillGap.service.js";

export class ProgressService {
  /**
   * Comprehensive Progress Tracking Overview
   */
  static async getProgressOverview(userId) {
    const now = new Date();

    // 1. Fetch all user learning tasks across plans
    const tasks = await db.learningTask.findMany({
      where: {
        improvementPlan: { userId },
      },
      select: {
        id: true,
        status: true,
        dueDate: true,
        completedAt: true,
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
    const inProgressTasks = tasks.filter(
      (t) => t.status === "IN_PROGRESS",
    ).length;
    const pendingTasks = tasks.filter((t) => t.status === "PENDING").length;
    const skippedTasks = tasks.filter((t) => t.status === "SKIPPED").length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate) < now,
    ).length;

    const eligibleTasks = completedTasks + inProgressTasks + pendingTasks;
    const completionPercentage =
      eligibleTasks > 0
        ? Math.round((completedTasks / eligibleTasks) * 100)
        : 0;

    // 2. Skill gaps assessment summary
    const skillGaps = await SkillGapService.getSkillGaps(userId);
    const skillsAssessed =
      skillGaps.strongCount +
      skillGaps.developingCount +
      skillGaps.needsImprovementCount;
    const skillsImproving = skillGaps.developingCount;
    const skillsRequiringPractice = skillGaps.needsImprovementCount;

    // 3. Learning streak and overall activity
    const overview = await AnalyticsService.getOverview(userId);
    const activity = await AnalyticsService.getActivity(userId, {
      dateRange: "30d",
    });

    // 4. Milestone tracking based on real achievements
    const milestones = [
      {
        id: "first-practice",
        title: "First Practice Attempt",
        description: "Complete your first practice interview question",
        achieved: overview.totalAttempts > 0,
        unlockedAt: overview.totalAttempts > 0 ? "Achieved" : null,
      },
      {
        id: "coding-challenger",
        title: "Coding Arena Pioneer",
        description: "Submit your first algorithm solution",
        achieved: overview.totalCodingSubmissions > 0,
        unlockedAt: overview.totalCodingSubmissions > 0 ? "Achieved" : null,
      },
      {
        id: "mock-graduate",
        title: "Mock Interview Graduate",
        description: "Complete a full multi-turn AI mock interview",
        achieved: overview.totalMockInterviews > 0,
        unlockedAt: overview.totalMockInterviews > 0 ? "Achieved" : null,
      },
      {
        id: "task-master",
        title: "Roadmap Milestone Achiever",
        description: "Complete 5 learning improvement tasks",
        achieved: completedTasks >= 5,
        unlockedAt:
          completedTasks >= 5 ? "Achieved" : `${completedTasks}/5 completed`,
      },
      {
        id: "streak-builder",
        title: "Consistency Champion",
        description: "Maintain an active 3-day practice streak",
        achieved: overview.streak >= 3,
        unlockedAt:
          overview.streak >= 3 ? "Achieved" : `${overview.streak}/3 days`,
      },
    ];

    return {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        skipped: skippedTasks,
        overdue: overdueTasks,
        completionPercentage,
      },
      skills: {
        total: skillGaps.totalSkills,
        assessed: skillsAssessed,
        strong: skillGaps.strongCount,
        improving: skillsImproving,
        requiringPractice: skillsRequiringPractice,
        notAssessed: skillGaps.notAssessedCount,
      },
      streak: overview.streak,
      lastActivity: overview.lastActivity,
      recentActivity: activity.activity,
      milestones,
    };
  }

  /**
   * Historical Progress Timeline
   */
  static async getProgressHistory(userId) {
    const [evaluations, completedTasks, completedInterviews] =
      await Promise.all([
        db.interviewEvaluation.findMany({
          where: { userId },
          select: {
            id: true,
            overallScore: true,
            classification: true,
            sourceType: true,
            evaluatedAt: true,
          },
          orderBy: { evaluatedAt: "desc" },
          take: 30,
        }),
        db.learningTask.findMany({
          where: {
            improvementPlan: { userId },
            status: "COMPLETED",
          },
          select: {
            id: true,
            title: true,
            category: true,
            completedAt: true,
          },
          orderBy: { completedAt: "desc" },
          take: 20,
        }),
        db.mockInterview.findMany({
          where: {
            userId,
            status: "COMPLETED",
          },
          select: {
            id: true,
            title: true,
            interviewType: true,
            overallScore: true,
            completedAt: true,
          },
          orderBy: { completedAt: "desc" },
          take: 10,
        }),
      ]);

    const events = [];

    evaluations.forEach((ev) => {
      events.push({
        type: "EVALUATION",
        id: ev.id,
        title: `AI Evaluation (${ev.classification || "Good"})`,
        detail: `Scored ${ev.overallScore || 0}/100 across rubrics`,
        timestamp: ev.evaluatedAt,
      });
    });

    completedTasks.forEach((ct) => {
      if (ct.completedAt) {
        events.push({
          type: "TASK_COMPLETED",
          id: ct.id,
          title: `Completed Task: ${ct.title}`,
          detail: `Category: ${ct.category}`,
          timestamp: ct.completedAt,
        });
      }
    });

    completedInterviews.forEach((mi) => {
      if (mi.completedAt) {
        events.push({
          type: "MOCK_INTERVIEW",
          id: mi.id,
          title: `Concluded ${mi.title}`,
          detail: `Mode: ${mi.interviewType}, Score: ${mi.overallScore || "N/A"}`,
          timestamp: mi.completedAt,
        });
      }
    });

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { timeline: events.slice(0, 40) };
  }

  /**
   * Skill Development Progression over time
   */
  static async getSkillProgress(userId) {
    const gaps = await SkillGapService.getSkillGaps(userId);
    return {
      skills: gaps.skills.map((s) => ({
        skillName: s.skillName,
        category: s.category,
        status: s.status,
        score: s.currentScore,
        attempts: s.evaluatedAttemptsCount,
        lastAssessed: s.lastAssessedDate,
      })),
    };
  }
}
