import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  User,
  Send,
  Pause,
  Play,
  Square,
  HelpCircle,
  Lightbulb,
  SkipForward,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { mockInterviewService } from '../services/mockInterviewService.js';

export function LiveMockInterview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [interview, setInterview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [candidateInput, setCandidateInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'CLARIFY' | 'HINT' | 'SKIP' | null
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals & Timers
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 1. Initial Load: Fetch interview details and message history
  useEffect(() => {
    let isMounted = true;

    async function loadInterview() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const raw = await mockInterviewService.getInterview(interviewId);
        const data = raw?.interview || raw;
        if (isMounted && data) {
          setInterview(data);
          setMessages(data.messages || raw?.messages || []);
          if (data.startedAt && data.status === 'IN_PROGRESS') {
            const initialElapsed = Math.floor(
              (Date.now() - new Date(data.startedAt).getTime()) / 1000
            );
            setElapsedSeconds(Math.max(0, initialElapsed));
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.message || err.message || 'Failed to load mock interview.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInterview();

    return () => {
      isMounted = false;
    };
  }, [interviewId]);

  // 2. Active Session Timer
  useEffect(() => {
    if (!interview || interview.status !== 'IN_PROGRESS') return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [interview?.status]);

  // 3. Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 4. Submit Candidate Answer
  const handleSubmitAnswer = async () => {
    if (!candidateInput.trim() || isSubmitting || interview?.status !== 'IN_PROGRESS') return;

    const answerText = candidateInput.trim();
    setCandidateInput('');

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await mockInterviewService.submitAnswer(interviewId, { content: answerText });

      if (result) {
        const candidateMsg = result.candidateMessage || result.userMessage;
        const interviewerMsg = result.interviewerMessage || result.assistantMessage;
        const newMsgs = [candidateMsg, interviewerMsg].filter(Boolean);
        setMessages((prev) => [...prev, ...newMsgs]);
        if (result.interview) {
          setInterview(result.interview);
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to send answer. Please try again.'
      );
      // Restore input on failure so user doesn't lose text
      setCandidateInput(answerText);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Handle Control Actions: CLARIFY, HINT, SKIP
  const handleAction = async (actionType) => {
    if (isSubmitting || actionLoading || interview?.status !== 'IN_PROGRESS') return;

    try {
      setActionLoading(actionType);
      setErrorMessage(null);

      const result = await mockInterviewService.performAction(interviewId, actionType);

      if (result) {
        setMessages((prev) => [...prev, result.actionMessage, result.interviewerMessage]);
        if (result.interview) {
          setInterview(result.interview);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || `Failed to execute ${actionType}`);
    } finally {
      setActionLoading(null);
    }
  };

  // 6. Pause / Resume Toggle
  const handleTogglePause = async () => {
    try {
      setErrorMessage(null);
      if (interview.status === 'IN_PROGRESS') {
        const updated = await mockInterviewService.pauseInterview(interviewId);
        setInterview(updated);
      } else if (interview.status === 'PAUSED') {
        const updated = await mockInterviewService.resumeInterview(interviewId);
        setInterview(updated);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update pause state.');
    }
  };

  // 7. End Interview
  const handleConfirmEnd = async () => {
    try {
      setIsEndModalOpen(false);
      setIsLoading(true);

      const result = await mockInterviewService.endInterview(interviewId);
      if (result?.interview) {
        setInterview(result.interview);
      }
      if (result?.closingMessage) {
        setMessages((prev) => [...prev, result.closingMessage]);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to conclude interview.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingState message="Connecting to AI Mock Interviewer..." />
      </div>
    );
  }

  if (errorMessage && !interview) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Session Error</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{errorMessage}</p>
        <Button variant="secondary" onClick={() => navigate('/mock-interviews')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isCompleted = interview?.status === 'COMPLETED';
  const isPaused = interview?.status === 'PAUSED';
  const preferences = interview?.preferences || {};

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto px-2 sm:px-4 pb-3 space-y-3">
      {/* Top Header & Stage Bar */}
      <div className="p-3.5 bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/mock-interviews')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0B1020] transition-colors"
            title="Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {interview?.title}
              </span>
              <Badge variant="primary" size="sm">
                {interview?.interviewType}
              </Badge>
              <Badge variant="outline" size="sm">
                {interview?.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
              <span>{interview?.interviewerPersonality} Style</span>
              <span>•</span>
              <span>Topic {(interview?.currentQuestionIndex ?? 0) + 1} of {interview?.questionLimit ?? 5}</span>
            </div>
          </div>
        </div>

        {/* Status / Timer / Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Live Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
            <Clock className="h-3.5 w-3.5 text-violet-500" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {!isCompleted && (
            <>
              {/* Pause / Resume Button */}
              <Button
                variant="outline"
                size="sm"
                iconLeft={isPaused ? Play : Pause}
                onClick={handleTogglePause}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>

              {/* End Interview Button */}
              <Button
                variant="danger"
                size="sm"
                iconLeft={Square}
                onClick={() => setIsEndModalOpen(true)}
              >
                End
              </Button>
            </>
          )}

          {isCompleted && (
            <Button
              variant="secondary"
              size="sm"
              iconLeft={BookOpen}
              onClick={() => navigate(`/mock-interviews/${interviewId}/history`)}
            >
              Review Transcript
            </Button>
          )}
        </div>
      </div>

      {/* Main Conversation Chat Viewport */}
      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] shadow-inner space-y-4">
        {messages.map((msg, idx) => {
          const isInterviewer = msg.role === 'ASSISTANT';
          const isSystem = msg.role === 'SYSTEM';

          if (isSystem) {
            return (
              <div key={msg.id || idx} className="text-center my-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-[#0B1020] text-slate-500 border border-slate-200 dark:border-[#27324A]">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id || idx}
              className={`flex items-start gap-3 max-w-3xl ${
                isInterviewer ? 'mr-auto' : 'ml-auto flex-row-reverse'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                  isInterviewer
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 ring-2 ring-violet-500/20'
                    : 'bg-slate-700 dark:bg-slate-800'
                }`}
              >
                {isInterviewer ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Speech Bubble */}
              <div
                className={`p-4 rounded-2xl space-y-1.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isInterviewer
                    ? 'bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-slate-800 dark:text-slate-100 rounded-tl-sm'
                    : 'bg-violet-600 text-white rounded-tr-sm'
                }`}
              >
                {/* Header Tag */}
                <div
                  className={`flex items-center justify-between gap-4 text-[11px] font-semibold ${
                    isInterviewer ? 'text-slate-400' : 'text-violet-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isInterviewer ? 'AI Interviewer' : 'Candidate'}
                    {msg.messageType && msg.messageType !== 'TEXT' && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-violet-500/10 text-violet-400 uppercase font-mono">
                        {msg.messageType.replace('_', ' ')}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] opacity-75">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          );
        })}

        {/* Live Typing / Generation Indicator */}
        {isSubmitting && (
          <div className="flex items-center gap-3 mr-auto max-w-md">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white animate-pulse">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-xs text-slate-400 font-medium ml-2">Interviewer is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Paused State Overlay Banner */}
      {isPaused && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
          <div className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center justify-center gap-2">
            <Pause className="h-4 w-4" />
            Interview Paused
          </div>
          <p className="text-xs text-slate-500">
            The session timer is paused. Take your time, and click Resume when you are ready to continue.
          </p>
          <Button variant="primary" size="sm" iconLeft={Play} onClick={handleTogglePause}>
            Resume Interview
          </Button>
        </div>
      )}

      {/* Completed State Card */}
      {isCompleted && (
        <Card className="p-6 text-center space-y-4 border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Mock Interview Concluded
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            You have successfully completed this interactive round. You can now review the full interview transcript.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              iconLeft={BookOpen}
              onClick={() => navigate(`/mock-interviews/${interviewId}/history`)}
            >
              Review Full Transcript
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/mock-interviews')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      )}

      {/* Candidate Response Input Bar (Active when IN_PROGRESS) */}
      {!isCompleted && !isPaused && (
        <div className="p-3 bg-white dark:bg-[#151C2E] rounded-2xl border border-slate-200 dark:border-[#27324A] space-y-2 shadow-sm">
          {/* Quick Action Helpers */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {preferences.allowClarification !== false && (
                <button
                  type="button"
                  disabled={isSubmitting || Boolean(actionLoading)}
                  onClick={() => handleAction('CLARIFY')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27324A] hover:bg-slate-100 dark:hover:bg-[#0B1020] text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <HelpCircle className="h-3 w-3 text-violet-500" />
                  Ask Clarification
                </button>
              )}

              {preferences.allowHints !== false && (
                <button
                  type="button"
                  disabled={isSubmitting || Boolean(actionLoading)}
                  onClick={() => handleAction('HINT')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27324A] hover:bg-slate-100 dark:hover:bg-[#0B1020] text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <Lightbulb className="h-3 w-3 text-amber-500" />
                  Request Hint
                </button>
              )}

              {preferences.allowSkip !== false && (
                <button
                  type="button"
                  disabled={isSubmitting || Boolean(actionLoading)}
                  onClick={() => handleAction('SKIP')}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27324A] hover:bg-slate-100 dark:hover:bg-[#0B1020] text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <SkipForward className="h-3 w-3 text-slate-400" />
                  Skip Topic
                </button>
              )}
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              {candidateInput.length} / 10,000 chars
            </span>
          </div>

          {/* Input Textarea & Submit Button */}
          <div className="flex items-end gap-2">
            <textarea
              rows={3}
              value={candidateInput}
              disabled={isSubmitting}
              onChange={(e) => setCandidateInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitAnswer();
                }
              }}
              placeholder="Type your response here... (Press Ctrl + Enter to submit)"
              className="flex-1 p-3 rounded-xl border border-slate-300 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed"
            />
            <Button
              variant="primary"
              size="md"
              iconRight={Send}
              loading={isSubmitting}
              disabled={!candidateInput.trim()}
              onClick={handleSubmitAnswer}
              className="h-12"
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {/* End Interview Confirmation Modal */}
      <ConfirmDialog
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        onConfirm={handleConfirmEnd}
        title="End Mock Interview Round?"
        message="Are you sure you want to conclude this interview? The conversation will be sealed and saved permanently to your history."
        confirmText="Yes, Conclude Interview"
        cancelText="Keep Interviewing"
        variant="danger"
      />
    </div>
  );
}

export default LiveMockInterview;

