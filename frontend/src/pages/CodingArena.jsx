import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Send,
  RotateCcw,
  Settings,
  ArrowLeft,
  Code2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Terminal
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { MonacoCodeEditor } from '../components/coding/MonacoCodeEditor.jsx';
import { ProblemDescriptionPanel } from '../components/coding/ProblemDescriptionPanel.jsx';
import { ExecutionResultsPanel } from '../components/coding/ExecutionResultsPanel.jsx';
import { codingService } from '../services/codingService.js';
import { apiClient } from '../services/api.js';

const DEFAULT_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript (Node.js)', extension: 'js', fileName: 'solution.js' },
  { id: 'java', name: 'Java (OpenJDK)', extension: 'java', fileName: 'Main.java' },
  { id: 'python', name: 'Python 3', extension: 'py', fileName: 'solution.py' },
  { id: 'cpp', name: 'C++ (GCC)', extension: 'cpp', fileName: 'main.cpp' },
  { id: 'c', name: 'C (GCC)', extension: 'c', fileName: 'main.c' },
  { id: 'csharp', name: 'C# (.NET)', extension: 'cs', fileName: 'Program.cs' },
  { id: 'go', name: 'Go', extension: 'go', fileName: 'main.go' },
  { id: 'php', name: 'PHP', extension: 'php', fileName: 'solution.php' },
  { id: 'ruby', name: 'Ruby', extension: 'rb', fileName: 'solution.rb' },
  { id: 'typescript', name: 'TypeScript', extension: 'ts', fileName: 'solution.ts' }
];

