import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  Filter,
  Briefcase,
  Layers,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { analyticsService } from '../services/analyticsService.js';

export function SkillGaps() {
  const navigate = useNavigate();
  const [selectedPreparation, setSelectedPreparation] = useState('');
  const [preparations, setPreparations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [gapData, setGapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick Task Creation Modal
  const [selectedSkillForTask, setSelectedSkillForTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('HIGH');
  const [creatingTask, setCreatingTask] = useState(false);
  const [userPlans, setUserPlans] = useState([]);

  useEffect(() => {
    loadPreparations();
    loadPlans();
  }, []);

  useEffect(() => {
    loadSkillGaps();
  }, [selectedPreparation]);

  const loadPreparations = async () => {
    try {
      const filters = await analyticsService.getFilters();
      if (filters?.preparations) {
        setPreparations(filters.preparations);
      }
    } catch (e) {
      // Non-blocking
    }
  };

  const loadPlans = async () => {
    try {
      const plans = await analyticsService.getPlans();
      setUserPlans(plans || []);
    } catch (e) {
      // Non-blocking
    }
  };

  const loadSkillGaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getSkillGaps({
        ...(selectedPreparation ? { preparationSessionId: selectedPreparation } : {})
      });
      setGapData(data);
    } catch (err) {
      setError(err.message || 'Failed to load skill gap analysis');
    } finally {
      setLoading(false);
    }
  };

  const openCreateTaskModal = (skill) => {
    setSelectedSkillForTask(skill);
    setTaskTitle(skill.recommendedLearningAction || `Master ${skill.skillName}`);
    setTaskDescription(`Action item to improve proficiency in ${skill.skillName} (${skill.category}).`);
    setTaskPriority(skill.improvementPriority || 'HIGH');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedSkillForTask) return;

    try {
      setCreatingTask(true);
      // If user has an active plan, use it; otherwise create one first
      let planId = userPlans[0]?.id;
      if (!planId) {
        const newPlan = await analyticsService.createPlan({
          title: 'Skill Remediation Roadmap',
          description: 'Auto-created to track prioritized skill gap learning tasks.',
          preparationSessionId: selectedPreparation || null
        });
        planId = newPlan.id;
      }

      await analyticsService.createTask({
        improvementPlanId: planId,
        title: taskTitle,
        description: taskDescription,
        skillName: selectedSkillForTask.skillName,
        category: selectedSkillForTask.category,
        priority: taskPriority,
        status: 'PENDING'
      });

      setSelectedSkillForTask(null);
      alert('Task successfully created in your Improvement Roadmap!');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'STRONG':
        return <Badge variant="success">Strong</Badge>;
      case 'DEVELOPING':
        return <Badge variant="warning">Developing</Badge>;
      case 'NEEDS_IMPROVEMENT':
        return <Badge variant="danger">Needs Focus</Badge>;
      case 'NOT_ASSESSED':
      default:
        return <Badge variant="secondary">Not Assessed</Badge>;
    }
  };

  const getRelevanceBadge = (relevance) => {
    switch (relevance) {
      case 'REQUIRED':
        return <span className="text-[10px] font-semibold tracking-wider text-rose-500 uppercase">Required</span>;
      case 'PREFERRED':
        return <span className="text-[10px] font-semibold tracking-wider text-blue-500 uppercase">Preferred</span>;
      default:
        return <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Inferred</span>;
    }
  };

  const filteredSkills = gapData?.skills?.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  }) || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Skill Gap Benchmarking"
          subtitle="Compare job description requirements against verified evaluation evidence to identify mastery and critical improvement areas."
        />

        {/* Preparation Dropdown */}
        <div className="flex items-center space-x-2">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <select
            value={selectedPreparation}
            onChange={(e) => setSelectedPreparation(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
          >
            <option value="">All Preparations / General Profile</option>
            {preparations.map((prep) => (
              <option key={prep.id} value={prep.id}>
                {prep.jobTitle} {prep.companyName ? `(${prep.companyName})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingState message="Benchmarking competencies against actual evaluation evidence..." />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-rose-500 border-rose-200 dark:border-rose-900/50">
          <p className="font-semibold mb-2">Error Loading Skill Gaps</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadSkillGaps}>
            Retry
          </Button>
        </Card>
      ) : !gapData || !gapData.skills || gapData.skills.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <EmptyState
            icon={Target}
            title="No Skill Gap Analysis Available"
            description="Your Skill Gap Analysis is not available yet. Complete technical practice sessions, coding assessments or mock interviews to evaluate your skills."
            actionLabel="Start Technical Practice"
            onAction={() => navigate('/practice')}
          />
        </Card>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 font-medium">Total Competencies</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {gapData?.totalSkills ?? 0}
              </div>
            </Card>

            <Card className="p-4 text-center border-rose-500/20 bg-rose-500/5">
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Needs Focus</span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {gapData?.needsImprovementCount ?? 0}
              </div>
            </Card>

            <Card className="p-4 text-center border-amber-500/20 bg-amber-500/5">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Developing</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {gapData?.developingCount ?? 0}
              </div>
            </Card>

            <Card className="p-4 text-center border-emerald-500/20 bg-emerald-500/5">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Strong</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {gapData?.strongCount ?? 0}
              </div>
            </Card>

            <Card className="p-4 text-center col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-500 font-medium">Not Assessed</span>
              <div className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">
                {gapData?.notAssessedCount ?? 0}
              </div>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-slate-200 dark:border-slate-800">
            {[
              { label: 'All Skills', value: 'ALL' },
              { label: `Needs Focus (${gapData?.needsImprovementCount ?? 0})`, value: 'NEEDS_IMPROVEMENT' },
              { label: `Developing (${gapData?.developingCount ?? 0})`, value: 'DEVELOPING' },
              { label: `Not Assessed (${gapData?.notAssessedCount ?? 0})`, value: 'NOT_ASSESSED' },
              { label: `Strong (${gapData?.strongCount ?? 0})`, value: 'STRONG' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  statusFilter === tab.value
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Skills Grid */}
          {filteredSkills.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No skills match the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => (
                <Card
                  key={skill.id}
                  className="p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                >
                  <div>
                    {/* Top row: Category & Status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-[10px]">
                          {skill.category}
                        </Badge>
                        {getRelevanceBadge(skill.jobRelevance)}
                      </div>
                      {getStatusBadge(skill.status)}
                    </div>

                    {/* Skill Title */}
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {skill.skillName}
                    </h4>

                    {/* Score Gauge / Assessment Stats */}
                    <div className="mt-3 py-2 px-3 bg-slate-50 dark:bg-[#121829] rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">Score:</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {skill.currentScore !== null ? `${skill.currentScore}%` : 'Unassessed'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {skill.evaluatedAttemptsCount} {skill.evaluatedAttemptsCount === 1 ? 'attempt' : 'attempts'}
                      </span>
                    </div>

                    {/* Recommended Learning Action */}
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-violet-500/5 p-2.5 rounded-lg border border-violet-500/10">
                      <span className="font-semibold text-violet-600 dark:text-violet-400 block mb-0.5">
                        Recommended Next Step:
                      </span>
                      {skill.recommendedLearningAction}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {skill.lastAssessedDate ? `Last: ${skill.lastAssessedDate}` : 'No date'}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs cursor-pointer"
                      onClick={() => openCreateTaskModal(skill)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add to Plan
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Quick Task Creation Modal */}
      {selectedSkillForTask && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSkillForTask(null)}
          title={`Add Learning Task for ${selectedSkillForTask.skillName}`}
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Task Title
              </label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Action Description
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Roadmap Plan
                </label>
                <div className="text-xs py-2 text-slate-500">
                  {userPlans[0]?.title || 'Auto-create Active Roadmap'}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedSkillForTask(null)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creatingTask}>
                {creatingTask ? 'Adding...' : 'Create Roadmap Task'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default SkillGaps;

