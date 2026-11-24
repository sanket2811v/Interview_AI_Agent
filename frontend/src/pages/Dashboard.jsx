import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Video,
  Award,
  HelpCircle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  BookOpen
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { StatCard } from '../components/dashboard/StatCard.jsx';
import { PerformanceChart } from '../components/dashboard/PerformanceChart.jsx';
import { SkillOverview } from '../components/dashboard/SkillOverview.jsx';
import { RecentSessions } from '../components/dashboard/RecentSessions.jsx';
import { QuickActions } from '../components/dashboard/QuickActions.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { dashboardService } from '../services/dashboardService.js';

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getDashboardData();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingState message="Aggregating performance analytics & preparation tracks..." />;
  }

  if (error || !data) {
    return <ErrorState message={error} onRetry={fetchDashboard} />;
  }

  const { stats, performanceHistory, skills, recentPreparations, recommendedQuestions } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome Banner with Gradient (Inspired by User's Reference) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 sm:p-8 text-white shadow-xl shadow-violet-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Coaching Active</span>
              </div>
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[11px] font-mono border border-white/20">
                <span>Phase 2 Demo Dataset</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Good morning, Candidate! 👋
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl">
              Prepare smarter, practice better and achieve your career goals. You're 3 sessions away from your weekly interview target.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/mock-interviews')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/25"
              iconLeft={Video}
            >
              Start Live Interview
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/preparations/new')}
              className="bg-white hover:bg-slate-100 text-violet-950 font-bold border-transparent"
              iconLeft={PlusCircle}
            >
              + Create Preparation
            </Button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Getting Started Progress Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Preparation Readiness Checklist
            </span>
            <Badge variant="primary" size="sm">3 of 5 Completed</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit a job description, practice 2 technical tracks, and complete 1 mock interview.
          </p>
        </div>

        <div className="w-full sm:w-60">
          <div className="flex justify-between text-xs font-mono mb-1 text-slate-500">
            <span>60% Completed</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-600 to-blue-500 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Preparations"
          value={stats.totalPreparations.value}
          change={stats.totalPreparations.change}
          trend={stats.totalPreparations.trend}
          icon={Briefcase}
          subtitle="Target roles tracked"
          iconBg="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          title="Completed Mock Interviews"
          value={stats.completedInterviews.value}
          change={stats.completedInterviews.change}
          trend={stats.completedInterviews.trend}
          icon={Video}
          subtitle="Full simulated rounds"
          iconBg="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Average Interview Score"
          value={`${stats.averageScore.value}%`}
          change={stats.averageScore.change}
          trend={stats.averageScore.trend}
          icon={Award}
          subtitle="Readiness index"
          iconBg="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          title="Questions Practiced"
          value={stats.questionsPracticed.value}
          change={stats.questionsPracticed.change}
          trend={stats.questionsPracticed.trend}
          icon={HelpCircle}
          subtitle="Technical & behavioral"
          iconBg="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase text-slate-400">
          Quick Launch Workflows
        </h3>
        <QuickActions />
      </div>

      {/* Analytics & Skills Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart data={performanceHistory} />
        </div>
        <div>
          <SkillOverview skills={skills} />
        </div>
      </div>

      {/* Recent Preparation Sessions */}
      <div>
        <RecentSessions preparations={recentPreparations} />
      </div>

      {/* Recommended Practice Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recommended Practice for Today</CardTitle>
              <CardDescription>
                AI-curated high-impact questions based on your target role requirements
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/practice/technical')}
            >
              Browse Library
            </Button>
          </div>
        </CardHeader>

        <CardContent className="divide-y divide-slate-100 dark:divide-[#27324A]/60 pt-0">
          {recommendedQuestions.map((q) => (
            <div
              key={q.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-[#151C2E]/60 -mx-6 px-6 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" size="sm">{q.category}</Badge>
                  <span className={`text-[11px] font-semibold ${
                    q.difficulty === 'Hard' ? 'text-rose-500' : 'text-amber-500'
                  }`}>
                    {q.difficulty}
                  </span>
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {q.estimatedMinutes} mins
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {q.title}
                </h4>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(q.path)}
                iconRight={ArrowRight}
              >
                Practice
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;

