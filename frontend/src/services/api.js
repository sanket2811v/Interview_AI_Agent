import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * In-memory storage for Access JWT.
 * Per strict security requirements, tokens are NEVER stored in localStorage or sessionStorage.
 */
let inMemoryAccessToken = null;

export const setAuthToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAuthToken = () => {
  return inMemoryAccessToken;
};

export const clearAuthToken = () => {
  inMemoryAccessToken = null;
};

/**
 * Standard request timeout: 30 seconds for typical REST queries.
 * AI request timeout: 120 seconds (2 minutes) for generative AI operations (JD analysis, question generation, mock interviews, evaluations).
 */
export const DEFAULT_REQUEST_TIMEOUT = 30000;
export const AI_REQUEST_TIMEOUT = 120000;

/**
 * Standard Axios Client for InterviewAI
 * Configured with credentials enabled for secure HttpOnly cookie transport
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_REQUEST_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor: Attach in-memory access token as Authorization Bearer
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: Uniform error handling & automatic token refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized for expired access tokens (avoid loop on auth endpoints)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (newAccessToken) {
          setAuthToken(newAccessToken);
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthToken();
        // Trigger event so AuthContext knows session expired
        window.dispatchEvent(new CustomEvent('interviewai:session_expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    let formattedError = {
      success: false,
      message: 'An unexpected error occurred',
      status: error.response?.status || 500,
      details: null
    };

    if (error.response?.data) {
      formattedError.message = error.response.data.message || formattedError.message;
      formattedError.details = error.response.data.errors || error.response.data.details || null;
    } else if (error.code === 'ECONNABORTED') {
      formattedError.message = 'Request timed out. Please try again.';
      formattedError.status = 408;
    } else if (error.message === 'Network Error') {
      formattedError.message = 'Unable to reach backend API. Server may be offline.';
      formattedError.status = 503;
    }

    return Promise.reject(formattedError);
  }
);

// Specialized auth API methods
export const authService = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  verifyEmail: (payload) => apiClient.post('/auth/verify-email', payload),
  resendVerification: (payload) => apiClient.post('/auth/resend-verification', payload),
  forgotPassword: (payload) => apiClient.post('/auth/forgot-password', payload),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  changePassword: (payload) => apiClient.patch('/auth/change-password', payload),
  getSessions: () => apiClient.get('/auth/sessions'),
  revokeSession: (id) => apiClient.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => apiClient.delete('/auth/sessions')
};

// Specialized user profile API methods
export const userService = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (payload) => apiClient.patch('/users/profile', payload)
};

// Health probe service
export const healthService = {
  getHealth: () => apiClient.get('/health'),
  getDatabaseHealth: () => apiClient.get('/health/database')
};

export { preparationService } from './preparationService.js';
export { practiceService } from './practiceService.js';
export { codingService } from './codingService.js';
export { mockInterviewService } from './mockInterviewService.js';
export { evaluationService } from './evaluationService.js';
export { analyticsService } from './analyticsService.js';
export { systemDesignService } from './systemDesignService.js';

export default apiClient;
