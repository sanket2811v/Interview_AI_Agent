/**
 * Transparent, versioned evaluation rubrics and scoring engine for Phase 11
 */

export const RUBRIC_VERSION = '1.0.0';

export const EVALUATION_RUBRICS = {
  TECHNICAL: {
    version: RUBRIC_VERSION,
    name: 'Technical Interview Rubric',
    criteria: [
      { id: 'technicalAccuracy', name: 'Technical Accuracy', weight: 0.30, description: 'Correctness of technical facts, algorithms, syntax, and principles.' },
      { id: 'conceptualUnderstanding', name: 'Conceptual Understanding', weight: 0.20, description: 'Grasp of fundamental theories, architecture patterns, and mental models.' },
      { id: 'problemSolvingAbility', name: 'Problem-Solving Ability', weight: 0.20, description: 'Analytical breakdown, logical structuring, and edge case identification.' },
      { id: 'practicalApplication', name: 'Practical Application', weight: 0.15, description: 'Real-world deployment, framework nuances, caching, and production considerations.' },
      { id: 'communicationAndExplanation', name: 'Communication & Explanation', weight: 0.10, description: 'Clarity, conciseness, structured terminology, and articulation.' },
      { id: 'completeness', name: 'Completeness', weight: 0.05, description: 'Covering all parts of the question without glaring omissions.' }
    ]
  },

  HR: {
    version: RUBRIC_VERSION,
    name: 'HR & Behavioral Interview Rubric',
    criteria: [
      { id: 'relevance', name: 'Relevance', weight: 0.20, description: 'Directly addresses the interviewer’s question without dodging or rambling.' },
      { id: 'communicationClarity', name: 'Communication Clarity', weight: 0.20, description: 'Clear narrative arc, structured thoughts, and professional vocabulary.' },
      { id: 'answerStructure', name: 'Answer Structure (STAR)', weight: 0.20, description: 'Coherent progression through Situation, Task, Action, and measurable Result.' },
      { id: 'authenticityAndSpecificity', name: 'Authenticity & Specificity', weight: 0.15, description: 'Concrete personal contributions rather than vague team claims.' },
      { id: 'professionalism', name: 'Professionalism', weight: 0.15, description: 'Constructive attitude towards coworkers, empathy, and positive demeanor.' },
      { id: 'selfAwareness', name: 'Self-Awareness', weight: 0.10, description: 'Insight into personal strengths, acknowledged growth areas, and lessons learned.' }
    ]
  },

  SYSTEM_DESIGN: {
    version: RUBRIC_VERSION,
    name: 'System Design Rubric',
    criteria: [
      { id: 'requirementsUnderstanding', name: 'Requirements Understanding', weight: 0.15, description: 'Scope clarity, functional & non-functional bounds (QPS, storage, latency).' },
      { id: 'architectureAndDesign', name: 'Architecture & Component Design', weight: 0.20, description: 'High-level modular decomposition, clean APIs, decoupled services.' },
      { id: 'databaseAndDataModeling', name: 'Database & Data Modeling', weight: 0.15, description: 'Appropriate DB choice (SQL vs NoSQL), schema schemas, read/write ratios.' },
      { id: 'scalabilityAndPerformance', name: 'Scalability & Performance', weight: 0.15, description: 'Horizontal scaling, partitioning, load balancing, caching tiers.' },
      { id: 'reliabilityAndAvailability', name: 'Reliability & Availability', weight: 0.10, description: 'Fault tolerance, replication, circuit breakers, backup failover.' },
      { id: 'security', name: 'Security & Auth', weight: 0.10, description: 'Authentication, authorization, data encryption in-transit and at-rest.' },
      { id: 'tradeOffAnalysis', name: 'Trade-off Analysis', weight: 0.10, description: 'CAP theorem evaluation, latency vs throughput tradeoffs, cost awareness.' },
      { id: 'communication', name: 'Communication', weight: 0.05, description: 'Whiteboarding clarity, structured progression, collaborative dialogue.' }
    ]
  },

  SCENARIO: {
    version: RUBRIC_VERSION,
    name: 'Scenario-Based & Incident Rubric',
    criteria: [
      { id: 'problemUnderstanding', name: 'Problem Understanding', weight: 0.15, description: 'Quickly grasping production incident symptoms, blast radius, and urgency.' },
      { id: 'investigationApproach', name: 'Investigation Approach', weight: 0.20, description: 'Systematic telemetry inspection, logs, metrics, trace analysis.' },
      { id: 'decisionMaking', name: 'Decision-Making Under Pressure', weight: 0.20, description: 'Prioritizing mitigation/rollback over root cause during active outage.' },
      { id: 'technicalSolution', name: 'Technical Solution & Fix', weight: 0.20, description: 'Sound corrective patching and permanent fix implementation.' },
      { id: 'communication', name: 'Stakeholder Communication', weight: 0.10, description: 'Timely status broadcasts to customers and cross-functional teams.' },
      { id: 'riskManagementAndPrevention', name: 'Risk Management & Post-Mortem', weight: 0.15, description: 'Blameless RCA, preventative automated alerts, regression tests.' }
    ]
  },

  CODING: {
    version: RUBRIC_VERSION,
    name: 'Coding & Algorithmic Rubric',
    criteria: [
      { id: 'functionalCorrectness', name: 'Functional Correctness', weight: 0.40, description: 'Test cases passed, edge cases handled, zero compile/runtime errors.' },
      { id: 'algorithmicEfficiency', name: 'Algorithmic Efficiency', weight: 0.20, description: 'Optimal asymptotic time and space complexity relative to problem constraints.' },
      { id: 'codeQuality', name: 'Code Quality & Idioms', weight: 0.15, description: 'Idiomatic language usage, modular structure, clean variable naming.' },
      { id: 'edgeCaseHandling', name: 'Edge Case Handling', weight: 0.10, description: 'Empty inputs, single elements, extremes, null safety, boundary values.' },
      { id: 'readabilityAndMaintainability', name: 'Readability & Maintainability', weight: 0.10, description: 'Self-documenting code, consistent formatting, maintainable design.' },
      { id: 'explanation', name: 'Explanation & Complexity Walkthrough', weight: 0.05, description: 'Clear justification of algorithm selection and complexity bounds.' }
    ]
  },

  MIXED: {
    version: RUBRIC_VERSION,
    name: 'Comprehensive Mixed Rubric',
    criteria: [
      { id: 'technicalCompetency', name: 'Core Technical Competency', weight: 0.35, description: 'Foundational programming concepts, REST, and system implementations.' },
      { id: 'systemArchitecture', name: 'Architecture & Design Thinking', weight: 0.25, description: 'Scalability, component breakdown, and tradeoff evaluation.' },
      { id: 'behavioralAndCulture', name: 'Behavioral & Collaboration', weight: 0.20, description: 'STAR structure, team harmony, conflict resolution, ownership.' },
      { id: 'communicationClarity', name: 'Communication Clarity', weight: 0.10, description: 'Clarity, conciseness, structured terminology, and active listening.' },
      { id: 'adaptability', name: 'Adaptability & Follow-up Handling', weight: 0.10, description: 'Receptive to interviewer pivots, probing hints, and deep-dives.' }
    ]
  }
};

