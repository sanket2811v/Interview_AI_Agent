import { db } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export class LearningTaskService {
  /**
   * Recalculate and update the completion percentage of an improvement plan
   */
  static async recalculatePlanProgress(improvementPlanId) {
    if (!improvementPlanId) return;

    const tasks = await db.learningTask.findMany({
      where: { improvementPlanId },
      select: { status: true }
    });

    const eligibleTasks = tasks.filter((t) => t.status !== 'SKIPPED');
    const completedTasks = eligibleTasks.filter((t) => t.status === 'COMPLETED');
    const percentage = eligibleTasks.length > 0
      ? Math.round((completedTasks.length / eligibleTasks.length) * 100)
      : 0;

    await db.improvementPlan.update({
      where: { id: improvementPlanId },
      data: { completionPercentage: percentage }
    });

    return percentage;
  }

  /**
   * List learning tasks with search, filters, and pagination
   */
  static async getTasks(userId, query = {}) {
    const {
      improvementPlanId,
      status = 'ALL',
      priority = 'ALL',
      category,
      skillName,
      search,
      overdueOnly = false,
      page = 1,
      limit = 20
    } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const now = new Date();

    const where = {
      improvementPlan: {
        userId
      },
      ...(improvementPlanId ? { improvementPlanId } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(priority && priority !== 'ALL' ? { priority } : {}),
      ...(category ? { category: { contains: category, mode: 'insensitive' } } : {}),
      ...(skillName ? { skillName: { contains: skillName, mode: 'insensitive' } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { skillName: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...(overdueOnly
        ? {
            status: { not: 'COMPLETED' },
            dueDate: { lt: now }
          }
        : {})
    };

    const [tasks, total] = await Promise.all([
      db.learningTask.findMany({
        where,
        include: {
          improvementPlan: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take
      }),
      db.learningTask.count({ where })
    ]);

    const enrichedTasks = tasks.map((t) => ({
      ...t,
      isOverdue: t.status !== 'COMPLETED' && t.dueDate ? new Date(t.dueDate) < now : false
    }));

    return {
      tasks: enrichedTasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  /**
   * Get single learning task
   */
  static async getTaskById(taskId, userId) {
    const task = await db.learningTask.findUnique({
      where: { id: taskId },
      include: {
        improvementPlan: {
          select: {
            id: true,
            title: true,
            userId: true
          }
        }
      }
    });

    if (!task) {
      const err = new Error('Learning task not found');
      err.status = 404;
      throw err;
    }

    if (task.improvementPlan.userId !== userId) {
      const err = new Error('Access denied: You do not own this learning task');
      err.status = 403;
      throw err;
    }

    const isOverdue = task.status !== 'COMPLETED' && task.dueDate ? new Date(task.dueDate) < new Date() : false;

    return { ...task, isOverdue };
  }

  /**
   * Create a learning task
   */
  static async createTask(userId, taskData) {
    const {
      improvementPlanId,
      title,
      description,
      skillName,
      category = 'General',
      priority = 'MEDIUM',
      status = 'PENDING',
      estimatedMinutes = 30,
      dueDate,
      resourceUrl
    } = taskData;

    // Verify ownership of the plan
    const plan = await db.improvementPlan.findUnique({
      where: { id: improvementPlanId }
    });

    if (!plan || plan.userId !== userId) {
      const err = new Error('Target improvement plan not found or access denied');
      err.status = plan ? 403 : 404;
      throw err;
    }

    const task = await db.learningTask.create({
      data: {
        improvementPlanId,
        userId,
        preparationSessionId: plan.preparationSessionId,
        title,
        description: description || '',
        skillName: skillName || null,
        category,
        priority,
        status,
        estimatedMinutes,
        dueDate: dueDate ? new Date(dueDate) : null,
        resourceUrl: resourceUrl || null,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });

    await this.recalculatePlanProgress(improvementPlanId);

    return task;
  }

  /**
   * Edit a learning task
   */
  static async updateTask(taskId, userId, updateData) {
    const existing = await this.getTaskById(taskId, userId);

    const {
      title,
      description,
      skillName,
      category,
      priority,
      status,
      estimatedMinutes,
      dueDate,
      resourceUrl
    } = updateData;

    let completedAt = existing.completedAt;
    if (status && status !== existing.status) {
      if (status === 'COMPLETED') {
        completedAt = new Date();
      } else if (existing.status === 'COMPLETED') {
        completedAt = null;
      }
    }

    const updated = await db.learningTask.update({
      where: { id: taskId },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(skillName !== undefined ? { skillName } : {}),
        ...(category ? { category } : {}),
        ...(priority ? { priority } : {}),
        ...(status ? { status } : {}),
        ...(estimatedMinutes ? { estimatedMinutes } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(resourceUrl !== undefined ? { resourceUrl } : {}),
        completedAt
      }
    });

    if (status && status !== existing.status) {
      await this.recalculatePlanProgress(existing.improvementPlanId);
    }

    return updated;
  }

  /**
   * Quick status update: PENDING, IN_PROGRESS, COMPLETED, SKIPPED
   */
  static async updateTaskStatus(taskId, userId, status) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }

    return this.updateTask(taskId, userId, { status });
  }

  /**
   * Delete a learning task
   */
  static async deleteTask(taskId, userId) {
    const existing = await this.getTaskById(taskId, userId);

    await db.learningTask.delete({
      where: { id: taskId }
    });

    await this.recalculatePlanProgress(existing.improvementPlanId);

    return { message: 'Task deleted successfully', taskId };
  }
}

