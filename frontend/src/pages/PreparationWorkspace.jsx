import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Video,
  FileText,
  BarChart2,
  Code2,
  CheckCircle2,
  PlayCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Building,
  MapPin,
  Edit3,
  Archive,
  ArrowLeft,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { preparationService } from '../services/preparationService.js';

export function PreparationWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Job Description edit state
  const [isEditingJd, setIsEditingJd] = useState(false);
  const [jdText, setJdText] = useState('');
  const [isSavingJd, setIsSavingJd] = useState(false);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await preparationService.getPreparationById(id);
      const sessionData = data?.data || data;
      if (!sessionData || !sessionData.id) {
        throw new Error('Preparation workspace details could not be loaded.');
      }
      setSession(sessionData);
      setJdText(sessionData.jobDescription?.rawText || '');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load preparation session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSession();
    }
  }, [id]);

  const handleSaveJd = async () => {
    if (!jdText.trim() || jdText.trim().length < 20) {
      toast.error('Job description must be at least 20 characters.');
      return;
    }
    setIsSavingJd(true);
    try {
      await preparationService.updateJobDescription(id, jdText);
      toast.success('Job description updated successfully.');
      setIsEditingJd(false);
      fetchSession();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update job description.');
    } finally {
      setIsSavingJd(false);
    }
  };

  const handleArchive = async () => {
    try {
      await preparationService.archivePreparation(id);
      toast.success('Preparation session archived.');
      navigate('/preparations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive preparation.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading preparation workspace and job description..." />;
  }

  if (error || !session) {
    return (
      <ErrorState
        message={error || 'Preparation workspace not found.'}
        onRetry={fetchSession}
      />
    );
  }

  const tabs = [
    { id: 'overview', label: 'Job Description & Overview', icon: FileText },
    { id: 'rounds', label: 'Interview Modules', icon: Layers, count: 4 },
    { id: 'questions', label: 'Role Question Bank', icon: HelpCircle, count: 5 }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
        <button
          onClick={() => navigate('/preparations')}
          className="hover:text-slate-900 dark:hover:text-white flex items-center space-x-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>My Preparations</span>
        </button>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium truncate">
          {session.jobTitle || session.title}
        </span>
      </div>

      <PageHeader
        title={session.jobTitle || session.title}
        subtitle={`${session.companyName}${session.location ? ` • ${session.location}` : ''} • Created on ${new Date(session.createdAt).toLocaleDateString()}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              iconLeft={Archive}
              onClick={handleArchive}
            >
              Archive
            </Button>
            <Button
              variant={session.jobAnalysis ? 'secondary' : 'primary'}
              size="sm"
              iconRight={ArrowRight}
              onClick={() => navigate(`/preparations/${id}/analysis`)}
            >
              {session.jobAnalysis ? 'View AI Job Analysis' : 'Analyze Job Posting (AI)'}
            </Button>
            {session.jobAnalysis && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  iconRight={Sparkles}
                  onClick={() => navigate(`/preparations/${id}/questions`)}
                >
                  Question Bank
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconRight={PlayCircle}
                  onClick={() => navigate(`/preparations/${id}/practice`)}
                >
                  Start Practice
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Target Progress Bar & High-Level Metadata */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Preparation Status:</span>
              <Badge variant={session.status === 'READY' ? 'primary' : 'success'}>
                {session.status}
              </Badge>
              <Badge variant="outline">{session.experienceLevel}</Badge>
              <Badge variant="secondary">Difficulty: {session.difficulty}</Badge>
              <Badge variant="neutral">Language: {session.preferredLanguage}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target Focus: {Array.isArray(session.preferences) && session.preferences.length > 0
                ? session.preferences.join(', ')
                : 'Full-stack Technical & System Design'}
            </p>
          </div>

          <div className="w-full lg:w-72 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Readiness Score</span>
              <span className="text-violet-600 dark:text-violet-400 font-mono">{session.progress}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${session.progress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Overview & Job Description */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  <span>Submitted Job Description</span>
                </CardTitle>
                <CardDescription>
                  Source: {session.jobDescription?.sourceType || 'PASTED_TEXT'}
                  {session.jobDescription?.originalFileName && ` • File: ${session.jobDescription.originalFileName}`}
                  {session.jobDescription?.fileSize && ` (${Math.round(session.jobDescription.fileSize / 1024)} KB)`}
                </CardDescription>
              </div>

              {!isEditingJd ? (
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={Edit3}
                  onClick={() => setIsEditingJd(true)}
                >
                  Edit Description
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingJd(false);
                      setJdText(session.jobDescription?.rawText || '');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={Save}
                    disabled={isSavingJd}
                    onClick={handleSaveJd}
                  >
                    {isSavingJd ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditingJd ? (
                <textarea
                  rows={14}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100"
                />
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-slate-800 dark:text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto">
                  {session.jobDescription?.rawText || 'No Job Description text available.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Start Next Steps Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-slate-900 border border-violet-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span>{session.jobAnalysis ? 'AI Job Analysis Ready' : 'AI Skill Extraction & Job Analysis'}</span>
              </h4>
              <p className="text-xs text-slate-300 max-w-xl">
                {session.jobAnalysis
                  ? `AI analysis complete! Extracted ${Array.isArray(session.jobAnalysis.technicalSkills) ? session.jobAnalysis.technicalSkills.length : 'core'} skills and difficulty score.`
                  : 'Deconstruct requirements, extract technical & soft skills, estimate interview difficulty, and benchmark candidate gaps.'}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate(`/preparations/${id}/analysis`)}
              iconRight={ArrowRight}
            >
              {session.jobAnalysis ? 'Open AI Analysis' : 'Analyze Job Posting'}
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: Modules Placeholder */}
      {activeTab === 'rounds' && (
        <div className="space-y-4">
          {[
            { title: 'Technical Architecture & Deep Dive', type: 'System Architecture', count: '10 Questions' },
            { title: 'Algorithmic Coding Arena', type: 'Live Coding Practice', count: '4 Challenges' },
            { title: 'Distributed System Design', type: 'Whiteboard Architecture', count: '1 Case Study' },
            { title: 'STAR Behavioral & Culture Fit', type: 'HR & Leadership', count: '6 Questions' }
          ].map((m, idx) => (
            <Card key={idx} className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h4>
                <p className="text-xs text-slate-500">{m.type} • {m.count}</p>
              </div>
              <Badge variant="outline">Configured</Badge>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Question Bank Integration */}
      {activeTab === 'questions' && (
        <Card className="p-8 text-center space-y-4 border-violet-500/30">
          <Sparkles className="h-10 w-10 text-violet-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">Role Question Bank & Challenges</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {session.jobAnalysis
              ? `Personalized questions and coding challenges tailored specifically for ${session.jobTitle} at ${session.companyName}.`
              : 'Complete Phase 6 Job Description Analysis first to unlock role-tailored question generation.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => navigate(`/preparations/${id}/questions`)}
            >
              Open Role Question Bank (Phase 7)
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
export default PreparationWorkspace;
