import { getSystemHealth, getDatabaseHealthStatus } from '../services/health.service.js';

/**
 * Controller for application health monitoring
 */
export const getHealth = (req, res) => {
  const healthData = getSystemHealth();
  return res.status(200).json(healthData);
};

export const getDatabaseHealth = async (req, res, next) => {
  try {
    const { status, data } = await getDatabaseHealthStatus();
    return res.status(status).json(data);
  } catch (error) {
    next(error);
  }
};

