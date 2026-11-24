import React, { Suspense, lazy } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.jsx';
import { PublicRoute } from '../components/auth/PublicRoute.jsx';
import { LoadingState } from '../components/common/LoadingState.jsx';

// Lazy-loaded public & landing pages
const Landing = lazy(() => import('../pages/Landing.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

// Lazy-loaded authentication pages (Phase 3)
const Login = lazy(() => import('../pages/Login.jsx'));
const Register = lazy(() => import('../pages/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/VerifyEmail.jsx'));

// Lazy-loaded dashboard workspace pages (Phase 2)
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));
const Preparations = lazy(() => import('../pages/Preparations.jsx'));
const CreatePreparation = lazy(() => import('../pages/CreatePreparation.jsx'));
const JobAnalysis = lazy(() => import('../pages/JobAnalysis.jsx'));
const PreparationWorkspace = lazy(() => import('../pages/PreparationWorkspace.jsx'));
const QuestionBank = lazy(() => import('../pages/QuestionBank.jsx'));
const InterviewPractice = lazy(() => import('../pages/InterviewPractice.jsx'));
const TechnicalPractice = lazy(() => import('../pages/TechnicalPractice.jsx'));
const HRPractice = lazy(() => import('../pages/HRPractice.jsx'));
const CodingArena = lazy(() => import('../pages/CodingArena.jsx'));
const SystemDesign = lazy(() => import('../pages/SystemDesign.jsx'));
const SystemDesignWhiteboard = lazy(() => import('../pages/SystemDesignWhiteboard.jsx'));
const MockInterviews = lazy(() => import('../pages/MockInterviews.jsx'));
const CreateMockInterview = lazy(() => import('../pages/CreateMockInterview.jsx'));
const LiveMockInterview = lazy(() => import('../pages/LiveMockInterview.jsx'));
const InterviewReview = lazy(() => import('../pages/InterviewReview.jsx'));
const Reports = lazy(() => import('../pages/Reports.jsx'));
const EvaluationDetail = lazy(() => import('../pages/EvaluationDetail.jsx'));
const ImprovementPlan = lazy(() => import('../pages/ImprovementPlan.jsx'));
const Analytics = lazy(() => import('../pages/Analytics.jsx'));
const SkillGaps = lazy(() => import('../pages/SkillGaps.jsx'));
const LearningTasks = lazy(() => import('../pages/LearningTasks.jsx'));
const Progress = lazy(() => import('../pages/Progress.jsx'));
const History = lazy(() => import('../pages/History.jsx'));
const Profile = lazy(() => import('../pages/Profile.jsx'));
const Settings = lazy(() => import('../pages/Settings.jsx'));

function SuspenseFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingState message="Loading page interface..." />
    </div>
  );
}

function DashboardOutlet() {
  return (
    <DashboardLayout>
      <Suspense fallback={<SuspenseFallback />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
}

function MainOutlet() {
  return (
    <MainLayout>
      <Suspense fallback={<SuspenseFallback />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Route */}
      <Route element={<MainOutlet />}>
        <Route path="/" element={<Landing />} />
      </Route>

      {/* Public Auth Routes - Redirect to dashboard if already authenticated */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Suspense fallback={<SuspenseFallback />}>
              <Login />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Suspense fallback={<SuspenseFallback />}>
              <Register />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <Suspense fallback={<SuspenseFallback />}>
              <ForgotPassword />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <PublicRoute>
            <Suspense fallback={<SuspenseFallback />}>
              <ResetPassword />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <Suspense fallback={<SuspenseFallback />}>
              <ResetPassword />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <Suspense fallback={<SuspenseFallback />}>
            <VerifyEmail />
          </Suspense>
        }
      />

      {/* Protected Dashboard Workspace Routes - Require Verified Authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardOutlet />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/preparations" element={<Preparations />} />
          <Route path="/preparations/new" element={<CreatePreparation />} />
          <Route path="/preparations/:id" element={<PreparationWorkspace />} />
          <Route path="/preparations/:id/analysis" element={<JobAnalysis />} />
          <Route path="/preparations/:id/questions" element={<QuestionBank />} />
          <Route path="/preparations/:id/practice" element={<InterviewPractice />} />
          <Route path="/practice" element={<TechnicalPractice />} />
          <Route path="/practice/history" element={<History />} />
          <Route path="/practice/technical" element={<TechnicalPractice />} />
          <Route path="/practice/hr" element={<HRPractice />} />
          <Route path="/coding" element={<CodingArena />} />
          <Route path="/coding/:challengeId" element={<CodingArena />} />
          <Route path="/system-design" element={<SystemDesign />} />
          <Route path="/system-design/whiteboard" element={<SystemDesignWhiteboard />} />
          <Route path="/mock-interviews" element={<MockInterviews />} />
          <Route path="/mock-interviews/new" element={<CreateMockInterview />} />
          <Route path="/mock-interviews/:interviewId" element={<LiveMockInterview />} />
          <Route path="/mock-interviews/:interviewId/history" element={<InterviewReview />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportId" element={<Reports />} />
          <Route path="/evaluations" element={<EvaluationDetail />} />
          <Route path="/evaluations/:evaluationId" element={<EvaluationDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/skill-gaps" element={<SkillGaps />} />
          <Route path="/improvement-plan" element={<ImprovementPlan />} />
          <Route path="/learning-tasks" element={<LearningTasks />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route element={<MainOutlet />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
