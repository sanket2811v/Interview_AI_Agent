import React, { useState } from 'react';
import {
  Code2,
  Search,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';

export function TechnicalPractice() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const categories = ['All', 'React & Frontend', 'Node.js & Backend', 'PostgreSQL & Databases', 'System Design'];

  const questions = [
    {
      id: 1,
      category: 'React & Frontend',
      difficulty: 'Hard',
      title: 'How does React 18 Concurrent Rendering handle state prioritization with useTransition and useDeferredValue?',
      hint: 'Think about how low-priority transitions are aborted if an urgent input event arrives.',
      modelAnswer: 'Concurrent React decouples rendering from immediate commitment. useTransition flags an update as non-urgent, allowing high-priority events (keystrokes, clicks) to interrupt work. If an urgent update occurs mid-render, React discards the uncommitted fiber work and prioritizes the user event.'
    },
    {
      id: 2,
      category: 'Node.js & Backend',
      difficulty: 'Medium',
      title: 'Explain the phases of the Node.js Event Loop and where process.nextTick fits in relation to setImmediate.',
      hint: 'nextTick executes at the boundary of each phase before the loop continues.',
      modelAnswer: 'The Event Loop has 6 phases: Timers, Pending Callbacks, Idle/Prepare, Poll, Check (setImmediate), and Close. process.nextTick is NOT part of the event loop itself—its queue runs immediately after the current operation finishes, before moving to the next phase.'
    },
    {
      id: 3,
      category: 'PostgreSQL & Databases',
      difficulty: 'Hard',
      title: 'How does PostgreSQL Multiversion Concurrency Control (MVCC) eliminate read locks while preventing dirty reads?',
      hint: 'Recall xmin and xmax transaction IDs stored on every tuple.',
      modelAnswer: 'PostgreSQL attaches xmin (creating transaction ID) and xmax (deleting/updating transaction ID) to every row tuple. When a query executes, it reads only tuples whose xmin is committed prior to the query snapshot and whose xmax is uncommitted or in the future.'
    },
    {
      id: 4,
      category: 'System Design',
      difficulty: 'Hard',
      title: 'How would you architect a distributed rate limiter that handles 500,000 requests per second across multiple data centers?',
      hint: 'Compare Sliding Window Log vs Token Bucket in Redis with local in-memory buffering.',
      modelAnswer: 'Use Redis cluster with Sliding Window Counter via Lua scripts. To handle 500k RPS without Redis network bottlenecks, deploy local in-process token buckets (Guava/Envoy) at API gateways that sync batches of consumed tokens every 50ms asynchronously.'
    }
  ];

  const filtered = selectedCategory === 'All'
    ? questions
    : questions.filter((q) => q.category === selectedCategory);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Technical Practice Arena"
        subtitle="Master high-frequency engineering questions with structured hints, model answers, and self-assessments."
      />

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === c
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A] text-slate-600 dark:text-slate-300 hover:border-violet-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {filtered.map((q) => (
          <Card key={q.id} className="p-5 hover:border-violet-500/50 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" size="sm">{q.category}</Badge>
                  <span className={`text-xs font-semibold ${
                    q.difficulty === 'Hard' ? 'text-rose-500' : 'text-amber-500'
                  }`}>
                    {q.difficulty}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {q.title}
                </h3>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveQuestion(q);
                  setShowHint(false);
                }}
                className="shrink-0 self-end sm:self-center"
              >
                Practice Question
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Question Modal with Hints & Model Answer */}
      {activeQuestion && (
        <Modal
          isOpen={Boolean(activeQuestion)}
          onClose={() => setActiveQuestion(null)}
          title={activeQuestion.category}
          description={`Difficulty: ${activeQuestion.difficulty}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
              {activeQuestion.title}
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">Your Practice Answer</label>
              <textarea
                rows={4}
                placeholder="Type your explanation using structured engineering principles..."
                className="w-full rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Hint Reveal */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4" />
                  Engineering Hint
                </span>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-amber-500 underline font-semibold"
                >
                  {showHint ? 'Hide Hint' : 'Reveal Hint'}
                </button>
              </div>
              {showHint && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeQuestion.hint}
                </p>
              )}
            </div>

            {/* Model Solution Box */}
            <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-1">
              <h5 className="text-xs font-bold text-violet-600 dark:text-violet-400">
                Staff Engineer Model Answer
              </h5>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeQuestion.modelAnswer}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveQuestion(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => setActiveQuestion(null)}>
                Save to Practice Log
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TechnicalPractice;

