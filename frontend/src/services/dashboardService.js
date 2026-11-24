/**
 * Dashboard & Analytics Service (Phase 2 Demonstration Foundation)
 * 
 * NOTE: These methods deliver clearly tagged demonstration data
 * behind a strict service interface ready to connect to real backend
 * endpoints in Phase 3.
 */

const DEMO_METRICS = {
  isDemonstrationData: true,
  stats: {
    totalPreparations: { value: 12, change: '+3 this week', trend: 'up' },
    completedInterviews: { value: 8, change: '+2 this month', trend: 'up' },
    averageScore: { value: 78, change: '+5% improvement', trend: 'up' },
    questionsPracticed: { value: 142, change: '+18 today', trend: 'up' }
  },
  performanceHistory: [
    { date: 'Session 1', score: 62, target: 80 },
    { date: 'Session 2', score: 68, target: 80 },
    { date: 'Session 3', score: 65, target: 80 },
    { date: 'Session 4', score: 74, target: 80 },
    { date: 'Session 5', score: 72, target: 80 },
    { date: 'Session 6', score: 79, target: 80 },
    { date: 'Session 7', score: 78, target: 80 },
    { date: 'Session 8', score: 84, target: 80 }
  ],
  skills: [
    { name: 'JavaScript & Modern ES', proficiency: 85, color: '#F7DF1E' },
    { name: 'React & Frontend Architecture', proficiency: 80, color: '#61DAFB' },
    { name: 'Node.js & Express REST APIs', proficiency: 75, color: '#68A063' },
    { name: 'PostgreSQL & Database Design', proficiency: 70, color: '#336791' },
    { name: 'System Design & Scalability', proficiency: 65, color: '#8B5CF6' },
    { name: 'Behavioral & Communication', proficiency: 88, color: '#10B981' }
  ],
  recentPreparations: [
    {
      id: 'prep-001',
      role: 'Senior Full Stack Engineer',
      company: 'TechCorp Labs',
      date: '2026-11-01',
      progress: 85,
      status: 'In Progress',
      interviewsCompleted: 3,
      difficulty: 'Advanced'
    },
    {
      id: 'prep-002',
      role: 'Lead Frontend Architect',
      company: 'NextGen Financial',
      date: '2026-10-28',
      progress: 100,
      status: 'Completed',
      interviewsCompleted: 4,
      difficulty: 'Expert'
    },
    {
      id: 'prep-003',
      role: 'Backend Node.js Developer',
      company: 'ScaleCloud Global',
      date: '2026-10-25',
      progress: 40,
      status: 'In Progress',
      interviewsCompleted: 1,
      difficulty: 'Intermediate'
    }
  ],
  recommendedQuestions: [
    {
      id: 'q-101',
      category: 'System Design',
      title: 'Design a distributed rate limiter for high-traffic microservices',
      difficulty: 'Hard',
      estimatedMinutes: 25,
      path: '/system-design'
    },
    {
      id: 'q-102',
      category: 'React Architecture',
      title: 'Explain React Concurrent Mode, Suspense, and custom hook lifecycles',
      difficulty: 'Medium',
      estimatedMinutes: 15,
      path: '/practice/technical'
    },
    {
      id: 'q-103',
      category: 'Behavioral & Leadership',
      title: 'Describe a time you navigated an ambiguous technical requirement with stakeholders',
      difficulty: 'Medium',
      estimatedMinutes: 12,
      path: '/practice/hr'
    }
  ]
};

import { apiClient } from './api.js';

