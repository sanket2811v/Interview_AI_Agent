import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  BarChart3,
  Video,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Edit2,
  Trash2,
  RotateCcw,
  AlertCircle,
  Building,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { preparationService } from '../services/preparationService.js';

export function Preparations() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [experienceFilter, setExperienceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  const [preparations, setPreparations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [editingSession, setEditingSession] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPreparations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await preparationService.getPreparations({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        experienceLevel: experienceFilter !== 'ALL' ? experienceFilter : undefined,
        sortBy,
        sortOrder,
        includeArchived: statusFilter === 'ARCHIVED'
      });
      setPreparations(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load preparations.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, experienceFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchPreparations();
  }, [fetchPreparations]);

  const handleArchive = async (id, e) => {
    e.stopPropagation();
    try {
      await preparationService.archivePreparation(id);
      toast.success('Preparation session archived.');
      fetchPreparations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive preparation.');
    }
  };

  const handleRestore = async (id, e) => {
    e.stopPropagation();
    try {
      await preparationService.restorePreparation(id);
      toast.success('Preparation session restored to active.');
      fetchPreparations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore preparation.');
    }
  };

  const handleDeletePermanently = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this preparation session? This action cannot be undone.')) {
      return;
    }
    try {
      await preparationService.deletePermanently(id);
      toast.success('Preparation session deleted permanently.');
      fetchPreparations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete preparation.');
    }
  };

  const openEditModal = (session, e) => {
    e.stopPropagation();
    setEditingSession(session);
    setEditFormData({
      jobTitle: session.jobTitle || session.title,
      companyName: session.companyName,
      location: session.location || '',
      experienceLevel: session.experienceLevel || 'MID',
      preferredLanguage: session.preferredLanguage || 'JavaScript',
      difficulty: session.difficulty || 'MEDIUM'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSession) return;
    setIsUpdating(true);
    try {
      await preparationService.updatePreparation(editingSession.id, editFormData);
      toast.success('Preparation session updated successfully.');
      setEditingSession(null);
      fetchPreparations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update preparation.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'READY':
      case 'IN_PROGRESS':
        return <Badge variant="primary">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'ARCHIVED':
        return <Badge variant="neutral">Archived</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="warning">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Preparations"
        subtitle="Manage and track tailored interview preparation workspaces based on targeted Job Descriptions."
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              iconLeft={RefreshCw}
              onClick={fetchPreparations}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/preparations/new')}
              iconLeft={PlusCircle}
            >
              Create Preparation
            </Button>
          </div>
        }
      />

      {/* Search, Filter & Sort Controls */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by job title, company name, or skills..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select
              value={experienceFilter}
              onChange={(e) => {
                setExperienceFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All Experience Levels</option>
              <option value="ENTRY">Entry / Graduate</option>
              <option value="JUNIOR">Junior</option>
              <option value="MID">Mid-Level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead / Architect</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(order);
                setPage(1);
              }}
              className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="title-asc">Role (A-Z)</option>
              <option value="companyName-asc">Company (A-Z)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Content State: Loading, Error, Empty, List */}
      {loading ? (
        <LoadingState message="Fetching your interview preparation workspaces..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPreparations} />
      ) : preparations.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={search ? 'No preparations match your search' : 'No interview preparations found'}
          description={
            search
              ? 'Try adjusting your search terms or filters.'
              : 'Submit a target Job Description to generate custom questions, syllabus, and simulated mock interviews.'
          }
          actionLabel="Create Your First Preparation"
          onAction={() => navigate('/preparations/new')}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {preparations.map((prep) => (
              <Card
                key={prep.id}
                className="hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer group"
                onClick={() => navigate(`/preparations/${prep.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {prep.jobTitle || prep.title}
                        </span>
                        {getStatusBadge(prep.status)}
                        <Badge variant="outline" size="sm">
                          {prep.experienceLevel}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {prep.difficulty}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1 font-medium text-slate-700 dark:text-slate-300">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span>{prep.companyName}</span>
                        </span>
                        {prep.location && (
                          <span>• {prep.location}</span>
                        )}
                        <span>• Lang: {prep.preferredLanguage}</span>
                        <span>• Created: {new Date(prep.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center space-x-3 pt-1 max-w-sm">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                            style={{ width: `${prep.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                          {prep.progress || 0}%
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => openEditModal(prep, e)}
                        title="Edit Preparation"
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4 text-slate-500 hover:text-violet-600" />
                      </Button>

                      {prep.status === 'ARCHIVED' || prep.deletedAt ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRestore(prep.id, e)}
                            title="Restore Preparation"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeletePermanently(prep.id, e)}
                            title="Permanently Delete"
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleArchive(prep.id, e)}
                          title="Archive Preparation"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-500"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/preparations/${prep.id}`);
                        }}
                        iconRight={ArrowRight}
                      >
                        Workspace
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing page <span className="font-bold">{pagination.page}</span> of{' '}
                <span className="font-bold">{pagination.totalPages}</span> ({pagination.total} total sessions)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  iconLeft={ChevronLeft}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  iconRight={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Preparation Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Edit2 className="h-4 w-4 text-violet-500" />
                <span>Edit Preparation Session</span>
              </h3>
              <button
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.jobTitle}
                  onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.companyName}
                  onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={editFormData.preferredLanguage}
                    onChange={(e) => setEditFormData({ ...editFormData, preferredLanguage: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editFormData.difficulty}
                    onChange={(e) => setEditFormData({ ...editFormData, difficulty: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSession(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Preparations;
