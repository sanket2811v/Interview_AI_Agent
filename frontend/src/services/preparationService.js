import { apiClient, AI_REQUEST_TIMEOUT } from './api.js';

const extractData = (res) => (res && res.data !== undefined ? res.data : res);

/**
 * Service for interview preparations and job description management
 */
export const preparationService = {
  /**
   * Create a new interview preparation session
   * Supports both pure JSON and multipart/form-data when a document file is attached
   */
  async createPreparation(data, file = null) {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobTitle', data.jobTitle);
      formData.append('companyName', data.companyName);
      if (data.location) formData.append('location', data.location);
      if (data.experienceLevel) formData.append('experienceLevel', data.experienceLevel);
      if (data.yearsOfExperience) formData.append('yearsOfExperience', data.yearsOfExperience);
      if (data.preferredLanguage) formData.append('preferredLanguage', data.preferredLanguage);
      if (data.difficulty) formData.append('difficulty', data.difficulty);
      if (data.preferences) formData.append('preferences', JSON.stringify(data.preferences));
      if (data.jobDescription) formData.append('jobDescription', data.jobDescription);

      const res = await apiClient.post('/preparations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return extractData(res);
    }

    const res = await apiClient.post('/preparations', data);
    return extractData(res);
  },

  /**
   * Upload and extract plain text from a document (PDF, DOCX, TXT)
   */
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post('/preparations/upload-doc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res;
  },

  /**
   * Fetch paginated list of candidate's preparations
   */
  async getPreparations(params = {}) {
    const res = await apiClient.get('/preparations', { params });
    const items = Array.isArray(res?.data)
      ? res.data
      : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
    const pagination = res?.pagination || res?.data?.pagination || { total: items.length, page: 1, limit: 10, totalPages: 1 };
    return { items, pagination };
  },

  /**
   * Retrieve single preparation session by ID
   */
  async getPreparationById(id) {
    const res = await apiClient.get(`/preparations/${id}`);
    return extractData(res);
  },

  /**
   * Update preparation metadata and/or job description
   */
  async updatePreparation(id, updates) {
    const res = await apiClient.patch(`/preparations/${id}`, updates);
    return extractData(res);
  },

  /**
   * Archive / soft-delete preparation session
   */
  async archivePreparation(id) {
    const res = await apiClient.delete(`/preparations/${id}`);
    return res;
  },

  /**
   * Restore an archived preparation session
   */
  async restorePreparation(id) {
    const res = await apiClient.patch(`/preparations/${id}/restore`);
    return extractData(res);
  },

  /**
   * Permanently delete preparation session
   */
  async deletePermanently(id) {
    const res = await apiClient.delete(`/preparations/${id}/permanent`);
    return res;
  },

  /**
   * Get preparation stats for candidate dashboard
   */
  async getPreparationStats() {
    const res = await apiClient.get('/preparations/stats');
    return extractData(res);
  },

  /**
   * Update job description text for an existing preparation
   */
  async updateJobDescription(id, rawText) {
    const res = await apiClient.patch(`/preparations/${id}/description`, { rawText });
    return extractData(res);
  },

  /**
   * Run AI analysis on a saved job description (extended 120s timeout for OpenAI generation)
   */
  async analyzePreparation(id) {
    const res = await apiClient.post(`/preparations/${id}/analyze`, {}, { timeout: AI_REQUEST_TIMEOUT });
    return extractData(res);
  },

  /**
   * Retrieve existing AI analysis for a preparation session
   */
  async getPreparationAnalysis(id) {
    const res = await apiClient.get(`/preparations/${id}/analysis`);
    return extractData(res);
  },

  /**
   * Regenerate AI analysis for an existing preparation session (extended 120s timeout)
   */
  async regeneratePreparationAnalysis(id) {
    const res = await apiClient.post(`/preparations/${id}/analysis/regenerate`, {}, { timeout: AI_REQUEST_TIMEOUT });
    return extractData(res);
  },

  /**
   * Get current analysis status (NOT_STARTED, PROCESSING, COMPLETED, MISSING_DESCRIPTION)
   */
  async getPreparationAnalysisStatus(id) {
    const res = await apiClient.get(`/preparations/${id}/analysis/status`);
    return extractData(res);
  },

  /**
   * Phase 7: Generate personalized interview questions & challenges (extended 120s timeout)
   */
  async generateQuestions(id, options = {}) {
    const res = await apiClient.post(`/preparations/${id}/questions/generate`, options, { timeout: AI_REQUEST_TIMEOUT });
    return extractData(res);
  },

  /**
   * Phase 7: Retrieve paginated questions for preparation
   */
  async getQuestions(id, params = {}) {
    const res = await apiClient.get(`/preparations/${id}/questions`, { params });
    const items = Array.isArray(res?.data)
      ? res.data
      : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
    const pagination = res?.pagination || res?.data?.pagination || { total: items.length, page: 1, limit: 10, totalPages: 1 };
    return { items, pagination };
  },

  /**
   * Phase 7: Retrieve question details by ID
   */
  async getQuestionById(questionId) {
    const res = await apiClient.get(`/questions/${questionId}`);
    return extractData(res);
  },

  /**
   * Phase 7: Update question content
   */
  async updateQuestion(questionId, data) {
    const res = await apiClient.patch(`/questions/${questionId}`, data);
    return extractData(res);
  },

  /**
   * Phase 7: Delete question
   */
  async deleteQuestion(questionId) {
    const res = await apiClient.delete(`/questions/${questionId}`);
    return res;
  },

  /**
   * Phase 7: Regenerate question category (extended 120s timeout)
   */
  async regenerateQuestions(id, options = {}) {
    const res = await apiClient.post(`/preparations/${id}/questions/regenerate`, options, { timeout: AI_REQUEST_TIMEOUT });
    return extractData(res);
  },

  /**
   * Phase 7: Retrieve coding challenges
   */
  async getCodingChallenges(id) {
    const res = await apiClient.get(`/preparations/${id}/coding-challenges`);
    return extractData(res);
  },

  /**
   * Phase 7: Retrieve coding challenge details
   */
  async getCodingChallengeById(challengeId) {
    const res = await apiClient.get(`/coding-challenges/${challengeId}`);
    return extractData(res);
  }
};

export default preparationService;