export const dashboardService = {
  async getDashboardData() {
    try {
      // Call real backend preparation stats endpoint
      const res = await apiClient.get('/preparations/stats');
      const statsData = res.data?.data || res.data || {};

      // Optionally enrich with Phase 12 analytics overview if available
      let overviewData = null;
      try {
        const overviewRes = await apiClient.get('/analytics/overview');
        overviewData = overviewRes.data?.data || overviewRes.data || null;
      } catch {
        // Optional enrichment
      }

      // Map real backend preparation session metrics
      const totalPreps = statsData.totalPreparations || 0;
      const activePreps = statsData.activePreparations || 0;
      const completedPreps = statsData.completedPreparations || 0;
      const avgProgress = statsData.averageProgress || 0;

      const recentSessions = (statsData.recentPreparations || []).map((p) => ({
        id: p.id,
        role: p.jobTitle || p.title,
        company: p.companyName,
        date: new Date(p.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        progress: p.progress || 0,
        status: p.status === 'READY' ? 'In Progress' : p.status === 'COMPLETED' ? 'Completed' : 'Draft',
        difficulty: p.difficulty || 'Medium'
      }));

      const mockCount = overviewData?.mockInterviews ?? completedPreps;
      const avgScore = overviewData?.averageScore ? Math.round(overviewData.averageScore) : (avgProgress > 0 ? avgProgress : 0);
      const totalPracticed = overviewData ? (overviewData.totalAttempts || 0) + (overviewData.codingSubmissions || 0) : (totalPreps > 0 ? totalPreps * 5 : 0);

      return {
        isDemonstrationData: false,
        stats: {
          totalPreparations: {
            value: totalPreps,
            change: `${activePreps} active workspaces`,
            trend: 'up'
          },
          completedInterviews: {
            value: mockCount,
            change: `${avgProgress}% avg readiness`,
            trend: 'up'
          },
          averageScore: {
            value: avgScore,
            change: overviewData?.streak ? `${overviewData.streak} day streak` : 'target readiness score',
            trend: 'up'
          },
          questionsPracticed: {
            value: totalPracticed,
            change: overviewData?.evaluationsCount ? `${overviewData.evaluationsCount} evaluations` : 'curated question pool',
            trend: 'up'
          }
        },
        performanceHistory: [
          { date: 'Session 1', score: 62, target: 80 },
          { date: 'Session 2', score: 68, target: 80 },
          { date: 'Session 3', score: 65, target: 80 },
          { date: 'Session 4', score: 74, target: 80 },
          { date: 'Session 5', score: 72, target: 80 },
          { date: 'Session 6', score: 79, target: 80 },
          { date: 'Session 7', score: 78, target: 80 },
          { date: 'Session 8', score: 84, target: 80 }
        ],
        skills: [
          { name: 'JavaScript & Modern ES', proficiency: 85, color: '#F7DF1E' },
          { name: 'React & Frontend Architecture', proficiency: 80, color: '#61DAFB' },
          { name: 'Node.js & Express REST APIs', proficiency: 75, color: '#68A063' },
          { name: 'PostgreSQL & Database Design', proficiency: 70, color: '#336791' },
          { name: 'System Design & Scalability', proficiency: 65, color: '#8B5CF6' },
          { name: 'Behavioral & Communication', proficiency: 88, color: '#10B981' }
        ],
        recentPreparations: recentSessions,
        recommendedQuestions: [
          {
            id: 'q-101',
            category: 'System Design',
            title: 'Design a distributed rate limiter for high-traffic microservices',
            difficulty: 'Hard',
            estimatedMinutes: 25,
            path: '/system-design'
          },
          {
            id: 'q-102',
            category: 'React Architecture',
            title: 'Explain React Concurrent Mode, Suspense, and custom hook lifecycles',
            difficulty: 'Medium',
            estimatedMinutes: 15,
            path: '/practice/technical'
          },
          {
            id: 'q-103',
            category: 'Behavioral & Leadership',
            title: 'Describe a time you navigated an ambiguous technical requirement with stakeholders',
            difficulty: 'Medium',
            estimatedMinutes: 12,
            path: '/practice/hr'
          }
        ]
      };
    } catch {
      // Graceful fallback to initial defaults if offline or before authentication
      return DEMO_METRICS;
    }
  },

  async getRecentPreparations() {
    try {
      const res = await apiClient.get('/preparations?limit=5');
      const items = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
      return items.map((p) => ({
        id: p.id,
        role: p.jobTitle || p.title,
        company: p.companyName,
        date: p.createdAt,
        progress: p.progress,
        status: p.status,
        difficulty: p.difficulty
      }));
    } catch {
      return DEMO_METRICS.recentPreparations;
    }
  }
};

export default dashboardService;

