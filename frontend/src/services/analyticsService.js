import api from './api.js';

/**
 * Normalizes response data whether unwrapped by Axios interceptor or received as raw response
 */
const unwrapData = (res) => {
  if (!res) return null;
  let current = res;
  // If raw Axios response with status/headers and data
  if (current && typeof current === 'object' && 'data' in current && ('status' in current || 'headers' in current)) {
    current = current.data;
  }
  // If backend JSON envelope { success, data }
  if (current && typeof current === 'object' && 'data' in current && 'success' in current) {
    current = current.data;
  }
  return current;
};

export const analyticsService = {
  // 1. Analytics Dashboard APIs
  async getOverview(params = {}) {
    const res = await api.get('/analytics/overview', { params });
    return unwrapData(res);
  },

  async getPerformance(params = {}) {
    const res = await api.get('/analytics/performance', { params });
    return unwrapData(res);
  },

  async getCategories(params = {}) {
    const res = await api.get('/analytics/categories', { params });
    return unwrapData(res);
  },

  async getSkills(params = {}) {
    const res = await api.get('/analytics/skills', { params });
    return unwrapData(res);
  },

  async getTrends(params = {}) {
    const res = await api.get('/analytics/trends', { params });
    return unwrapData(res);
  },

  async getActivity(params = {}) {
    const res = await api.get('/analytics/activity', { params });
    return unwrapData(res);
  },

  async getFilters() {
    const res = await api.get('/analytics/filters');
    return unwrapData(res);
  },

  // 2. Skill Gap Analysis APIs
  async getSkillGaps(params = {}) {
    const res = await api.get('/skill-gaps', { params });
    return unwrapData(res);
  },

  async getSkillById(skillId, params = {}) {
    const res = await api.get(`/skill-gaps/${skillId}`, { params });
    return unwrapData(res);
  },

  async triggerAnalyze(data = {}) {
    const res = await api.post('/skill-gaps/analyze', data);
    return unwrapData(res);
  },

  // 3. Improvement Plan APIs
  async getPlans() {
    const res = await api.get('/improvement-plans');
    const data = unwrapData(res);
    return data?.plans || (Array.isArray(data) ? data : []);
  },

  async getPlanById(planId) {
    const res = await api.get(`/improvement-plans/${planId}`);
    const data = unwrapData(res);
    return data?.plan || data;
  },

  async createPlan(planData) {
    const res = await api.post('/improvement-plans', planData);
    const data = unwrapData(res);
    return data?.plan || data;
  },

  async generateAIPlan(generationData) {
    const res = await api.post('/improvement-plans/generate', generationData);
    const data = unwrapData(res);
    return data?.plan || data;
  },

  async updatePlan(planId, updateData) {
    const res = await api.patch(`/improvement-plans/${planId}`, updateData);
    const data = unwrapData(res);
    return data?.plan || data;
  },

  async updatePlanStatus(planId, status) {
    const res = await api.patch(`/improvement-plans/${planId}/status`, { status });
    const data = unwrapData(res);
    return data?.plan || data;
  },

  async regeneratePlan(planId) {
    const res = await api.post(`/improvement-plans/${planId}/regenerate`);
    const data = unwrapData(res);
    return data?.plan || data;
  },

  async deletePlan(planId) {
    const res = await api.delete(`/improvement-plans/${planId}`);
    return unwrapData(res);
  },

  // 4. Learning Task APIs
  async getTasks(params = {}) {
    const res = await api.get('/learning-tasks', { params });
    const data = unwrapData(res);
    return data?.tasks ? data : (Array.isArray(data) ? { tasks: data, pagination: {} } : (data || { tasks: [], pagination: {} }));
  },

  async getTaskById(taskId) {
    const res = await api.get(`/learning-tasks/${taskId}`);
    const data = unwrapData(res);
    return data?.task || data;
  },

  async createTask(taskData) {
    const res = await api.post('/learning-tasks', taskData);
    const data = unwrapData(res);
    return data?.task || data;
  },

  async updateTask(taskId, updateData) {
    const res = await api.patch(`/learning-tasks/${taskId}`, updateData);
    const data = unwrapData(res);
    return data?.task || data;
  },

  async updateTaskStatus(taskId, status) {
    const res = await api.patch(`/learning-tasks/${taskId}/status`, { status });
    const data = unwrapData(res);
    return data?.task || data;
  },

  async deleteTask(taskId) {
    const res = await api.delete(`/learning-tasks/${taskId}`);
    return unwrapData(res);
  },

  // 5. Progress Tracking APIs
  async getProgressOverview() {
    const res = await api.get('/progress/overview');
    return unwrapData(res);
  },

  async getProgressHistory() {
    const res = await api.get('/progress/history');
    return unwrapData(res);
  },

  async getProgressActivity(params = {}) {
    const res = await api.get('/progress/activity', { params });
    return unwrapData(res);
  },

  async getSkillProgress() {
    const res = await api.get('/progress/skills');
    return unwrapData(res);
  }
};

export default analyticsService;
