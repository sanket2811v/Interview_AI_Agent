import api from './api.js';

/**
 * Normalizes Axios response whether interceptor unwrapped response.data or not
 */
const extractData = (res) => {
  if (!res) return null;
  if (res.data !== undefined) {
    if (res.data && res.data.data !== undefined) {
      return res.data.data;
    }
    return res.data;
  }
  return res;
};

export const codingService = {
  /**
   * Retrieves list of supported programming languages
   */
  async getSupportedLanguages() {
    try {
      const response = await api.get('/coding/languages');
      const data = extractData(response);
      return data?.languages || data || [];
    } catch (err) {
      console.warn('Failed to fetch supported languages from server, using fallback list', err);
      return [];
    }
  },

  /**
   * Retrieves coding challenge details by challengeId
   */
  async getChallengeDetails(challengeId) {
    const response = await api.get(`/coding/challenges/${challengeId}`);
    const data = extractData(response);
    return data?.challenge || data || null;
  },

  /**
   * Retrieves starter code for a specific challenge or standalone mode
   */
  async getStarterCode(challengeId, language) {
    if (challengeId) {
      const response = await api.get(`/coding/challenges/${challengeId}/starter-code`, {
        params: { language }
      });
      return extractData(response);
    }

    // Standalone mode template
    const response = await api.get('/coding/starter-code', {
      params: { language }
    });
    return extractData(response);
  },

  /**
   * Runs code in standalone mode (no challenge required)
   */
  async runStandaloneCode({ language, sourceCode, stdin = '' }) {
    const response = await api.post('/coding/run', {
      language,
      sourceCode,
      stdin
    });
    return extractData(response);
  },

  /**
   * Runs solution against sample/public test cases only, or in standalone mode if no challengeId
   */
  async runCode(challengeId, { language, sourceCode, stdin = '' }) {
    if (!challengeId) {
      return this.runStandaloneCode({ language, sourceCode, stdin });
    }
    const response = await api.post(`/coding/challenges/${challengeId}/run`, {
      language,
      sourceCode,
      stdin
    });
    return extractData(response);
  },

  /**
   * Submits solution against all test cases (persisting submission)
   */
  async submitSolution(challengeId, { language, sourceCode, practiceSessionId = null }) {
    if (!challengeId) {
      throw new Error('Submit requires a selected challenge to evaluate test cases');
    }
    const response = await api.post(`/coding/challenges/${challengeId}/submit`, {
      language,
      sourceCode,
      practiceSessionId
    });
    return extractData(response);
  },

  /**
   * Retrieves detailed submission by submissionId
   */
  async getSubmissionDetails(submissionId) {
    const response = await api.get(`/coding/submissions/${submissionId}`);
    const data = extractData(response);
    return data?.submission || data || null;
  },

  /**
   * Retrieves submissions for a specific challenge
   */
  async getChallengeSubmissions(challengeId, { page = 1, limit = 10 } = {}) {
    const response = await api.get(`/coding/challenges/${challengeId}/submissions`, {
      params: { page, limit }
    });
    return extractData(response) || { submissions: [], pagination: {} };
  },

  /**
   * Retrieves user's global coding submission history
   */
  async getUserCodingHistory({ page = 1, limit = 15 } = {}) {
    const response = await api.get('/coding/submissions/history', {
      params: { page, limit }
    });
    return extractData(response) || { submissions: [], pagination: {} };
  },

  /**
   * Retrieves user's coding assessment analytics
   */
  async getCodingStats() {
    const response = await api.get('/coding/stats');
    return extractData(response);
  }
};

export default codingService;
