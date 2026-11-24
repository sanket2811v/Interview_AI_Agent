import { PerformanceReportService } from '../services/evaluation/performanceReport.service.js';
import { generateReportSchema } from '../validators/evaluation.validator.js';

export async function generateReport(req, res, next) {
  try {
    const userId = req.user.id;
    const parsed = generateReportSchema.safeParse(req.body);
    const payload = parsed.success ? parsed.data : req.body;

    const report = await PerformanceReportService.generateReport(userId, payload);
    return res.status(201).json({
      success: true,
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

export async function listReports(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await PerformanceReportService.getUserReports(userId);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getReportById(req, res, next) {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const report = await PerformanceReportService.getReportById(reportId, userId);
    return res.status(200).json({
      success: true,
      data: { report }
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadReport(req, res, next) {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const downloadData = await PerformanceReportService.getReportDownloadData(reportId, userId);
    return res.status(200).json({
      success: true,
      data: downloadData
    });
  } catch (err) {
    next(err);
  }
}

