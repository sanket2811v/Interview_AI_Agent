import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Eye,
  EyeOff,
  Bookmark,
  Flag,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Clock,
  Sparkles,
  Save,
  HelpCircle,
  FileText,
  Code2,
  Users2,
  Cpu,
  Layers,
  Compass,
  Star,
  Check,
  Send,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { preparationService } from '../services/preparationService.js';
import { practiceService } from '../services/practiceService.js';
import { evaluationService } from '../services/evaluationService.js';

export function InterviewPractice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuration / Active Session State
  const [activeSession, setActiveSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pastSessions, setPastSessions] = useState([]);

  // Form Configuration State
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('MEDIUM');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionFilter, setQuestionFilter] = useState('ALL');
  const [startingSession, setStartingSession] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [filterNotice, setFilterNotice] = useState(null);

  // Active Question Work State
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answerFormat, setAnswerFormat] = useState('TEXT');
  const [revealedHints, setRevealedHints] = useState([]);
  const [revealedReference, setRevealedReference] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [selfRating, setSelfRating] = useState(null);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDraftTime, setLastDraftTime] = useState(null);

  // Reference Material Cache
  const [referenceMaterial, setReferenceMaterial] = useState({});
  const [loadingReference, setLoadingReference] = useState(false);
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false);
  const [activeAttemptId, setActiveAttemptId] = useState(null);

  // Complete Session Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // Fetch Preparation and Past Sessions
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const prepData = await preparationService.getPreparationById(id);
      setSession(prepData);

      const pastSessionsData = await practiceService.getPracticeSessions(id, { limit: 10 });
      const sessionsList = Array.isArray(pastSessionsData)
        ? pastSessionsData
        : (Array.isArray(pastSessionsData?.items)
            ? pastSessionsData.items
            : (Array.isArray(pastSessionsData?.data) ? pastSessionsData.data : []));
      setPastSessions(sessionsList);

      // Fetch Question Availability Breakdown
      try {
        const availData = await practiceService.getPracticeAvailability(id);
        const availObj = availData?.data || availData;
        setAvailability(availObj);
      } catch (availErr) {
        // Non-blocking fallback
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load practice environment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadInitialData();
    }
  }, [id]);

  // Synchronize local form inputs when switching questions
  const currentQuestion = questions[currentIndex] || null;

  useEffect(() => {
    if (currentQuestion) {
      setCurrentAnswer(currentQuestion.savedAnswer || '');
      setAnswerFormat(currentQuestion.answerFormat || 'TEXT');
      setRevealedHints(currentQuestion.revealedHints || []);
      setIsBookmarked(Boolean(currentQuestion.isBookmarked));
      setNeedsReview(Boolean(currentQuestion.needsReview));
      setSelfRating(currentQuestion.selfRating || null);
      setPersonalNotes(currentQuestion.personalNotes || '');
      setRevealedReference(false);
      setLastDraftTime(currentQuestion.draftSavedAt ? new Date(currentQuestion.draftSavedAt) : null);
    }
  }, [currentIndex, currentQuestion]);

  // Calculate live matching question count from availability matrix
  const getMatchingCount = () => {
    if (!availability) return null;
    if (selectedCategory === 'ALL' && selectedDifficulty === 'MIXED') {
      return availability.total;
    }
    if (selectedCategory === 'ALL') {
      return availability.byDifficulty?.[selectedDifficulty] || 0;
    }
    if (selectedDifficulty === 'MIXED') {
      return availability.byCategory?.[selectedCategory] || 0;
    }
    return availability.matrix?.[selectedCategory]?.[selectedDifficulty] || 0;
  };

  const matchingCount = getMatchingCount();

  // 1. Start a New Practice Session
  const handleStartSession = async (e, customPayload = null) => {
    if (e) e.preventDefault();
    if (startingSession) return;
    setStartingSession(true);
    setError(null);
    setFilterNotice(null);

    try {
      const payload = customPayload || {
        category: selectedCategory,
        difficulty: selectedDifficulty,
        count: Number(questionCount),
        filter: questionFilter
      };

      const result = await practiceService.startPracticeSession(id, payload);
      const sessionObj = result?.session || result?.data?.session || result;
      const questionsList = result?.questions || result?.data?.questions || [];

      setActiveSession(sessionObj);
      setQuestions(questionsList);
      setCurrentIndex(0);
      setFilterNotice(null);
      toast.success("Your practice session is ready. Let's begin!");
    } catch (err) {
      const errData = err.response?.data || err;
      const errorMsg = errData?.message || err.message || 'Failed to start practice session.';
      const details = errData?.details || null;

      setFilterNotice({
        message: errorMsg,
        details,
        code: errData?.code || 'PRACTICE_START_FAILED'
      });

      toast.error(errorMsg);
    } finally {
      setStartingSession(false);
    }
  };

  // 2. Resume an Incomplete Practice Session
  const handleResumeSession = async (sessionId) => {
    setLoading(true);
    try {
      const data = await practiceService.resumePracticeSession(sessionId);
      const sessionObj = data?.session || data?.data?.session || data;
      const questionsList = data?.questions || data?.data?.questions || [];

      setActiveSession(sessionObj);
      setQuestions(questionsList);
      setCurrentIndex(sessionObj?.currentQuestionIndex || 0);
      toast.success('Practice session resumed.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to resume session.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Save Answer Draft
  const handleSaveDraft = async () => {
    if (!activeSession || !currentQuestion) return;
    setIsSavingDraft(true);
    try {
      await practiceService.saveAnswerDraft(activeSession.id, currentQuestion.id, {
        answer: currentAnswer,
        answerFormat,
        revealedHints
      });

      setLastDraftTime(new Date());
      // Update local state
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === currentIndex
            ? { ...q, savedAnswer: currentAnswer, status: q.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT' }
            : q
        )
      );
      toast.success('Draft saved successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 4. Submit Final Answer
  const handleSubmitAnswer = async () => {
    if (!activeSession || !currentQuestion) return;
    if (!currentAnswer.trim()) {
      toast.error('Please enter an answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const attempt = await practiceService.submitAnswer(activeSession.id, currentQuestion.id, {
        answer: currentAnswer,
        answerFormat,
        revealedHints
      });

      const attemptId = attempt?.id || attempt?.data?.id || null;
      if (attemptId) setActiveAttemptId(attemptId);

      // Update question status in local state
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === currentIndex
            ? { ...q, savedAnswer: currentAnswer, status: 'SUBMITTED', submittedAt: new Date().toISOString(), attemptId }
            : q
        )
      );

      toast.success('Answer submitted! You can now review reference points, evaluate with AI, or self-assess.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    const targetAttemptId = activeAttemptId || currentQuestion?.attemptId;
    if (!targetAttemptId) {
      toast.error('Please submit your answer before evaluating with AI.');
      return;
    }
    setIsEvaluatingAnswer(true);
    try {
      const evalRes = await evaluationService.evaluateAnswer(targetAttemptId);
      toast.success('AI Evaluation completed!');
      if (evalRes?.id) {
        navigate(`/evaluations/${evalRes.id}`);
      } else {
        navigate('/evaluations');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Evaluation generation failed');
    } finally {
      setIsEvaluatingAnswer(false);
    }
  };

  // 5. Reveal Hint Sequentially
  const handleRevealNextHint = async () => {
    if (!activeSession || !currentQuestion) return;
    const nextIdx = revealedHints.length;

    try {
      const res = await practiceService.revealHint(activeSession.id, currentQuestion.id, nextIdx);
      if (res.hasHints && !revealedHints.includes(res.hintIndex)) {
        const updated = [...revealedHints, res.hintIndex];
        setRevealedHints(updated);
        // Update in memory question
        setQuestions((prev) =>
          prev.map((q, i) => (i === currentIndex ? { ...q, revealedHints: updated } : q))
        );
        toast.info(`Hint ${res.hintIndex + 1} revealed.`);
      } else if (!res.hasHints) {
        toast.info('No hints available for this question.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reveal hint.');
    }
  };

  // 6. Reveal Reference Answer & Explanation
  const handleToggleReference = async () => {
    if (revealedReference) {
      setRevealedReference(false);
      return;
    }

    if (!referenceMaterial[currentQuestion.id]) {
      setLoadingReference(true);
      try {
        const refData = await practiceService.getReferenceAnswer(currentQuestion.id);
        setReferenceMaterial((prev) => ({ ...prev, [currentQuestion.id]: refData }));
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to retrieve reference answer.');
        setLoadingReference(false);
        return;
      }
      setLoadingReference(false);
    }

    setRevealedReference(true);
  };

  // 7. Toggle Bookmark & Needs Review
  const handleToggleReviewStatus = async (field) => {
    if (!currentQuestion) return;
    const newBookmark = field === 'bookmark' ? !isBookmarked : isBookmarked;
    const newNeedsReview = field === 'review' ? !needsReview : needsReview;

    try {
      await practiceService.updateQuestionReview(currentQuestion.id, {
        isBookmarked: newBookmark,
        needsReview: newNeedsReview
      });

      if (field === 'bookmark') {
        setIsBookmarked(newBookmark);
        toast.success(newBookmark ? 'Question bookmarked for revision.' : 'Bookmark removed.');
      } else {
        setNeedsReview(newNeedsReview);
        toast.success(newNeedsReview ? 'Marked as needing review.' : 'Review flag cleared.');
      }

      setQuestions((prev) =>
        prev.map((q, i) =>
          i === currentIndex
            ? { ...q, isBookmarked: newBookmark, needsReview: newNeedsReview }
            : q
        )
      );
    } catch (err) {
      toast.error('Failed to update question status.');
    }
  };

  // 8. Update Self-Assessment Rating & Notes
  const handleSaveSelfRating = async (rating) => {
    if (!currentQuestion) return;
    try {
      await practiceService.updateQuestionReview(currentQuestion.id, {
        selfRating: rating,
        personalNotes
      });
      setSelfRating(rating);
      setQuestions((prev) =>
        prev.map((q, i) => (i === currentIndex ? { ...q, selfRating: rating } : q))
      );
      toast.success(`Self-rating recorded: ${rating}/5 stars.`);
    } catch (err) {
      toast.error('Failed to save self-assessment rating.');
    }
  };

  // 9. Complete Practice Session
  const handleConfirmComplete = async () => {
    if (!activeSession) return;
    try {
      const completeFn = practiceService.completePracticeSession || practiceService.completeSession;
      await completeFn.call(practiceService, activeSession.id);
      toast.success('Practice session completed successfully!');
      setIsCompleteModalOpen(false);
      navigate(`/history`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete session.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading interactive practice environment..." />;
  }

  if (error && !session) {
    return <ErrorState message={error} onRetry={loadInitialData} />;
  }

  // =========================================================================
  // RENDER SCREEN A: PRACTICE DASHBOARD & CONFIGURATION (NO ACTIVE SESSION)
  // =========================================================================
  if (!activeSession) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16 px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <button
            onClick={() => navigate('/preparations')}
            className="hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>My Preparations</span>
          </button>
          <span>/</span>
          <button
            onClick={() => navigate(`/preparations/${id}`)}
            className="hover:text-slate-900 dark:hover:text-white truncate max-w-xs"
          >
            {session?.jobTitle || session?.title}
          </button>
          <span>/</span>
          <span className="text-violet-600 dark:text-violet-400 font-medium">Interview Practice Engine</span>
        </div>

        {/* Page Header */}
        <PageHeader
          title="Interactive Interview Practice"
          subtitle={`Formulate answers, reveal sequential hints, inspect reference architectures, and track your practice mastery for ${session?.companyName || 'Target Role'}`}
          actions={
            <Button
              variant="outline"
              size="sm"
              iconLeft={ArrowLeft}
              onClick={() => navigate(`/preparations/${id}`)}
            >
              Back to Workspace
            </Button>
          }
        />

        {/* Practice Setup Card */}
        <Card className="p-6">
          <form onSubmit={handleStartSession} className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <PlayCircle className="h-5 w-5 text-violet-500" />
                <span>Configure Practice Session</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Customize your practice scope using questions generated for this preparation session.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Question Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setFilterNotice(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">
                    All Categories ({availability ? `${availability.total} questions` : 'Comprehensive'})
                  </option>
                  <option value="TECHNICAL">
                    Technical Deep-Dive ({availability ? `${availability.byCategory?.TECHNICAL ?? 0} questions` : 'Role Core'})
                  </option>
                  <option value="HR">
                    HR & Behavioral (STAR) ({availability ? `${availability.byCategory?.HR ?? 0} questions` : 'STAR'})
                  </option>
                  <option value="CODING">
                    Coding Arena Challenges ({availability ? `${availability.byCategory?.CODING ?? 0} challenges` : 'Code'})
                  </option>
                  <option value="SYSTEM_DESIGN">
                    System Design & Architecture ({availability ? `${availability.byCategory?.SYSTEM_DESIGN ?? 0} questions` : 'Architecture'})
                  </option>
                  <option value="SCENARIO">
                    Scenario & Incident Triage ({availability ? `${availability.byCategory?.SCENARIO ?? 0} questions` : 'Production'})
                  </option>
                </select>
              </div>

              {/* Difficulty Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Difficulty
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => {
                    setSelectedDifficulty(e.target.value);
                    setFilterNotice(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                >
                  <option value="MEDIUM">
                    Medium (Balanced Standards) {availability ? `(${availability.byDifficulty?.MEDIUM ?? 0} in prep)` : ''}
                  </option>
                  <option value="EASY">
                    Easy (Core Foundations) {availability ? `(${availability.byDifficulty?.EASY ?? 0} in prep)` : ''}
                  </option>
                  <option value="HARD">
                    Hard (Advanced / Senior Bar) {availability ? `(${availability.byDifficulty?.HARD ?? 0} in prep)` : ''}
                  </option>
                  <option value="EXPERT">
                    Expert (Staff / Principal Level) {availability ? `(${availability.byDifficulty?.EXPERT ?? 0} in prep)` : ''}
                  </option>
                  <option value="MIXED">
                    Mixed (Progressive Ladder - All Available)
                  </option>
                </select>
              </div>

              {/* Question Count Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Session Question Count
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                        questionCount === num
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-500'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Filter Scope */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Question Scope Filter
                </label>
                <select
                  value={questionFilter}
                  onChange={(e) => {
                    setQuestionFilter(e.target.value);
                    setFilterNotice(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">All Available Role Questions</option>
                  <option value="UNATTEMPTED">Unattempted Questions Only</option>
                  <option value="NEEDS_REVIEW">Questions Marked for Review</option>
                  <option value="BOOKMARKED">Bookmarked Questions Only</option>
                  <option value="ATTEMPTED">Re-practice Attempted Questions</option>
                </select>
              </div>
            </div>

            {/* Live Question Bank Availability Status Banner */}
            {availability && matchingCount !== null && (
              <div>
                {matchingCount === 0 ? (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                    <div className="flex items-start space-x-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">
                          No questions match your selected filters ({selectedCategory === 'ALL' ? 'All Categories' : selectedCategory} + {selectedDifficulty}).
                        </p>
                        <p className="text-amber-700 dark:text-amber-300">
                          {selectedCategory !== 'ALL' && availability.byCategory?.[selectedCategory] > 0
                            ? `${availability.byCategory[selectedCategory]} question(s) exist for this category, but at different difficulty levels.`
                            : `There are ${availability.total} total questions generated for this preparation.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-amber-500/20">
                      {availability.matrix?.[selectedCategory]?.MEDIUM > 0 && selectedDifficulty !== 'MEDIUM' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDifficulty('MEDIUM');
                            setFilterNotice(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-amber-900 dark:text-amber-100 transition-colors flex items-center space-x-1.5"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Switch to Medium ({availability.matrix[selectedCategory].MEDIUM} available)</span>
                        </button>
                      )}
                      {selectedDifficulty !== 'MIXED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDifficulty('MIXED');
                            setFilterNotice(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-amber-900 dark:text-amber-100 transition-colors"
                        >
                          Switch to Mixed / All Difficulties
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/preparations/${id}/questions`)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        Generate More in Question Bank
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>
                        <strong className="font-bold">{matchingCount}</strong> interview question(s) match your selected practice criteria.
                        {matchingCount < questionCount && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1">
                            (Selected size {questionCount} will be capped to available {matchingCount})
                          </span>
                        )}
                      </span>
                    </div>
                    {matchingCount < questionCount && (
                      <button
                        type="button"
                        onClick={() => setQuestionCount(matchingCount)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 font-semibold text-emerald-900 dark:text-emerald-100 transition-colors"
                      >
                        Set Count to {matchingCount}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* API Error / Filter Notice Action Banner */}
            {filterNotice && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-800 dark:text-red-200 space-y-2">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{filterNotice.message}</p>
                    {filterNotice.details?.suggestion && (
                      <p className="text-red-700 dark:text-red-300">{filterNotice.details.suggestion}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 border-t border-red-500/20">
                  {filterNotice.details?.availableCount > 0 && (
                    <Button
                      size="sm"
                      variant="primary"
                      type="button"
                      onClick={() => {
                        setQuestionCount(filterNotice.details.availableCount);
                        handleStartSession(null, {
                          category: selectedCategory,
                          difficulty: selectedDifficulty,
                          count: filterNotice.details.availableCount,
                          filter: questionFilter,
                          allowPartial: true
                        });
                      }}
                    >
                      Start with {filterNotice.details.availableCount} Question(s)
                    </Button>
                  )}
                  {filterNotice.details?.breakdown?.matrix?.[selectedCategory]?.MEDIUM > 0 && selectedDifficulty !== 'MEDIUM' && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setSelectedDifficulty('MEDIUM');
                        setFilterNotice(null);
                      }}
                    >
                      Switch to Medium Difficulty
                    </Button>
                  )}
                  {selectedDifficulty !== 'MIXED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setSelectedDifficulty('MIXED');
                        setFilterNotice(null);
                      }}
                    >
                      Switch to Mixed Difficulty
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => navigate(`/preparations/${id}/questions`)}
              >
                Inspect Question Bank
              </Button>

              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={startingSession}
                iconRight={ArrowRight}
              >
                Start Practice Session
              </Button>
            </div>
          </form>
        </Card>

        {/* Previous Practice Sessions Section */}
        {pastSessions.length > 0 && (
          <Card className="p-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>Previous Practice Sessions for this Preparation</span>
            </h4>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {pastSessions.map((ps) => (
                <div key={ps.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {ps.title}
                      </span>
                      <Badge variant={ps.status === 'COMPLETED' ? 'success' : 'primary'}>
                        {ps.status}
                      </Badge>
                      <Badge variant="outline">{ps.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Answered {ps.completedQuestions} of {ps.totalQuestions} questions • Started on{' '}
                      {new Date(ps.startedAt || ps.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    iconRight={ArrowRight}
                    onClick={() => handleResumeSession(ps.id)}
                  >
                    {ps.status === 'COMPLETED' ? 'Review Answers' : 'Resume Practice'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER SCREEN B: ACTIVE INTERACTIVE PRACTICE WORKSPACE
  // =========================================================================
  const totalQuestionsCount = questions.length;
  const isAnswered = currentQuestion?.status === 'SUBMITTED';
  const hasDraft = currentQuestion?.status === 'DRAFT' || Boolean(currentAnswer);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 px-4 sm:px-6">
      {/* Session Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <span>{session?.jobTitle || 'Role Practice'}</span>
            <span>•</span>
            <span className="font-medium text-violet-500">{activeSession?.title}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Question {currentIndex + 1} of {totalQuestionsCount}</span>
            <Badge variant="primary">{currentQuestion?.category}</Badge>
            <Badge variant="outline">{currentQuestion?.difficulty}</Badge>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Bookmark Toggle */}
          <button
            onClick={() => handleToggleReviewStatus('bookmark')}
            className={`p-2 rounded-xl border transition-colors ${
              isBookmarked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark for revision'}
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          {/* Needs Review Toggle */}
          <button
            onClick={() => handleToggleReviewStatus('review')}
            className={`p-2 rounded-xl border transition-colors ${
              needsReview
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
            }`}
            title={needsReview ? 'Marked for improvement' : 'Flag as needs review'}
          >
            <Flag className="h-4 w-4" fill={needsReview ? 'currentColor' : 'none'} />
          </button>

          {/* Complete Session Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompleteModalOpen(true)}
          >
            End Practice
          </Button>
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQuestion?.question}
          </h3>
          {currentQuestion?.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {currentQuestion.description}
            </p>
          )}
        </div>

        {/* Skill Tags & Estimated Time */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Badge variant="neutral" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>~{currentQuestion?.estimatedTime || 5} mins</span>
          </Badge>
          {(currentQuestion?.tags || []).map((tag, idx) => (
            <Badge key={idx} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Sequential Hint System */}
      <Card className="p-4 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
              Assistance & Hints ({revealedHints.length} / {currentQuestion?.hints?.length || 0} Revealed)
            </span>
          </div>

          {(currentQuestion?.hints?.length || 0) > revealedHints.length && (
            <Button
              variant="outline"
              size="xs"
              iconLeft={Lightbulb}
              onClick={handleRevealNextHint}
            >
              Reveal Next Hint ({revealedHints.length + 1})
            </Button>
          )}
        </div>

        {/* Display Revealed Hints */}
        {revealedHints.length > 0 && (
          <div className="mt-3 space-y-2">
            {revealedHints.map((idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-100"
              >
                <strong className="font-semibold">Hint {idx + 1}:</strong> {currentQuestion?.hints?.[idx]}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Answer Workspace Area */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-violet-500" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Your Answer / Formulation
            </h4>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            {lastDraftTime && (
              <span className="italic">
                Draft saved at {lastDraftTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span>{currentAnswer.length} / 20,000 chars</span>
          </div>
        </div>

        {/* Textarea for Multiline Answer */}
        <textarea
          rows={10}
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder={
            currentQuestion?.category === 'CODING'
              ? 'Detail your algorithmic approach, edge cases considered, time/space complexity, and pseudocode...'
              : currentQuestion?.category === 'SYSTEM_DESIGN'
              ? 'Outline functional requirements, core components, storage schema, API protocols, and scalability trade-offs...'
              : currentQuestion?.category === 'HR'
              ? 'Structure your response using the STAR methodology (Situation, Task, Action, Result)...'
              : 'Formulate your comprehensive technical answer and practical trade-offs...'
          }
          className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white font-sans focus:ring-2 focus:ring-violet-500 resize-y"
        />

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={Save}
              loading={isSavingDraft}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={Send}
              loading={isSubmitting}
              onClick={handleSubmitAnswer}
            >
              {isAnswered ? 'Update Submission' : 'Submit Answer'}
            </Button>
            {isAnswered && (
              <Button
                variant="outline"
                size="sm"
                iconLeft={Sparkles}
                loading={isEvaluatingAnswer}
                onClick={handleEvaluateAnswer}
              >
                Evaluate with AI
              </Button>
            )}
            {currentQuestion?.category === 'CODING' && (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={Code2}
                onClick={() =>
                  navigate(
                    `/coding?prepId=${id}&sessionId=${session?.id || ''}&questionId=${currentQuestion.id}`
                  )
                }
              >
                Open in Coding Arena
              </Button>
            )}
          </div>

          {/* Reveal Reference Answer Toggle */}
          <Button
            variant={revealedReference ? 'secondary' : 'outline'}
            size="sm"
            iconLeft={revealedReference ? EyeOff : Eye}
            loading={loadingReference}
            onClick={handleToggleReference}
          >
            {revealedReference ? 'Hide Reference Answer' : 'Reveal Reference Answer'}
          </Button>
        </div>
      </Card>

      {/* Reference Answer Accordion / Reveal Box */}
      {revealedReference && (
        <Card className="p-6 border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5" />
            <span>Model Reference Answer & Evaluation Concepts</span>
          </div>

          <div className="space-y-3">
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Benchmark Answer
              </h5>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                {referenceMaterial[currentQuestion?.id]?.referenceAnswer ||
                  'No model answer available.'}
              </div>
            </div>

            {referenceMaterial[currentQuestion?.id]?.explanation && (
              <div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Interviewer Context & Architectural Value
                </h5>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {referenceMaterial[currentQuestion?.id]?.explanation}
                </p>
              </div>
            )}

            {/* Expected Key Concepts */}
            {Array.isArray(referenceMaterial[currentQuestion?.id]?.expectedConcepts) &&
              referenceMaterial[currentQuestion?.id]?.expectedConcepts.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expected Concepts Checklist
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {referenceMaterial[currentQuestion?.id]?.expectedConcepts.map((concept, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      >
                        ✓ {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </Card>
      )}

      {/* Answer Self-Assessment & Reflection Card */}
      <Card className="p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Candidate Self-Assessment & Takeaways
        </h4>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Rate your confidence answering this question:
            </span>
            <div className="flex items-center space-x-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleSaveSelfRating(star)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    (selfRating || 0) >= star
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                      : 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-amber-400'
                  }`}
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  <Star className="h-4 w-4" fill={(selfRating || 0) >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
              {selfRating && (
                <span className="text-xs font-bold text-amber-500 ml-2">
                  {selfRating}/5
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleToggleReviewStatus('review')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                needsReview
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
              }`}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{needsReview ? 'Marked for Review' : 'Mark for Review'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Question Navigation Palette & Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="outline"
          size="sm"
          iconLeft={ArrowLeft}
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
        >
          Previous
        </Button>

        {/* Question Palette Dots */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md">
          {questions.map((q, idx) => {
            const isCurr = idx === currentIndex;
            const isSub = q.status === 'SUBMITTED';
            const isDrf = q.status === 'DRAFT' || Boolean(q.savedAnswer);

            return (
              <button
                key={q.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 text-xs font-bold rounded-lg border flex items-center justify-center transition-all ${
                  isCurr
                    ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 bg-violet-600 text-white border-violet-600'
                    : isSub
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : isDrf
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title={`Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <Button
          variant="primary"
          size="sm"
          iconRight={ArrowRight}
          disabled={currentIndex === totalQuestionsCount - 1}
          onClick={() => setCurrentIndex((prev) => Math.min(totalQuestionsCount - 1, prev + 1))}
        >
          Next Question
        </Button>
      </div>

      {/* Complete Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={handleConfirmComplete}
        title="Complete Practice Session?"
        description="This will mark the current practice session as completed, save your duration, and record your practice activity in your history dashboard."
        confirmText="End & View History"
        variant="primary"
      />
    </div>
  );
}
export default InterviewPractice;

