import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Terminal,
  History,
  Code2,
  RotateCcw,
  Check,
  Copy
} from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

export function ExecutionResultsPanel({
  runResult,
  submissionResult,
  submissionsHistory = [],
  isLoading = false,
  loadingAction = 'Running tests...',
  onLoadSubmissionCode,
  className = ''
}) {
  const [activeTab, setActiveTab] = useState('tests');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);

  const activeResult = submissionResult || runResult;

  // If standalone execution was run, automatically switch to the output tab
  useEffect(() => {
    if (runResult?.isStandalone) {
      setActiveTab('output');
    } else if (submissionResult) {
      setActiveTab('tests');
    }
  }, [runResult, submissionResult]);

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
            Success
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
            Accepted
          </span>
        );
      case 'WRONG_ANSWER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <XCircle className="h-4 w-4" />
            Wrong Answer
          </span>
        );
      case 'COMPILATION_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4" />
            Compilation Error
          </span>
        );
      case 'TIME_LIMIT_EXCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="h-4 w-4" />
            Time Limit Exceeded
          </span>
        );
      case 'RUNTIME_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <AlertTriangle className="h-4 w-4" />
            Runtime Error
          </span>
        );
      case 'API_ROUTE_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertTriangle className="h-4 w-4" />
            API Route Error
          </span>
        );
      case 'NETWORK_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4" />
            Network Error
          </span>
        );
      case 'AUTH_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4" />
            Provider Authentication Failed
          </span>
        );
      case 'PROVIDER_CONFIG_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertTriangle className="h-4 w-4" />
            Provider Config Error
          </span>
        );
      case 'PROVIDER_ERROR':
      case 'INTERNAL_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertTriangle className="h-4 w-4" />
            Provider Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {verdict || 'Ready'}
          </span>
        );
    }
  };

  const testCases = activeResult?.testResults || [];
  const selectedCase = testCases[selectedTestCaseIdx] || testCases[0] || null;

  // Determine standard output to display
  const standardOutput =
    activeResult?.stdout !== undefined && activeResult?.stdout !== null && activeResult?.stdout !== ''
      ? activeResult.stdout
      : (activeResult?.testResults?.[0]?.actualOutput || '');

  // Determine error / stderr to display
  const errorOutput =
    activeResult?.compileOutput ||
    activeResult?.compilationError ||
    activeResult?.runtimeError ||
    activeResult?.stderr ||
    activeResult?.errorMessage ||
    '';

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] overflow-hidden ${className}`}>
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#27324A] px-4 text-xs font-semibold select-none bg-slate-50/50 dark:bg-[#0B1020]/50">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Output
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'tests'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Test Results
            {testCases.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-800">
                {activeResult?.passedTestCases || 0}/{activeResult?.totalTestCases || testCases.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Submissions ({submissionsHistory.length})
          </button>
        </div>

        {activeResult && (
          <div className="flex items-center gap-3">
            {activeResult.executionTimeMs !== undefined && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400">
                <Clock className="h-3 w-3" />
                {activeResult.executionTimeMs} ms
              </span>
            )}
            {getVerdictBadge(activeResult.status || activeResult.verdict)}
          </div>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400 font-medium animate-pulse">{loadingAction}</p>
          </div>
        ) : activeTab === 'output' ? (
          /* Output Tab */
          !activeResult ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
              <Terminal className="h-8 w-8 text-slate-500 opacity-50" />
              <p className="text-sm font-medium">Click "Run" to execute your program</p>
              <p className="text-xs text-slate-500">Live output, compiler messages, and execution duration will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {/* Error / Compiler Output */}
              {errorOutput ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 space-y-1">
                  <span className="font-bold font-sans text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {activeResult.status === 'COMPILATION_ERROR'
                      ? 'Compilation / Syntax Output:'
                      : activeResult.status === 'AUTH_ERROR'
                      ? 'Provider Authentication Error:'
                      : 'Error / Standard Error (stderr):'}
                  </span>
                  <pre className="whitespace-pre-wrap overflow-x-auto text-xs">{errorOutput}</pre>
                </div>
              ) : null}

              {/* Standard Output (stdout) */}
              {standardOutput ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-slate-800 dark:text-slate-200 space-y-1">
                  <span className="text-slate-400 font-bold font-sans text-[11px] block mb-1">
                    Standard Output (stdout):
                  </span>
                  <pre className="whitespace-pre-wrap overflow-x-auto text-emerald-400 font-mono text-xs">{standardOutput}</pre>
                </div>
              ) : !errorOutput ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-slate-400 text-center">
                  Program executed successfully with no output to stdout (exit code 0).
                </div>
              ) : null}

              {/* Execution Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1 text-[11px] font-sans text-slate-400 border-t border-slate-100 dark:border-[#27324A]">
                <div className="flex items-center gap-3">
                  <span>Exit Code: <strong className={activeResult.exitCode === 0 || activeResult.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>{activeResult.exitCode !== undefined ? activeResult.exitCode : (activeResult.status === 'SUCCESS' ? 0 : 1)}</strong></span>
                  {activeResult.executionTimeMs !== undefined && (
                    <span>Time: <strong>{activeResult.executionTimeMs} ms</strong></span>
                  )}
                </div>
                {activeResult.language && (
                  <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-300">
                    {activeResult.language}
                  </span>
                )}
              </div>
            </div>
          )
        ) : activeTab === 'tests' ? (
          /* Test Results Tab */
          !activeResult ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-slate-500 opacity-50" />
              <p className="text-sm font-medium">No test results to display</p>
              <p className="text-xs text-slate-500">Run code or submit against challenge test cases to inspect individual results.</p>
            </div>
          ) : testCases.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-2 font-sans text-xs">
              <Terminal className="h-6 w-6 mx-auto text-violet-400" />
              <p className="font-semibold text-slate-300">Standalone Code Execution</p>
              <p>Your code executed in standalone mode. Review output in the <strong>Output</strong> tab.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Test Case Selectors */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-[#27324A]">
                {testCases.map((tc, idx) => {
                  const isPassed = tc.passed;
                  const isSelected = (selectedTestCaseIdx === idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedTestCaseIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                          : isPassed
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Case {idx + 1}
                      {tc.isHidden && <span className="text-[10px] opacity-75">(Hidden)</span>}
                    </button>
                  );
                })}
              </div>

              {/* Selected Case Detail */}
              {selectedCase && (
                <div className="space-y-3 font-mono text-xs">
                  {selectedCase.isHidden ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-slate-500 italic">
                      This is a hidden evaluation test case. Inputs and expected outputs are confidential to prevent test case tampering.
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-400 font-sans font-bold text-[11px]">Input:</span>
                        <pre className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                          {selectedCase.input || '(No input)'}
                        </pre>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-400 font-sans font-bold text-[11px]">Expected Output:</span>
                          <pre className="mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-emerald-500 font-semibold overflow-x-auto whitespace-pre-wrap">
                            {selectedCase.expectedOutput}
                          </pre>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans font-bold text-[11px]">Actual Output:</span>
                          <pre className={`mt-1 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] font-semibold overflow-x-auto whitespace-pre-wrap ${
                            selectedCase.passed ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {selectedCase.actualOutput || '(No output)'}
                          </pre>
                        </div>
                      </div>

                      {selectedCase.error && (
                        <div>
                          <span className="text-rose-400 font-sans font-bold text-[11px]">Error Message:</span>
                          <pre className="mt-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 overflow-x-auto whitespace-pre-wrap">
                            {selectedCase.error}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          /* Submissions History */
          <div className="space-y-3">
            {submissionsHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 italic">
                No previous submissions for this challenge yet.
              </div>
            ) : (
              submissionsHistory.map((sub) => {
                const isAccepted = sub.executionStatus === 'ACCEPTED';
                return (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getVerdictBadge(sub.executionStatus)}
                        <span className="font-mono text-slate-400 uppercase text-[10px]">
                          {sub.language}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Passed {sub.testCasesPassed}/{sub.totalTestCases} test cases • {new Date(sub.submittedAt).toLocaleString()}
                      </div>
                    </div>

                    {onLoadSubmissionCode && (
                      <button
                        type="button"
                        onClick={() => onLoadSubmissionCode(sub.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#27324A] hover:bg-slate-200 dark:hover:bg-[#151C2E] text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
                      >
                        <Code2 className="h-3 w-3" />
                        View Code
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionResultsPanel;
