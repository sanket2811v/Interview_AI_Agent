import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileSearch,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Layers,
  Code2,
  Users2,
  ShieldCheck,
  Cpu,
  RefreshCw,
  FileText,
  Briefcase,
  Building,
  MapPin,
  Calendar,
  Clock,
  Compass,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { preparationService } from '../services/preparationService.js';

export function JobAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Filter & modal states
  const [skillFilter, setSkillFilter] = useState('ALL'); // ALL, REQUIRED, PREFERRED
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isJdModalOpen, setIsJdModalOpen] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState({});

  // Analysis progress step indicator during live generation
  const [analysisStep, setAnalysisStep] = useState(0);

  const steps = [
    'Parsing saved job description structure...',
    'Extracting technical proficiencies & soft skills...',
    'Analyzing seniority & experience expectations...',
    'Benchmarking candidate profile for skill gap analysis...',
    'Synthesizing recruiter summary & difficulty rating...'
  ];

  // Fetch preparation session and analysis status
  const fetchSessionAndAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get preparation session details
      const sessionData = await preparationService.getPreparationById(id);
      setSession(sessionData);

      // 2. Try fetching existing analysis
      try {
        const analysisData = await preparationService.getPreparationAnalysis(id);
        setAnalysis(analysisData);
      } catch (analysisErr) {
        // If 404, analysis has not been generated yet
        if (analysisErr.response?.status === 404 || analysisErr.response?.data?.code === 'ANALYSIS_NOT_FOUND') {
          setAnalysis(null);
        } else {
          loggerErr(analysisErr);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load preparation session.');
    } finally {
      setLoading(false);
    }
  };

  function loggerErr(e) {
    console.warn('Analysis fetch notice:', e.message);
  }

  useEffect(() => {
    if (id) {
      fetchSessionAndAnalysis();
    }
  }, [id]);

  // Execute job analysis
  const handleStartAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisStep(0);
    setError(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const result = await preparationService.analyzePreparation(id);
      setAnalysis(result);
      toast.success('AI Job Description Analysis completed successfully!');
    } catch (err) {
      // If 409 (already in progress) or 408 (timeout), probe for completed analysis
      if (err.status === 409 || err.status === 408) {
        try {
          const probeAnalysis = await preparationService.getPreparationAnalysis(id);
          if (probeAnalysis) {
            setAnalysis(probeAnalysis);
            toast.success('Job Description Analysis retrieved successfully!');
            return;
          }
        } catch {
          // Fall through to show status notice
        }
      }

      const msg = err.response?.data?.message || err.message || 'Failed to analyze job description.';
      toast.error(msg);
      setError(msg);
    } finally {
      clearInterval(stepInterval);
      setAnalyzing(false);
      // Refresh session metadata to update readiness progress
      try {
        const updatedSession = await preparationService.getPreparationById(id);
        setSession(updatedSession);
      } catch {}
    }
  };

  // Force regenerate analysis
  const handleRegenerateAnalysis = async () => {
    setIsRegenerateModalOpen(false);
    setAnalyzing(true);
    setAnalysisStep(0);
    setError(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const result = await preparationService.regeneratePreparationAnalysis(id);
      setAnalysis(result);
      toast.success('Job description re-analyzed successfully!');
    } catch (err) {
      if (err.status === 409 || err.status === 408) {
        try {
          const probeAnalysis = await preparationService.getPreparationAnalysis(id);
          if (probeAnalysis) {
            setAnalysis(probeAnalysis);
            toast.success('Job Description Analysis retrieved successfully!');
            return;
          }
        } catch {}
      }

      const msg = err.response?.data?.message || err.message || 'Failed to regenerate analysis.';
      toast.error(msg);
      setError(msg);
    } finally {
      clearInterval(stepInterval);
      setAnalyzing(false);
      try {
        const updatedSession = await preparationService.getPreparationById(id);
        setSession(updatedSession);
      } catch {}
    }
  };

  const toggleEvidence = (index) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return <LoadingState message="Loading job description analysis..." />;
  }

  if (error && !analysis && !session) {
    return <ErrorState message={error} onRetry={fetchSessionAndAnalysis} />;
  }

  const hasJobDescription = Boolean(
    session?.jobDescription?.rawText && session.jobDescription.rawText.trim().length >= 20
  );

  // Normalized raw data helper
  const raw = analysis?.rawAnalysis || {};
  const jobOverview = raw.jobOverview || {
    jobTitle: analysis?.jobTitle || session?.jobTitle,
    standardizedTitle: session?.jobTitle,
    companyName: analysis?.companyName || session?.companyName,
    seniorityLevel: analysis?.seniorityLevel || session?.experienceLevel,
    employmentType: 'Full-time',
    workArrangement: 'UNKNOWN',
    location: session?.location || null,
    summary: 'Detailed AI role synthesis is being compiled from your submitted requirements.'
  };

  const difficultyData = raw.difficultyAnalysis || {
    level: analysis?.interviewDifficulty || session?.difficulty || 'MEDIUM',
    score: analysis?.interviewDifficulty === 'EXPERT' ? 90 : analysis?.interviewDifficulty === 'HARD' ? 75 : 55,
    explanation: 'Calculated baseline from role responsibilities and required technical competencies.',
    technicalComplexity: 'Moderate full-stack and architectural requirements.',
    experienceComplexity: 'Industry standard for role seniority.'
  };

  const technicalSkills = Array.isArray(analysis?.technicalSkills) && analysis.technicalSkills.length > 0
    ? analysis.technicalSkills
    : (raw.technicalSkills || []);

  const softSkills = Array.isArray(analysis?.softSkills) && analysis.softSkills.length > 0
    ? analysis.softSkills
    : (raw.softSkills || []);

  const responsibilities = Array.isArray(analysis?.responsibilities) && analysis.responsibilities.length > 0
    ? analysis.responsibilities
    : (raw.responsibilities || []);

  const qualifications = Array.isArray(analysis?.qualifications) && analysis.qualifications.length > 0
    ? analysis.qualifications
    : (raw.qualifications || []);

  const techStack = raw.technologyStack || (typeof analysis?.technologies === 'object' && analysis.technologies) || {
    languages: [],
    frameworks: [],
    databases: [],
    cloudPlatforms: [],
    tools: []
  };

  const skillGapData = raw.skillGapAnalysis || (typeof analysis?.skillGapAnalysis === 'object' && analysis.skillGapAnalysis) || {
    isPreliminary: true,
    profileCompleteness: 'INCOMPLETE',
    skills: []
  };

  const summaryData = raw.summary || {
    executiveSummary: jobOverview.summary,
    topTechnicalSkills: technicalSkills.slice(0, 5).map((s) => s.name),
    topSoftSkills: softSkills.slice(0, 4).map((s) => s.name),
    preparationRecommendations: [
      'Focus interview preparation on core language fundamentals and database design.',
      'Practice hands-on coding challenges for real-world API building.',
      'Review architectural patterns relevant to this role.'
    ]
  };

  // Filtered technical skills
  const filteredSkills = technicalSkills.filter((s) => {
    if (skillFilter === 'REQUIRED') return s.requirementType === 'REQUIRED';
    if (skillFilter === 'PREFERRED') return s.requirementType === 'PREFERRED' || s.requirementType === 'OPTIONAL';
    return true;
  });

  // Categorized technical skills grouping
  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    const cat = skill.category || 'OTHER';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const getDifficultyColor = (score) => {
    if (score >= 80) return 'text-rose-500 from-rose-500 to-red-600';
    if (score >= 65) return 'text-amber-500 from-amber-500 to-orange-500';
    if (score >= 40) return 'text-violet-500 from-violet-500 to-indigo-500';
    return 'text-emerald-500 from-emerald-500 to-teal-500';
  };

  const getMatchBadgeVariant = (status) => {
    switch (status) {
      case 'MATCHED':
        return 'success';
      case 'PARTIAL_MATCH':
        return 'warning';
      case 'GAP':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
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
        <span className="text-violet-600 dark:text-violet-400 font-medium">AI Job Analysis</span>
      </div>

      {/* Page Header */}
      <PageHeader
        title="AI-Powered Job Description Analysis"
        subtitle={`Intelligent capability breakdown, skill gap benchmarking, and candidate readiness for ${session?.companyName || 'Target Role'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              iconLeft={FileText}
              onClick={() => setIsJdModalOpen(true)}
              disabled={!hasJobDescription}
            >
              View Saved JD
            </Button>
            {analysis && (
              <Button
                variant="outline"
                size="sm"
                iconLeft={RefreshCw}
                onClick={() => setIsRegenerateModalOpen(true)}
                disabled={analyzing}
              >
                Regenerate
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => navigate(`/preparations/${id}`)}
            >
              Back to Workspace
            </Button>
          </div>
        }
      />

      {/* CASE 1: Missing Job Description */}
      {!hasJobDescription && (
        <Card className="p-8 text-center border-amber-500/30 bg-amber-500/5">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Job Description Required for AI Analysis
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 mb-6">
            You must paste or upload a job description of at least 20 characters before the AI can extract skills and evaluate requirements.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(`/preparations/${id}`)}
            iconLeft={ArrowLeft}
          >
            Add Job Description in Workspace
          </Button>
        </Card>
      )}

      {/* CASE 2: Analysis In Progress */}
      {analyzing && (
        <Card className="p-10 text-center border-violet-500/40 bg-gradient-to-b from-violet-950/20 to-transparent">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-600/20 text-violet-500 flex items-center justify-center mb-5 animate-spin">
            <RefreshCw className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Analyzing Job Description with AI
          </h3>
          <p className="text-sm text-violet-400 font-medium mt-2 mb-6 animate-pulse">
            {steps[analysisStep]}
          </p>

          <div className="w-full max-w-md mx-auto bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${((analysisStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            Please keep this tab open. Real structured AI reasoning typically takes 5–15 seconds.
          </p>
        </Card>
      )}

      {/* CASE 3: Not Analyzed Yet (Hero CTA) */}
      {!analysis && !analyzing && hasJobDescription && (
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-violet-500/30 bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-[#151C2E] space-y-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Phase 6 AI Intelligence Engine Ready</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Deconstruct {session?.jobTitle || 'Your Target Role'} with Precision AI
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Our AI analyzes your saved job description against industry engineering benchmarks. Extract mandatory vs. preferred skills, estimate interview difficulty, identify candidate skill gaps, and receive tailored preparation recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {[
              { icon: Code2, title: 'Technical Stack Extraction', desc: 'Languages, frameworks, databases, and cloud tools categorized' },
              { icon: TrendingUp, title: 'Interview Difficulty Rating', desc: 'Comprehensive score (1–100) based on role complexity' },
              { icon: ShieldCheck, title: 'Candidate Skill Gap Analysis', desc: 'Identifies gaps & matches against your profile' }
            ].map((feature, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                <feature.icon className="h-5 w-5 text-violet-400" />
                <h4 className="text-xs font-bold text-white">{feature.title}</h4>
                <p className="text-[11px] text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              iconLeft={Sparkles}
              onClick={handleStartAnalysis}
            >
              Analyze Job Description Now
            </Button>
          </div>
        </div>
      )}

      {/* CASE 4: Full Analysis Completed Dashboard */}
      {analysis && !analyzing && (
        <div className="space-y-8">
          {/* SECTION 1: Overview Banner & Executive Summary */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-violet-950/40 via-indigo-950/30 to-[#151C2E] border border-violet-500/30 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                    {jobOverview.standardizedTitle || jobOverview.jobTitle}
                  </span>
                  <Badge variant="primary" size="sm">{jobOverview.seniorityLevel}</Badge>
                  {jobOverview.workArrangement && jobOverview.workArrangement !== 'UNKNOWN' && (
                    <Badge variant="outline" size="sm">{jobOverview.workArrangement}</Badge>
                  )}
                  {jobOverview.employmentType && (
                    <Badge variant="neutral" size="sm">{jobOverview.employmentType}</Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {jobOverview.jobTitle}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-500" />
                    <span className="font-medium text-slate-300">{jobOverview.companyName || session?.companyName}</span>
                  </div>
                  {jobOverview.location && (
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span>{jobOverview.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Analyzed on {new Date(analysis.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Difficulty Gauge Score Card */}
              <div className="p-4 rounded-2xl bg-white/5 dark:bg-[#1A233A] border border-white/10 shrink-0 min-w-[220px] text-center space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Interview Difficulty Rating
                </span>
                <div className={`text-4xl font-extrabold bg-gradient-to-r ${getDifficultyColor(difficultyData.score)} bg-clip-text text-transparent`}>
                  {difficultyData.score}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Badge variant={difficultyData.level === 'EXPERT' ? 'danger' : difficultyData.level === 'HARD' ? 'warning' : 'primary'} size="sm">
                    {difficultyData.level}
                  </Badge>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1" title="AI-calculated difficulty based on JD complexity">
                    <Info className="h-3 w-3" />
                    <span>AI Estimate</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <span>Recruiter Executive Summary</span>
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                {summaryData.executiveSummary || jobOverview.summary}
              </p>
              {jobOverview.primaryPurpose && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 mt-3">
                  <span className="font-semibold text-violet-200">Core Hiring Mission: </span>
                  {jobOverview.primaryPurpose}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2 & 7: Experience & Difficulty Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Experience Requirements Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Experience & Seniority</CardTitle>
                    <CardDescription>Expectations extracted from job specifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Required Experience:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {raw.experienceAnalysis?.minimumYears !== null && raw.experienceAnalysis?.minimumYears !== undefined
                        ? `${raw.experienceAnalysis.minimumYears}+ years`
                        : 'Not explicitly specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Seniority Bracket:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {raw.experienceAnalysis?.experienceLevel || jobOverview.seniorityLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Fresh Graduate Eligible:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {raw.experienceAnalysis?.freshGraduateEligible === true
                        ? 'Yes'
                        : raw.experienceAnalysis?.freshGraduateEligible === false
                        ? 'No (Experience required)'
                        : 'Not mentioned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Leadership / Mentorship:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {raw.experienceAnalysis?.leadershipRequired ? 'Required' : 'Individual Contributor'}
                    </span>
                  </div>
                </div>

                {Array.isArray(raw.experienceAnalysis?.explicitRequirements) && raw.experienceAnalysis.explicitRequirements.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Explicit Experience Statements:</span>
                    <ul className="space-y-1">
                      {raw.experienceAnalysis.explicitRequirements.map((stmt, i) => (
                        <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start space-x-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{stmt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Difficulty Breakdown Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Role Complexity Assessment</CardTitle>
                    <CardDescription>Evaluation of technical and organizational demands</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {difficultyData.explanation}
                </p>

                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                      Technical Complexity Factor:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 mt-0.5 block">
                      {difficultyData.technicalComplexity}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                      Experience Complexity Factor:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 mt-0.5 block">
                      {difficultyData.experienceComplexity}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: Technical Skills Matrix */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Technical Competencies Matrix</CardTitle>
                  <CardDescription>
                    Extracted from job requirements, grouped by engineering discipline
                  </CardDescription>
                </div>
              </div>

              {/* Skill Filter Pills */}
              <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto text-xs">
                <button
                  onClick={() => setSkillFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    skillFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({technicalSkills.length})
                </button>
                <button
                  onClick={() => setSkillFilter('REQUIRED')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    skillFilter === 'REQUIRED'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Required ({technicalSkills.filter((s) => s.requirementType === 'REQUIRED').length})
                </button>
                <button
                  onClick={() => setSkillFilter('PREFERRED')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    skillFilter === 'PREFERRED'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Preferred ({technicalSkills.filter((s) => s.requirementType !== 'REQUIRED').length})
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              {Object.keys(groupedSkills).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No technical skills found matching the current filter.
                </p>
              ) : (
                Object.entries(groupedSkills).map(([category, skills]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {category.replace(/_/g, ' ')} ({skills.length})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skills.map((skill, idx) => {
                        const isExp = expandedEvidence[`${category}-${idx}`];
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-violet-500/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {skill.name}
                              </span>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <Badge
                                  variant={skill.requirementType === 'REQUIRED' ? 'primary' : 'outline'}
                                  size="sm"
                                >
                                  {skill.requirementType}
                                </Badge>
                                <Badge
                                  variant={skill.importance === 'HIGH' ? 'danger' : 'neutral'}
                                  size="sm"
                                >
                                  {skill.importance}
                                </Badge>
                              </div>
                            </div>

                            {skill.evidence && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                <button
                                  onClick={() => toggleEvidence(`${category}-${idx}`)}
                                  className="text-violet-600 dark:text-violet-400 hover:underline flex items-center space-x-1 font-medium"
                                >
                                  <span>{isExp ? 'Hide context quote' : 'View context quote'}</span>
                                  {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                                {isExp && (
                                  <blockquote className="mt-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 italic text-slate-700 dark:text-slate-300 border-l-2 border-violet-500">
                                    "{skill.evidence}"
                                  </blockquote>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* SECTION 4 & 8: Soft Skills & Tech Stack Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Soft Skills Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Behavioral & Soft Skills</CardTitle>
                    <CardDescription>Interpersonal attributes emphasized in the JD</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {softSkills.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No soft skills explicitly identified.</p>
                ) : (
                  softSkills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {skill.name}
                        </span>
                        {skill.evidence && (
                          <p className="text-[11px] text-slate-500 italic">"{skill.evidence}"</p>
                        )}
                      </div>
                      <Badge variant={skill.importance === 'HIGH' ? 'primary' : 'neutral'} size="sm">
                        {skill.importance} Priority
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Tech Stack Summary Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Technology Stack Overview</CardTitle>
                    <CardDescription>Consolidated catalog of libraries and tools</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                {[
                  { label: 'Languages', items: techStack.languages },
                  { label: 'Frameworks / Libraries', items: techStack.frameworks },
                  { label: 'Databases & Storage', items: techStack.databases },
                  { label: 'Cloud & Infrastructure', items: techStack.cloudPlatforms },
                  { label: 'Development Tools', items: techStack.tools }
                ]
                  .filter((group) => Array.isArray(group.items) && group.items.length > 0)
                  .map((group, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">{group.label}:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((tech, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 6: Key Responsibilities */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Core Responsibilities</CardTitle>
                  <CardDescription>Primary duties categorized and ranked by hiring priority</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {responsibilities.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No responsibilities extracted.</p>
              ) : (
                responsibilities.map((resp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          {resp.title}
                        </span>
                        {resp.category && (
                          <Badge variant="outline" size="sm">{resp.category}</Badge>
                        )}
                      </div>
                      <Badge variant={resp.priority === 'HIGH' ? 'danger' : 'neutral'} size="sm">
                        {resp.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {resp.description}
                    </p>
                    {resp.evidence && (
                      <p className="text-[11px] text-slate-500 italic pt-0.5">
                        Supporting Quote: "{resp.evidence}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* SECTION 7: Qualifications Breakdown */}
          {qualifications.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Qualifications & Education Requirements</CardTitle>
                    <CardDescription>Mandatory credentials vs preferred qualifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mandatory */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center space-x-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Mandatory Qualifications</span>
                    </h4>
                    <div className="space-y-2">
                      {qualifications.filter((q) => q.isMandatory).map((q, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{q.requirement}</span>
                            <Badge variant="neutral" size="sm">{q.type}</Badge>
                          </div>
                          {q.evidence && <p className="text-[11px] text-slate-500 italic">"{q.evidence}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preferred */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center space-x-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Preferred / Bonus Credentials</span>
                    </h4>
                    <div className="space-y-2">
                      {qualifications.filter((q) => !q.isMandatory).map((q, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{q.requirement}</span>
                            <Badge variant="outline" size="sm">{q.type}</Badge>
                          </div>
                          {q.evidence && <p className="text-[11px] text-slate-500 italic">"{q.evidence}"</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 9: Candidate Skill Gap Analysis */}
          <Card className="border-violet-500/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Skill Gap & Candidate Profile Alignment</CardTitle>
                  <CardDescription>
                    Direct comparison of job requirements against your user profile credentials
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Profile Completeness Alert */}
              {skillGapData.profileCompleteness !== 'COMPLETE' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Preliminary Skill Gap Assessment
                      </h4>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Your user profile skills or experience are partially populated. Populate your profile to receive deeper automated skill-match precision.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => navigate('/profile')}
                    iconRight={ExternalLink}
                  >
                    Edit Profile Skills
                  </Button>
                </div>
              )}

              {/* Skill Gap Cards List */}
              <div className="space-y-3">
                {Array.isArray(skillGapData.skills) && skillGapData.skills.length > 0 ? (
                  skillGapData.skills.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {item.requiredSkill}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] text-slate-500">Candidate Evidence:</span>
                            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              {item.candidateEvidence || 'No direct match stated in profile'}
                            </span>
                          </div>
                        </div>

                        <Badge variant={getMatchBadgeVariant(item.matchStatus)} size="sm">
                          {item.matchStatus.replace('_', ' ')}
                        </Badge>
                      </div>

                      {item.explanation && (
                        <p className="text-slate-600 dark:text-slate-400">
                          {item.explanation}
                        </p>
                      )}

                      {item.improvementAction && (
                        <div className="p-2.5 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/20 text-violet-700 dark:text-violet-300 flex items-start space-x-2">
                          <TrendingUp className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="font-semibold">Recommended Prep Action: </strong>
                            {item.improvementAction}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Skill gap analysis will populate with tailored profile comparisons when full skills are submitted.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 10: Preparation Recommendations & Action Hub */}
          <Card className="bg-gradient-to-r from-violet-950/20 via-indigo-950/20 to-transparent border-violet-500/30">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>AI Strategic Preparation Recommendations</CardTitle>
                  <CardDescription>Tailored focus items to maximize your interview readiness score</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <ul className="space-y-2.5">
                {summaryData.preparationRecommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start space-x-3"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-xs text-slate-500">
                Ready to begin targeted technical practice and mock interviews?
              </span>
              <Button
                variant="primary"
                onClick={() => navigate(`/preparations/${id}`)}
                iconRight={ArrowRight}
              >
                Proceed to Preparation Workspace
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Confirmation Modal for Analysis Regeneration */}
      <ConfirmDialog
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        onConfirm={handleRegenerateAnalysis}
        title="Regenerate Job Analysis?"
        message="This will re-run the AI intelligence engine on the saved job description. Any updated skills in your profile will be benchmarked."
        confirmText="Regenerate Now"
        danger={false}
      />

      {/* View Raw Job Description Modal */}
      <Modal
        isOpen={isJdModalOpen}
        onClose={() => setIsJdModalOpen(false)}
        title="Submitted Job Description"
        description={`Original source text analyzed for ${session?.jobTitle || 'Role'}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {session?.jobDescription?.rawText || 'No text found.'}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsJdModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default JobAnalysis;
