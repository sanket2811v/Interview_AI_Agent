import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Cpu,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Terminal,
  Code2,
  Sparkles,
  Play
} from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export function ProblemDescriptionPanel({
  challenge,
  stdin = '',
  onStdinChange,
  availableChallenges = [],
  onSelectChallenge,
  className = ''
}) {
  const [activeTab, setActiveTab] = useState('description');
  const [revealedHints, setRevealedHints] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  // If no challenge is selected, display the Standalone Code Runner Workspace
  if (!challenge) {
    return (
      <div className={`flex flex-col h-full bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] overflow-hidden ${className}`}>
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#27324A] space-y-2 bg-slate-50/50 dark:bg-[#0B1020]/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-violet-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Standalone Code Runner
              </h2>
            </div>
            <Badge variant="success" size="sm">Active Sandbox</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Write, execute, and inspect programs in real-time without requiring a coding challenge.
          </p>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Challenge Selector (if user has available interview challenges) */}
          {availableChallenges && availableChallenges.length > 0 && (
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-2">
              <span className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
                <Code2 className="h-4 w-4" />
                Practice an Interview Challenge
              </span>
              <p className="text-[11px] text-slate-400">
                You have challenges generated for your preparation sessions. Select one to evaluate against official test cases:
              </p>
              <select
                onChange={(e) => {
                  if (e.target.value && onSelectChallenge) {
                    onSelectChallenge(e.target.value);
                  }
                }}
                defaultValue=""
                className="w-full text-xs rounded-lg border border-violet-500/30 bg-white dark:bg-[#0B1020] text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="" disabled>-- Select a challenge to practice --</option>
                {availableChallenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.difficulty || 'MEDIUM'}) {c.prepTitle ? `— ${c.prepTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Standard Input (stdin) Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="custom-stdin" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-violet-400" />
                Standard Input (stdin)
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <textarea
              id="custom-stdin"
              value={stdin}
              onChange={(e) => onStdinChange && onStdinChange(e.target.value)}
              placeholder="Enter custom input data to feed into stdin (e.g. test numbers, lines, or arguments)..."
              rows={5}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] text-slate-800 dark:text-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
            />
          </div>

          {/* Execution Tips */}
          <div className="space-y-3 pt-2 text-xs">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Quick Tips
            </h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-[11px] list-disc list-inside">
              <li>
                <strong className="text-slate-700 dark:text-slate-200">Java:</strong> The main class must be <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-violet-400">public class Main</code> matching <code className="font-mono text-violet-400">Main.java</code>.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-200">Run Shortcut:</strong> Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">Ctrl + Enter</kbd> to execute your code immediately.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-200">Real Execution:</strong> Code runs in a secure, isolated sandbox with full standard output, standard error, and exit codes.
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const handleCopy = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleHint = (index) => {
    setRevealedHints((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const hints = Array.isArray(challenge.hints) ? challenge.hints : [];
  const constraints = Array.isArray(challenge.constraints) ? challenge.constraints : [];
  const sampleCases = Array.isArray(challenge.testCases)
    ? challenge.testCases.filter((tc) => !tc.isHidden)
    : [];

  const getDifficultyBadge = (diff) => {
    switch (diff?.toUpperCase()) {
      case 'EASY':
        return <Badge variant="success" size="sm">Easy</Badge>;
      case 'HARD':
      case 'EXPERT':
        return <Badge variant="danger" size="sm">Hard</Badge>;
      case 'MEDIUM':
      default:
        return <Badge variant="warning" size="sm">Medium</Badge>;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] overflow-hidden ${className}`}>
      {/* Challenge Title Bar */}
      <div className="p-5 border-b border-slate-200 dark:border-[#27324A] space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {challenge.title}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getDifficultyBadge(challenge.difficulty)}
            <Badge variant="neutral" size="sm">{challenge.category || 'Algorithms'}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-violet-400" />
            {challenge.timeLimit || 2000} ms
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            {challenge.memoryLimit || 128} MB
          </span>
          {challenge.expectedTimeComplexity && (
            <span className="font-mono text-slate-400">
              O({challenge.expectedTimeComplexity})
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#27324A] px-4 text-xs font-semibold select-none bg-slate-50/50 dark:bg-[#0B1020]/50">
        <button
          onClick={() => setActiveTab('description')}
          className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'description'
              ? 'border-violet-500 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Description
        </button>

        {hints.length > 0 && (
          <button
            onClick={() => setActiveTab('hints')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'hints'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Hints ({hints.length})
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'description' ? (
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {/* Problem Statement */}
            <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
              <p className="whitespace-pre-wrap">{challenge.description}</p>
            </div>

            {/* Constraints */}
            {constraints.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Constraints
                </h3>
                <ul className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
                  {constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Test Cases */}
            {sampleCases.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Sample Test Cases
                </h3>
                {sampleCases.map((tc, idx) => (
                  <div
                    key={tc.id || idx}
                    className="rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] p-3.5 space-y-3 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-400 font-sans font-semibold text-[11px]">
                      <span>Sample Case {idx + 1}</span>
                      <button
                        onClick={() => handleCopy(`input-${idx}`, tc.input)}
                        className="hover:text-slate-200 transition-colors flex items-center gap-1"
                      >
                        {copiedKey === `input-${idx}` ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copy
                      </button>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block mb-1">Input:</span>
                      <pre className="p-2 rounded-lg bg-white dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A] overflow-x-auto whitespace-pre-wrap">
                        {tc.input}
                      </pre>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block mb-1">Expected Output:</span>
                      <pre className="p-2 rounded-lg bg-white dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                        {tc.expectedOutput}
                      </pre>
                    </div>

                    {tc.explanation && (
                      <div className="text-[11px] text-slate-400 font-sans italic pt-1">
                        Explanation: {tc.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Hints Tab */
          <div className="space-y-3">
            {hints.map((hint, idx) => {
              const isRevealed = revealedHints[idx];
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] overflow-hidden text-xs"
                >
                  <button
                    onClick={() => toggleHint(idx)}
                    className="w-full p-3.5 flex items-center justify-between text-left font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151C2E] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-violet-400" />
                      Hint {idx + 1}
                    </span>
                    {isRevealed ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {isRevealed && (
                    <div className="p-3.5 pt-0 border-t border-slate-200 dark:border-[#27324A] text-slate-600 dark:text-slate-300 leading-relaxed bg-white/50 dark:bg-[#151C2E]/50">
                      {hint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProblemDescriptionPanel;
