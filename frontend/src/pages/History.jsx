import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon,
  PlayCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Bookmark,
  Flag,
  BarChart2,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { practiceService } from '../services/practiceService.js';

export function History() {
  const navigate = useNavigate();

  const [historyItems, setHistoryItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyRes, statsRes] = await Promise.all([
        practiceService.getPracticeHistory({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
          page: pagination.page,
          limit: pagination.limit
        }),
        practiceService.getPracticeStats()
      ]);

      setHistoryItems(historyRes.items || []);
      setPagination(historyRes.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setStats(statsRes || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load practice history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, pagination.page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchData();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  if (loading && !historyItems.length) {
    return <LoadingState message="Loading practice sessions and historical statistics..." />;
  }

  if (error && !historyItems.length) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      <PageHeader
        title="Practice History & Analytics"
        subtitle="Review past completed interview sessions, resume in-progress practice, and inspect detailed answer formulations."
      />

      {/* Aggregate Statistics Header */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Sessions
            </span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {stats.totalSessions || 0}
            </p>
          </Card>

          <Card className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.completedSessions || 0}
            </p>
          </Card>

          <Card className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Questions Attempted
            </span>
            <p className="text-xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">
              {stats.uniqueQuestionsAttempted || 0}
            </p>
          </Card>

          <Card className="p-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Needs Review
            </span>
            <p className="text-xl font-extrabold text-rose-500 mt-1">
              {stats.needsReviewCount || 0}
            </p>
          </Card>

          <Card className="p-4 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Bookmarked
            </span>
            <p className="text-xl font-extrabold text-amber-500 mt-1">
              {stats.bookmarkedCount || 0}
            </p>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'ALL', label: 'All Sessions' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'COMPLETED', label: 'Completed' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search practice title..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <Button variant="secondary" size="xs" type="submit">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      {/* Practice Sessions List */}
      {historyItems.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No practice sessions found"
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'No practice sessions match your current filter criteria.'
              : 'You have not started any interview practice sessions yet. Open any preparation session and click "Start Interview Practice" to begin.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              iconLeft={PlayCircle}
              onClick={() => navigate('/preparations')}
            >
              Go to My Preparations
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-slate-800">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.status === 'COMPLETED' ? 'success' : 'primary'} size="sm">
                    {item.status}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {item.difficulty}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(item.durationSeconds)}
                  </span>
                  <span className="text-xs text-slate-400">
                    • Started {new Date(item.startedAt || item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-500">
                  Target Role: <strong className="text-slate-700 dark:text-slate-300">{item.preparationSession?.jobTitle}</strong>
                  {item.preparationSession?.companyName && ` at ${item.preparationSession.companyName}`}
                  {' • '}
                  Answered <strong className="text-violet-600 dark:text-violet-400">{item.completedQuestions}</strong> of {item.totalQuestions} questions
                </p>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                <Button
                  variant={item.status === 'COMPLETED' ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => navigate(`/preparations/${item.preparationSessionId}/practice`)}
                  iconRight={ArrowRight}
                >
                  {item.status === 'COMPLETED' ? 'Review Answers' : 'Resume Practice'}
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default History;
