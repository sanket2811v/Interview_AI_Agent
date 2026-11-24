import { apiClient } from './api.js';
import { SYSTEM_DESIGN_PROBLEMS, getProblemById } from '../data/systemDesignProblems.js';

const STORAGE_PREFIX = 'interviewai_whiteboard_';

export const systemDesignService = {
  /**
   * Get all problems overview
   */
  async getProblems() {
    try {
      const res = await apiClient.get('/system-design/problems');
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (err) {
      // Fallback to local problem definitions
    }
    return SYSTEM_DESIGN_PROBLEMS;
  },

  /**
   * Get specific problem details
   */
  async getProblem(problemId) {
    try {
      const res = await apiClient.get(`/system-design/problems/${problemId}`);
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      // Fallback to local
    }
    return getProblemById(problemId);
  },

  /**
   * Load diagram for a given problem and user
   */
  async getDiagram(problemId, userId = 'guest') {
    const storageKey = `${STORAGE_PREFIX}${userId}_${problemId}`;

    // 1. Try backend API first
    try {
      const res = await apiClient.get(`/system-design/diagrams/${problemId}`);
      if (res.data?.success && res.data.data) {
        const diagram = res.data.data;
        // Keep local cache synced
        localStorage.setItem(storageKey, JSON.stringify(diagram));
        return diagram;
      }
    } catch (err) {
      // Fallback to local cache
    }

    // 2. Try localStorage
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Ignore parse error
    }

    // 3. Fallback to problem starter template
    const problem = getProblemById(problemId);
    return {
      problemId,
      nodes: problem.starterNodes || [],
      edges: problem.starterEdges || [],
      updatedAt: new Date().toISOString(),
      isDefaultTemplate: true
    };
  },

  /**
   * Save diagram to both localStorage and backend API
   */
  async saveDiagram(problemId, diagramData, userId = 'guest') {
    const storageKey = `${STORAGE_PREFIX}${userId}_${problemId}`;
    const payload = {
      problemId,
      nodes: diagramData.nodes || [],
      edges: diagramData.edges || [],
      updatedAt: new Date().toISOString(),
      isDefaultTemplate: false
    };

    // 1. Save to localStorage immediately for instant resilience
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('Could not save diagram to localStorage', err);
    }

    // 2. Persist to backend
    try {
      const res = await apiClient.post(`/system-design/diagrams/${problemId}`, payload);
      if (res.data?.success && res.data.data) {
        return { ...res.data.data, syncedToCloud: true };
      }
    } catch (err) {
      // Offline or network error - local save is already complete
    }

    return { ...payload, syncedToCloud: false };
  },

  /**
   * Delete or reset saved diagram
   */
  async deleteDiagram(problemId, userId = 'guest') {
    const storageKey = `${STORAGE_PREFIX}${userId}_${problemId}`;
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      // Ignore
    }

    try {
      await apiClient.delete(`/system-design/diagrams/${problemId}`);
    } catch (err) {
      // Ignore
    }

    return { success: true };
  }
};
