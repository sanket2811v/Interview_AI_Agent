import { db } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class SkillGapService {
  /**
   * Helper to categorize skill performance status based on evidence
   */
  static classifySkillStatus(avgScore, attemptsCount = 1, weaknessMentionCount = 0) {
    if (!attemptsCount || attemptsCount === 0) return 'NOT_ASSESSED';
    if (avgScore >= 80 && weaknessMentionCount === 0) return 'STRONG';
    if (avgScore >= 60 && weaknessMentionCount <= 1) return 'DEVELOPING';
    return 'NEEDS_IMPROVEMENT';
  }

  /**
   * Identifies and benchmarks user skills against evaluations and target Job Analysis
   */
  static async getSkillGaps(userId, options = {}) {
    const { preparationSessionId } = options;

    // 1. Fetch relevant job analysis and skills from preparation
    let targetSkills = [];
    let preparationTitle = 'General Software Engineering';

    if (preparationSessionId) {
      const prep = await db.preparationSession.findUnique({
        where: { id: preparationSessionId },
        include: {
          jobAnalysis: true
        }
      });

      if (prep) {
        preparationTitle = `${prep.jobTitle}${prep.companyName ? ` at ${prep.companyName}` : ''}`;
        if (prep.jobAnalysis) {
          const ja = prep.jobAnalysis;
          // Extract technical skills
          const tech = Array.isArray(ja.technicalSkills) ? ja.technicalSkills : [];
          tech.forEach((ts) => {
            targetSkills.push({
              name: ts.skill || ts.name || String(ts),
              category: ts.category || 'TECHNICAL',
              importance: ts.required ? 'CRITICAL' : 'MEDIUM',
              relevance: ts.required ? 'REQUIRED' : 'PREFERRED'
            });
          });

          // Extract behavioral skills
          const beh = Array.isArray(ja.behavioralSkills) ? ja.behavioralSkills : [];
          beh.forEach((bs) => {
            targetSkills.push({
              name: bs.skill || bs.name || String(bs),
              category: 'HR',
              importance: bs.criticality === 'HIGH' ? 'HIGH' : 'MEDIUM',
              relevance: 'PREFERRED'
            });
          });
        }
      }
    }

    // If no preparation specified or no skills found in JD, look at user profile and previous preparations
    if (targetSkills.length === 0) {
      const userProfile = await db.userProfile.findUnique({ where: { userId } });
      const profileSkills = Array.isArray(userProfile?.skills) ? userProfile.skills : [];
      profileSkills.forEach((ps) => {
        targetSkills.push({
          name: String(ps),
          category: 'TECHNICAL',
          importance: 'MEDIUM',
          relevance: 'INFERRED'
        });
      });

      // Default common competencies if candidate has empty profile
      if (targetSkills.length === 0) {
        targetSkills = [
          { name: 'JavaScript / TypeScript', category: 'TECHNICAL', importance: 'HIGH', relevance: 'INFERRED' },
          { name: 'Data Structures & Algorithms', category: 'CODING', importance: 'HIGH', relevance: 'INFERRED' },
          { name: 'System Architecture & Scalability', category: 'SYSTEM_DESIGN', importance: 'HIGH', relevance: 'INFERRED' },
          { name: 'Behavioral Communication (STAR)', category: 'HR', importance: 'MEDIUM', relevance: 'INFERRED' },
          { name: 'Production Incident Triage', category: 'SCENARIO', importance: 'MEDIUM', relevance: 'INFERRED' }
        ];
      }
    }

    // 2. Fetch all evaluations for the candidate
    const evaluations = await db.interviewEvaluation.findMany({
      where: { userId },
      select: {
        id: true,
        overallScore: true,
        sourceType: true,
        criterionScores: true,
        strengths: true,
        weaknesses: true,
        missingConcepts: true,
        evaluatedAt: true
      },
      orderBy: { evaluatedAt: 'desc' }
    });

    // 3. Fetch coding submissions for language/challenge skills
    const codingSubmissions = await db.codingSubmission.findMany({
      where: { userId },
      select: {
        language: true,
        executionStatus: true,
        testCasesPassed: true,
        totalTestCases: true,
        submittedAt: true
      }
    });

    // 4. Benchmark each target skill with actual evaluation evidence
    const assessedSkillMap = new Map();

    for (const skill of targetSkills) {
      const skillLower = skill.name.toLowerCase();
      let matchedEvaluations = [];
      let missingMentionCount = 0;
      let weaknessMentionCount = 0;
      let strengthMentionCount = 0;
      let lastDate = null;

      for (const ev of evaluations) {
        const textContent = [
          ...(Array.isArray(ev.strengths) ? ev.strengths : []),
          ...(Array.isArray(ev.weaknesses) ? ev.weaknesses : []),
          ...(Array.isArray(ev.missingConcepts) ? ev.missingConcepts : [])
        ].join(' ').toLowerCase();

        const isRelevant = textContent.includes(skillLower) ||
          (ev.sourceType === 'CODING_SUBMISSION' && skill.category === 'CODING') ||
          (ev.sourceType === 'MOCK_INTERVIEW' && skill.category === 'MOCK_INTERVIEW');

        if (isRelevant) {
          matchedEvaluations.push(ev.overallScore || 0);
          if (!lastDate || ev.evaluatedAt > lastDate) lastDate = ev.evaluatedAt;

          if (Array.isArray(ev.missingConcepts) && ev.missingConcepts.some((mc) => mc.toLowerCase().includes(skillLower))) {
            missingMentionCount++;
          }
          if (Array.isArray(ev.weaknesses) && ev.weaknesses.some((w) => w.toLowerCase().includes(skillLower))) {
            weaknessMentionCount++;
          }
          if (Array.isArray(ev.strengths) && ev.strengths.some((s) => s.toLowerCase().includes(skillLower))) {
            strengthMentionCount++;
          }
        }
      }

      // Check coding submissions if skill is language or coding
      if (skill.category === 'CODING' || skillLower.includes('python') || skillLower.includes('javascript') || skillLower.includes('java')) {
        const relevantSubs = codingSubmissions.filter((cs) => cs.language && skillLower.includes(cs.language.toLowerCase()));
        if (relevantSubs.length > 0) {
          relevantSubs.forEach((cs) => {
            const passPct = cs.totalTestCases > 0 ? (cs.testCasesPassed / cs.totalTestCases) * 100 : cs.executionStatus === 'ACCEPTED' ? 100 : 0;
            matchedEvaluations.push(passPct);
            if (!lastDate || cs.submittedAt > lastDate) lastDate = cs.submittedAt;
          });
        }
      }

      // Classification logic based on actual evidence
      let status = 'NOT_ASSESSED';
      let currentScore = null;
      let priority = 'LOW';
      let action = `Complete a dedicated practice question or challenge on ${skill.name}.`;

      const attemptsCount = matchedEvaluations.length;

      if (attemptsCount > 0) {
        const avgScore = Math.round(matchedEvaluations.reduce((a, b) => a + b, 0) / attemptsCount);
        currentScore = avgScore;

        if (avgScore >= 80 && missingMentionCount === 0) {
          status = 'STRONG';
          priority = 'LOW';
          action = `Maintain proficiency with occasional mock review of ${skill.name}.`;
        } else if (avgScore >= 60 && weaknessMentionCount <= 1) {
          status = 'DEVELOPING';
          priority = skill.importance === 'CRITICAL' ? 'HIGH' : 'MEDIUM';
          action = `Practice 2-3 intermediate questions on ${skill.name} focusing on edge cases.`;
        } else {
          status = 'NEEDS_IMPROVEMENT';
          priority = 'HIGH';
          action = `Targeted remediation: review fundamental concepts of ${skill.name} and re-evaluate answers.`;
        }
      } else {
        // Skill has not been evaluated yet
        status = 'NOT_ASSESSED';
        priority = skill.importance === 'CRITICAL' ? 'HIGH' : 'MEDIUM';
        action = `Attempt your first assessment or coding challenge covering ${skill.name}.`;
      }

      // Prevent duplicate skills
      const key = skill.name.trim();
      if (!assessedSkillMap.has(key)) {
        assessedSkillMap.set(key, {
          id: `skill-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          skillName: skill.name,
          category: skill.category,
          importanceLevel: skill.importance,
          jobRelevance: skill.relevance,
          currentScore,
          evaluatedAttemptsCount: attemptsCount,
          status,
          lastAssessedDate: lastDate ? lastDate.toISOString().split('T')[0] : null,
          improvementPriority: priority,
          recommendedLearningAction: action
        });
      }
    }

    const skillsList = Array.from(assessedSkillMap.values());

    // Sort: NEEDS_IMPROVEMENT first, then DEVELOPING, NOT_ASSESSED, STRONG
    const statusOrder = { NEEDS_IMPROVEMENT: 0, DEVELOPING: 1, NOT_ASSESSED: 2, STRONG: 3 };
    skillsList.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return {
      preparationTitle,
      totalSkills: skillsList.length,
      strongCount: skillsList.filter((s) => s.status === 'STRONG').length,
      developingCount: skillsList.filter((s) => s.status === 'DEVELOPING').length,
      needsImprovementCount: skillsList.filter((s) => s.status === 'NEEDS_IMPROVEMENT').length,
      notAssessedCount: skillsList.filter((s) => s.status === 'NOT_ASSESSED').length,
      skills: skillsList
    };
  }

  /**
   * Detailed single skill analysis
   */
  static async getSkillById(userId, skillId, options = {}) {
    const gaps = await this.getSkillGaps(userId, options);
    const skill = gaps.skills.find((s) => s.id === skillId || s.skillName.toLowerCase() === skillId.toLowerCase());
    if (!skill) {
      const err = new Error('Skill not found in candidate assessment profile');
      err.status = 404;
      throw err;
    }
    return skill;
  }
}

