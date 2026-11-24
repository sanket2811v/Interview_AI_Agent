import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileBarChart2,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowRight,
  TrendingUp,
  Download,
  Share2,
  Sparkles,
  RefreshCw,
  PlusCircle,
  FileText,
  Clock,
  Layers,
  Code2,
  Printer,
  X,
  Target,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { evaluationService } from '../services/evaluationService.js';

export function Reports() {
  const navigate = useNavigate();
  const { reportId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState({ strengths: [], weaknesses: [] });
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  // Generation Modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState('COMPREHENSIVE');
  const [isGenerating, setIsGenerating] = useState(false);

  // Full Report View Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [reportId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorMessage(null);

      const [overviewData, categoryData, swData, reportsList] = await Promise.all([
        evaluationService.getPerformanceOverview(),
        evaluationService.getCategoryBreakdown(),
        evaluationService.getStrengthsAndWeaknesses(),
        evaluationService.getUserReports()
      ]);

      setOverview(overviewData);
      setCategories(categoryData || []);
      setStrengthsWeaknesses(swData || { strengths: [], weaknesses: [] });
      setReports(reportsList || []);

      if (reportId) {
        const found = await evaluationService.getReportDetails(reportId);
        if (found) {
          setSelectedReport(found);
          setIsViewModalOpen(true);
        }
      } else if (reportsList && reportsList.length > 0) {
        setSelectedReport(reportsList[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load performance analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const payload = {
        title: reportTitle.trim() || undefined,
        reportType
      };

      const newReport = await evaluationService.generateReport(payload);

      setIsGenerateModalOpen(false);
      setReportTitle('');

      // Refresh reports history list and analytics
      const [updatedReports, updatedOverview] = await Promise.all([
        evaluationService.getUserReports(),
        evaluationService.getPerformanceOverview()
      ]);

      if (updatedReports) setReports(updatedReports);
      if (updatedOverview) setOverview(updatedOverview);

      if (newReport) {
        setSelectedReport(newReport);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to generate performance report.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = async (targetReport) => {
    const reportToDownload = targetReport || selectedReport;
    if (!reportToDownload?.id) return;

    try {
      setIsDownloading(true);
      const downloadData = await evaluationService.downloadReportData(reportToDownload.id);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(downloadData || reportToDownload, null, 2));
      const downloadAnchor = document.createElement('a');
      const safeTitle = (reportToDownload.title || 'performance_report').toLowerCase().replace(/[^a-z0-9]/g, '_');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${safeTitle}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export report payload.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Loading performance analytics & evaluations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <ErrorState message={error} onRetry={loadDashboardData} />
      </div>
    );
  }

  const hasEvaluations = (overview?.totalEvaluations || 0) > 0;
  const score = selectedReport?.overallScore ?? overview?.averageScore ?? 0;
  const classification = selectedReport?.classification ?? overview?.classification ?? (hasEvaluations ? 'Good' : 'Needs Data');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print:max-w-none print:pb-0">
      {/* Page Header (Hidden in print) */}
      <div className="print:hidden">
        <PageHeader
          title="Interview Performance & Evaluation Reports"
          subtitle="Objective scoring, rubric breakdowns, and evidence-based strengths from your practice questions, coding submissions, and mock rounds."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                iconLeft={TrendingUp}
                onClick={() => navigate('/improvement-plan')}
              >
                Improvement Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={Printer}
                onClick={handlePrint}
              >
                Print / Export
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={PlusCircle}
                loading={isGenerating}
                onClick={() => setIsGenerateModalOpen(true)}
              >
                Generate Report
              </Button>
            </div>
          }
        />
      </div>

      {/* Error alert if generation or action failed */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs sm:text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Zero Evaluation Empty State Card (Visible when user has 0 evaluations) */}
      {!hasEvaluations && (
        <Card className="p-6 sm:p-8 border-violet-500/30 bg-violet-500/5 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">No Evaluation Data</Badge>
                <span className="text-xs text-slate-400">0 Evaluated Attempts</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                No evaluation data is available yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                Complete a mock interview, technical practice session, or coding assessment to generate your performance report. You can also generate an initial baseline preparation report now.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                iconLeft={Code2}
                onClick={() => navigate('/practice')}
              >
                Technical Practice
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={Sparkles}
                onClick={() => navigate('/mock-interviews/new')}
              >
                Mock Interview
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={Layers}
                onClick={() => navigate('/coding')}
              >
                Coding Arena
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Primary Overall Score Card */}
      <Card className="p-6 sm:p-8 border-violet-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-[#27324A]/60">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {selectedReport?.title || 'Comprehensive Performance Overview'}
              </Badge>
              <span className="text-xs text-slate-400">
                {overview?.totalEvaluations || 0} Total Evaluations
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Candidate Readiness Assessment
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {selectedReport?.summary || overview?.summary || 'Evaluated across multi-dimensional criteria.'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 rounded-full border-4 border-violet-600 flex items-center justify-center font-extrabold text-2xl text-violet-600 dark:text-violet-400 shrink-0">
              {score}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{classification}</p>
              <p className="text-xs text-emerald-500 font-semibold">
                {hasEvaluations
                  ? (score >= 70 ? 'Benchmark Met' : 'Development In Progress')
                  : 'Pending Practice Evaluation'}
              </p>
            </div>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-center">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] space-y-1">
            <p className="text-xs text-slate-500">Evaluated Answers</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {overview?.totalAnswersEvaluated || 0}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] space-y-1">
            <p className="text-xs text-slate-500">Mock Rounds</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {overview?.totalInterviewsEvaluated || 0}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] space-y-1">
            <p className="text-xs text-slate-500">Coding Success</p>
            <p className="text-lg font-bold text-emerald-500">
              {overview?.codingSuccessRate || 0}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] space-y-1">
            <p className="text-xs text-slate-500">Avg Practice Score</p>
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
              {overview?.averagePracticeScore || 0}/100
            </p>
          </div>
        </div>
      </Card>

      {/* Category Performance Breakdown */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-500" />
          Category-Wise Competency Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => {
            const isEvaluated = c.evaluationCount > 0;
            return (
              <div
                key={c.category}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {c.name}
                  </span>
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                    {isEvaluated ? `${c.averageScore}/100` : 'Not Evaluated'}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all"
                    style={{ width: `${isEvaluated ? Math.min(100, c.averageScore) : 0}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEvaluated ? `${c.evaluationCount} evaluated attempts` : '0 evaluated attempts'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Demonstrated Candidate Strengths
          </h3>
          <div className="space-y-3">
            {strengthsWeaknesses.strengths && strengthsWeaknesses.strengths.length > 0 ? (
              strengthsWeaknesses.strengths.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-start gap-2"
                >
                  <span className="shrink-0">✓</span>
                  <span>{typeof s === 'string' ? s : s.point}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">
                Complete more evaluations to populate strengths analysis.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Identified Growth Areas & Weaknesses
          </h3>
          <div className="space-y-3">
            {strengthsWeaknesses.weaknesses && strengthsWeaknesses.weaknesses.length > 0 ? (
              strengthsWeaknesses.weaknesses.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-medium flex items-start gap-2"
                >
                  <span className="shrink-0">•</span>
                  <span>{typeof w === 'string' ? w : w.point}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">
                No recurring weaknesses identified yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Historical Generated Reports List (Hidden in print) */}
      <div className="print:hidden">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Generated Performance Reports History
            </h3>
            <span className="text-xs text-slate-400">
              {reports.length} {reports.length === 1 ? 'Report' : 'Reports'} Archived
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-slate-400 italic">
                No standalone reports generated yet. Click "Generate Report" above to create your first report archive.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#27324A]/60">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#151C2E]/40 px-3 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {rep.title}
                    </p>
                    <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(rep.generatedAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>Score: {rep.overallScore}/100</span>
                      <span>•</span>
                      <span className="text-violet-500 font-medium">({rep.classification})</span>
                      <span>•</span>
                      <span>{rep.evaluationCount || 0} evals</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(rep);
                        setIsViewModalOpen(true);
                      }}
                    >
                      View Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      iconLeft={Download}
                      loading={isDownloading && selectedReport?.id === rep.id}
                      onClick={() => handleDownloadJSON(rep)}
                    >
                      Export
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Generate Report Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          if (!isGenerating) setIsGenerateModalOpen(false);
        }}
        title="Generate Formal Performance Report"
      >
        <div className="space-y-4 pt-2">
          {!hasEvaluations && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1">
              <p className="font-semibold">Notice: Zero Evaluated Attempts</p>
              <p>
                No completed mock interviews, practice sessions, or coding assessments exist yet. Generating now will produce an initial baseline readiness archive for your target role without fabricated scores.
              </p>
            </div>
          )}

          <p className="text-xs sm:text-sm text-slate-500">
            Synthesize all current evaluation attempts, category scores, and growth areas into an official report archive.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Report Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Mid-Preparation Senior Backend Review"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] rounded-lg text-slate-900 dark:text-white"
            >
              <option value="COMPREHENSIVE">Comprehensive Assessment</option>
              <option value="PRACTICE">Practice Questions Focus</option>
              <option value="MOCK_INTERVIEW">Mock Interviews Focus</option>
              <option value="CODING">Algorithms & Coding Focus</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-[#27324A]/60">
            <Button
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto"
              disabled={isGenerating}
              onClick={() => setIsGenerateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              loading={isGenerating}
              disabled={isGenerating}
              onClick={handleGenerateReport}
            >
              Generate Report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Comprehensive Report View Modal */}
      {selectedReport && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={selectedReport.title || 'Performance Report'}
        >
          <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto pr-1">
            {/* A. Candidate Overview */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Candidate Overview
                </h4>
                <Badge variant={selectedReport.evaluationCount > 0 ? 'success' : 'secondary'} size="sm">
                  {selectedReport.evaluationCount > 0 ? 'Evaluated Report' : 'Baseline Report'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Candidate</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedReport.metrics?.candidateName || 'Candidate'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Target Role</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedReport.metrics?.targetJobRole || 'Full Stack Developer'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Company</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedReport.metrics?.companyName || 'Target Company'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Reporting Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedReport.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* B. Overall Performance */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Overall Performance
              </h4>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full border-4 border-violet-600 flex items-center justify-center font-extrabold text-xl text-violet-600 dark:text-violet-400 shrink-0">
                    {selectedReport.overallScore || 0}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Readiness: {selectedReport.classification || 'Needs Data'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Based on {selectedReport.evaluationCount || 0} completed evaluation interactions
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#151C2E]">
                    <p className="text-slate-400 text-[10px]">Technical</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedReport.metrics?.technicalScore || selectedReport.metrics?.averagePracticeScore || 0}/100
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#151C2E]">
                    <p className="text-slate-400 text-[10px]">Communication</p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedReport.metrics?.communicationScore || selectedReport.metrics?.averageInterviewScore || 0}/100
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#151C2E]">
                    <p className="text-slate-400 text-[10px]">Coding</p>
                    <p className="font-bold text-emerald-500">
                      {selectedReport.metrics?.codingSuccessRate || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* C. Category-Wise Competency Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Category-Wise Competency Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Array.isArray(selectedReport.categoryScores) && selectedReport.categoryScores.length > 0 ? (
                  selectedReport.categoryScores.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {cat.name || cat.category}
                        </span>
                        <span className="font-bold text-violet-600 dark:text-violet-400">
                          {cat.isEvaluated || cat.evaluationCount > 0 ? `${cat.averageScore}/100` : 'Not Evaluated'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full"
                          style={{ width: `${cat.isEvaluated || cat.evaluationCount > 0 ? Math.min(100, cat.averageScore) : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {cat.evaluationCount > 0 ? `${cat.evaluationCount} evaluated attempts` : '0 evaluated attempts'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No category metrics archived for this report.</p>
                )}
              </div>
            </div>

            {/* D & E. Strengths & Growth Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Demonstrated Strengths
                </h4>
                <div className="space-y-2">
                  {Array.isArray(selectedReport.strengths) && selectedReport.strengths.length > 0 ? (
                    selectedReport.strengths.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2"
                      >
                        <span className="shrink-0 font-bold">✓</span>
                        <span>{typeof s === 'string' ? s : s.point}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic p-2 rounded-lg bg-slate-50 dark:bg-[#0B1020]">
                      Complete more evaluations to identify demonstrated strengths.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Areas for Growth & Weaknesses
                </h4>
                <div className="space-y-2">
                  {Array.isArray(selectedReport.weaknesses) && selectedReport.weaknesses.length > 0 ? (
                    selectedReport.weaknesses.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2"
                      >
                        <span className="shrink-0 font-bold">•</span>
                        <span>{typeof w === 'string' ? w : w.point}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic p-2 rounded-lg bg-slate-50 dark:bg-[#0B1020]">
                      No recurring weaknesses detected in available records.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* F & G. Recommendations & Learning Plan */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-violet-500" />
                Actionable Recommendations & Learning Plan
              </h4>

              <div className="space-y-2">
                {Array.isArray(selectedReport.recommendations) && selectedReport.recommendations.length > 0 ? (
                  selectedReport.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-violet-500 font-bold">#{idx + 1}</span>
                      <span>{rec}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No recommendations recorded.</p>
                )}
              </div>

              {Array.isArray(selectedReport.metrics?.learningPlan) && selectedReport.metrics.learningPlan.length > 0 && (
                <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-xs space-y-2">
                  <p className="font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Recommended Practice Focus
                  </p>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                    {selectedReport.metrics.learningPlan.map((step, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* H. Final Assessment Summary */}
            <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-[#151C2E] text-xs space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">Executive Assessment</p>
              <p className="text-slate-600 dark:text-slate-400">
                {selectedReport.summary || selectedReport.metrics?.finalAssessment || 'Assessment complete.'}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-[#27324A]/60">
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  iconLeft={Printer}
                  onClick={handlePrint}
                >
                  Print
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full sm:w-auto"
                  iconLeft={Download}
                  loading={isDownloading}
                  onClick={() => handleDownloadJSON(selectedReport)}
                >
                  Export JSON
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Reports;
