import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Code2,
  Users2,
  Cpu,
  Layers,
  Compass,
  Clock,
  HelpCircle,
  SlidersHorizontal,
  Briefcase,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { mockInterviewService } from '../services/mockInterviewService.js';
import { apiClient } from '../services/api.js';

const INTERVIEW_TYPES = [
  {
    id: 'TECHNICAL',
    title: 'Technical Round',
    description: 'Deep-dive technical assessment covering language internals, REST APIs, databases, and frameworks.',
    icon: Code2,
    badgeVariant: 'primary'
  },
  {
    id: 'HR',
    title: 'HR & Behavioral',
    description: 'STAR-based conversational interview evaluating teamwork, conflict resolution, leadership, and culture fit.',
    icon: Users2,
    badgeVariant: 'success'
  },
  {
    id: 'CODING',
    title: 'Coding Discussion',
    description: 'Algorithmic approach breakdown, time/space complexity evaluation, and edge-case probing.',
    icon: Code2,
    badgeVariant: 'warning'
  },
  {
    id: 'SYSTEM_DESIGN',
    title: 'System Design',
    description: 'Architecture requirements, distributed components, database schemas, scaling, and tradeoff exploration.',
    icon: Cpu,
    badgeVariant: 'info'
  },
  {
    id: 'SCENARIO',
    title: 'Incident & Scenario',
    description: 'Real-world production triage: outage handling, rollback mitigation, and post-mortem analysis.',
    icon: Compass,
    badgeVariant: 'danger'
  },
  {
    id: 'MIXED',
    title: 'Comprehensive Mixed',
    description: 'Holistic multi-dimensional interview balancing technical mastery, architecture, and team collaboration.',
    icon: Layers,
    badgeVariant: 'secondary'
  }
];

const INTERVIEW_MODES = INTERVIEW_TYPES;

const PERSONALITIES = [
  { id: 'Professional', label: 'Professional', desc: 'Balanced, formal, articulate, and objective' },
  { id: 'Friendly', label: 'Friendly', desc: 'Warm, encouraging, patient, and conversational' },
  { id: 'Strict', label: 'Strict', desc: 'Rigorous, concise, challenges vague assertions' },
  { id: 'Supportive', label: 'Supportive', desc: 'Mentoring, positive reinforcement, gentle nudges' },
  { id: 'Challenging', label: 'Challenging', desc: 'Devil’s advocate, continuously tests limits' }
];

const PERSONALITY_STYLES = PERSONALITIES;

