import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  BookOpen,
  Clock,
  CheckCircle2,
  Layers,
  Code2,
  Users2,
  Cpu,
  Compass,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { mockInterviewService } from '../services/mockInterviewService.js';

export function MockInterviews() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [interviewsRes, statsRes] = await Promise.all([
          mockInterviewService.getInterviews({ limit: 20 }),
          mockInterviewService.getInterviewStats()
        ]);

        setInterviews(interviewsRes.interviews || []);
        setStats(statsRes);
      } catch (err) {
        setErrorMessage(err.response?.data?.message || err.message || 'Failed to load mock interview dashboard.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'HR':
        return Users2;
      case 'CODING':
        return Code2;
      case 'SYSTEM_DESIGN':
        return Cpu;
      case 'SCENARIO':
        return Compass;
      case 'MIXED':
        return Layers;
      case 'TECHNICAL':
      default:
        return Sparkles;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'PAUSED':
        return <Badge variant="warning" size="sm">Paused</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary" size="sm">In Progress</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const filteredInterviews = interviews.filter((item) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'IN_PROGRESS') return item.status === 'IN_PROGRESS' || item.status === 'PAUSED';
    if (statusFilter === 'COMPLETED') return item.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="AI Mock Interview Engine"
        subtitle="Practice interactive technical rounds, system architecture, and behavioral interviews with conversational AI."
        actions={
          <Button
            variant="primary"
            size="md"
            iconLeft={Plus}
            onClick={() => navigate('/mock-interviews/new')}
          >
            Start New Interview
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Aggregate Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 space-y-1">
          <div className="text-xs text-slate-500 font-medium">Total Interviews</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalInterviews || 0}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-xs text-slate-500 font-medium">Completed Rounds</div>
          <div className="text-2xl font-bold text-emerald-500">
            {stats?.completedInterviews || 0}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-xs text-slate-500 font-medium">Active / Paused</div>
          <div className="text-2xl font-bold text-violet-500">
            {stats?.inProgressInterviews || 0}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-xs text-slate-500 font-medium">Total Practice Time</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalPracticeMinutes || 0} <span className="text-xs font-normal text-slate-400">mins</span>
          </div>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#27324A] pb-3">
        <div className="flex flex-wrap gap-2">
          {['ALL', 'IN_PROGRESS', 'COMPLETED'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All Sessions' : tab === 'IN_PROGRESS' ? 'Active / In Progress' : 'Completed'}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredInterviews.length} sessions
        </span>
      </div>

      {/* Interviews List */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingState message="Loading your mock interviews..." />
        </div>
      ) : filteredInterviews.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No mock interviews found
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Start an interactive mock interview round to practice answering real questions with our contextual AI interviewer.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            iconLeft={Plus}
            onClick={() => navigate('/mock-interviews/new')}
          >
            Start Your First Mock Interview
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((item) => {
            const Icon = getModeIcon(item.interviewType);
            const isFinished = item.status === 'COMPLETED';

            return (
              <Card
                key={item.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-violet-500/30 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <span className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 flex-shrink-0 mt-0.5">
                    <Icon className="h-5 w-5" />
                  </span>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      {getStatusBadge(item.status)}
                      <Badge variant="outline" size="sm">{item.interviewType}</Badge>
                      <Badge variant="secondary" size="sm">{item.difficulty}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{item._count?.messages || 0} messages</span>
                      <span>•</span>
                      <span>{Math.round((item.duration || 0) / 60)} mins</span>
                      <span>•</span>
                      <span>{item.interviewerPersonality} Style</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isFinished ? (
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={BookOpen}
                      onClick={() => navigate(`/mock-interviews/${item.id}/history`)}
                    >
                      Review Transcript
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      iconLeft={Play}
                      onClick={() => navigate(`/mock-interviews/${item.id}`)}
                    >
                      Resume Interview
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MockInterviews;
