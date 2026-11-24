import { db } from '../config/prisma.js';
import { getPaginationParams, formatPaginatedResponse } from './db.service.js';
import { logger } from '../utils/logger.js';

/**
 * Service handling all interview preparation workspace business logic and database access
 */
export class PreparationService {
  /**
   * Creates a preparation session and its required job description atomically
   */
  static async createPreparation(userId, data, fileInfo = null) {
    const title = data.title || `${data.jobTitle} at ${data.companyName}`;
    const rawJobDescription = data.jobDescription;

    const session = await db.$transaction(async (tx) => {
      const createdSession = await tx.preparationSession.create({
        data: {
          userId,
          title,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          location: data.location || null,
          experienceLevel: data.experienceLevel || 'MID',
          yearsOfExperience: data.yearsOfExperience || null,
          preferredLanguage: data.preferredLanguage || 'JavaScript',
          difficulty: data.difficulty || 'MEDIUM',
          status: 'READY',
          progress: 0,
          preferences: data.preferences || [],
          jobDescription: {
            create: {
              rawText: rawJobDescription,
              sourceType: fileInfo?.sourceType || 'PASTED_TEXT',
              originalFileName: fileInfo?.originalFileName || null,
              fileSize: fileInfo?.fileSize || null
            }
          }
        },
        include: {
          jobDescription: true
        }
      });

      return createdSession;
    });

    logger.info('Preparation session created', {
      id: session.id,
      userId,
      company: session.companyName,
      role: session.jobTitle
    });

    return session;
  }

  /**
   * Retrieves paginated preparations scoped strictly to the authenticated user
   */
  static async getPreparations(userId, queryParams) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      experienceLevel,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeArchived = false
    } = queryParams;

    const { skip, take } = getPaginationParams(page, limit);

    // Build Prisma where clause
    const where = {
      userId
    };

    // Filter archived vs active
    if (status === 'ARCHIVED') {
      where.OR = [
        { status: 'ARCHIVED' },
        { deletedAt: { not: null } }
      ];
    } else if (!includeArchived) {
      where.deletedAt = null;
      if (status && status !== 'ALL') {
        where.status = status;
      }
    } else if (status && status !== 'ALL') {
      where.status = status;
    }

    // Filter experience level
    if (experienceLevel && experienceLevel !== 'ALL') {
      where.experienceLevel = experienceLevel;
    }

    // Text search on title, company, role
    if (search && search.trim().length > 0) {
      where.AND = [
        {
          OR: [
            { title: { contains: search.trim(), mode: 'insensitive' } },
            { companyName: { contains: search.trim(), mode: 'insensitive' } },
            { jobTitle: { contains: search.trim(), mode: 'insensitive' } }
          ]
        }
      ];
    }

    const [items, total] = await Promise.all([
      db.preparationSession.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          jobDescription: {
            select: {
              id: true,
              sourceType: true,
              originalFileName: true,
              createdAt: true
            }
          }
        }
      }),
      db.preparationSession.count({ where })
    ]);

    return formatPaginatedResponse({
      data: items,
      total,
      page,
      limit
    });
  }

  /**
   * Retrieves single preparation details with user ownership enforcement
   */
  static async getPreparationById(id, userId) {
    const session = await db.preparationSession.findUnique({
      where: { id },
      include: {
        jobDescription: true,
        jobAnalysis: true
      }
    });

    if (!session) {
      const error = new Error('Preparation session not found');
      error.status = 404;
      throw error;
    }

    // Strict ownership verification
    if (session.userId !== userId) {
      const error = new Error('Access denied: You do not have permission to view this preparation');
      error.status = 403;
      throw error;
    }

    return session;
  }

  /**
   * Updates preparation details
   */
  static async updatePreparation(id, userId, updates) {
    // Verify ownership first
    const existing = await this.getPreparationById(id, userId);

    const { jobDescription, ...sessionUpdates } = updates;

    const updated = await db.$transaction(async (tx) => {
      // Update job description text if provided
      if (jobDescription && existing.jobDescription) {
        await tx.jobDescription.update({
          where: { preparationSessionId: id },
          data: {
            rawText: jobDescription
          }
        });
      }

      // Update preparation session
      return await tx.preparationSession.update({
        where: { id },
        data: sessionUpdates,
        include: {
          jobDescription: true
        }
      });
    });

    logger.info('Preparation session updated', { id, userId });
    return updated;
  }

  /**
   * Soft deletes / archives a preparation session
   */
  static async archivePreparation(id, userId) {
    await this.getPreparationById(id, userId);

    const archived = await db.preparationSession.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date()
      }
    });

    logger.info('Preparation session archived', { id, userId });
    return archived;
  }

  /**
   * Restores an archived preparation session
   */
  static async restorePreparation(id, userId) {
    await this.getPreparationById(id, userId);

    const restored = await db.preparationSession.update({
      where: { id },
      data: {
        status: 'READY',
        deletedAt: null
      }
    });

    logger.info('Preparation session restored', { id, userId });
    return restored;
  }

  /**
   * Permanently deletes a preparation session and its cascading child records
   */
  static async deletePreparationPermanently(id, userId) {
    await this.getPreparationById(id, userId);

    await db.preparationSession.delete({
      where: { id }
    });

    logger.info('Preparation session permanently deleted', { id, userId });
    return { success: true, message: 'Preparation session deleted permanently' };
  }

  /**
   * Aggregates real preparation statistics for the authenticated candidate
   */
  static async getPreparationStats(userId) {
    const [
      total,
      active,
      completed,
      archived,
      recentSessions,
      avgProgressResult
    ] = await Promise.all([
      db.preparationSession.count({
        where: { userId, deletedAt: null }
      }),
      db.preparationSession.count({
        where: {
          userId,
          deletedAt: null,
          status: { in: ['READY', 'IN_PROGRESS', 'DRAFT'] }
        }
      }),
      db.preparationSession.count({
        where: { userId, deletedAt: null, status: 'COMPLETED' }
      }),
      db.preparationSession.count({
        where: {
          userId,
          OR: [{ status: 'ARCHIVED' }, { deletedAt: { not: null } }]
        }
      }),
      db.preparationSession.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          companyName: true,
          jobTitle: true,
          status: true,
          progress: true,
          difficulty: true,
          experienceLevel: true,
          createdAt: true
        }
      }),
      db.preparationSession.aggregate({
        where: { userId, deletedAt: null },
        _avg: {
          progress: true
        }
      })
    ]);

    return {
      totalPreparations: total,
      activePreparations: active,
      completedPreparations: completed,
      archivedPreparations: archived,
      averageProgress: Math.round(avgProgressResult._avg.progress || 0),
      recentPreparations: recentSessions
    };
  }

  /**
   * Retrieves the raw job description for a specific preparation session
   */
  static async getJobDescription(preparationId, userId) {
    const session = await this.getPreparationById(preparationId, userId);
    return session.jobDescription;
  }

  /**
   * Updates the job description text
   */
  static async updateJobDescription(preparationId, userId, rawText) {
    await this.getPreparationById(preparationId, userId);

    const updated = await db.jobDescription.update({
      where: { preparationSessionId: preparationId },
      data: { rawText }
    });

    return updated;
  }
}

