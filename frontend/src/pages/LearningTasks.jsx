import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Play,
  RotateCcw,
  SkipForward,
  Layers,
  Sparkles
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

export function LearningTasks() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [skillName, setSkillName] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter, searchQuery, overdueOnly, pagination.page]);

  const loadPlans = async () => {
    try {
      const p = await analyticsService.getPlans();
      setPlans(p || []);
      if (p && p.length > 0) setSelectedPlanId(p[0].id);
    } catch (e) {
      // Non-blocking
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getTasks({
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery.trim() || undefined,
        overdueOnly: overdueOnly || undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      setTasks(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await analyticsService.updateTaskStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await analyticsService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      let targetPlan = selectedPlanId;
      if (!targetPlan) {
        const newPlan = await analyticsService.createPlan({
          title: 'General Interview Preparation Roadmap',
          description: 'Auto-created to organize learning tasks.'
        });
        targetPlan = newPlan.id;
        setSelectedPlanId(newPlan.id);
      }

      await analyticsService.createTask({
        improvementPlanId: targetPlan,
        title,
        description,
        category,
        skillName: skillName.trim() || undefined,
        priority,
        estimatedMinutes: Number(estimatedMinutes),
        dueDate: dueDate || undefined,
        status: 'PENDING'
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setSkillName('');
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Learning Task Management"
          subtitle="Organize, track, and complete targeted interview milestones and skill-building activities."
        />

        <Button
          size="sm"
          className="flex items-center space-x-1.5 cursor-pointer"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Filter Controls Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks by title, skill, or keyword..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#121829] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="SKIPPED">Skipped</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            {/* Overdue Only Toggle */}
            <button
              onClick={() => {
                setOverdueOnly(!overdueOnly);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer flex items-center space-x-1.5 ${
                overdueOnly
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : 'bg-white dark:bg-[#151D30] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Overdue Only</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Task List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingState message="Loading tasks..." />
        </div>
      ) : error ? (
        <Card className="p-8 text-center text-rose-500">
          <p className="font-semibold mb-2">Error Loading Tasks</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadTasks}>
            Retry
          </Button>
        </Card>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description="Create custom learning tasks or generate a roadmap to track your interview study milestones."
          actionText="Create First Task"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            const inProgress = task.status === 'IN_PROGRESS';
            return (
              <Card
                key={task.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                  isDone
                    ? 'opacity-70 bg-slate-50 dark:bg-[#121829]/40 border-slate-200 dark:border-slate-800/60'
                    : inProgress
                    ? 'border-violet-500/40 bg-violet-500/5'
                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() =>
                      handleStatusChange(task.id, isDone ? 'PENDING' : 'COMPLETED')
                    }
                    className="mt-0.5 text-slate-400 hover:text-violet-600 cursor-pointer"
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
                        <span
                          className={`text-[10px] flex items-center ${
                            task.isOverdue ? 'text-rose-500 font-bold' : 'text-slate-400'
                          }`}
                        >
                          <Calendar className="h-3 w-3 mr-0.5" />
                          {new Date(task.dueDate).toLocaleDateString()}
                          {task.isOverdue && ' (Overdue)'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side controls */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
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

                  {!isDone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 cursor-pointer"
                      onClick={() =>
                        handleStatusChange(
                          task.id,
                          inProgress ? 'PENDING' : 'IN_PROGRESS'
                        )
                      }
                      title={inProgress ? 'Pause' : 'Start Task'}
                    >
                      {inProgress ? 'In Progress' : 'Start'}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 px-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                    onClick={() => handleDeleteTask(task.id)}
                    title="Delete Task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} tasks)
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Create New Learning Task"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Roadmap Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Task Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Implement LRU Cache with O(1) get and put"
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add details, links, or specific focus areas..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#151D30] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  Skill Tag
                </label>
                <Input
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g. Redis, Dynamic Programming"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
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
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  min={5}
                  max={480}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={creating}>
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default LearningTasks;

