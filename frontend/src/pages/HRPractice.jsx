import React, { useState } from 'react';
import {
  Users2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Award
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';

export function HRPractice() {
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [starAnswer, setStarAnswer] = useState({
    situation: '',
    task: '',
    action: '',
    result: ''
  });

  const hrQuestions = [
    {
      id: 1,
      title: 'Tell me about a time you experienced a major production incident and how you communicated with executive stakeholders.',
      competency: 'Crisis Management & Communication'
    },
    {
      id: 2,
      title: 'Describe a situation where a product manager requested a feature that conflicted with code quality or architectural health.',
      competency: 'Constructive Disagreement & Trade-offs'
    },
    {
      id: 3,
      title: 'Give an example of how you mentored a junior engineer who was struggling to hit delivery milestones.',
      competency: 'Mentorship & Team Leadership'
    }
  ];

  const currentQ = hrQuestions[activeQuestionIdx];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Behavioral & HR Practice (STAR Method)"
        subtitle="Structure high-scoring behavioral answers using the Situation, Task, Action, and Result framework."
      />

      {/* Question Selector Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {hrQuestions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setActiveQuestionIdx(idx)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeQuestionIdx === idx
                ? 'border-violet-600 bg-violet-500/10 dark:bg-violet-500/10 shadow-sm'
                : 'border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">
              Question {idx + 1}
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-1">
              {q.title}
            </p>
          </button>
        ))}
      </div>

      {/* Active Question Box */}
      <Card className="p-6">
        <div className="space-y-2">
          <Badge variant="primary" size="sm">{currentQ.competency}</Badge>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            "{currentQ.title}"
          </h2>
        </div>

        {/* STAR Framework Response Builder */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
              <span className="h-5 w-5 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px]">S</span>
              Situation (Context & Challenge)
            </label>
            <textarea
              rows={2}
              value={starAnswer.situation}
              onChange={(e) => setStarAnswer({ ...starAnswer, situation: e.target.value })}
              placeholder="What was the setting, system architecture, or baseline problem?"
              className="w-full rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
              <span className="h-5 w-5 rounded bg-violet-500/10 text-violet-500 flex items-center justify-center text-[10px]">T</span>
              Task (Your specific responsibility)
            </label>
            <textarea
              rows={2}
              value={starAnswer.task}
              onChange={(e) => setStarAnswer({ ...starAnswer, task: e.target.value })}
              placeholder="What was expected of you specifically?"
              className="w-full rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
              <span className="h-5 w-5 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center text-[10px]">A</span>
              Action (What steps you took)
            </label>
            <textarea
              rows={3}
              value={starAnswer.action}
              onChange={(e) => setStarAnswer({ ...starAnswer, action: e.target.value })}
              placeholder="Detail the technical decisions, collaborative steps, and tools used."
              className="w-full rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
              <span className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px]">R</span>
              Result (Measurable outcomes & learnings)
            </label>
            <textarea
              rows={2}
              value={starAnswer.result}
              onChange={(e) => setStarAnswer({ ...starAnswer, result: e.target.value })}
              placeholder="Quantifiable impact: % latency reduced, $ saved, team morale improved."
              className="w-full rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#27324A]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Auto-saves to candidate dossier</span>
          <Button variant="primary" size="sm" iconRight={ArrowRight}>
            Evaluate Answer with AI
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default HRPractice;