export function CreateMockInterview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prepIdParam = searchParams.get('prepId');

  const [preparations, setPreparations] = useState([]);
  const [selectedPrepId, setSelectedPrepId] = useState(prepIdParam || '');
  const [interviewType, setInterviewType] = useState('TECHNICAL');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [experienceLevel, setExperienceLevel] = useState('MID');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionLimit, setQuestionLimit] = useState(5);
  const [interviewerPersonality, setInterviewerPersonality] = useState('Professional');
  const [language, setLanguage] = useState('English');
  const [allowHints, setAllowHints] = useState(true);
  const [allowClarification, setAllowClarification] = useState(true);
  const [allowSkip, setAllowSkip] = useState(true);

  const [loadingPreps, setLoadingPreps] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    async function loadPreps() {
      try {
        setLoadingPreps(true);
        const res = await apiClient.get('/preparations?limit=20');
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.preparations || res.data?.data?.preparations || res.data?.data || (Array.isArray(res) ? res : []));
        setPreparations(list);

        if (!selectedPrepId && list.length > 0) {
          setSelectedPrepId(list[0].id);
          if (list[0].experienceLevel) setExperienceLevel(list[0].experienceLevel);
          if (list[0].difficulty) setDifficulty(list[0].difficulty);
        }
      } catch (err) {
        setErrorMessage('Failed to load job preparations.');
      } finally {
        setLoadingPreps(false);
      }
    }
    loadPreps();
  }, []);

  const handleStartInterview = async () => {
    if (isStartingRef.current || isStarting) return;

    if (!selectedPrepId) {
      setErrorMessage('Please select a target job preparation.');
      return;
    }

    try {
      isStartingRef.current = true;
      setIsStarting(true);
      setErrorMessage(null);

      const payload = {
        preparationSessionId: selectedPrepId,
        interviewType,
        difficulty,
        experienceLevel,
        durationMinutes: Number(durationMinutes),
        questionLimit: Number(questionLimit),
        interviewerPersonality,
        language,
        preferences: {
          allowHints,
          allowClarification,
          allowSkip
        }
      };

      const result = await mockInterviewService.createInterview(payload);
      const targetId =
        result?.interview?.id ||
        result?.id ||
        result?.interviewId ||
        result?.data?.interview?.id ||
        result?.data?.id ||
        result?.data?.interviewId;

      if (targetId) {
        navigate(`/mock-interviews/${targetId}`);
      } else {
        throw new Error('Interview was initialized, but no session ID was returned.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to initialize AI mock interview.'
      );
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  };

  if (loadingPreps) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Loading interview configuration workspace..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Configure AI Mock Interview"
        subtitle="Set up your role parameters, AI interviewer personality, and evaluation round type."
        actions={
          <Button variant="outline" size="sm" iconLeft={ArrowLeft} onClick={() => navigate('/mock-interviews')}>
            Back to Dashboard
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Target Job Preparation */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Briefcase className="h-4 w-4 text-violet-500" />
          <span>1. Select Target Job Preparation</span>
        </div>

        {preparations.length === 0 ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
            No active job preparations found. Please create a preparation session first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {preparations.map((prep) => (
              <button
                key={prep.id}
                type="button"
                onClick={() => {
                  setSelectedPrepId(prep.id);
                  if (prep.experienceLevel) setExperienceLevel(prep.experienceLevel);
                  if (prep.difficulty) setDifficulty(prep.difficulty);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedPrepId === prep.id
                    ? 'border-violet-600 bg-violet-500/5 shadow-sm ring-1 ring-violet-500'
                    : 'border-slate-200 dark:border-[#27324A] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {prep.jobTitle}
                </div>
                <div className="text-xs text-slate-500 truncate">{prep.companyName || 'General Preparation'}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" size="sm">{prep.experienceLevel}</Badge>
                  <Badge variant="secondary" size="sm">{prep.difficulty}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Step 2: Interview Mode Selection */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span>2. Select Interview Round Mode</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INTERVIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = interviewType === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setInterviewType(mode.id)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-violet-600 bg-violet-500/5 shadow-sm ring-1 ring-violet-500'
                    : 'border-slate-200 dark:border-[#27324A] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                      <Icon className="h-4 w-4" />
                    </span>
                    <Badge variant={mode.badgeVariant} size="sm">
                      {mode.id}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{mode.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mode.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Step 3: Difficulty & Persona Customization */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <SlidersHorizontal className="h-4 w-4 text-violet-500" />
          <span>3. Session Settings & AI Persona</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          {/* Difficulty */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1.5">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0B1020] text-slate-800 dark:text-slate-200"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1.5">Duration (Minutes)</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0B1020] text-slate-800 dark:text-slate-200"
            >
              <option value="15">15 Minutes (Brief)</option>
              <option value="30">30 Minutes (Standard)</option>
              <option value="45">45 Minutes (Extended)</option>
              <option value="60">60 Minutes (Full Round)</option>
            </select>
          </div>

          {/* Questions Budget */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1.5">Question Budget</label>
            <select
              value={questionLimit}
              onChange={(e) => setQuestionLimit(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0B1020] text-slate-800 dark:text-slate-200"
            >
              <option value="3">3 Topics (Fast)</option>
              <option value="5">5 Topics (Standard)</option>
              <option value="8">8 Topics (Comprehensive)</option>
              <option value="10">10 Topics (Deep Probe)</option>
            </select>
          </div>
        </div>

        {/* Personality Selector */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Interviewer Personality Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setInterviewerPersonality(p.id)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  interviewerPersonality === p.id
                    ? 'border-violet-600 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold'
                    : 'border-slate-200 dark:border-[#27324A] text-slate-600 dark:text-slate-400 text-xs'
                }`}
              >
                <div className="text-xs">{p.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Controls / Flags */}
        <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowHints}
              onChange={(e) => setAllowHints(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <span>Allow requesting hints</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowClarification}
              onChange={(e) => setAllowClarification(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <span>Allow asking for question clarification</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowSkip}
              onChange={(e) => setAllowSkip(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <span>Allow skipping questions</span>
          </label>
        </div>
      </Card>

      {/* Start Button & Feedback */}
      <div className="space-y-3 pt-2">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartInterview}
              disabled={isStarting}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 min-h-[20px]">
            {isStarting && (
              <div className="flex items-center gap-2 text-violet-400 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                <span>Initializing AI Mock Interview session and opening round...</span>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="lg"
            iconRight={ArrowRight}
            loading={isStarting}
            disabled={!selectedPrepId || isStarting}
            onClick={handleStartInterview}
          >
            {isStarting ? 'Initializing Interview...' : 'Begin Mock Interview'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateMockInterview;