/**
 * Returns rubric matching category or falls back to TECHNICAL
 */
export function getRubricForCategory(category = 'TECHNICAL') {
  const norm = String(category).toUpperCase();
  if (norm.includes('HR') || norm.includes('BEHAVIORAL')) return EVALUATION_RUBRICS.HR;
  if (norm.includes('CODE') || norm.includes('CODING')) return EVALUATION_RUBRICS.CODING;
  if (norm.includes('SYSTEM') || norm.includes('DESIGN')) return EVALUATION_RUBRICS.SYSTEM_DESIGN;
  if (norm.includes('SCENARIO') || norm.includes('INCIDENT')) return EVALUATION_RUBRICS.SCENARIO;
  if (norm.includes('MIXED')) return EVALUATION_RUBRICS.MIXED;
  return EVALUATION_RUBRICS.TECHNICAL;
}

/**
 * Maps numeric score (0-100) to standard performance classification
 */
export function classifyPerformance(score) {
  const num = Number(score);
  if (isNaN(num)) return 'Poor';
  const s = Math.max(0, Math.min(100, Math.round(num)));
  if (s >= 90) return 'Excellent';
  if (s >= 80) return 'Very Good';
  if (s >= 70) return 'Good';
  if (s >= 60) return 'Average';
  if (s >= 40) return 'Needs Improvement';
  return 'Poor';
}

