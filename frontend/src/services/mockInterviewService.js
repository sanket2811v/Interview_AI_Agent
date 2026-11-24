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

export const mockInterviewService = {
  /**
   * Starts a new AI Mock Interview session
   */
  async createInterview(payload) {
    const response = await api.post('/mock-interviews', payload, { timeout: AI_REQUEST_TIMEOUT });
    return unwrapData(response);
  },

  /**
   * Retrieves list of user's mock interviews with optional filtering
   */
  async getInterviews({ page = 1, limit = 10, status, interviewType } = {}) {
    const response = await api.get('/mock-interviews', {
      params: { page, limit, status, interviewType }
    });
    const data = unwrapData(response);
    return data || { interviews: [], pagination: {} };
  },

  async getUserInterviews(params) {
    return this.getInterviews(params);
  },

  /**
   * Retrieves single interview details and full message transcript
   */
  async getInterview(interviewId) {
    const response = await api.get(`/mock-interviews/${interviewId}`);
    const data = unwrapData(response);
    return data?.interview || data || null;
  },

  async getInterviewDetails(interviewId) {
    return this.getInterview(interviewId);
  },

  /**
   * Submits candidate answer and receives interviewer response
   */
  async submitAnswer(interviewId, { content }) {
    const response = await api.post(
      `/mock-interviews/${interviewId}/messages`,
      { content },
      { timeout: AI_REQUEST_TIMEOUT }
    );
    return unwrapData(response);
  },

  /**
   * Performs an interviewer action: CLARIFY, HINT, or SKIP
   */
  async performAction(interviewId, actionType) {
    const response = await api.post(
      `/mock-interviews/${interviewId}/action`,
      { actionType },
      { timeout: AI_REQUEST_TIMEOUT }
    );
    return unwrapData(response);
  },

  /**
   * Pauses an in-progress interview
   */
  async pauseInterview(interviewId) {
    const response = await api.post(`/mock-interviews/${interviewId}/pause`);
    const data = unwrapData(response);
    return data?.interview || data || null;
  },

  /**
   * Resumes a paused interview
   */
  async resumeInterview(interviewId) {
    const response = await api.post(`/mock-interviews/${interviewId}/resume`);
    const data = unwrapData(response);
    return data?.interview || data || null;
  },

  /**
   * Concludes an interview and seals the transcript
   */
  async endInterview(interviewId) {
    const response = await api.post(`/mock-interviews/${interviewId}/end`);
    return unwrapData(response);
  },

  /**
   * Retrieves mock interview aggregate statistics
   */
  async getInterviewStats() {
    const response = await api.get('/mock-interviews/stats');
    return unwrapData(response);
  }
};

export default mockInterviewService;
