import { SystemDesignService } from '../services/systemDesign.service.js';

export const getProblems = async (req, res, next) => {
  try {
    const problems = SystemDesignService.getProblems();
    res.status(200).json({
      success: true,
      data: problems
    });
  } catch (err) {
    next(err);
  }
};

export const getProblemById = async (req, res, next) => {
  try {
    const { problemId } = req.params;
    const problem = SystemDesignService.getProblemById(problemId);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: `System design problem '${problemId}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: problem
    });
  } catch (err) {
    next(err);
  }
};

export const getDiagram = async (req, res, next) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id || 'guest';
    const diagram = SystemDesignService.getDiagram(userId, problemId);

    if (!diagram) {
      return res.status(404).json({
        success: false,
        message: `No diagram found for problem '${problemId}'.`
      });
    }

    res.status(200).json({
      success: true,
      data: diagram
    });
  } catch (err) {
    next(err);
  }
};

export const saveDiagram = async (req, res, next) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id || 'guest';
    const diagramData = req.body;

    const saved = SystemDesignService.saveDiagram(userId, problemId, diagramData);

    res.status(200).json({
      success: true,
      message: 'Diagram saved successfully.',
      data: saved
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDiagram = async (req, res, next) => {
  try {
    const { problemId } = req.params;
    const userId = req.user?.id || 'guest';

    const result = SystemDesignService.deleteDiagram(userId, problemId);

    res.status(200).json({
      success: true,
      message: 'Diagram deleted successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};
