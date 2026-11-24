/**
 * Standard API Response Utilities
 */

export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  const payload = {
    success: true,
    message,
    ...(data !== null && { data }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (res, message, statusCode = 500, details = null) => {
  const payload = {
    success: false,
    message,
    ...(details !== null && { details }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
};

