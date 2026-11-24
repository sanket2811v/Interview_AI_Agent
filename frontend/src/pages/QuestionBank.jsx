import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  PlayCircle,
  Sparkles,
  Search,
  Filter,
  Code2,
  Users2,
  Cpu,
  Layers,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Tag,
  ShieldAlert,
  SlidersHorizontal,
  FileCode2,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { preparationService } from '../services/preparationService.js';

export function QuestionBank() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [codingChallenges, setCodingChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});

  // Generator Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [genCategory, setGenCategory] = useState('TECHNICAL');
  const [genDifficulty, setGenDifficulty] = useState('MEDIUM');
  const [genCount, setGenCount] = useState(5);
  const [genLanguage, setGenLanguage] = useState('JavaScript');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [focusOnGaps, setFocusOnGaps] = useState(false);

  // Edit & Delete Modals
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // Fetch Session, Questions, and Coding Challenges
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = await preparationService.getPreparationById(id);
      setSession(sessionData);

      // Fetch questions
      const qRes = await preparationService.getQuestions(id, { limit: 100 });
      setQuestions(qRes.items || []);

      // Fetch coding challenges
      const cRes = await preparationService.getCodingChallenges(id);
      const challengesList = Array.isArray(cRes) ? cRes : (Array.isArray(cRes?.data) ? cRes.data : []);
      setCodingChallenges(challengesList);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load question bank data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAllData();
    }
  }, [id]);

  // Handle Question Generation Submission
  const handleGenerateSubmit = async (e) => {
    if (e) e.preventDefault();
    if (generating) return;
    setGenerating(true);
    setModalError(null);

    try {
      const payload = {
        category: genCategory,
        difficulty: genDifficulty,
        count: Number(genCount),
        language: genLanguage,
        targetSkills: selectedSkills,
        focusOnGaps
      };

      const result = await preparationService.generateQuestions(id, payload);
      const totalCreated =
        result?.totalCreated ??
        result?.data?.totalCreated ??
        (Array.isArray(result?.questions) ? result.questions.length : 0);

      toast.success(`Generated ${totalCreated || genCount} new interview questions and challenges!`);
      setIsGenerateModalOpen(false);
      await fetchAllData();
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to generate interview questions. Please try again.';
      toast.error(errorMsg);
      setModalError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  // Handle Question Delete
  const handleDeleteConfirm = async () => {
    if (!deletingQuestionId) return;
    try {
      await preparationService.deleteQuestion(deletingQuestionId);
      toast.success('Question removed.');
      setQuestions((prev) => prev.filter((q) => q.id !== deletingQuestionId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete question.');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // Handle Question Edit
  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    try {
      const updated = await preparationService.updateQuestion(editingQuestion.id, {
        question: editingQuestion.question,
        description: editingQuestion.description,
        referenceAnswer: editingQuestion.referenceAnswer,
        explanation: editingQuestion.explanation,
        difficulty: editingQuestion.difficulty
      });
      toast.success('Question updated successfully.');
      setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setEditingQuestion(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update question.');
    }
  };

  const toggleCardExpand = (qId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  if (loading) {
    return <LoadingState message="Loading role question bank and challenges..." />;
  }

  if (error && !session) {
    return <ErrorState message={error} onRetry={fetchAllData} />;
  }

  const hasAnalysis = Boolean(session?.jobAnalysis);

  // Available skills extracted from Phase 6 analysis
  const availableSkills = Array.isArray(session?.jobAnalysis?.requiredSkills)
    ? Array.from(new Set([...session.jobAnalysis.requiredSkills, ...(session.jobAnalysis.preferredSkills || [])]))
    : [];

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    if (activeCategory !== 'ALL' && q.category !== activeCategory) return false;
    if (difficultyFilter !== 'ALL' && q.difficulty !== difficultyFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = (q.question + ' ' + (q.description || '') + ' ' + (q.tags || []).join(' ')).toLowerCase();
      if (!matchText.includes(query)) return false;
    }
    return true;
  });

  const categoryCounts = {
    ALL: questions.length + codingChallenges.length,
    TECHNICAL: questions.filter((q) => q.category === 'TECHNICAL').length,
    HR: questions.filter((q) => q.category === 'HR').length,
    CODING: codingChallenges.length + questions.filter((q) => q.category === 'CODING').length,
    SYSTEM_DESIGN: questions.filter((q) => q.category === 'SYSTEM_DESIGN').length,
    SCENARIO: questions.filter((q) => q.category === 'SCENARIO').length
  };

  const getDifficultyBadgeVariant = (diff) => {
    switch (diff) {
      case 'EASY':
        return 'success';
      case 'MEDIUM':
        return 'primary';
      case 'HARD':
        return 'warning';
      case 'EXPERT':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Breadcrumb Navigation */}
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
        <span className="text-violet-600 dark:text-violet-400 font-medium">Question Bank</span>
      </div>

      {/* Page Header */}
      <PageHeader
        title="Role Question Bank & Coding Challenges"
        subtitle={`Personalized interview practice generated from job analysis for ${session?.companyName || 'Target Role'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              iconLeft={ArrowLeft}
              onClick={() => navigate(`/preparations/${id}`)}
            >
              Workspace
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconRight={PlayCircle}
              disabled={questions.length === 0}
              onClick={() => navigate(`/preparations/${id}/practice`)}
            >
              Start Practice
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={Sparkles}
              disabled={generating || !hasAnalysis}
              onClick={() => setIsGenerateModalOpen(true)}
            >
              Generate Questions
            </Button>
          </div>
        }
      />

      {/* Warning Banner: Missing Phase 6 Analysis */}
      {!hasAnalysis && (
        <Card className="p-6 border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Phase 6 Job Description Analysis Required
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Questions must be personalized using the AI analysis from Phase 6. Complete job description analysis first.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/preparations/${id}/analysis`)}
            iconRight={ArrowRight}
          >
            Go to AI Analysis
          </Button>
        </Card>
      )}

      {/* High-Level Overview Metrics Card */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Target Role:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{session?.jobTitle}</span>
              <Badge variant="outline">{session?.experienceLevel}</Badge>
              <Badge variant="secondary">Difficulty: {session?.difficulty}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Questions Generated: <strong className="text-slate-900 dark:text-white font-mono">{questions.length}</strong> standard questions • <strong className="text-slate-900 dark:text-white font-mono">{codingChallenges.length}</strong> coding challenges
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['TECHNICAL', 'HR', 'CODING', 'SYSTEM_DESIGN', 'SCENARIO'].map((cat) => (
              <div
                key={cat}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center"
              >
                <div className="text-[10px] uppercase font-semibold text-slate-500">
                  {cat.replace('_', ' ')}
                </div>
                <div className="text-sm font-extrabold text-violet-600 dark:text-violet-400 font-mono">
                  {categoryCounts[cat] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Generating Progress State */}
      {generating && (
        <Card className="p-8 text-center border-violet-500/40 bg-gradient-to-b from-violet-950/20 to-transparent">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-500 flex items-center justify-center mb-4 animate-spin">
            <RefreshCw className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Synthesizing Tailored Interview Questions
          </h3>
          <p className="text-xs text-violet-400 font-medium mt-1 animate-pulse">
            Analyzing job competencies, formulating evaluation rubrics, and constructing test cases...
          </p>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs">
          {[
            { id: 'ALL', label: 'All Questions' },
            { id: 'TECHNICAL', label: 'Technical' },
            { id: 'HR', label: 'HR & Behavioral' },
            { id: 'CODING', label: 'Coding Arena' },
            { id: 'SYSTEM_DESIGN', label: 'System Design' },
            { id: 'SCENARIO', label: 'Scenario' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeCategory === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label} ({categoryCounts[tab.id] || 0})
            </button>
          ))}
        </div>

        {/* Search & Difficulty Filter */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>
      </div>

      {/* Questions & Coding Challenges Display */}
      {filteredQuestions.length === 0 && codingChallenges.length === 0 && !generating ? (
        <Card className="p-10 text-center space-y-4">
          <HelpCircle className="h-12 w-12 text-violet-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No Interview Questions Generated Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Use the AI Question Generator to create personalized technical, HR, system design, or coding questions aligned with your role requirements.
          </p>
          <Button
            variant="primary"
            iconLeft={Sparkles}
            onClick={() => setIsGenerateModalOpen(true)}
            disabled={!hasAnalysis}
          >
            Generate Questions Now
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Section A: Coding Challenges (if CODING or ALL selected) */}
          {(activeCategory === 'ALL' || activeCategory === 'CODING') && codingChallenges.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400 flex items-center space-x-2">
                <FileCode2 className="h-4 w-4" />
                <span>Coding Challenges ({codingChallenges.length})</span>
              </h3>

              {codingChallenges.map((challenge) => (
                <Card key={challenge.id} className="p-5 space-y-4 border-violet-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary" size="sm">CODING CHALLENGE</Badge>
                        <Badge variant={getDifficultyBadgeVariant(challenge.difficulty)} size="sm">
                          {challenge.difficulty}
                        </Badge>
                        <Badge variant="outline" size="sm">{challenge.category}</Badge>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                        {challenge.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 font-mono">
                        <span>Time: {challenge.timeLimit}ms</span>
                        <span>•</span>
                        <span>Mem: {challenge.memoryLimit}MB</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        iconLeft={Code2}
                        onClick={() => navigate(`/coding/${challenge.id}?prepId=${id}`)}
                      >
                        Solve in Coding Arena
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {challenge.description}
                  </p>

                  {/* Constraints & Supported Languages */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    {Array.isArray(challenge.constraints) && challenge.constraints.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                          Constraints:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {challenge.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                        Expected Complexities:
                      </span>
                      <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px] space-y-0.5">
                        <p>Time: {challenge.expectedTimeComplexity || 'O(n)'}</p>
                        <p>Space: {challenge.expectedSpaceComplexity || 'O(1)'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Test Cases List */}
                  {Array.isArray(challenge.testCases) && challenge.testCases.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Problem Test Cases ({challenge.testCases.length}):
                      </span>
                      <div className="space-y-2">
                        {challenge.testCases.map((tc, idx) => (
                          <div
                            key={tc.id || idx}
                            className={`p-3 rounded-xl text-xs font-mono space-y-1 ${
                              tc.isHidden
                                ? 'bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold flex items-center space-x-1">
                                {tc.isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                <span>{tc.isHidden ? 'Hidden Evaluation Test Case' : `Sample Case #${idx + 1}`}</span>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Input:</span>
                                <code>{tc.input}</code>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Expected Output:</span>
                                <code>{tc.expectedOutput}</code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Section B: Standard Interview Questions */}
          {filteredQuestions.map((q) => {
            const isExpanded = expandedCards[q.id];
            return (
              <Card key={q.id} className="p-5 space-y-3 hover:border-violet-500/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary" size="sm">{q.category.replace('_', ' ')}</Badge>
                      <Badge variant={getDifficultyBadgeVariant(q.difficulty)} size="sm">
                        {q.difficulty}
                      </Badge>
                      <span className="text-xs text-slate-400 flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{q.estimatedTime} min</span>
                      </span>
                      {q.description && (
                        <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                          • {q.description}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingQuestion(q)}
                      iconLeft={Edit3}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={() => setDeletingQuestionId(q.id)}
                      iconLeft={Trash2}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Skill / Tags badges */}
                {Array.isArray(q.tags) && q.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {q.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand / Collapse Button */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => toggleCardExpand(q.id)}
                    className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center space-x-1"
                  >
                    <span>{isExpanded ? 'Hide Answer & Rubrics' : 'View Answer, Explanation & Rubrics'}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {/* Expanded Content Drawer */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs">
                      {/* Reference Answer */}
                      {q.referenceAnswer && (
                        <div className="p-3.5 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/20 space-y-1">
                          <span className="font-bold text-violet-700 dark:text-violet-300 block text-[11px] uppercase tracking-wider">
                            Model Reference Answer:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {q.referenceAnswer}
                          </p>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                            Why This Question Matters:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}

                      {/* Expected Concepts */}
                      {Array.isArray(q.expectedConcepts) && q.expectedConcepts.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                            Core Concepts Evaluated:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                            {q.expectedConcepts.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Follow-up Probing Questions */}
                      {Array.isArray(q.followUpQuestions) && q.followUpQuestions.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block">
                            Potential Follow-Up Questions:
                          </span>
                          <ul className="space-y-1">
                            {q.followUpQuestions.map((f, i) => (
                              <li key={i} className="text-slate-600 dark:text-slate-400 flex items-start space-x-1.5">
                                <span className="text-violet-500 font-bold">•</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generator Configuration Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => !generating && setIsGenerateModalOpen(false)}
        title="AI Question Generator"
        description="Configure parameters to synthesize personalized interview questions"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start space-x-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Generation Failed</span>
                <span>{modalError}</span>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Question Category
            </label>
            <select
              value={genCategory}
              onChange={(e) => setGenCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            >
              <option value="TECHNICAL">Technical Deep-Dive</option>
              <option value="HR">HR & Behavioral (STAR)</option>
              <option value="CODING">Coding Problem & Challenges</option>
              <option value="SYSTEM_DESIGN">System Architecture & Design</option>
              <option value="SCENARIO">Real-world Scenario & Troubleshooting</option>
              <option value="ALL">All Categories (Comprehensive Mix)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Difficulty */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Difficulty Level
              </label>
              <select
                value={genDifficulty}
                onChange={(e) => setGenDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value="MEDIUM">Medium (Recommended)</option>
                <option value="EASY">Easy (Foundational)</option>
                <option value="HARD">Hard (Advanced)</option>
                <option value="EXPERT">Expert (Staff/Principal)</option>
                <option value="MIXED">Mixed Distribution</option>
              </select>
            </div>

            {/* Question Count */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Number of Questions
              </label>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>
          </div>

          {/* Programming language (if coding) */}
          {(genCategory === 'CODING' || genCategory === 'ALL') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Coding Language
              </label>
              <select
                value={genLanguage}
                onChange={(e) => setGenLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value="JavaScript">JavaScript (Node.js)</option>
                <option value="TypeScript">TypeScript</option>
                <option value="Python">Python 3</option>
                <option value="Java">Java</option>
                <option value="C++">C++</option>
              </select>
            </div>
          )}

          {/* Available Skills checkboxes */}
          {availableSkills.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Role Competencies (Optional Focus):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {availableSkills.map((sk) => {
                  const isChecked = selectedSkills.includes(sk);
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => {
                        setSelectedSkills((prev) =>
                          isChecked ? prev.filter((s) => s !== sk) : [...prev, sk]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isChecked
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {sk}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Focus on Skill Gaps Toggle */}
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="focusGaps"
              checked={focusOnGaps}
              onChange={(e) => setFocusOnGaps(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="focusGaps" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              Prioritize identified skill gaps from candidate profile analysis
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={generating}
              onClick={() => setIsGenerateModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={generating}
              iconLeft={generating ? RefreshCw : Sparkles}
              className={`w-full sm:w-auto ${generating ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              {generating ? 'Synthesizing Questions...' : 'Generate Questions'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Modal
          isOpen={Boolean(editingQuestion)}
          onClose={() => setEditingQuestion(null)}
          title="Edit Interview Question"
          description="Update question wording or reference answer points"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Question Statement
              </label>
              <textarea
                rows={3}
                value={editingQuestion.question}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Reference Answer & Solution Rubric
              </label>
              <textarea
                rows={4}
                value={editingQuestion.referenceAnswer || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, referenceAnswer: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setEditingQuestion(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingQuestionId)}
        onClose={() => setDeletingQuestionId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Question?"
        message="This question will be removed from your preparation bank."
        confirmText="Delete"
        danger={true}
      />
    </div>
  );
}

export default QuestionBank;

