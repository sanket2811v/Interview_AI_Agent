import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Code2,
  Users2,
  Terminal,
  Network,
  Activity,
  Video,
  CheckCircle2,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  BarChart3,
  Layers,
  Clock,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { analyticsService } from '../services/analyticsService.js';

export function Analytics() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('all');
  const [selectedPreparation, setSelectedPreparation] = useState('');
  const [filterOptions, setFilterOptions] = useState({ preparations: [], categories: [] });

  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [categories, setCategories] = useState([]);
  const [trends, setTrends] = useState([]);
  const [activity, setActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedPreparation]);

  const loadFilterOptions = async () => {
    try {
      const opts = await analyticsService.getFilters();
      if (opts) setFilterOptions(opts);
    } catch (e) {
      // Non-blocking
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        dateRange,
        ...(selectedPreparation ? { preparationSessionId: selectedPreparation } : {})
      };

      const [ovData, perfData, catData, trendData, actData] = await Promise.all([
        analyticsService.getOverview(params),
        analyticsService.getPerformance(params),
        analyticsService.getCategories(params),
        analyticsService.getTrends(params),
        analyticsService.getActivity(params)
      ]);

      setOverview(ovData);
      setPerformance(perfData);
      setCategories(catData?.categories || []);
      setTrends(trendData?.trends || []);
      setActivity(actData?.activity || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderDelta = (delta, status) => {
    if (status === 'NOT_ENOUGH_DATA' || delta === null) {
      return (
        <span className="text-xs text-slate-400 flex items-center">
          <Minus className="h-3 w-3 mr-0.5" /> No prev data
        </span>
      );
    }
    if (delta > 0) {
      return (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
          <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> +{delta}%
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center">
          <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" /> {delta}%
        </span>
      );
    }
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
        <Minus className="h-3 w-3 mr-0.5" /> Stable
      </span>
    );
  };

  const getCardIcon = (key) => {
    switch (key) {
      case 'overall': return <TrendingUp className="h-5 w-5 text-violet-500" />;
      case 'technical': return <Code2 className="h-5 w-5 text-blue-500" />;
      case 'hr': return <Users2 className="h-5 w-5 text-amber-500" />;
      case 'coding': return <Terminal className="h-5 w-5 text-emerald-500" />;
      case 'systemDesign': return <Network className="h-5 w-5 text-cyan-500" />;
      case 'scenario': return <Activity className="h-5 w-5 text-pink-500" />;
      case 'mockInterview': return <Video className="h-5 w-5 text-indigo-500" />;
      case 'learningProgress': return <CheckCircle2 className="h-5 w-5 text-purple-500" />;
      default: return <BarChart3 className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Performance Analytics & Insights"
          subtitle="Comprehensive, evidence-based performance tracking aggregated from practice answers, coding assessments, and mock interviews."
        />

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preparation Selector */}
          <select
            value={selectedPreparation}
            onChange={(e) => setSelectedPreparation(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
          >
            <option value="">All Job Preparations</option>
            {filterOptions.preparations?.map((prep) => (
              <option key={prep.id} value={prep.id}>
                {prep.jobTitle} {prep.companyName ? `(${prep.companyName})` : ''}
              </option>
            ))}
          </select>

          {/* Date Range Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-[#151D30] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            {['7d', '30d', '90d', '6m', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dateRange === range
                    ? 'bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingState message="Aggregating verified performance metrics..." />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-rose-500 border-rose-200 dark:border-rose-900/50">
          <p className="font-semibold mb-2">Error Loading Analytics</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            Retry
          </Button>
        </Card>
      ) : !overview?.hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No evaluation data yet"
          description="Complete individual practice questions, coding challenges, or mock interviews to view evidence-backed analytics."
          actionText="Start Practice"
          onAction={() => navigate('/practice')}
        />
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border-violet-500/20">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Evaluated Score</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {overview.averageScore !== null ? `${overview.averageScore}%` : 'N/A'}
                </span>
                <span className="text-xs text-slate-500">{overview.totalEvaluations} evaluations</span>
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Practice Attempts</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overview.totalAttempts}
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {overview.completedAttempts} completed
                </span>
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Roadmap Tasks</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overview.taskProgressPercentage}%
                </span>
                <span className="text-xs text-slate-500">{overview.completedTasks}/{overview.totalTasks} done</span>
              </div>
            </Card>

            <Card className="p-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Learning Streak</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-amber-500">
                  {overview.streak} {overview.streak === 1 ? 'day' : 'days'}
                </span>
                <span className="text-xs text-slate-400">Active</span>
              </div>
            </Card>
          </div>

          {/* Performance Summary Cards */}
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              Performance Domains & Categories
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {performance?.cards?.map((card) => (
                <Card key={card.key} className="p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {card.title}
                    </span>
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getCardIcon(card.key)}
                    </div>
                  </div>

                  <div className="my-2">
                    {card.score !== null ? (
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {card.score}%
                        </span>
                        {renderDelta(card.delta, card.status)}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        Not enough data yet
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1">
                    <span>Evaluated Attempts</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {card.count}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Overall Performance Trend
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chronological evaluation score progression across rubrics
                  </p>
                </div>
              </div>

              <div className="h-64 w-full min-w-0">
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748B" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Evaluation Score"
                        stroke="#8B5CF6"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#8B5CF6' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Need at least one completed evaluation to render score trend.
                  </div>
                )}
              </div>
            </Card>

            {/* Category Comparison Bar Chart */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Category Breakdown
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Average score by interview category (0-100)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full min-w-0">
                {categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categories.map((c) => ({
                        category: c.category.replace('_', ' '),
                        score: c.averageScore || 0,
                        count: c.evaluatedCount
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="#64748B" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748B" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="score" name="Average Score" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No evaluated categories found for this period.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Activity Timeline Bar Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Practice & Evaluation Activity
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily question answers, coding submissions, and mock interview sessions
                </p>
              </div>
            </div>

            <div className="h-48 w-full min-w-0">
              {activity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748B" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" name="Activities" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No activity recorded for this period.
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default Analytics;

