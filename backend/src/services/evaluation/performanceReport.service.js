import { db } from '../../config/prisma.js';
import { PerformanceAnalyticsService } from './performanceAnalytics.service.js';
import { classifyPerformance } from './rubrics.js';

export class PerformanceReportService {
  /**
   * Generates a persistent PerformanceReport synthesizing user's evaluation history
   */
  static async generateReport(userId, payload = {}) {
    const { preparationSessionId = null, reportType = 'COMPREHENSIVE', title } = payload;

    // 1. Gather user analytics & candidate context
    const [overview, categoryData, swData] = await Promise.all([
      PerformanceAnalyticsService.getOverview(userId),
      PerformanceAnalyticsService.getCategoryBreakdown(userId),
      PerformanceAnalyticsService.getStrengthsAndWeaknesses(userId)
    ]);

    // Retrieve user and target job preparation details safely
    let user = null;
    try {
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true }
      });
    } catch (_) {}

    let prepSession = null;
    if (preparationSessionId) {
      try {
        prepSession = await db.preparationSession.findUnique({
          where: { id: preparationSessionId },
          include: { jobAnalysis: true }
        });
      } catch (_) {}
    }
    if (!prepSession) {
      try {
        prepSession = await db.preparationSession.findFirst({
          where: { userId, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
          include: { jobAnalysis: true }
        });
      } catch (_) {}
    }

    const candidateName = user?.name || 'Candidate';
    const targetJobRole = prepSession?.jobTitle || 'Full Stack Developer';
    const companyName = prepSession?.companyName || 'Target Company';
    const resolvedPrepId = prepSession?.id || preparationSessionId || null;

    const reportTitle =
      title ||
      `${reportType.replace('_', ' ')} Interview Performance Report - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const totalEvaluations = overview.totalEvaluations || 0;
    const overallScore = overview.averageScore || 0;
    // When zero evaluations exist, classification must be "Needs Data" (not "Poor")
    const classification = totalEvaluations > 0 ? classifyPerformance(overallScore) : 'Needs Data';

    const summary = totalEvaluations > 0
      ? `Based on ${totalEvaluations} evaluated interactions (${overview.totalAnswersEvaluated} practice answers, ${overview.totalInterviewsEvaluated} mock interviews, and ${overview.totalCodingEvaluated} coding assessments), candidate demonstrates an overall readiness score of ${overallScore}/100 (${classification}). Coding test case execution success rate is currently ${overview.codingSuccessRate}%.`
      : 'Initial performance baseline report. No completed evaluation attempts were available at generation time. Complete a mock interview, technical practice session, or coding assessment to generate an evaluated performance report.';

    // Generate actionable recommendations & personalized learning plan based on real evidence
    let recommendations = [];
    let learningPlan = [];

    if (totalEvaluations > 0) {
      if (Array.isArray(swData.weaknesses) && swData.weaknesses.length > 0) {
        recommendations = swData.weaknesses.map((w) => `Target improvement for: ${w.point}`);
        learningPlan = swData.weaknesses.slice(0, 4).map((w, i) => `Module ${i + 1}: Targeted practice to address "${w.point}"`);
      } else {
        recommendations = [
          'Maintain consistent practice rhythm across multiple difficulty tiers',
          'Explore advanced system design and architecture trade-offs',
          'Practice time-constrained algorithmic solutions under mock conditions'
        ];
        learningPlan = [
          'Practice explaining algorithmic time and space complexity aloud',
          'Review distributed systems patterns and database scaling models'
        ];
      }
    } else {
      recommendations = [
        'Complete a Technical Practice question to evaluate foundational concepts',
        'Run a Coding Arena algorithm assessment to evaluate execution accuracy',
        'Complete a Mock Interview round for behavioral and communication feedback'
      ];
      learningPlan = [
        'Start with Technical Practice for language internals and system fundamentals',
        'Practice structured STAR format answers for behavioral readiness',
        'Solve Coding Arena challenges with optimal time/space complexity'
      ];
    }

    // Enrich category scores: ensure standard categories are documented without inventing fake scores
    const standardCategories = ['TECHNICAL', 'CODING', 'SYSTEM_DESIGN', 'HR', 'SCENARIO'];
    const existingCategories = Array.isArray(categoryData.categories) ? categoryData.categories : [];
    const categoryScores = standardCategories.map((catKey) => {
      const match = existingCategories.find((c) => c.category === catKey);
      const count = match?.evaluationCount || 0;
      return {
        category: catKey,
        name: catKey.replace('_', ' '),
        evaluationCount: count,
        averageScore: count > 0 ? match.averageScore : 0,
        isEvaluated: count > 0,
        status: count > 0 ? 'EVALUATED' : 'NOT_EVALUATED'
      };
    });

    const metrics = {
      candidateName,
      candidateEmail: user?.email || '',
      targetJobRole,
      companyName,
      reportingDate: new Date().toISOString(),
      hasEvaluations: totalEvaluations > 0,
      totalEvaluations,
      totalAnswersEvaluated: overview.totalAnswersEvaluated || 0,
      totalInterviewsEvaluated: overview.totalInterviewsEvaluated || 0,
      totalCodingEvaluated: overview.totalCodingEvaluated || 0,
      codingSuccessRate: overview.codingSuccessRate || 0,
      averagePracticeScore: overview.averagePracticeScore || 0,
      averageInterviewScore: overview.averageInterviewScore || 0,
      technicalScore: overview.averagePracticeScore || (totalEvaluations > 0 ? overallScore : 0),
      communicationScore: overview.averageInterviewScore || (totalEvaluations > 0 ? overallScore : 0),
      learningPlan: learningPlan.slice(0, 5),
      finalAssessment: totalEvaluations > 0
        ? `${classification} performance demonstrated across ${totalEvaluations} evaluated assessments.`
        : 'Baseline established. Pending completed interview and practice evaluations.'
    };

    // 2. Persist PerformanceReport
    const report = await db.performanceReport.create({
      data: {
        userId,
        preparationSessionId: resolvedPrepId,
        reportType,
        title: reportTitle,
        overallScore,
        classification,
        categoryScores,
        skillScores: {},
        summary,
        strengths: swData.strengths || [],
        weaknesses: swData.weaknesses || [],
        recommendations: recommendations.slice(0, 5),
        evaluationCount: totalEvaluations,
        metrics,
        generatedAt: new Date()
      }
    });

    return report;
  }

  /**
   * Retrieves list of generated reports for user
   */
  static async getUserReports(userId) {
    const reports = await db.performanceReport.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' }
    });

    return { reports };
  }

  /**
   * Retrieves single report with ownership verification
   */
  static async getReportById(reportId, userId) {
    const report = await db.performanceReport.findUnique({
      where: { id: reportId },
      include: { preparationSession: true }
    });

    if (!report) {
      const err = new Error('Report not found');
      err.status = 404;
      throw err;
    }

    if (report.userId !== userId) {
      const err = new Error('Access denied: You do not own this report');
      err.status = 403;
      throw err;
    }

    return report;
  }

  /**
   * Generates printable export payload
   */
  static async getReportDownloadData(reportId, userId) {
    const report = await this.getReportById(reportId, userId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    return {
      report,
      candidate: {
        name: user?.name || report.metrics?.candidateName || 'Candidate',
        email: user?.email || report.metrics?.candidateEmail
      },
      exportTimestamp: new Date().toISOString()
    };
  }
}
