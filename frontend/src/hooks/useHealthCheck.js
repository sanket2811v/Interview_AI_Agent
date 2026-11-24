import { useState, useEffect, useCallback } from 'react';
import { healthService } from '../services/api.js';

/**
 * Custom React Hook for monitoring backend and database connectivity status
 */
export function useHealthCheck() {
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null
  });

  const [databaseStatus, setDatabaseStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null
  });

  const checkStatus = useCallback(async () => {
    // 1. Check Backend API Health
    setBackendStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const backendData = await healthService.getHealth();
      setBackendStatus({
        loading: false,
        connected: Boolean(backendData && backendData.success),
        data: backendData,
        error: null
      });
    } catch (err) {
      setBackendStatus({
        loading: false,
        connected: false,
        data: null,
        error: err.message || 'Unable to connect to backend server'
      });
    }

    // 2. Check Database Health via Backend
    setDatabaseStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const dbData = await healthService.getDatabaseHealth();
      setDatabaseStatus({
        loading: false,
        connected: Boolean(dbData && dbData.success && dbData.database === 'connected'),
        data: dbData,
        error: null
      });
    } catch (err) {
      setDatabaseStatus({
        loading: false,
        connected: false,
        data: null,
        error: err.message || 'Unable to connect to PostgreSQL database'
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    backendStatus,
    databaseStatus,
    refresh: checkStatus
  };
}

export default useHealthCheck;

