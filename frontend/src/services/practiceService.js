import { apiClient } from './api.js';

const extractData = (res) => (res && res.data !== undefined ? res.data : res);

/**
 * Frontend API Service for Phase 8: Interview Practice Engine
 */
export const practiceService = {
  /**
   * Starts a new practice session for a preparation
   */
  async startPracticeSession(preparationId, options = {}) {
    const res = await apiClient.post(`/preparations/${preparationId}/practice/sessions`, options);
    return extractData(res);
  },

  /**
   * Retrieves question availability counts and matrix for a preparation
   */
  async getPracticeAvailability(preparationId) {
    const res = await apiClient.get(`/preparations/${preparationId}/practice/availability`);
    return extractData(res);
  },

  /**
   * Retrieves practice sessions for a preparation
   */
  async getPracticeSessions(preparationId, params = {}) {
    const res = await apiClient.get(`/preparations/${preparationId}/practice/sessions`, { params });
    const items = Array.isArray(res?.data)
      ? res.data
      : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
    const pagination = res?.pagination || res?.data?.pagination || { total: items.length, page: 1, limit: 10, totalPages: 1 };
    return { items, pagination };
  },

  /**
   * Retrieves single practice session details with saved questions & drafts
   */
  async getPracticeSession(sessionId) {
    const res = await apiClient.get(`/practice/sessions/${sessionId}`);
    return extractData(res);
  },

  /**
   * Resumes an existing practice session
   */
  async resumePracticeSession(sessionId) {
    const res = await apiClient.post(`/practice/sessions/${sessionId}/resume`);
    return extractData(res);
  },

  /**
   * Saves or updates an answer draft
   */
  async saveAnswerDraft(sessionId, questionId, data) {
    const res = await apiClient.put(`/practice/sessions/${sessionId}/questions/${questionId}/draft`, data);
    return extractData(res);
  },

  /**
   * Submits an answer attempt
   */
  async submitAnswer(sessionId, questionId, data) {
    const res = await apiClient.post(`/practice/sessions/${sessionId}/questions/${questionId}/attempts`, data);
    return extractData(res);
  },

  /**
   * Retrieves past attempts for a question by authenticated user
   */
  async getQuestionAttempts(questionId) {
    const res = await apiClient.get(`/questions/${questionId}/attempts`);
    return extractData(res);
  },

  /**
   * Reveals a hint sequentially
   */
  async revealHint(sessionId, questionId, hintIndex = 0) {
    const res = await apiClient.post(`/practice/sessions/${sessionId}/questions/${questionId}/hints/reveal`, {
      hintIndex
    });
    return extractData(res);
  },

  /**
   * Retrieves reference answer, explanation, and expected concepts
   */
  async getReferenceAnswer(questionId) {
    const res = await apiClient.get(`/questions/${questionId}/reference-answer`);
    return extractData(res);
  },

  /**
   * Completes a practice session
   */
  async completePracticeSession(sessionId) {
    const res = await apiClient.post(`/practice/sessions/${sessionId}/complete`);
    return extractData(res);
  },

  /**
   * Alias for completePracticeSession
   */
  async completeSession(sessionId) {
    return this.completePracticeSession(sessionId);
  },

  /**
   * Updates question review state, bookmark, self-rating, and personal notes
   */
  async updateQuestionReview(questionId, data) {
    const res = await apiClient.patch(`/questions/${questionId}/review`, data);
    return extractData(res);
  },

  /**
   * Retrieves overall practice history for the authenticated user
   */
  async getPracticeHistory(params = {}) {
    const res = await apiClient.get('/practice/history', { params });
    const items = Array.isArray(res?.data)
      ? res.data
      : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
    const pagination = res?.pagination || res?.data?.pagination || { total: items.length, page: 1, limit: 10, totalPages: 1 };
    return { items, pagination };
  },

  /**
   * Retrieves aggregated practice statistics
   */
  async getPracticeStats() {
    const res = await apiClient.get('/practice/stats');
    return extractData(res);
  }
};

export default practiceService;