export function CodingArena() {
  const { challengeId: routeChallengeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryChallengeId = searchParams.get('challengeId');
  const practiceSessionId = searchParams.get('sessionId') || null;
  const preparationSessionId = searchParams.get('prepId') || null;

  const challengeId = routeChallengeId || queryChallengeId;

  // Language & Code State
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [isCodeModified, setIsCodeModified] = useState(false);
  const [theme, setTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);

  // Challenge & Workspace State
  const [challenge, setChallenge] = useState(null);
  const [availableChallenges, setAvailableChallenges] = useState([]);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submissionsHistory, setSubmissionsHistory] = useState([]);
  const [loadingActionText, setLoadingActionText] = useState('');

  // Page level state
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Mobile layout active tab ('problem' | 'code' | 'results')
  const [mobileTab, setMobileTab] = useState('code');

  // 1. Initial Load: Fetch languages, challenge, or starter code for standalone mode
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setPageLoading(true);
        setErrorMessage(null);

        // Fetch supported languages from backend
        try {
          const supported = await codingService.getSupportedLanguages();
          if (isMounted && Array.isArray(supported) && supported.length > 0) {
            setLanguages(supported);
          }
        } catch (langErr) {
          console.warn('Using default language specifications:', langErr.message);
        }

        if (challengeId) {
          // Challenge Mode (Mode B)
          setMobileTab('problem');
          const chal = await codingService.getChallengeDetails(challengeId);
          if (isMounted) {
            setChallenge(chal);
            // Fetch starter code for the challenge
            const starter = await codingService.getStarterCode(challengeId, selectedLanguage);
            setCode(starter?.starterCode || '');
            setIsCodeModified(false);

            // Fetch submissions history
            try {
              const history = await codingService.getChallengeSubmissions(challengeId);
              setSubmissionsHistory(history.submissions || []);
            } catch (ignore) {}
          }
        } else {
          // Standalone Mode (Mode A)
          setChallenge(null);
          setMobileTab('code');

          // Load starter code for standalone mode
          try {
            const starter = await codingService.getStarterCode(null, selectedLanguage);
            if (isMounted) {
              setCode(starter?.starterCode || '');
              setIsCodeModified(false);
            }
          } catch (starterErr) {
            console.warn('Failed to load standalone starter code:', starterErr.message);
          }

          // Discover user's interview preparations to populate optional challenge picker
          try {
            const prepsRes = await apiClient.get('/preparations?limit=10');
            const preps = Array.isArray(prepsRes.data)
              ? prepsRes.data
              : (prepsRes.data?.preparations || prepsRes.data?.data?.preparations || []);
            const discovered = [];

            for (const p of preps) {
              try {
                const chalRes = await apiClient.get(`/preparations/${p.id}/coding-challenges`);
                const chals = Array.isArray(chalRes.data)
                  ? chalRes.data
                  : (chalRes.data?.codingChallenges || chalRes.data?.data?.codingChallenges || []);
                chals.forEach((c) => discovered.push({ ...c, prepTitle: p.title }));
              } catch (ignore) {}
            }

            if (isMounted) {
              setAvailableChallenges(discovered);
            }
          } catch (ignore) {}
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.message || err.message || 'Failed to initialize coding workspace');
        }
      } finally {
        if (isMounted) setPageLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [challengeId]);

  // 2. Handle Language Switch
  const handleLanguageChange = async (newLang) => {
    if (newLang === selectedLanguage) return;

    if (isCodeModified) {
      const confirmSwitch = window.confirm(
        'Switching languages will load the starter template for the new language. Unsaved edits will be lost. Continue?'
      );
      if (!confirmSwitch) return;
    }

    setSelectedLanguage(newLang);
    try {
      const starter = await codingService.getStarterCode(challengeId, newLang);
      setCode(starter?.starterCode || '');
      setIsCodeModified(false);
    } catch (err) {
      console.error('Failed to load starter code for', newLang, err);
    }
  };

  // 3. Reset Code
  const handleResetCode = async () => {
    const confirmReset = window.confirm('Reset code to starter template?');
    if (!confirmReset) return;

    try {
      const starter = await codingService.getStarterCode(challengeId, selectedLanguage);
      setCode(starter?.starterCode || '');
      setIsCodeModified(false);
    } catch (err) {
      console.error('Failed to reset template', err);
    }
  };

  // 4. Run Code (Works in both Standalone Mode & Challenge Mode)
  const handleRun = async () => {
    if (isRunning || isSubmitting) return;

    if (!code || !code.trim()) {
      alert('Source code cannot be empty. Please enter code to run.');
      return;
    }

    try {
      setIsRunning(true);
      setMobileTab('results');

      if (!challengeId) {
        // Mode A: Standalone Execution
        setLoadingActionText('Executing program in isolated sandbox...');
        const result = await codingService.runStandaloneCode({
          language: selectedLanguage,
          sourceCode: code,
          stdin
        });

        setRunResult({
          ...result,
          isStandalone: true,
          verdict: result.status === 'SUCCESS' ? 'SUCCESS' : result.status,
          testResults: []
        });
        setSubmissionResult(null);
      } else {
        // Mode B: Challenge-Based Execution
        setLoadingActionText('Executing code against sample test cases in sandbox...');
        const result = await codingService.runCode(challengeId, {
          language: selectedLanguage,
          sourceCode: code,
          stdin
        });

        setRunResult(result);
        setSubmissionResult(null);
      }
    } catch (err) {
      let status = 'PROVIDER_ERROR';
      const msg = err.response?.data?.message || err.message || 'Execution failed';
      const httpStatus = err.response?.status || err.status;

      if (httpStatus === 404) {
        status = 'API_ROUTE_ERROR';
      } else if (httpStatus === 401 || httpStatus === 403) {
        status = 'AUTH_ERROR';
      } else if (httpStatus === 503 || msg.includes('offline') || err.message === 'Network Error') {
        status = 'NETWORK_ERROR';
      } else if (msg.includes('API key') || msg.includes('provider configuration') || msg.includes('provider disabled')) {
        status = 'PROVIDER_CONFIG_ERROR';
      }

      setRunResult({
        status,
        verdict: status,
        language: selectedLanguage,
        stdout: '',
        stderr: msg,
        errorMessage: msg,
        exitCode: 1,
        executionTimeMs: 0,
        isStandalone: !challengeId,
        testResults: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 5. Submit Solution against All Cases (Challenge Mode only)
  const handleSubmit = async () => {
    if (isRunning || isSubmitting) return;

    if (!challengeId) {
      alert(
        'Submit evaluates your code against formal challenge test cases. Please select a coding challenge to submit, or click "Run" to test your code standalone.'
      );
      return;
    }

    if (!code || !code.trim()) {
      alert('Source code cannot be empty. Please enter code to submit.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLoadingActionText('Evaluating solution against all hidden & public test cases...');
      setMobileTab('results');

      const result = await codingService.submitSolution(challengeId, {
        language: selectedLanguage,
        sourceCode: code,
        practiceSessionId
      });

      setSubmissionResult(result);
      setRunResult(null);

      // Refresh submissions history
      try {
        const history = await codingService.getChallengeSubmissions(challengeId);
        setSubmissionsHistory(history.submissions || []);
      } catch (ignore) {}
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Submission failed';
      setSubmissionResult({
        status: 'INTERNAL_ERROR',
        isAccepted: false,
        testCasesPassed: 0,
        totalTestCases: 0,
        errorMessage: msg,
        testResults: []
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Load Previous Submission Code
  const handleLoadSubmissionCode = async (submissionId) => {
    try {
      const details = await codingService.getSubmissionDetails(submissionId);
      if (details?.sourceCode) {
        setCode(details.sourceCode);
        if (details.language) setSelectedLanguage(details.language);
        setIsCodeModified(true);
        setMobileTab('code');
      }
    } catch (err) {
      console.error('Failed to load submission source code', err);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingState message="Loading coding workspace..." />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Coding Arena Error</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{errorMessage}</p>
        <div className="pt-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Return to Previous Page
          </Button>
        </div>
      </div>
    );
  }

  const currentLangObj = languages.find((l) => l.id === selectedLanguage) || DEFAULT_LANGUAGES.find((l) => l.id === selectedLanguage);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-[1920px] mx-auto px-2 sm:px-4 pb-4 space-y-3">
      {/* Top Navigation & Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (practiceSessionId && preparationSessionId) {
                navigate(`/preparations/${preparationSessionId}/practice`);
              } else {
                navigate(-1);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0B1020] transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[280px] sm:max-w-md">
                {challenge?.title || 'Coding Arena — Standalone Runner'}
              </span>
              {challenge?.difficulty ? (
                <Badge variant={challenge.difficulty === 'EASY' ? 'success' : challenge.difficulty === 'HARD' ? 'danger' : 'warning'} size="sm">
                  {challenge.difficulty}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">Standalone Mode</Badge>
              )}
            </div>
            {challenge?.category && (
              <span className="text-[11px] text-slate-400">{challenge.category}</span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="language-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
              Language:
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] text-xs font-semibold px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer shadow-sm"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Switcher */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="hidden sm:inline-block rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] text-xs font-medium px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="vs-dark">Dark Theme</option>
            <option value="vs-light">Light Theme</option>
          </select>

          {/* Run Button */}
          <Button
            variant="secondary"
            size="sm"
            iconLeft={Play}
            loading={isRunning}
            disabled={isSubmitting}
            onClick={handleRun}
            title="Execute code in sandbox (Ctrl + Enter)"
          >
            Run
          </Button>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="sm"
            iconLeft={Send}
            loading={isSubmitting}
            disabled={isRunning}
            onClick={handleSubmit}
            title={challengeId ? "Submit solution against all test cases" : "Submit requires selecting a challenge"}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Mobile Screen Tab Bar (visible on screens < 1024px) */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-[#151C2E] p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab('problem')}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            mobileTab === 'problem'
              ? 'bg-white dark:bg-[#0B1020] text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          {challenge ? 'Problem' : 'Runner Info'}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('code')}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            mobileTab === 'code'
              ? 'bg-white dark:bg-[#0B1020] text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('results')}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            mobileTab === 'results'
              ? 'bg-white dark:bg-[#0B1020] text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-slate-500'
          }`}
        >
          Results
        </button>
      </div>

      {/* Main Workspace Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Column: Problem Description / Standalone Runner Panel (5 cols on lg) */}
        <div
          className={`lg:col-span-5 h-full overflow-hidden ${
            mobileTab !== 'problem' ? 'hidden lg:block' : 'block'
          }`}
        >
          <ProblemDescriptionPanel
            challenge={challenge}
            stdin={stdin}
            onStdinChange={setStdin}
            availableChallenges={availableChallenges}
            onSelectChallenge={(newId) => navigate(`/coding/${newId}`)}
          />
        </div>

        {/* Right Column: Code Editor & Execution Results (7 cols on lg) */}
        <div
          className={`lg:col-span-7 h-full flex flex-col gap-3 min-h-0 overflow-hidden ${
            mobileTab === 'problem' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Half: Monaco Editor */}
          <div
            className={`flex-1 min-h-[300px] overflow-hidden ${
              mobileTab === 'results' ? 'hidden lg:block' : 'block'
            }`}
          >
            <MonacoCodeEditor
              value={code}
              onChange={(newVal) => {
                setCode(newVal);
                setIsCodeModified(true);
              }}
              language={selectedLanguage}
              fileName={currentLangObj?.fileName}
              theme={theme}
              fontSize={fontSize}
              onRun={handleRun}
              onSubmit={handleSubmit}
              onReset={handleResetCode}
            />
          </div>

          {/* Bottom Half: Execution Results Panel */}
          <div
            className={`flex-1 min-h-[220px] max-h-[360px] overflow-hidden ${
              mobileTab === 'code' ? 'hidden lg:block' : 'block'
            }`}
          >
            <ExecutionResultsPanel
              runResult={runResult}
              submissionResult={submissionResult}
              submissionsHistory={submissionsHistory}
              isLoading={isRunning || isSubmitting}
              loadingAction={loadingActionText}
              onLoadSubmissionCode={handleLoadSubmissionCode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodingArena;
