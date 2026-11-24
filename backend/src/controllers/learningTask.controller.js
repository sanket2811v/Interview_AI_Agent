import { LearningTaskService } from '../services/analytics/learningTask.service.js';
import {
  createLearningTaskSchema,
  updateLearningTaskSchema,
  updateTaskStatusSchema,
  queryLearningTasksSchema
} from '../validators/analytics.validator.js';

export const getTasks = async (req, res, next) => {
  try {
    const validated = queryLearningTasksSchema.parse(req.query);
    const result = await LearningTaskService.getTasks(req.user.id, validated);
    res.status(200).json({ success: true, data: result.tasks, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await LearningTaskService.getTaskById(taskId, req.user.id);
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const validated = createLearningTaskSchema.parse(req.body);
    const task = await LearningTaskService.createTask(req.user.id, validated);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const validated = updateLearningTaskSchema.parse(req.body);
    const updated = await LearningTaskService.updateTask(taskId, req.user.id, validated);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = updateTaskStatusSchema.parse(req.body);
    const updated = await LearningTaskService.updateTaskStatus(taskId, req.user.id, status);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const result = await LearningTaskService.deleteTask(taskId, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

