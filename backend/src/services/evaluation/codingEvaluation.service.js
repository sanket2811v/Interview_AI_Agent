import { db } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import {
  EVALUATION_RUBRICS,
  calculateWeightedScore,
  classifyPerformance,
  RUBRIC_VERSION,
} from "./rubrics.js";
import {
  buildCodingEvaluationSystemPrompt,
  buildCodingEvaluationTurnPrompt,
} from "../../prompts/evaluation.prompt.js";
import { aiCodingEvaluationOutputSchema } from "../../validators/evaluation.validator.js";

export class CodingEvaluationService {
  static _mockHandler = null;

  static __setMockHandler(fn) {
    this._mockHandler = fn;
  }

  /**
   * Evaluates a Phase 9 CodingSubmission integrating actual execution results with AI code quality analysis
   */
  static async evaluateSubmission(submissionId, userId, options = {}) {
    const { forceRegenerate = false } = options;

    // 1. Fetch submission with associated coding challenge
    const submission = await db.codingSubmission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          include: {
            preparationSession: true,
          },
        },
      },
    });

    if (!submission) {
      const err = new Error("Coding submission not found");
      err.status = 404;
      throw err;
    }

    if (submission.userId !== userId) {
      const err = new Error(
        "Access denied: You do not own this coding submission",
      );
      err.status = 403;
      throw err;
    }

    // 2. Check for existing evaluation unless forceRegenerate is true
    if (!forceRegenerate) {
      const existing = await db.interviewEvaluation.findFirst({
        where: {
          codingSubmissionId: submission.id,
          userId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const { challenge } = submission;
    const rubric = EVALUATION_RUBRICS.CODING;

    // 3. Compute Functional Correctness Score from actual execution provider results
    // IMPORTANT: Grounded in real provider results; AI cannot override this!
    const totalCases = submission.totalTestCases || 0;
    const passedCases = submission.testCasesPassed || 0;
    let functionalCorrectnessScore = 0;
    let isUnverified = false;
    let executionStatusLabel = submission.executionStatus;

    if (totalCases > 0) {
      functionalCorrectnessScore = Math.round((passedCases / totalCases) * 100);
    } else if (submission.executionStatus === "ACCEPTED") {
      functionalCorrectnessScore = 100;
    } else if (
      !submission.executionStatus ||
      submission.executionStatus === "PENDING"
    ) {
      executionStatusLabel = "UNVERIFIED";
      isUnverified = true;
      functionalCorrectnessScore = null;
    }

    // 4. Generate AI Code Quality & Complexity Feedback
    let aiOutput;
    if (this._mockHandler) {
      aiOutput = await this._mockHandler({
        submission,
        challenge,
        rubric,
        sourceType: "CODING_SUBMISSION",
      });
    } else {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        const err = new Error(
          "OpenAI API Key is not configured. Real AI evaluation is unavailable.",
        );
        err.status = 503;
        err.code = "OPENAI_KEY_MISSING";
        throw err;
      }

      const systemPrompt = buildCodingEvaluationSystemPrompt({ rubric });
      const userPrompt = buildCodingEvaluationTurnPrompt({
        challengeTitle: challenge.title,
        problemDescription: challenge.description || challenge.problemStatement,
        language: submission.language,
        sourceCode: submission.sourceCode,
        executionVerdict: executionStatusLabel,
        passedTestCases: passedCases,
        totalTestCases: totalCases,
        executionTimeMs: submission.executionTime,
        compilationError: submission.compilationError,
        runtimeError: submission.runtimeError,
      });

      const startTime = Date.now();
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        },
      );

      if (!response.ok) {
        const err = new Error(
          `OpenAI coding evaluation error: ${response.statusText}`,
        );
        err.status = response.status === 429 ? 429 : 502;
        throw err;
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      try {
        aiOutput = JSON.parse(rawContent);
      } catch (parseErr) {
        throw new Error("AI returned malformed coding evaluation JSON");
      }

      if (data.usage) {
        await db.aiUsageLog
          .create({
            data: {
              userId,
              preparationSessionId: challenge.preparationSessionId,
              operationType: "CODING_REVIEW",
              provider: "OpenAI",
              model: env.OPENAI_MODEL || "gpt-4o-mini",
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
              durationMs: Date.now() - startTime,
              status: "SUCCESS",
            },
          })
          .catch((e) =>
            logger.warn("Failed to log AI coding usage:", e.message),
          );
      }
    }

    const parsed = aiCodingEvaluationOutputSchema.safeParse(aiOutput);
    const validOutput = parsed.success ? parsed.data : aiOutput;

    // 5. Build Criterion Scores synthesizing execution results + AI code quality
    const criterionScores = [
      {
        criterion: "functionalCorrectness",
        name: "Functional Correctness",
        weight: 0.4,
        score: functionalCorrectnessScore,
        weightedScore:
          functionalCorrectnessScore !== null
            ? Math.round(functionalCorrectnessScore * 0.4 * 10) / 10
            : null,
        isUnverified,
        status: isUnverified ? "UNVERIFIED" : "VERIFIED",
        explanation: isUnverified
          ? "UNVERIFIED: Code has not been executed against test cases by the execution provider."
          : `Grounded in actual execution provider results: ${passedCases} of ${totalCases} test cases passed (Status: ${executionStatusLabel}).`,
        supportingEvidence: isUnverified
          ? "Execution status: UNVERIFIED"
          : `Execution verdict: ${submission.executionStatus}, ${passedCases}/${totalCases} passed.`,
      },
      {
        criterion: "algorithmicEfficiency",
        name: "Algorithmic Efficiency",
        weight: 0.2,
        score: validOutput.algorithmicEfficiencyScore ?? 75,
        weightedScore:
          Math.round(
            (validOutput.algorithmicEfficiencyScore ?? 75) * 0.2 * 10,
          ) / 10,
        explanation: `Estimated Time Complexity: ${validOutput.timeComplexity || "O(n)"}, Space Complexity: ${validOutput.spaceComplexity || "O(1)"}. ${validOutput.complexityExplanation || ""}`,
        supportingEvidence: `${validOutput.timeComplexity || "O(n)"} time, ${validOutput.spaceComplexity || "O(1)"} space.`,
      },
      {
        criterion: "codeQuality",
        name: "Code Quality & Idioms",
        weight: 0.15,
        score: validOutput.codeQualityScore ?? 75,
        weightedScore:
          Math.round((validOutput.codeQualityScore ?? 75) * 0.15 * 10) / 10,
        explanation:
          "Evaluates idiomatic language constructs, modular structuring, and naming consistency.",
        supportingEvidence:
          validOutput.strengths?.[0] || "Clean code structure.",
      },
      {
        criterion: "edgeCaseHandling",
        name: "Edge Case Handling",
        weight: 0.1,
        score: validOutput.edgeCaseHandlingScore ?? 70,
        weightedScore:
          Math.round((validOutput.edgeCaseHandlingScore ?? 70) * 0.1 * 10) / 10,
        explanation:
          "Boundary conditions, empty collections, null checks, and extremes.",
        supportingEvidence:
          validOutput.weaknesses?.[0] || "Standard boundary handling.",
      },
      {
        criterion: "readabilityAndMaintainability",
        name: "Readability & Maintainability",
        weight: 0.1,
        score: validOutput.readabilityScore ?? 80,
        weightedScore:
          Math.round((validOutput.readabilityScore ?? 80) * 0.1 * 10) / 10,
        explanation:
          "Self-documenting logic, clean layout, and maintainability.",
        supportingEvidence: "Code formatting analysis.",
      },
      {
        criterion: "explanation",
        name: "Explanation & Walkthrough",
        weight: 0.05,
        score: 75,
        weightedScore: Math.round(75 * 0.05 * 10) / 10,
        explanation: "Algorithmic complexity walkthrough clarity.",
        supportingEvidence:
          validOutput.complexityExplanation ||
          "Algorithmic breakdown provided.",
      },
    ];

    const overallScore = calculateWeightedScore(criterionScores, rubric);
    const classification = classifyPerformance(overallScore);

    // 6. Persist InterviewEvaluation
    const evaluation = await db.interviewEvaluation.create({
      data: {
        userId,
        sourceType: "CODING_SUBMISSION",
        sourceId: submission.id,
        codingSubmissionId: submission.id,
        overallScore,
        classification,
        rubricVersion: RUBRIC_VERSION,
        evaluationStatus: "COMPLETED",
        criterionScores,
        strengths: validOutput.strengths || [],
        weaknesses: validOutput.weaknesses || [],
        missingConcepts: [],
        recommendations: validOutput.improvementSuggestions || [],
        improvementSuggestions: validOutput.improvementSuggestions || [],
        detailedFeedback: validOutput.detailedFeedback || "",
        improvedAnswer: validOutput.alternativeApproaches?.[0] || null,
        confidence: validOutput.confidence || 0.9,
        limitations: [
          "Functional correctness is verified by the sandbox execution provider without exposing hidden test case data.",
        ],
        evaluatedAt: new Date(),
      },
    });

    // 7. Generate improvement recommendation if there are weaknesses
    if (
      Array.isArray(validOutput.weaknesses) &&
      validOutput.weaknesses.length > 0
    ) {
      await db.improvementRecommendation
        .create({
          data: {
            userId,
            evaluationId: evaluation.id,
            skill: "Algorithms",
            weakness: validOutput.weaknesses[0],
            whyItMatters: `Identified bottleneck during coding challenge: "${challenge.title}"`,
            recommendedAction:
              validOutput.improvementSuggestions?.[0] ||
              "Review algorithmic patterns and optimize complexity.",
            practiceActivity: `Refactor solution for "${challenge.title}" targeting ${validOutput.timeComplexity || "optimal complexity"}`,
            priority: overallScore < 60 ? "HIGH" : "MEDIUM",
            estimatedMinutes: 30,
            status: "PENDING",
          },
        })
        .catch((e) =>
          logger.warn("Failed to generate coding recommendation:", e.message),
        );
    }

    return evaluation;
  }

  /**
   * Retrieves evaluation for a coding submission
   */
  static async getSubmissionEvaluation(submissionId, userId) {
    const evaluation = await db.interviewEvaluation.findFirst({
      where: {
        codingSubmissionId: submissionId,
        userId,
      },
    });

    if (!evaluation) {
      const err = new Error(
        "No evaluation found for this coding submission. Please request evaluation first.",
      );
      err.status = 404;
      throw err;
    }

    return evaluation;
  }
}
