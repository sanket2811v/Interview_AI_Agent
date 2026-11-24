import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileText,
  Award,
  Layers,
  Code2,
  HelpCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { evaluationService } from '../services/evaluationService.js';

export function EvaluationDetail() {
  const { evaluationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    loadEvaluation();
  }, [evaluationId]);

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);
      if (evaluationId) {
        const data = await evaluationService.getEvaluationDetails(evaluationId);
        setEvaluation(data);
      } else {
        const listRes = await evaluationService.listEvaluations({ limit: 1 });
        if (listRes.evaluations && listRes.evaluations.length > 0) {
          setEvaluation(listRes.evaluations[0]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load evaluation details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!evaluation?.id) return;
    try {
      setIsRegenerating(true);
      const updated = await evaluationService.regenerateEvaluation(evaluation.id);
      if (updated) setEvaluation(updated);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to regenerate evaluation');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Loading evaluation analysis..." />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <ErrorState
          message={error || 'Evaluation record not found.'}
          onRetry={loadEvaluation}
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
            Return to Reports
          </Button>
        </div>
      </div>
    );
  }

  const score = evaluation.overallScore || 0;
  const classification = evaluation.classification || 'Good';
  const criteria = Array.isArray(evaluation.criterionScores) ? evaluation.criterionScores : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={ArrowLeft}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            iconLeft={FileText}
            onClick={() => navigate('/reports')}
          >
            Reports
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={TrendingUp}
            onClick={() => navigate('/improvement-plan')}
          >
            Improvement Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeft={RefreshCw}
            loading={isRegenerating}
            onClick={handleRegenerate}
          >
            Re-Evaluate
          </Button>
        </div>
      </div>

      {/* Header Banner */}
      <Card className="p-6 sm:p-8 border-violet-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-[#27324A]/60">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {evaluation.sourceType?.replace('_', ' ')} Evaluation
              </Badge>
              <Badge variant="outline" size="sm">
                Rubric v{evaluation.rubricVersion || '1.0.0'}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Evaluation Performance Report
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Evaluated on {new Date(evaluation.evaluatedAt || evaluation.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 rounded-full border-4 border-violet-600 flex items-center justify-center font-extrabold text-2xl text-violet-600 dark:text-violet-400 shrink-0">
              {score}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white">{classification}</p>
              <p className="text-xs text-slate-400">
                Confidence: {Math.round((evaluation.confidence || 0.85) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Feedback Narrative */}
        {evaluation.detailedFeedback && (
          <div className="pt-6 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assessor Executive Assessment
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {evaluation.detailedFeedback}
            </p>
          </div>
        )}
      </Card>

      {/* Criterion Breakdown Table */}
      {criteria.length > 0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Transparent Criterion-Level Scoring
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-[#27324A]/60">
            {criteria.map((crit, idx) => (
              <div key={idx} className="py-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {crit.name || crit.criterion}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      (Weight: {Math.round((crit.weight || 0) * 100)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                      {crit.score}/100
                    </span>
                  </div>
                </div>
                {crit.explanation && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {crit.explanation}
                  </p>
                )}
                {crit.supportingEvidence && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-xs text-slate-500 italic">
                    Evidence: "{crit.supportingEvidence}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Demonstrated Strengths
          </h3>
          <div className="space-y-2">
            {Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 ? (
              evaluation.strengths.map((s, idx) => (
                <div key={idx} className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <span>✓</span>
                  <span>{s}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No specific strengths listed.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Identified Growth Areas
          </h3>
          <div className="space-y-2">
            {Array.isArray(evaluation.weaknesses) && evaluation.weaknesses.length > 0 ? (
              evaluation.weaknesses.map((w, idx) => (
                <div key={idx} className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <span>•</span>
                  <span>{w}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No specific weaknesses listed.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Missing Concepts & Improved Sample Answer */}
      {Array.isArray(evaluation.missingConcepts) && evaluation.missingConcepts.length > 0 && (
        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            Missing Expected Concepts / Terminology
          </h3>
          <div className="flex flex-wrap gap-2">
            {evaluation.missingConcepts.map((concept, idx) => (
              <Badge key={idx} variant="outline" size="sm">
                {concept}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {evaluation.improvedAnswer && (
        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Exemplary Model Answer / Alternative Solution
          </h3>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
            {evaluation.improvedAnswer}
          </div>
        </Card>
      )}
    </div>
  );
}

export default EvaluationDetail;

