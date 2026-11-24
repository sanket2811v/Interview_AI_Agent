import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Target,
  Flame,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { analyticsService } from '../services/analyticsService.js';

export function Progress() {
  const [overview, setOverview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ovData, histData] = await Promise.all([
        analyticsService.getProgressOverview(),
        analyticsService.getProgressHistory()
      ]);
      setOverview(ovData);
      setHistory(histData?.timeline || []);
    } catch (err) {
      setError(err.message || 'Failed to load progress metrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="Learning Progress & Milestones"
        subtitle="Track continuous improvement velocity, roadmap task completion, and competency milestones over time."
      />

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingState message="Calculating continuous learning velocity..." />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-rose-500">
          <p className="font-semibold mb-2">Error Loading Progress</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadProgress}>
            Retry
          </Button>
        </Card>
      ) : (
        <>
          {/* Top Progress Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Task Completion Gauge */}
            <Card className="p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Roadmap Task Completion
                </span>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-4xl font-extrabold text-violet-600 dark:text-violet-400">
                    {overview.tasks.completionPercentage}%
                  </span>
                  <span className="text-xs text-slate-500">
                    {overview.tasks.completed}/{overview.tasks.total} Tasks
                  </span>
                </div>

                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${overview.tasks.completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Pending</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {overview.tasks.pending}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">In Progress</span>
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                    {overview.tasks.inProgress}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Overdue</span>
                  <span className="text-sm font-bold text-rose-500">
                    {overview.tasks.overdue}
                  </span>
                </div>
              </div>
            </Card>

            {/* Streak & Consistency Card */}
            <Card className="p-6 flex flex-col justify-between bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
              <div>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center">
                  <Flame className="h-4 w-4 mr-1 text-amber-500" /> Practice Consistency
                </span>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-amber-600 dark:text-amber-400">
                    {overview.streak}
                  </span>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {overview.streak === 1 ? 'Day Active' : 'Days Active Streak'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Maintain daily momentum by answering 1 technical question or solving 1 coding challenge.
                </p>
              </div>

              <div className="text-[11px] text-slate-400 mt-4 pt-4 border-t border-amber-500/10">
                Last recorded activity: {overview.lastActivity || 'No activity yet'}
              </div>
            </Card>

            {/* Competency Mastery Card */}
            <Card className="p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
                  <Target className="h-4 w-4 mr-1 text-indigo-500" /> Evaluated Competencies
                </span>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    {overview.skills.assessed}
                  </span>
                  <span className="text-xs text-slate-500">
                    of {overview.skills.total} Benchmarked
                  </span>
                </div>

                <div className="space-y-1.5 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Strong:</span>
                    <span className="font-bold">{overview.skills.strong}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Developing:</span>
                    <span className="font-bold">{overview.skills.improving}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-rose-600 dark:text-rose-400 font-medium">Needs Focus:</span>
                    <span className="font-bold">{overview.skills.requiringPractice}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs cursor-pointer"
                  onClick={() => (window.location.href = '/analytics/skill-gaps')}
                >
                  View Full Skill Gap Breakdown <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Milestones Unlocked */}
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center">
              <Award className="h-5 w-5 mr-1.5 text-amber-500" />
              <span>Achievement Milestones</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.milestones?.map((m) => (
                <Card
                  key={m.id}
                  className={`p-4 transition-all ${
                    m.achieved
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'opacity-70 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {m.achieved ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <Badge variant={m.achieved ? 'success' : 'secondary'} className="text-[10px]">
                      {m.achieved ? 'Unlocked' : m.unlockedAt || 'Locked'}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
                    {m.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {m.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Progress Timeline */}
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center">
              <Clock className="h-5 w-5 mr-1.5 text-violet-500" />
              <span>Recent Activity Timeline</span>
            </h3>

            <Card className="p-5">
              {history.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No historical progress events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {history.map((ev, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-violet-600 border-2 border-white dark:border-[#0F172A]" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ev.detail}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(ev.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default Progress;

