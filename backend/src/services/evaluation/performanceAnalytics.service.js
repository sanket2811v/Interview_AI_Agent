import { db } from '../../config/prisma.js';

export class PerformanceAnalyticsService {
  /**
   * Generates comprehensive performance overview KPIs for user
   */
  static async getOverview(userId) {
    const evaluations = await db.interviewEvaluation.findMany({
      where: { userId },
      orderBy: { evaluatedAt: 'asc' }
    });

    const totalEvaluations = evaluations.length;
    if (totalEvaluations === 0) {
      return {
        totalEvaluations: 0,
        totalAnswersEvaluated: 0,
        totalCodingEvaluated: 0,
        totalInterviewsEvaluated: 0,
        averageScore: 0,
        averagePracticeScore: 0,
        averageInterviewScore: 0,
        codingSuccessRate: 0,
        classification: 'Needs Data',
        insufficientData: true,
        summary: 'No evaluated interview answers or sessions yet. Complete practice questions or mock interviews to view analytics.'
      };
    }

    let answerCount = 0;
    let answerScoreSum = 0;
    let interviewCount = 0;
    let interviewScoreSum = 0;
    let codingCount = 0;
    let totalScoreSum = 0;

    for (const ev of evaluations) {
      totalScoreSum += ev.overallScore || 0;
      if (ev.sourceType === 'PRACTICE_ANSWER') {
        answerCount++;
        answerScoreSum += ev.overallScore || 0;
      } else if (ev.sourceType === 'MOCK_INTERVIEW') {
        interviewCount++;
        interviewScoreSum += ev.overallScore || 0;
      } else if (ev.sourceType === 'CODING_SUBMISSION') {
        codingCount++;
      }
    }

    // Coding execution success rate from actual coding submissions
    const codingSubmissions = await db.codingSubmission.findMany({
      where: { userId },
      select: { executionStatus: true, testCasesPassed: true, totalTestCases: true }
    });
    const acceptedCount = codingSubmissions.filter((s) => s.executionStatus === 'ACCEPTED').length;
    const codingSuccessRate = codingSubmissions.length > 0
      ? Math.round((acceptedCount / codingSubmissions.length) * 100)
      : 0;

    const averageScore = Math.round(totalScoreSum / totalEvaluations);
    const averagePracticeScore = answerCount > 0 ? Math.round(answerScoreSum / answerCount) : 0;
    const averageInterviewScore = interviewCount > 0 ? Math.round(interviewScoreSum / interviewCount) : 0;

    return {
      totalEvaluations,
      totalAnswersEvaluated: answerCount,
      totalCodingEvaluated: codingCount,
      totalInterviewsEvaluated: interviewCount,
      averageScore,
      averagePracticeScore,
      averageInterviewScore,
      codingSuccessRate,
      classification: averageScore >= 80 ? 'Very Good' : averageScore >= 70 ? 'Good' : averageScore >= 60 ? 'Average' : 'Needs Improvement',
      insufficientData: totalEvaluations < 3
    };
  }

  /**
   * Aggregates category-wise performance
   */
  static async getCategoryBreakdown(userId) {
    const evaluations = await db.interviewEvaluation.findMany({
      where: { userId }
    });

    const categoryStats = {
      TECHNICAL: { count: 0, totalScore: 0 },
      HR: { count: 0, totalScore: 0 },
      CODING: { count: 0, totalScore: 0 },
      SYSTEM_DESIGN: { count: 0, totalScore: 0 },
      SCENARIO: { count: 0, totalScore: 0 }
    };

    for (const ev of evaluations) {
      let cat = 'TECHNICAL';
      if (ev.sourceType === 'CODING_SUBMISSION') cat = 'CODING';
      // Map other evaluations by criterion or category indicators
      const crits = Array.isArray(ev.criterionScores) ? ev.criterionScores : [];
      if (crits.some((c) => c.criterion === 'requirementsUnderstanding')) cat = 'SYSTEM_DESIGN';
      if (crits.some((c) => c.criterion === 'answerStructure')) cat = 'HR';
      if (crits.some((c) => c.criterion === 'investigationApproach')) cat = 'SCENARIO';

      if (!categoryStats[cat]) categoryStats[cat] = { count: 0, totalScore: 0 };
      categoryStats[cat].count++;
      categoryStats[cat].totalScore += ev.overallScore || 0;
    }

    const categories = Object.entries(categoryStats).map(([category, data]) => ({
      category,
      name: category.replace('_', ' '),
      evaluationCount: data.count,
      averageScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0
    }));

    return { categories };
  }

  /**
   * Generates chronological performance trends
   */
  static async getTrends(userId) {
    const evaluations = await db.interviewEvaluation.findMany({
      where: { userId },
      orderBy: { evaluatedAt: 'asc' },
      take: 30
    });

    const timeline = evaluations.map((ev, idx) => ({
      index: idx + 1,
      id: ev.id,
      sourceType: ev.sourceType,
      overallScore: ev.overallScore,
      classification: ev.classification,
      date: ev.evaluatedAt ? new Date(ev.evaluatedAt).toISOString().split('T')[0] : ''
    }));

    return {
      trends: timeline,
      totalEvaluations: timeline.length,
      insufficientData: timeline.length < 2
    };
  }

  /**
   * Gathers recurring strengths and weaknesses with evidence
   */
  static async getStrengthsAndWeaknesses(userId) {
    const evaluations = await db.interviewEvaluation.findMany({
      where: { userId },
      orderBy: { evaluatedAt: 'desc' },
      take: 20
    });

    const strengthsMap = new Map();
    const weaknessesMap = new Map();

    for (const ev of evaluations) {
      if (Array.isArray(ev.strengths)) {
        for (const s of ev.strengths) {
          if (typeof s === 'string' && s.trim()) {
            const key = s.trim();
            strengthsMap.set(key, (strengthsMap.get(key) || 0) + 1);
          }
        }
      }
      if (Array.isArray(ev.weaknesses)) {
        for (const w of ev.weaknesses) {
          if (typeof w === 'string' && w.trim()) {
            const key = w.trim();
            weaknessesMap.set(key, (weaknessesMap.get(key) || 0) + 1);
          }
        }
      }
    }

    const strengths = Array.from(strengthsMap.entries())
      .map(([point, occurrences]) => ({ point, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 6);

    const weaknesses = Array.from(weaknessesMap.entries())
      .map(([point, occurrences]) => ({ point, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 6);

    return {
      strengths,
      weaknesses,
      totalEvaluationsAnalyzed: evaluations.length
    };
  }
}

