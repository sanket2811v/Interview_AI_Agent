import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  ArrowRight,
  Target,
  Plus,
  X,
  Clock,
  AlertCircle,
  Pause,
  Play,
  Archive,
  RefreshCw,
  Layers,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { analyticsService } from '../services/analyticsService.js';
import { evaluationService } from '../services/evaluationService.js';

export function ImprovementPlan() {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recommendations state (Phase 11 2-way sync)
  const [recommendations, setRecommendations] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // Plan generation modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [customGoal, setCustomGoal] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // New task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Technical');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    loadPlansAndData();
  }, []);

  const loadPlansAndData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansData, recs] = await Promise.all([
        analyticsService.getPlans(),
        evaluationService.getUserRecommendations({ status: 'PENDING' }).catch(() => [])
      ]);

      setPlans(plansData || []);
      setRecommendations(recs || []);

      if (plansData && plansData.length > 0) {
        // Select first active plan, or the first plan
        const firstActive = plansData.find((p) => p.status === 'ACTIVE') || plansData[0];
        const fullPlan = await analyticsService.getPlanById(firstActive.id);
        setActivePlan(fullPlan);
      } else {
        setActivePlan(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load improvement plans');
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = async (planId) => {
    try {
      const fullPlan = await analyticsService.getPlanById(planId);
      setActivePlan(fullPlan);
    } catch (err) {
      alert('Failed to load plan details');
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    try {
      setGeneratingPlan(true);
      const generated = await analyticsService.generateAIPlan({
        durationWeeks: Number(durationWeeks),
        customGoal: customGoal.trim() || undefined
      });
      setShowGenerateModal(false);
      setCustomGoal('');
      await loadPlansAndData();
      if (generated) setActivePlan(generated);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to generate improvement plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!activePlan) return;

    try {
      setCreatingTask(true);
      await analyticsService.createTask({
        improvementPlanId: activePlan.id,
        title: newTaskTitle,
        category: newTaskCategory,
        priority: newTaskPriority,
        estimatedMinutes: Number(newTaskDuration),
        status: 'PENDING'
      });

      setShowTaskModal(false);
      setNewTaskTitle('');
      // Reload active plan
      const updated = await analyticsService.getPlanById(activePlan.id);
      setActivePlan(updated);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const toggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await analyticsService.updateTaskStatus(task.id, newStatus);
      // Refresh plan
      const updated = await analyticsService.getPlanById(activePlan.id);
      setActivePlan(updated);
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  const handlePlanStatusChange = async (status) => {
    if (!activePlan) return;
    try {
      await analyticsService.updatePlanStatus(activePlan.id, status);
      const updated = await analyticsService.getPlanById(activePlan.id);
      setActivePlan(updated);
      const allPlans = await analyticsService.getPlans();
      setPlans(allPlans);
    } catch (err) {
      alert('Failed to update plan status');
    }
  };

  const handleAcceptRec = async (rec) => {
    try {
      setActionLoading(rec.id);
      const res = await evaluationService.acceptRecommendation(rec.id);
      setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
      if (activePlan) {
        const updated = await analyticsService.getPlanById(activePlan.id);
        setActivePlan(updated);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissRec = async (recId) => {
    try {
      setActionLoading(recId);
      await evaluationService.dismissRecommendation(recId);
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dismiss recommendation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = handleAcceptRec;
  const handleDismiss = handleDismissRec;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Personalized Improvement Roadmap"
          subtitle="Actionable development milestones grounded in weak points identified during recent evaluations."
        />

        <div className="flex flex-wrap items-center gap-2">
          {plans.length > 0 && (
            <select
              value={activePlan?.id || ''}
              onChange={(e) => selectPlan(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            className="flex items-center space-x-1.5 cursor-pointer"
            onClick={() => setShowGenerateModal(true)}
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Plan</span>
          </Button>
        </div>
      </div>

      {/* AI Recommendations Banner (from Phase 11) */}
      {recommendations.length > 0 && (
        <Card className="border-violet-500/30 bg-violet-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                AI Identified Growth Recommendations ({recommendations.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Add directly to active roadmap</span>
          </div>

          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-white dark:bg-[#121829] border border-slate-200 dark:border-slate-800 gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {rec.skill}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {rec.recommendedAction}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {rec.weakness}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    size="sm"
                    className="text-xs h-7 px-2.5 cursor-pointer"
                    disabled={actionLoading === rec.id}
                    onClick={() => handleAcceptRec(rec)}
                  >
                    Add to Plan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    disabled={actionLoading === rec.id}
                    onClick={() => handleDismissRec(rec.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingState message="Loading your improvement roadmap..." />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-rose-500">
          <p className="font-semibold mb-2">Error Loading Roadmap</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadPlansAndData}>
            Retry
          </Button>
        </Card>
      ) : !activePlan ? (
        <EmptyState
          icon={Target}
          title="No Improvement Plan Active"
          description="Synthesize a customized development plan from recent interview practice or target job descriptions."
          actionText="Generate AI Plan"
          onAction={() => setShowGenerateModal(true)}
        />
      ) : (
        <>
          {/* Active Plan Overview Card */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activePlan.title}
                  </h3>
                  <Badge variant={activePlan.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {activePlan.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                  {activePlan.description}
                </p>
              </div>

              {/* Status Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {activePlan.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs cursor-pointer"
                    onClick={() => handlePlanStatusChange('PAUSED')}
                  >
                    <Pause className="h-3.5 w-3.5 mr-1" /> Pause Plan
                  </Button>
                ) : activePlan.status === 'PAUSED' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs cursor-pointer"
                    onClick={() => handlePlanStatusChange('ACTIVE')}
                  >
                    <Play className="h-3.5 w-3.5 mr-1" /> Resume Plan
                  </Button>
                ) : null}

                {activePlan.status !== 'COMPLETED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs cursor-pointer text-emerald-600"
                    onClick={() => handlePlanStatusChange('COMPLETED')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">Roadmap Completion</span>
                <span className="text-violet-600 dark:text-violet-400 font-bold">
                  {activePlan.completionPercentage}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${activePlan.completionPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
                <span>Created {new Date(activePlan.createdAt).toLocaleDateString()}</span>
                {activePlan.targetDate && (
                  <span>Target Date: {new Date(activePlan.targetDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </Card>

          {/* Plan Tasks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Learning Tasks & Milestones</span>
                <span className="text-xs font-normal text-slate-500">
                  ({activePlan.tasks?.filter((t) => t.status === 'COMPLETED').length || 0}/
                  {activePlan.tasks?.length || 0} completed)
                </span>
              </h4>

              <Button
                size="sm"
                variant="outline"
                className="text-xs cursor-pointer"
                onClick={() => setShowTaskModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
              </Button>
            </div>

            {activePlan.tasks?.length === 0 ? (
              <Card className="p-8 text-center text-sm text-slate-500">
                No tasks in this plan yet. Click "Add Task" to create your first milestone.
              </Card>
            ) : (
              <div className="space-y-2">
                {activePlan.tasks?.map((task) => {
                  const isDone = task.status === 'COMPLETED';
                  const handleAccept = handleAcceptRec;
  const handleDismiss = handleDismissRec;

  return (
                    <div
                      key={task.id}
                      className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-slate-50 dark:bg-[#121829]/50 border-slate-200 dark:border-slate-800/60 opacity-80'
                          : 'bg-white dark:bg-[#151D30] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          className="mt-0.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <p
                            className={`text-sm font-semibold ${
                              isDone
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {task.category}
                            </Badge>
                            {task.skillName && (
                              <span className="text-[10px] text-violet-500 font-medium">
                                #{task.skillName}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 flex items-center">
                              <Clock className="h-3 w-3 mr-0.5" /> {task.estimatedMinutes}m
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] text-slate-400 flex items-center">
                                <Calendar className="h-3 w-3 mr-0.5" />{' '}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={
                          task.priority === 'HIGH' || task.priority === 'URGENT'
                            ? 'danger'
                            : task.priority === 'MEDIUM'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Generate AI Plan Modal */}
      {showGenerateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowGenerateModal(false)}
          title="Generate AI Improvement Plan"
        >
          <form onSubmit={handleGeneratePlan} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The AI will analyze your actual evaluation scores, coding submissions, and job description requirements to build a personalized milestone roadmap.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Roadmap Duration
              </label>
              <select
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              >
                <option value={2}>2 Weeks (Accelerated)</option>
                <option value={4}>4 Weeks (Standard Preparation)</option>
                <option value={8}>8 Weeks (Comprehensive Mastery)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Custom Focus / Goal (Optional)
              </label>
              <Input
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="e.g., Senior Full-Stack React & Node System Design Prep"
                className="text-xs"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={generatingPlan}>
                {generatingPlan ? 'Synthesizing Roadmap...' : 'Generate Roadmap'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowTaskModal(false)}
          title="Add Custom Learning Task"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Task Title
              </label>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Review Redis cache eviction policies (LRU vs LFU)"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="Technical">Technical</option>
                  <option value="Coding">Coding</option>
                  <option value="System Design">System Design</option>
                  <option value="HR">HR</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Duration (min)
                </label>
                <Input
                  type="number"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(e.target.value)}
                  min={5}
                  max={480}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setShowTaskModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={creatingTask}>
                {creatingTask ? 'Creating...' : 'Add Task'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ImprovementPlan;