/**
 * Calculates weighted score from criterion scores according to the target rubric
 * Handles unverified criteria by normalizing over evaluated criteria weights
 * so unverified criteria are not silently assigned zero.
 */
export function calculateWeightedScore(criterionScores = [], rubric = EVALUATION_RUBRICS.TECHNICAL) {
  if (!Array.isArray(criterionScores) || criterionScores.length === 0) {
    return 0;
  }

  const scoreMap = new Map();
  const unverifiedSet = new Set();

  for (const cs of criterionScores) {
    if (cs && cs.criterion) {
      if (cs.isUnverified || cs.status === 'UNVERIFIED' || cs.score === null || cs.score === undefined) {
        unverifiedSet.add(cs.criterion);
        if (cs.name) unverifiedSet.add(cs.name);
      } else {
        const scoreVal = Math.max(0, Math.min(100, Number(cs.score) || 0));
        scoreMap.set(cs.criterion, scoreVal);
        if (cs.name) scoreMap.set(cs.name, scoreVal);
      }
    }
  }

  let totalWeighted = 0;
  let totalWeightAccounted = 0;

  for (const crit of rubric.criteria) {
    if (unverifiedSet.has(crit.id) || unverifiedSet.has(crit.name)) {
      // Unverified criterion is excluded from denominator so it does not falsely drag score down
      continue;
    }
    if (scoreMap.has(crit.id) || scoreMap.has(crit.name)) {
      const rawScore = scoreMap.has(crit.id) ? scoreMap.get(crit.id) : scoreMap.get(crit.name);
      totalWeighted += rawScore * crit.weight;
      totalWeightAccounted += crit.weight;
    }
  }

  if (totalWeightAccounted === 0) return 0;
  const normalized = totalWeighted / totalWeightAccounted;
  return Math.round(normalized);
}

/**
 * Validates and enriches criterion scores ensuring weights align with the rubric
 */
export function normalizeCriterionScores(rawCriterionScores = [], rubric = EVALUATION_RUBRICS.TECHNICAL) {
  const enriched = [];

  for (const crit of rubric.criteria) {
    const matching = rawCriterionScores.find(
      (rc) => rc.criterion === crit.id || rc.criterion === crit.name
    );
    const isUnverified = matching?.isUnverified || matching?.status === 'UNVERIFIED' || matching?.score === null;
    const score = isUnverified ? null : (matching ? Math.max(0, Math.min(100, Math.round(Number(matching.score) || 0))) : 0);
    const weightedScore = score !== null ? Math.round(score * crit.weight * 10) / 10 : null;

    enriched.push({
      criterion: crit.id,
      name: crit.name,
      weight: crit.weight,
      score,
      weightedScore,
      isUnverified: !!isUnverified,
      status: isUnverified ? 'UNVERIFIED' : 'VERIFIED',
      explanation: matching?.explanation || `Evaluated against ${crit.name} criteria.`,
      supportingEvidence: matching?.supportingEvidence || matching?.evidence || ''
    });
  }

  return enriched;
}

