import db from '../config/prisma.js';

/**
 * Reusable Database Service Utilities for InterviewAI
 * Implements high-performance query patterns, pagination, ownership verification, and analytics.
 */

/**
 * Calculate standard pagination parameters (offset/limit)
 */
export const getPaginationParams = (page = 1, limit = 10, maxLimit = 100) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    skip,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit
  };
};

/**
 * Standard paginated response formatter
 */
export const formatPaginatedResponse = ({ data, total, page, limit }) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    items: data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Execute a paginated Prisma query
 */
export const paginate = async (modelDelegate, { where = {}, orderBy = { createdAt: 'desc' }, select, include, page = 1, limit = 10 }) => {
  const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);

  const [total, data] = await Promise.all([
    modelDelegate.count({ where }),
    modelDelegate.findMany({
      where,
      orderBy,
      skip,
      take,
      ...(select ? { select } : {}),
      ...(include && !select ? { include } : {})
    })
  ]);

  return formatPaginatedResponse({
    data,
    total,
    page: currentPage,
    limit: currentLimit
  });
};

/**
 * Verifies that a record belongs to the authenticated user.
 * Throws 403 / 404 if record doesn't exist or ownership check fails.
 */
export const verifyOwnership = async (modelDelegate, recordId, userId, idField = 'id', userField = 'userId') => {
  const record = await modelDelegate.findUnique({
    where: { [idField]: recordId },
    select: { [idField]: true, [userField]: true }
  });

  if (!record) {
    const error = new Error('Resource not found');
    error.status = 404;
    throw error;
  }

  if (record[userField] !== userId) {
    const error = new Error('Access denied: You do not have permission to access this resource.');
    error.status = 403;
    throw error;
  }

  return true;
};

/**
 * Soft delete a record by setting deletedAt
 */
export const softDelete = async (modelDelegate, id) => {
  return modelDelegate.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};

/**
 * Transaction helper with automatic rollback
 */
export const withTransaction = async (callback) => {
  return db.$transaction(callback);
};

/**
 * High-performance dashboard analytics aggregator for a user
 * Avoids N+1 query patterns by combining counts and averages.
 */
export const getUserDashboardStats = async (userId) => {
  const [
    totalPreparations,
    completedInterviews,
    questionsPracticed,
    userProgresses,
    recentSessions
  ] = await Promise.all([
    db.preparationSession.count({
      where: { userId, deletedAt: null }
    }),
    db.mockInterview.count({
      where: { userId, status: 'COMPLETED' }
    }),
    db.questionAttempt.count({
      where: { userId }
    }),
    db.userProgress.findMany({
      where: { userId },
      orderBy: { averageScore: 'desc' },
      take: 5
    }),
    db.preparationSession.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        title: true,
        companyName: true,
        jobTitle: true,
        difficulty: true,
        status: true,
        progress: true,
        updatedAt: true
      }
    })
  ]);

  // Calculate average score across progress metrics
  const avgScore = userProgresses.length
    ? Math.round(userProgresses.reduce((acc, curr) => acc + curr.averageScore, 0) / userProgresses.length)
    : 0;

  return {
    totalPreparations,
    completedInterviews,
    questionsPracticed,
    averageScore: avgScore,
    skillProficiencies: userProgresses.map((p) => ({
      skill: p.skillName,
      category: p.category,
      score: Math.round(p.averageScore),
      proficiency: p.proficiencyLevel,
      attempts: p.completedAttempts
    })),
    recentSessions
  };
};

export default {
  getPaginationParams,
  formatPaginatedResponse,
  paginate,
  verifyOwnership,
  softDelete,
  withTransaction,
  getUserDashboardStats
};

