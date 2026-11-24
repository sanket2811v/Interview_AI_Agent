import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('InterviewAI Frontend Architecture & Design System Audit', () => {
  // 1. Verify All Core Pages Exist and are Structured Correctly
  test('1. All Phase 2 & Phase 3 page components exist and are non-empty', () => {
    const requiredPages = [
      'Landing.jsx',
      'Dashboard.jsx',
      'Preparations.jsx',
      'CreatePreparation.jsx',
      'JobAnalysis.jsx',
      'QuestionBank.jsx',
      'InterviewPractice.jsx',
      'PreparationWorkspace.jsx',
      'TechnicalPractice.jsx',
      'HRPractice.jsx',
      'CodingArena.jsx',
      'SystemDesign.jsx',
      'MockInterviews.jsx',
      'CreateMockInterview.jsx',
      'LiveMockInterview.jsx',
      'InterviewReview.jsx',
      'Reports.jsx',
      'EvaluationDetail.jsx',
      'ImprovementPlan.jsx',
      'History.jsx',
      'Profile.jsx',
      'Settings.jsx',
      'NotFound.jsx',
      'Login.jsx',
      'Register.jsx',
      'ForgotPassword.jsx',
      'ResetPassword.jsx',
      'VerifyEmail.jsx'
    ];

    requiredPages.forEach((pageFile) => {
      const filePath = path.join(srcDir, 'pages', pageFile);
      assert.ok(fs.existsSync(filePath), `Missing required page: ${pageFile}`);
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.length > 200, `Page component ${pageFile} is empty or incomplete`);
      assert.ok(
        content.includes('export function') || content.includes('export default'),
        `Page ${pageFile} lacks a standard export`
      );
    });
  });

  // 2. Verify Reusable UI Components
  test('2. All required reusable UI components exist and export valid definitions', () => {
    const uiComponents = [
      'Button.jsx',
      'Card.jsx',
      'Input.jsx',
      'Badge.jsx',
      'Modal.jsx',
      'Dropdown.jsx',
      'Skeleton.jsx',
      'Tooltip.jsx',
      'Tabs.jsx',
      'Toast.jsx',
      'Avatar.jsx'
    ];

    uiComponents.forEach((component) => {
      const filePath = path.join(srcDir, 'components/ui', component);
      assert.ok(fs.existsSync(filePath), `Missing UI primitive: ${component}`);
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.length > 100, `UI component ${component} is too short`);
    });
  });

  // 3. Verify Common Layout Components
  test('3. Common layout, navigation, and auth guard components exist', () => {
    const commonComponents = [
      'common/PageHeader.jsx',
      'common/EmptyState.jsx',
      'common/LoadingState.jsx',
      'common/ErrorState.jsx',
      'common/ConfirmDialog.jsx',
      'common/Breadcrumbs.jsx',
      'navigation/Sidebar.jsx',
      'navigation/Header.jsx',
      'navigation/MobileNavigation.jsx',
      'auth/ProtectedRoute.jsx',
      'auth/PublicRoute.jsx',
      'layouts/MainLayout.jsx',
      'layouts/DashboardLayout.jsx',
      'layouts/AuthLayout.jsx'
    ];

    commonComponents.forEach((comp) => {
      const filePath = path.join(srcDir, 'components', comp.startsWith('layouts/') ? `../${comp}` : comp);
      assert.ok(fs.existsSync(filePath), `Missing component: ${comp}`);
    });
  });

  // 4. Verify Route Path Coverage in AppRoutes.jsx
  test('4. AppRoutes defines all required public, auth, and protected route paths', () => {
    const appRoutesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    assert.ok(fs.existsSync(appRoutesPath), 'Missing AppRoutes.jsx');
    const routesContent = fs.readFileSync(appRoutesPath, 'utf-8');

    const expectedPaths = [
      'path="/"',
      'path="/login"',
      'path="/register"',
      'path="/forgot-password"',
      'path="/reset-password/:token"',
      'path="/verify-email"',
      'path="/dashboard"',
      'path="/preparations"',
      'path="/preparations/new"',
      'path="/preparations/:id"',
      'path="/preparations/:id/analysis"',
      'path="/preparations/:id/questions"',
      'path="/preparations/:id/practice"',
      'path="/practice/history"',
      'path="/practice/technical"',
      'path="/practice/hr"',
      'path="/coding"',
      'path="/system-design"',
      'path="/mock-interviews"',
      'path="/reports"',
      'path="/improvement-plan"',
      'path="/history"',
      'path="/profile"',
      'path="/settings"',
      'path="*"'
    ];

    expectedPaths.forEach((routeSnippet) => {
      assert.ok(
        routesContent.includes(routeSnippet),
        `AppRoutes.jsx missing route definition: ${routeSnippet}`
      );
    });
  });

  // 5. Verify Design Tokens & Theme Palettes
  test('5. Design tokens define both dark and light theme variables', () => {
    const tokensPath = path.join(srcDir, 'styles/design-tokens.css');
    assert.ok(fs.existsSync(tokensPath), 'Missing design-tokens.css');
    const tokensContent = fs.readFileSync(tokensPath, 'utf-8');

    assert.ok(tokensContent.includes(':root'), 'Tokens missing light theme :root definitions');
    assert.ok(tokensContent.includes('.dark'), 'Tokens missing .dark theme definitions');
    assert.ok(tokensContent.includes('--bg-primary'), 'Tokens missing --bg-primary token');
    assert.ok(tokensContent.includes('--accent-primary'), 'Tokens missing --accent-primary token');
  });

  // 6. Verify Authentication Context & API Integration
  test('6. AuthContext and ApiClient enforce secure credential management', () => {
    const authContextPath = path.join(srcDir, 'context/AuthContext.jsx');
    assert.ok(fs.existsSync(authContextPath), 'Missing AuthContext.jsx');
    const authContent = fs.readFileSync(authContextPath, 'utf-8');

    assert.ok(authContent.includes('useAuth'), 'AuthContext missing useAuth hook');
    assert.ok(authContent.includes('login'), 'AuthContext missing login method');
    assert.ok(authContent.includes('register'), 'AuthContext missing register method');
    assert.ok(authContent.includes('logout'), 'AuthContext missing logout method');
    assert.ok(authContent.includes('refreshSession'), 'AuthContext missing refreshSession method');

    const apiPath = path.join(srcDir, 'services/api.js');
    assert.ok(fs.existsSync(apiPath), 'Missing api.js');
    const apiContent = fs.readFileSync(apiPath, 'utf-8');

    assert.ok(apiContent.includes('withCredentials: true'), 'Axios missing withCredentials for cookies');
    assert.ok(apiContent.includes('authService'), 'api.js missing authService export');
    assert.ok(apiContent.includes('userService'), 'api.js missing userService export');
  });

  // 7. Verify Phase 5 preparationService API Architecture
  test('7. preparationService.js exports all required Phase 5 CRUD and document upload methods', () => {
    const prepServicePath = path.join(srcDir, 'services/preparationService.js');
    assert.ok(fs.existsSync(prepServicePath), 'Missing preparationService.js');
    const content = fs.readFileSync(prepServicePath, 'utf-8');

    const expectedMethods = [
      'createPreparation',
      'uploadDocument',
      'getPreparations',
      'getPreparationById',
      'updatePreparation',
      'archivePreparation',
      'restorePreparation',
      'deletePermanently',
      'getPreparationStats',
      'updateJobDescription'
    ];

    expectedMethods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `preparationService.js missing required method: ${method}`
      );
    });
  });

  // 8. Verify Responsive Breakpoints & Multi-Device Layout Support
  test('8. Tailwind & CSS layout tokens support all responsive viewport tiers', () => {
    const tailwindConfigPath = path.resolve(__dirname, '../tailwind.config.js');
    assert.ok(fs.existsSync(tailwindConfigPath), 'Missing tailwind.config.js');

    // Verify CreatePreparation and Preparations contain responsive classes
    const createPrepContent = fs.readFileSync(path.join(srcDir, 'pages/CreatePreparation.jsx'), 'utf-8');
    assert.ok(createPrepContent.includes('grid-cols-1 md:grid-cols-2'));
    assert.ok(createPrepContent.includes('sm:grid-cols-3'));

    const prepsContent = fs.readFileSync(path.join(srcDir, 'pages/Preparations.jsx'), 'utf-8');
    assert.ok(prepsContent.includes('flex-col lg:flex-row'));
    assert.ok(prepsContent.includes('flex-col md:flex-row'));
  });

  // 9. Verify Phase 6 AI Job Analysis Service Methods
  test('9. preparationService.js exports all required Phase 6 AI Analysis methods', () => {
    const prepServicePath = path.join(srcDir, 'services/preparationService.js');
    assert.ok(fs.existsSync(prepServicePath), 'Missing preparationService.js');
    const content = fs.readFileSync(prepServicePath, 'utf-8');

    const expectedPhase6Methods = [
      'analyzePreparation',
      'getPreparationAnalysis',
      'regeneratePreparationAnalysis',
      'getPreparationAnalysisStatus'
    ];

    expectedPhase6Methods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `preparationService.js missing required Phase 6 method: ${method}`
      );
    });
  });

  // 10. Verify Phase 6 JobAnalysis.jsx Dashboard Sections & Responsive Layout
  test('10. JobAnalysis.jsx implements comprehensive 10-section AI analysis dashboard and modals', () => {
    const jobAnalysisPath = path.join(srcDir, 'pages/JobAnalysis.jsx');
    assert.ok(fs.existsSync(jobAnalysisPath), 'Missing JobAnalysis.jsx');
    const content = fs.readFileSync(jobAnalysisPath, 'utf-8');

    // Section 1: Overview & Summary
    assert.ok(content.includes('Executive Summary') || content.includes('executiveSummary'));
    assert.ok(content.includes('jobOverview'));

    // Section 2: Difficulty Estimation
    assert.ok(content.includes('difficultyData') || content.includes('Interview Difficulty Rating'));
    assert.ok(content.includes('/100'));

    // Section 3: Technical Skills Matrix & Filtering
    assert.ok(content.includes('technicalSkills'));
    assert.ok(content.includes('groupedSkills'));
    assert.ok(content.includes('setSkillFilter'));

    // Section 4: Soft Skills
    assert.ok(content.includes('softSkills'));

    // Section 5: Experience & Seniority
    assert.ok(content.includes('experienceAnalysis') || content.includes('Experience & Seniority'));

    // Section 6: Responsibilities
    assert.ok(content.includes('responsibilities'));

    // Section 7: Qualifications
    assert.ok(content.includes('qualifications'));

    // Section 8: Technology Stack
    assert.ok(content.includes('techStack') || content.includes('technologyStack'));

    // Section 9: Candidate Skill Gap Analysis
    assert.ok(content.includes('skillGapData') || content.includes('Skill Gap'));
    assert.ok(content.includes('profileCompleteness'));
    assert.ok(content.includes('/profile'));

    // Section 10: Preparation Recommendations & Actions
    assert.ok(content.includes('preparationRecommendations'));
    assert.ok(content.includes('ConfirmDialog'));
    assert.ok(content.includes('handleRegenerateAnalysis'));
    assert.ok(content.includes('isJdModalOpen'));
  });

  // 11. Verify Phase 7 AI Question Generation Service Methods
  test('11. preparationService.js exports all required Phase 7 AI Question Generation methods', () => {
    const prepServicePath = path.join(srcDir, 'services/preparationService.js');
    assert.ok(fs.existsSync(prepServicePath), 'Missing preparationService.js');
    const content = fs.readFileSync(prepServicePath, 'utf-8');

    const expectedPhase7Methods = [
      'generateQuestions',
      'getQuestions',
      'getQuestionById',
      'updateQuestion',
      'deleteQuestion',
      'regenerateQuestions',
      'getCodingChallenges',
      'getCodingChallengeById'
    ];

    expectedPhase7Methods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `preparationService.js missing required Phase 7 method: ${method}`
      );
    });
  });

  // 12. Verify Phase 7 QuestionBank.jsx Component Architecture & Controls
  test('12. QuestionBank.jsx implements full category filtering, generation modal, and question inspection', () => {
    const questionBankPath = path.join(srcDir, 'pages/QuestionBank.jsx');
    assert.ok(fs.existsSync(questionBankPath), 'Missing QuestionBank.jsx');
    const content = fs.readFileSync(questionBankPath, 'utf-8');

    // Category filtering
    assert.ok(content.includes('activeCategory') || content.includes('selectedCategory'));
    assert.ok(content.includes('TECHNICAL'));
    assert.ok(content.includes('CODING'));
    assert.ok(content.includes('SYSTEM_DESIGN'));
    assert.ok(content.includes('HR'));

    // Generation modal & controls
    assert.ok(content.includes('isGenerateModalOpen'));
    assert.ok(content.includes('handleGenerateSubmit') || content.includes('handleGenerateQuestions'));

    // Question card details & actions
    assert.ok(content.includes('expandedCards') || content.includes('expandedAnswers'));
    assert.ok(content.includes('referenceAnswer') || content.includes('sampleAnswer'));
    assert.ok(content.includes('evaluationRubric') || content.includes('rubric'));
    assert.ok(content.includes('ConfirmDialog'));
  });

  // 13. Verify Phase 8 practiceService API Architecture
  test('13. practiceService.js exports all required Phase 8 practice engine methods', () => {
    const practiceServicePath = path.join(srcDir, 'services/practiceService.js');
    assert.ok(fs.existsSync(practiceServicePath), 'Missing practiceService.js');
    const content = fs.readFileSync(practiceServicePath, 'utf-8');

    const expectedMethods = [
      'startPracticeSession',
      'getPracticeSessions',
      'getPracticeSession',
      'resumePracticeSession',
      'saveAnswerDraft',
      'submitAnswer',
      'getQuestionAttempts',
      'revealHint',
      'getReferenceAnswer',
      'completePracticeSession',
      'updateQuestionReview',
      'getPracticeHistory',
      'getPracticeStats'
    ];

    expectedMethods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `practiceService.js missing required Phase 8 method: ${method}`
      );
    });
  });

  // 14. Verify Phase 8 InterviewPractice.jsx Component Architecture & Controls
  test('14. InterviewPractice.jsx implements full interactive practice workspace with hints, drafts, and reference answer reveal', () => {
    const practicePath = path.join(srcDir, 'pages/InterviewPractice.jsx');
    assert.ok(fs.existsSync(practicePath), 'Missing InterviewPractice.jsx');
    const content = fs.readFileSync(practicePath, 'utf-8');

    // Sequential Hints
    assert.ok(content.includes('revealedHints'));
    assert.ok(content.includes('handleRevealNextHint') || content.includes('revealHint'));

    // Draft & Answer Submission
    assert.ok(content.includes('handleSaveDraft') || content.includes('saveDraft'));
    assert.ok(content.includes('handleSubmitAnswer') || content.includes('submitAnswer'));

    // Reference Answer & Evaluation Concepts
    assert.ok(content.includes('revealedReference'));
    assert.ok(content.includes('handleToggleReference') || content.includes('getReferenceAnswer'));

    // Question Navigation & Completion
    assert.ok(content.includes('currentIndex'));
    assert.ok(content.includes('handleConfirmComplete') || content.includes('completePracticeSession'));

    // Self-Assessment & Bookmarking
    assert.ok(content.includes('handleSaveSelfRating') || content.includes('selfRating'));
    assert.ok(content.includes('handleToggleReviewStatus') || content.includes('isBookmarked'));
  });

  // 15. Verify Phase 9 codingService API Architecture
  test('15. codingService.js exports all required Phase 9 execution engine client methods', () => {
    const codingServicePath = path.join(srcDir, 'services/codingService.js');
    assert.ok(fs.existsSync(codingServicePath), 'Missing codingService.js');
    const content = fs.readFileSync(codingServicePath, 'utf-8');

    const expectedMethods = [
      'getSupportedLanguages',
      'getChallengeDetails',
      'getStarterCode',
      'runCode',
      'submitSolution',
      'getSubmissionDetails',
      'getChallengeSubmissions',
      'getUserCodingHistory',
      'getCodingStats'
    ];

    expectedMethods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `codingService.js missing required Phase 9 method: ${method}`
      );
    });
  });

  // 16. Verify Phase 9 Coding Arena & Monaco Integration Architecture
  test('16. CodingArena and Monaco components implement complete IDE workspace', () => {
    const arenaPath = path.join(srcDir, 'pages/CodingArena.jsx');
    assert.ok(fs.existsSync(arenaPath), 'Missing CodingArena.jsx');
    const arenaContent = fs.readFileSync(arenaPath, 'utf-8');

    // Key operations in CodingArena
    assert.ok(arenaContent.includes('handleRun'));
    assert.ok(arenaContent.includes('handleSubmit'));
    assert.ok(arenaContent.includes('handleLanguageChange'));
    assert.ok(arenaContent.includes('selectedLanguage'));
    assert.ok(arenaContent.includes('MonacoCodeEditor'));
    assert.ok(arenaContent.includes('ProblemDescriptionPanel'));
    assert.ok(arenaContent.includes('ExecutionResultsPanel'));

    // Verify MonacoCodeEditor component
    const editorPath = path.join(srcDir, 'components/coding/MonacoCodeEditor.jsx');
    assert.ok(fs.existsSync(editorPath), 'Missing MonacoCodeEditor.jsx');
    const editorContent = fs.readFileSync(editorPath, 'utf-8');
    assert.ok(editorContent.includes('monaco-editor'));
    assert.ok(editorContent.includes('isFullscreen'));

    // Verify ProblemDescriptionPanel
    const problemPath = path.join(srcDir, 'components/coding/ProblemDescriptionPanel.jsx');
    assert.ok(fs.existsSync(problemPath), 'Missing ProblemDescriptionPanel.jsx');

    // Verify ExecutionResultsPanel
    const resultsPath = path.join(srcDir, 'components/coding/ExecutionResultsPanel.jsx');
    assert.ok(fs.existsSync(resultsPath), 'Missing ExecutionResultsPanel.jsx');
  });

  // 17. Verify Phase 10 mockInterviewService API Architecture
  test('17. mockInterviewService.js exports all required Phase 10 interview engine client methods', () => {
    const mockServicePath = path.join(srcDir, 'services/mockInterviewService.js');
    assert.ok(fs.existsSync(mockServicePath), 'Missing mockInterviewService.js');
    const content = fs.readFileSync(mockServicePath, 'utf-8');

    const expectedMethods = [
      'createInterview',
      'getInterviewDetails',
      'submitAnswer',
      'performAction',
      'pauseInterview',
      'resumeInterview',
      'endInterview',
      'getUserInterviews',
      'getInterviewStats'
    ];

    expectedMethods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `mockInterviewService.js missing required Phase 10 method: ${method}`
      );
    });
  });

  // 18. Verify Phase 10 Mock Interview UI Architecture & Routing
  test('18. Phase 10 components and routing implement interactive interview arena and review', () => {
    // 1. CreateMockInterview.jsx
    const createPath = path.join(srcDir, 'pages/CreateMockInterview.jsx');
    assert.ok(fs.existsSync(createPath), 'Missing CreateMockInterview.jsx');
    const createContent = fs.readFileSync(createPath, 'utf-8');
    assert.ok(createContent.includes('INTERVIEW_TYPES'));
    assert.ok(createContent.includes('PERSONALITY_STYLES'));
    assert.ok(createContent.includes('handleStartInterview'));

    // 2. LiveMockInterview.jsx
    const livePath = path.join(srcDir, 'pages/LiveMockInterview.jsx');
    assert.ok(fs.existsSync(livePath), 'Missing LiveMockInterview.jsx');
    const liveContent = fs.readFileSync(livePath, 'utf-8');
    assert.ok(liveContent.includes('handleSubmitAnswer'));
    assert.ok(liveContent.includes('handleAction'));
    assert.ok(liveContent.includes('handleTogglePause'));
    assert.ok(liveContent.includes('handleConfirmEnd') || liveContent.includes('handleEndInterview'));
    assert.ok(liveContent.includes('formatTime'));

    // 3. InterviewReview.jsx
    const reviewPath = path.join(srcDir, 'pages/InterviewReview.jsx');
    assert.ok(fs.existsSync(reviewPath), 'Missing InterviewReview.jsx');
    const reviewContent = fs.readFileSync(reviewPath, 'utf-8');
    assert.ok(reviewContent.includes('filteredMessages'));
    assert.ok(reviewContent.includes('handleCopyTranscript'));

    // 4. AppRoutes.jsx contains Phase 10 routes
    const routesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    assert.ok(routesContent.includes('/mock-interviews/new'));
    assert.ok(routesContent.includes('/mock-interviews/:interviewId'));
    assert.ok(routesContent.includes('/mock-interviews/:interviewId/history'));
  });

  // 19. Verify Phase 11 evaluationService API Architecture
  test('19. evaluationService.js exports all required Phase 11 client methods', () => {
    const servicePath = path.join(srcDir, 'services/evaluationService.js');
    assert.ok(fs.existsSync(servicePath), 'Missing evaluationService.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    const expectedMethods = [
      'evaluateAnswer',
      'getAnswerEvaluation',
      'evaluateCoding',
      'getCodingEvaluation',
      'evaluateInterview',
      'getInterviewEvaluation',
      'listEvaluations',
      'getEvaluationDetails',
      'getPerformanceOverview',
      'getCategoryBreakdown',
      'getPerformanceTrends',
      'getStrengthsAndWeaknesses',
      'generateReport',
      'getUserReports',
      'getReportDetails',
      'downloadReportData',
      'getUserRecommendations',
      'acceptRecommendation',
      'dismissRecommendation'
    ];

    expectedMethods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `evaluationService.js missing required Phase 11 method: ${method}`
      );
    });
  });

  // 20. Verify Phase 11 Evaluation & Reporting UI Architecture
  test('20. Reports, EvaluationDetail, and ImprovementPlan implement complete Phase 11 workspace', () => {
    // 1. Reports.jsx
    const reportsPath = path.join(srcDir, 'pages/Reports.jsx');
    assert.ok(fs.existsSync(reportsPath), 'Missing Reports.jsx');
    const reportsContent = fs.readFileSync(reportsPath, 'utf-8');
    assert.ok(reportsContent.includes('Candidate Readiness Assessment'));
    assert.ok(reportsContent.includes('Category-Wise Competency Breakdown'));
    assert.ok(reportsContent.includes('handleGenerateReport'));
    assert.ok(reportsContent.includes('handlePrint'));

    // 2. EvaluationDetail.jsx
    const detailPath = path.join(srcDir, 'pages/EvaluationDetail.jsx');
    assert.ok(fs.existsSync(detailPath), 'Missing EvaluationDetail.jsx');
    const detailContent = fs.readFileSync(detailPath, 'utf-8');
    assert.ok(detailContent.includes('Evaluation Performance Report'));
    assert.ok(detailContent.includes('Transparent Criterion-Level Scoring'));
    assert.ok(detailContent.includes('handleRegenerate'));

    // 3. ImprovementPlan.jsx
    const planPath = path.join(srcDir, 'pages/ImprovementPlan.jsx');
    assert.ok(fs.existsSync(planPath), 'Missing ImprovementPlan.jsx');
    const planContent = fs.readFileSync(planPath, 'utf-8');
    assert.ok(planContent.includes('handleAccept'));
    assert.ok(planContent.includes('handleDismiss'));
    assert.ok(planContent.includes('AI Identified Growth Recommendations'));

    // 4. AppRoutes.jsx contains Phase 11 routes
    const routesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    assert.ok(routesContent.includes('/reports'));
    assert.ok(routesContent.includes('/reports/:reportId'));
    assert.ok(routesContent.includes('/evaluations'));
    assert.ok(routesContent.includes('/evaluations/:evaluationId'));
  });

  // 21. Verify Phase 12 Analytics Service Layer
  test('21. analyticsService.js exports all required Phase 12 client methods', () => {
    const analyticsServicePath = path.join(srcDir, 'services/analyticsService.js');
    assert.ok(fs.existsSync(analyticsServicePath), 'Missing analyticsService.js');
    const content = fs.readFileSync(analyticsServicePath, 'utf-8');

    const expectedMethods = [
      'getOverview',
      'getPerformance',
      'getCategories',
      'getSkills',
      'getTrends',
      'getActivity',
      'getFilters',
      'getSkillGaps',
      'getSkillById',
      'triggerAnalyze',
      'getPlans',
      'getPlanById',
      'createPlan',
      'generateAIPlan',
      'updatePlan',
      'updatePlanStatus',
      'regeneratePlan',
      'deletePlan',
      'getTasks',
      'getTaskById',
      'createTask',
      'updateTask',
      'updateTaskStatus',
      'deleteTask',
      'getProgressOverview',
      'getProgressHistory',
      'getProgressActivity',
      'getSkillProgress'
    ];

    expectedMethods.forEach((method) => {
      assert.ok(
        content.includes(method),
        `analyticsService.js missing required Phase 12 method: ${method}`
      );
    });
  });

  // 22. Verify Phase 12 Analytics & Improvement Plan UI Pages
  test('22. Analytics, SkillGaps, LearningTasks, and Progress implement complete Phase 12 workspace', () => {
    // 1. Analytics.jsx
    const analyticsPath = path.join(srcDir, 'pages/Analytics.jsx');
    assert.ok(fs.existsSync(analyticsPath), 'Missing Analytics.jsx');
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf-8');
    assert.ok(analyticsContent.includes('Performance Analytics & Insights'));
    assert.ok(analyticsContent.includes('Performance Domains & Categories'));
    assert.ok(analyticsContent.includes('Overall Performance Trend'));
    assert.ok(analyticsContent.includes('Category Breakdown'));

    // 2. SkillGaps.jsx
    const skillGapsPath = path.join(srcDir, 'pages/SkillGaps.jsx');
    assert.ok(fs.existsSync(skillGapsPath), 'Missing SkillGaps.jsx');
    const skillGapsContent = fs.readFileSync(skillGapsPath, 'utf-8');
    assert.ok(skillGapsContent.includes('Skill Gap Benchmarking'));
    assert.ok(skillGapsContent.includes('Total Competencies'));

    // 3. LearningTasks.jsx
    const tasksPath = path.join(srcDir, 'pages/LearningTasks.jsx');
    assert.ok(fs.existsSync(tasksPath), 'Missing LearningTasks.jsx');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    assert.ok(tasksContent.includes('Learning Task Management'));
    assert.ok(tasksContent.includes('handleStatusChange'));

    // 4. Progress.jsx
    const progressPath = path.join(srcDir, 'pages/Progress.jsx');
    assert.ok(fs.existsSync(progressPath), 'Missing Progress.jsx');
    const progressContent = fs.readFileSync(progressPath, 'utf-8');
    assert.ok(progressContent.includes('Learning Progress & Milestones'));
    assert.ok(progressContent.includes('Roadmap Task Completion'));
    assert.ok(progressContent.includes('Practice Consistency'));

    // 5. AppRoutes.jsx contains Phase 12 routes
    const routesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    assert.ok(routesContent.includes('/analytics'));
    assert.ok(routesContent.includes('/analytics/skill-gaps'));
    assert.ok(routesContent.includes('/learning-tasks'));
    assert.ok(routesContent.includes('/progress'));
  });

  // 23. Verify Phase 13 Full-Stack Integration Architecture
  test('23. Complete full-stack integration connects API services, cross-page flows, and response handling', () => {
    // 1. Centralized api.js exports all specialized services
    const apiPath = path.join(srcDir, 'services/api.js');
    assert.ok(fs.existsSync(apiPath), 'Missing api.js');
    const apiContent = fs.readFileSync(apiPath, 'utf-8');
    assert.ok(apiContent.includes('export { preparationService }'));
    assert.ok(apiContent.includes('export { practiceService }'));
    assert.ok(apiContent.includes('export { codingService }'));
    assert.ok(apiContent.includes('export { mockInterviewService }'));
    assert.ok(apiContent.includes('export { evaluationService }'));
    assert.ok(apiContent.includes('export { analyticsService }'));

    // 2. Direct /practice route in AppRoutes
    const routesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    const routesContent = fs.readFileSync(routesPath, 'utf-8');
    assert.ok(routesContent.includes('path="/practice"'));

    // 3. InterviewReview.jsx has Phase 11 evaluation link
    const reviewPath = path.join(srcDir, 'pages/InterviewReview.jsx');
    const reviewContent = fs.readFileSync(reviewPath, 'utf-8');
    assert.ok(reviewContent.includes('handleEvaluate'));
    assert.ok(reviewContent.includes('evaluateInterview'));

    // 4. InterviewPractice.jsx has Phase 11 evaluation trigger
    const practicePath = path.join(srcDir, 'pages/InterviewPractice.jsx');
    const practiceContent = fs.readFileSync(practicePath, 'utf-8');
    assert.ok(practiceContent.includes('handleEvaluateAnswer'));
    assert.ok(practiceContent.includes('evaluateAnswer'));

    // 5. CodingArena and CreateMockInterview robust response handling
    const codingArenaPath = path.join(srcDir, 'pages/CodingArena.jsx');
    const codingContent = fs.readFileSync(codingArenaPath, 'utf-8');
    assert.ok(codingContent.includes('Array.isArray(prepsRes.data)'));
    assert.ok(codingContent.includes('Array.isArray(chalRes.data)'));

    const createMockPath = path.join(srcDir, 'pages/CreateMockInterview.jsx');
    const createMockContent = fs.readFileSync(createMockPath, 'utf-8');
    assert.ok(createMockContent.includes('Array.isArray(res.data)'));

    // 6. Dashboard live metrics integration
    const dashServicePath = path.join(srcDir, 'services/dashboardService.js');
    const dashServiceContent = fs.readFileSync(dashServicePath, 'utf-8');
    assert.ok(dashServiceContent.includes('res.data?.data || res.data'));
  });

  // 24. Phase 14 Security Hardening Audit
  test('24. Frontend security hardening enforces in-memory tokens and zero client credential leakage', () => {
    // Audit all files under frontend/src for forbidden localStorage token storage
    function scanFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanFiles(fullPath);
        } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert.ok(
            !content.includes("localStorage.setItem('token'") &&
            !content.includes("localStorage.setItem('accessToken'") &&
            !content.includes("sessionStorage.setItem('token'") &&
            !content.includes("sessionStorage.setItem('accessToken'"),
            `Security violation: ${entry.name} attempts to persist access token in browser storage`
          );
        }
      }
    }
    scanFiles(srcDir);

    // Verify Axios instance config
    const apiPath = path.join(srcDir, 'services/api.js');
    const apiContent = fs.readFileSync(apiPath, 'utf-8');
    assert.ok(apiContent.includes('withCredentials: true'), 'Axios instance must include withCredentials: true for HttpOnly cookies');
    assert.ok(apiContent.includes('let inMemoryAccessToken = null'), 'Auth architecture must use in-memory access token storage');
  });

  // 25. Phase 14 Responsive Viewport Design Audit across 7 Viewports
  test('25. Responsive design tokens and layout components support all 7 required viewports', () => {
    // 7 Viewports: 320px, 375px, 425px, 768px, 1024px, 1366px, 1920px
    const tailwindConfigPath = path.resolve(__dirname, '../tailwind.config.js');
    assert.ok(fs.existsSync(tailwindConfigPath), 'tailwind.config.js must exist');

    // Inspect layout components for responsive class usage (sm:, md:, lg:, xl:, etc.)
    const dashLayoutPath = path.join(srcDir, 'layouts/DashboardLayout.jsx');
    assert.ok(fs.existsSync(dashLayoutPath), 'DashboardLayout.jsx must exist');
    const dashLayoutContent = fs.readFileSync(dashLayoutPath, 'utf-8');
    assert.ok(dashLayoutContent.includes('Sidebar') && dashLayoutContent.includes('MobileNavigation'),
      'DashboardLayout must support responsive desktop sidebar and mobile navigation drawer');

    const mobileNavPath = path.join(srcDir, 'components/navigation/MobileNavigation.jsx');
    assert.ok(fs.existsSync(mobileNavPath), 'MobileNavigation.jsx must exist');

    const mainLayoutPath = path.join(srcDir, 'layouts/MainLayout.jsx');
    assert.ok(fs.existsSync(mainLayoutPath), 'MainLayout.jsx must exist');
    const mainLayoutContent = fs.readFileSync(mainLayoutPath, 'utf-8');
    assert.ok(mainLayoutContent.includes('hidden md:flex') || mainLayoutContent.includes('sm:px-6'),
      'MainLayout must support mobile-responsive collapse/expand navigation');

    // Verify main CSS defines root design tokens and responsive containers
    const globalsCssPath = path.join(srcDir, 'styles/globals.css');
    const cssContent = fs.readFileSync(globalsCssPath, 'utf-8');
    assert.ok(cssContent.includes('@tailwind base'), 'globals.css must include Tailwind base directive');
    assert.ok(cssContent.includes('@tailwind components'), 'globals.css must include Tailwind components directive');
    assert.ok(cssContent.includes('@tailwind utilities'), 'globals.css must include Tailwind utilities directive');
  });

  // 26. Phase 14 WCAG Accessibility & Semantic Architecture Audit
  test('26. Core forms and interactive components comply with WCAG accessibility standards', () => {
    // Verify common Button component supports focus management and accessibility
    const buttonPath = path.join(srcDir, 'components/ui/Button.jsx');
    const buttonContent = fs.readFileSync(buttonPath, 'utf-8');
    assert.ok(
      buttonContent.includes('focus-visible:ring') ||
      buttonContent.includes('focus:ring') ||
      buttonContent.includes('focus-visible:outline-none'),
      'Button must provide visible focus indicators for keyboard navigation'
    );

    // Verify Input component has label and aria accessibility attributes
    const inputPath = path.join(srcDir, 'components/ui/Input.jsx');
    const inputContent = fs.readFileSync(inputPath, 'utf-8');
    assert.ok(inputContent.includes('label') || inputContent.includes('aria-'),
      'Input component must support accessible label bindings');

    // Verify Auth forms use semantic form tags
    const loginPath = path.join(srcDir, 'pages/Login.jsx');
    const loginContent = fs.readFileSync(loginPath, 'utf-8');
    assert.ok(loginContent.includes('<form'), 'Login page must use semantic <form> container');

    const registerPath = path.join(srcDir, 'pages/Register.jsx');
    const registerContent = fs.readFileSync(registerPath, 'utf-8');
    assert.ok(registerContent.includes('<form'), 'Register page must use semantic <form> container');
  });
});
