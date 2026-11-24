import api, { AI_REQUEST_TIMEOUT } from './api.js';

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

export const evaluationService = {
  // ==========================================
  // 1. Answer Evaluations (Phase 8)
  // ==========================================
  async evaluateAnswer(attemptId, options = {}) {
    const response = await api.post(`/evaluations/answers/${attemptId}`, options, { timeout: AI_REQUEST_TIMEOUT });
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  async getAnswerEvaluation(attemptId) {
    const response = await api.get(`/evaluations/answers/${attemptId}`);
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  // ==========================================
  // 2. Coding Evaluations (Phase 9)
  // ==========================================
  async evaluateCoding(submissionId, options = {}) {
    const response = await api.post(`/evaluations/coding/${submissionId}`, options, { timeout: AI_REQUEST_TIMEOUT });
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  async getCodingEvaluation(submissionId) {
    const response = await api.get(`/evaluations/coding/${submissionId}`);
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  // ==========================================
  // 3. Mock Interview Evaluations (Phase 10)
  // ==========================================
  async evaluateInterview(interviewId, options = {}) {
    const response = await api.post(`/evaluations/interviews/${interviewId}`, options, { timeout: AI_REQUEST_TIMEOUT });
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  async getInterviewEvaluation(interviewId) {
    const response = await api.get(`/evaluations/interviews/${interviewId}`);
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  // ==========================================
  // 4. General Evaluations
  // ==========================================
  async listEvaluations({ page = 1, limit = 10, sourceType } = {}) {
    const response = await api.get('/evaluations', {
      params: { page, limit, sourceType }
    });
    const data = unwrapData(response);
    return data?.evaluations ? data : { evaluations: Array.isArray(data) ? data : [], pagination: {} };
  },

  async getEvaluationDetails(evaluationId) {
    const response = await api.get(`/evaluations/${evaluationId}`);
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  async regenerateEvaluation(evaluationId) {
    const response = await api.post(`/evaluations/${evaluationId}/regenerate`, {}, { timeout: AI_REQUEST_TIMEOUT });
    const data = unwrapData(response);
    return data?.evaluation || data || null;
  },

  // ==========================================
  // 5. Performance Analytics
  // ==========================================
  async getPerformanceOverview() {
    const response = await api.get('/performance/overview');
    const data = unwrapData(response);
    return data?.overview || data || null;
  },

  async getCategoryBreakdown() {
    const response = await api.get('/performance/categories');
    const data = unwrapData(response);
    return data?.categories || (Array.isArray(data) ? data : []);
  },

  async getPerformanceTrends() {
    const response = await api.get('/performance/trends');
    const data = unwrapData(response);
    return data?.trends || (Array.isArray(data) ? data : []);
  },

  async getStrengthsAndWeaknesses() {
    const response = await api.get('/performance/strengths');
    const data = unwrapData(response);
    return data || { strengths: [], weaknesses: [] };
  },

  // ==========================================
  // 6. Performance Reports
  // ==========================================
  async generateReport(payload = {}) {
    const response = await api.post('/reports/generate', payload);
    const data = unwrapData(response);
    return data?.report || data || null;
  },

  async getUserReports() {
    const response = await api.get('/reports');
    const data = unwrapData(response);
    return data?.reports || (Array.isArray(data) ? data : []);
  },

  async getReportDetails(reportId) {
    const response = await api.get(`/reports/${reportId}`);
    const data = unwrapData(response);
    return data?.report || data || null;
  },

  async downloadReportData(reportId) {
    const response = await api.get(`/reports/${reportId}/download`);
    return unwrapData(response);
  },

  // ==========================================
  // 7. Improvement Recommendations
  // ==========================================
  async getUserRecommendations({ status, limit = 20 } = {}) {
    const response = await api.get('/improvement-recommendations', {
      params: { status, limit }
    });
    const data = unwrapData(response);
    return data?.recommendations || (Array.isArray(data) ? data : []);
  },

  async acceptRecommendation(id) {
    const response = await api.post(`/improvement-recommendations/${id}/accept`);
    return unwrapData(response);
  },

  async dismissRecommendation(id) {
    const response = await api.post(`/improvement-recommendations/${id}/dismiss`);
    return unwrapData(response);
  }
};

export default evaluationService;
