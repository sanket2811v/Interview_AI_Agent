import { db } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export class AnalyticsService {
  /**
   * Helper to resolve Date filter bounds
   */
  static getDateBounds(dateRange = 'all', customStart, customEnd) {
    if (customStart || customEnd) {
      return {
        gte: customStart ? new Date(customStart) : undefined,
        lte: customEnd ? new Date(customEnd) : undefined
      };
    }

    const now = new Date();
    switch (dateRange) {
      case '7d': {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return { gte: start };
      }
      case '30d': {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        return { gte: start };
      }
      case '90d': {
        const start = new Date(now);
        start.setDate(now.getDate() - 90);
        return { gte: start };
      }
      case '6m': {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 6);
        return { gte: start };
      }
      case 'all':
      default:
        return {};
    }
  }

  /**
   * Helper to compute previous period date bounds for delta comparison
   */
  static getPreviousPeriodBounds(dateRange = 'all') {
    const now = new Date();
    switch (dateRange) {
      case '7d': {
        const end = new Date(now);
        end.setDate(now.getDate() - 7);
        const start = new Date(now);
        start.setDate(now.getDate() - 14);
        return { gte: start, lte: end };
      }
      case '30d': {
        const end = new Date(now);
        end.setDate(now.getDate() - 30);
        const start = new Date(now);
        start.setDate(now.getDate() - 60);
        return { gte: start, lte: end };
      }
      case '90d': {
        const end = new Date(now);
        end.setDate(now.getDate() - 90);
        const start = new Date(now);
        start.setDate(now.getDate() - 180);
        return { gte: start, lte: end };
      }
      case '6m': {
        const end = new Date(now);
        end.setMonth(now.getMonth() - 6);
        const start = new Date(now);
        start.setMonth(now.getMonth() - 12);
        return { gte: start, lte: end };
      }
      default:
        return null;
    }
  }

  /**
   * 1. Overall Performance Summary
   */
  static async getOverview(userId, filters = {}) {
    const { dateRange = 'all', preparationSessionId, startDate, endDate } = filters;
    const dateBounds = this.getDateBounds(dateRange, startDate, endDate);

    const prepFilter = preparationSessionId ? { preparationSessionId } : {};

    // 1. Practice question attempts
    const [totalAttempts, completedAttempts] = await Promise.all([
      db.questionAttempt.count({
        where: {
          userId,
          attemptedAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined,
          ...(preparationSessionId ? { question: { preparationSessionId } } : {})
        }
      }),
      db.questionAttempt.count({
        where: {
          userId,
          status: 'SUBMITTED',
          attemptedAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined,
          ...(preparationSessionId ? { question: { preparationSessionId } } : {})
        }
      })
    ]);

    // 2. Coding submissions
    const totalCodingSubmissions = await db.codingSubmission.count({
      where: {
        userId,
        submittedAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined,
        ...(preparationSessionId ? { challenge: { preparationSessionId } } : {})
      }
    });

    // 3. Completed mock interviews
    const totalMockInterviews = await db.mockInterview.count({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined,
        ...prepFilter
      }
    });

    // 4. AI evaluations
    const evaluations = await db.interviewEvaluation.findMany({
      where: {
        userId,
        evaluatedAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined
      },
      select: {
        id: true,
        overallScore: true,
        classification: true,
        evaluatedAt: true
      }
    });

    const totalEvaluations = evaluations.length;
    let averageScore = null;
    if (totalEvaluations > 0) {
      const sum = evaluations.reduce((acc, curr) => acc + (curr.overallScore || 0), 0);
      averageScore = Math.round(sum / totalEvaluations);
    }

    // 5. Learning tasks & Progress
    const tasks = await db.learningTask.findMany({
      where: {
        improvementPlan: {
          userId,
          ...(preparationSessionId ? { preparationSessionId } : {})
        }
      },
      select: {
        id: true,
        status: true,
        completedAt: true
      }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
    const eligibleTasks = completedTasks + inProgressTasks + pendingTasks;
    const taskProgressPercentage = eligibleTasks > 0 ? Math.round((completedTasks / eligibleTasks) * 100) : 0;

    // 6. Calculate Streak from distinct active days
    const recentAttempts = await db.questionAttempt.findMany({
      where: { userId },
      select: { attemptedAt: true },
      orderBy: { attemptedAt: 'desc' },
      take: 100
    });
    const recentSubmissions = await db.codingSubmission.findMany({
      where: { userId },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'desc' },
      take: 100
    });
    const recentInterviews = await db.mockInterview.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const activeDates = new Set();
    [...recentAttempts, ...recentSubmissions, ...recentInterviews].forEach((item) => {
      const date = item.attemptedAt || item.submittedAt || item.createdAt;
      if (date) {
        activeDates.add(date.toISOString().split('T')[0]);
      }
    });

    const sortedDates = Array.from(activeDates).sort().reverse();
    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (sortedDates.length > 0 && (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr)) {
      let currentCheck = new Date(sortedDates[0]);
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDay = new Date(currentCheck);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDayStr = prevDay.toISOString().split('T')[0];
        if (sortedDates[i] === prevDayStr) {
          streak++;
          currentCheck = prevDay;
        } else {
          break;
        }
      }
    }

    // 7. Last Activity Date
    const lastActivity = sortedDates.length > 0 ? sortedDates[0] : null;

    return {
      totalAttempts,
      completedAttempts,
      totalCodingSubmissions,
      totalMockInterviews,
      totalEvaluations,
      averageScore,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      taskProgressPercentage,
      streak,
      lastActivity,
      hasData: totalAttempts > 0 || totalCodingSubmissions > 0 || totalMockInterviews > 0 || totalEvaluations > 0
    };
  }

  /**
   * 2. Performance Summary Cards with Delta Comparisons
   */
  static async getPerformanceMetrics(userId, filters = {}) {
    const { dateRange = 'all', preparationSessionId, startDate, endDate } = filters;
    const currentBounds = this.getDateBounds(dateRange, startDate, endDate);
    const previousBounds = this.getPreviousPeriodBounds(dateRange);

    // Helper to compute stats for a specific criterion/type in a date window
    const computeScopeStats = async (bounds) => {
      const evaluations = await db.interviewEvaluation.findMany({
        where: {
          userId,
          evaluatedAt: bounds?.gte ? { gte: bounds.gte, lte: bounds.lte } : undefined
        },
        select: {
          id: true,
          overallScore: true,
          sourceType: true,
          rubricVersion: true,
          criterionScores: true
        }
      });

      const result = {
        overall: { sum: 0, count: 0 },
        technical: { sum: 0, count: 0 },
        hr: { sum: 0, count: 0 },
        coding: { sum: 0, count: 0 },
        systemDesign: { sum: 0, count: 0 },
        scenario: { sum: 0, count: 0 },
        mockInterview: { sum: 0, count: 0 }
      };

      for (const ev of evaluations) {
        const score = ev.overallScore || 0;
        result.overall.sum += score;
        result.overall.count++;

        if (ev.sourceType === 'CODING_SUBMISSION') {
          result.coding.sum += score;
          result.coding.count++;
        } else if (ev.sourceType === 'MOCK_INTERVIEW') {
          result.mockInterview.sum += score;
          result.mockInterview.count++;
        }

        // Check criteria scores or rubric for category matching
        const scores = Array.isArray(ev.criterionScores) ? ev.criterionScores : [];
        const isTech = scores.some((c) => c.criterion === 'technicalAccuracy' || c.criterion === 'conceptualUnderstanding');
        const isHR = scores.some((c) => c.criterion === 'relevance' || c.criterion === 'answerStructure');
        const isSys = scores.some((c) => c.criterion === 'architectureAndDesign' || c.criterion === 'requirementsUnderstanding');
        const isScen = scores.some((c) => c.criterion === 'investigationApproach' || c.criterion === 'decisionMaking');

        if (isTech) {
          result.technical.sum += score;
          result.technical.count++;
        } else if (isHR) {
          result.hr.sum += score;
          result.hr.count++;
        } else if (isSys) {
          result.systemDesign.sum += score;
          result.systemDesign.count++;
        } else if (isScen) {
          result.scenario.sum += score;
          result.scenario.count++;
        }
      }

      return result;
    };

    const currentStats = await computeScopeStats(currentBounds);
    const prevStats = previousBounds ? await computeScopeStats(previousBounds) : null;

    // Also get task progress
    const tasks = await db.learningTask.findMany({
      where: { improvementPlan: { userId } },
      select: { status: true }
    });
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const progressScore = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const buildCard = (title, key, iconName) => {
      const cur = currentStats[key];
      const prev = prevStats ? prevStats[key] : null;

      const count = cur.count;
      const currentScore = count > 0 ? Math.round(cur.sum / count) : null;
      let prevScore = null;
      let delta = null;

      if (prev && prev.count > 0 && currentScore !== null) {
        prevScore = Math.round(prev.sum / prev.count);
        delta = currentScore - prevScore;
      }

      return {
        title,
        key,
        icon: iconName,
        score: currentScore,
        count,
        previousScore: prevScore,
        delta,
        status: count === 0 ? 'NOT_ENOUGH_DATA' : delta !== null && delta > 0 ? 'IMPROVING' : delta !== null && delta < 0 ? 'DECLINING' : 'STABLE'
      };
    };

    return {
      cards: [
        buildCard('Overall Performance', 'overall', 'TrendingUp'),
        buildCard('Technical Skills', 'technical', 'Code2'),
        buildCard('HR & Behavioral', 'hr', 'Users2'),
        buildCard('Coding Performance', 'coding', 'Terminal'),
        buildCard('System Design', 'systemDesign', 'Network'),
        buildCard('Scenario-Based', 'scenario', 'Activity'),
        buildCard('Mock Interviews', 'mockInterview', 'Video'),
        {
          title: 'Learning Progress',
          key: 'learningProgress',
          icon: 'CheckCircle2',
          score: progressScore,
          count: tasks.length,
          previousScore: null,
          delta: null,
          status: tasks.length === 0 ? 'NOT_ENOUGH_DATA' : 'ACTIVE'
        }
      ]
    };
  }

  /**
   * 3. Category-Wise Performance Analytics
   */
  static async getCategoryAnalytics(userId, filters = {}) {
    const { dateRange = 'all', preparationSessionId, category, startDate, endDate } = filters;
    const dateBounds = this.getDateBounds(dateRange, startDate, endDate);

    // Fetch all evaluations
    const evaluations = await db.interviewEvaluation.findMany({
      where: {
        userId,
        evaluatedAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined
      },
      select: {
        id: true,
        overallScore: true,
        classification: true,
        sourceType: true,
        criterionScores: true,
        strengths: true,
        weaknesses: true,
        evaluatedAt: true
      },
      orderBy: { evaluatedAt: 'asc' }
    });

    const categoryBuckets = {
      TECHNICAL: { attempts: 0, evaluated: 0, scores: [], strengths: [], weaknesses: [] },
      HR: { attempts: 0, evaluated: 0, scores: [], strengths: [], weaknesses: [] },
      CODING: { attempts: 0, evaluated: 0, scores: [], strengths: [], weaknesses: [] },
      SYSTEM_DESIGN: { attempts: 0, evaluated: 0, scores: [], strengths: [], weaknesses: [] },
      SCENARIO: { attempts: 0, evaluated: 0, scores: [], strengths: [], weaknesses: [] },
      MOCK_INTERVIEW: { attempts: 0, evaluated: 0, scores: [], strengths: [], weaknesses: [] }
    };

    for (const ev of evaluations) {
      let targetCat = 'TECHNICAL';
      if (ev.sourceType === 'CODING_SUBMISSION') {
        targetCat = 'CODING';
      } else if (ev.sourceType === 'MOCK_INTERVIEW') {
        targetCat = 'MOCK_INTERVIEW';
      } else {
        const crits = Array.isArray(ev.criterionScores) ? ev.criterionScores : [];
        if (crits.some((c) => c.criterion === 'relevance' || c.criterion === 'answerStructure')) targetCat = 'HR';
        else if (crits.some((c) => c.criterion === 'architectureAndDesign')) targetCat = 'SYSTEM_DESIGN';
        else if (crits.some((c) => c.criterion === 'investigationApproach')) targetCat = 'SCENARIO';
        else targetCat = 'TECHNICAL';
      }

      const bucket = categoryBuckets[targetCat];
      if (bucket) {
        bucket.evaluated++;
        bucket.scores.push({ score: ev.overallScore || 0, date: ev.evaluatedAt });
        if (Array.isArray(ev.strengths)) bucket.strengths.push(...ev.strengths);
        if (Array.isArray(ev.weaknesses)) bucket.weaknesses.push(...ev.weaknesses);
      }
    }

    const categoriesList = Object.keys(categoryBuckets).map((catKey) => {
      const b = categoryBuckets[catKey];
      const count = b.scores.length;
      const scoresArr = b.scores.map((s) => s.score);
      const avg = count > 0 ? Math.round(scoresArr.reduce((a, b) => a + b, 0) / count) : null;
      const highest = count > 0 ? Math.max(...scoresArr) : null;
      const lowest = count > 0 ? Math.min(...scoresArr) : null;
      const recent = count > 0 ? scoresArr[scoresArr.length - 1] : null;

      return {
        category: catKey,
        evaluatedCount: count,
        averageScore: avg,
        highestScore: highest,
        lowestScore: lowest,
        recentScore: recent,
        trend: b.scores.slice(-5), // last 5 trend points
        strengths: Array.from(new Set(b.strengths)).slice(0, 3),
        weaknesses: Array.from(new Set(b.weaknesses)).slice(0, 3)
      };
    });

    if (category && category !== 'ALL') {
      return { categories: categoriesList.filter((c) => c.category === category) };
    }

    return { categories: categoriesList };
  }

  /**
   * 4. Historical Performance Trends
   */
  static async getHistoricalTrends(userId, filters = {}) {
    const { dateRange = 'all', startDate, endDate } = filters;
    const dateBounds = this.getDateBounds(dateRange, startDate, endDate);

    const evaluations = await db.interviewEvaluation.findMany({
      where: {
        userId,
        evaluatedAt: dateBounds.gte ? { gte: dateBounds.gte, lte: dateBounds.lte } : undefined
      },
      select: {
        id: true,
        overallScore: true,
        classification: true,
        sourceType: true,
        evaluatedAt: true
      },
      orderBy: { evaluatedAt: 'asc' }
    });

    const trendPoints = evaluations.map((ev) => ({
      id: ev.id,
      score: ev.overallScore || 0,
      classification: ev.classification || 'Good',
      sourceType: ev.sourceType,
      date: ev.evaluatedAt.toISOString().split('T')[0],
      timestamp: ev.evaluatedAt.getTime()
    }));

    return { trends: trendPoints };
  }

  /**
   * 5. Weekly and Monthly Activity
   */
  static async getActivity(userId, filters = {}) {
    const { dateRange = 'all' } = filters;
    const dateBounds = this.getDateBounds(dateRange);

    const [attempts, submissions, interviews] = await Promise.all([
      db.questionAttempt.findMany({
        where: { userId, attemptedAt: dateBounds.gte ? { gte: dateBounds.gte } : undefined },
        select: { attemptedAt: true }
      }),
      db.codingSubmission.findMany({
        where: { userId, submittedAt: dateBounds.gte ? { gte: dateBounds.gte } : undefined },
        select: { submittedAt: true }
      }),
      db.mockInterview.findMany({
        where: { userId, createdAt: dateBounds.gte ? { gte: dateBounds.gte } : undefined },
        select: { createdAt: true }
      })
    ]);

    const activityByDate = {};
    const recordItem = (dt) => {
      if (!dt) return;
      const key = dt.toISOString().split('T')[0];
      activityByDate[key] = (activityByDate[key] || 0) + 1;
    };

    attempts.forEach((a) => recordItem(a.attemptedAt));
    submissions.forEach((s) => recordItem(s.submittedAt));
    interviews.forEach((i) => recordItem(i.createdAt));

    const activityList = Object.keys(activityByDate)
      .sort()
      .map((date) => ({ date, count: activityByDate[date] }));

    return { activity: activityList };
  }

  /**
   * 6. User Filter Options (Preparations, etc.)
   */
  static async getFilters(userId) {
    const preparations = await db.preparationSession.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      preparations,
      categories: ['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO', 'MOCK_INTERVIEW'],
      dateRanges: ['7d', '30d', '90d', '6m', 'all']
    };
  }
}

