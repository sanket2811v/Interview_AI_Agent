# InterviewAI – AI-Powered Interview Preparation Platform

A production-grade, full-stack platform designed to simulate intelligent mock interviews, analyze candidate responses, and provide actionable real-time feedback.

---

## 1. Technology Stack

- **Frontend**:
  - React 18+ (JavaScript ES Modules)
  - Vite 6+
  - Tailwind CSS & PostCSS
  - React Router DOM v7
  - Lucide React Icons
  - Recharts Data Visualization
  - Axios (withCredentials: true)
  - React Context API (`AuthContext`, `ThemeContext`, `SidebarContext`, `ToastContext`)
- **Backend**:
  - Node.js (v20+ / v24+ ESM)
  - Express.js 5
  - RESTful API Architecture
  - Zod Schema Validation
  - Helmet & CORS Security
  - Morgan Structured Request Logging
  - In-Memory Rate Limiting
- **Database & ORM**:
  - PostgreSQL 16+ / 18+
  - Prisma ORM 6.19.3
- **Security & Cryptography**:
  - Memory-hard scrypt password hashing with cryptographically random salts
  - RFC 7519 JWT Access Tokens (HS256) stored in-memory (never in localStorage/sessionStorage)
  - Cryptographically random 64-char refresh tokens rotated on every renewal
  - SHA-256 hashed refresh tokens and verification tokens stored in database
  - Secure HttpOnly, Lax/Strict, SameSite cookies
  - Automated token reuse detection that invalidates compromised user sessions
- **Email Service**:
  - SMTP-based email service with Nodemailer architecture
  - Responsive HTML templates for Email Verification and Password Recovery
  - Development mode safe email logging simulator

---

## 2. Project Architecture

```
InterviewAI/
  ├── frontend/
  │   ├── src/
  │   │   ├── components/
  │   │   │   ├── auth/
  │   │   │   │   ├── ProtectedRoute.jsx
  │   │   │   │   └── PublicRoute.jsx
  │   │   │   ├── common/
  │   │   │   ├── navigation/
  │   │   │   │   ├── Header.jsx
  │   │   │   │   └── Sidebar.jsx
  │   │   │   └── ui/
  │   │   ├── context/
  │   │   │   ├── AuthContext.jsx
  │   │   │   ├── ThemeContext.jsx
  │   │   │   └── SidebarContext.jsx
  │   │   ├── pages/
  │   │   │   ├── Login.jsx
  │   │   │   ├── Register.jsx
  │   │   │   ├── ForgotPassword.jsx
  │   │   │   ├── ResetPassword.jsx
  │   │   │   ├── VerifyEmail.jsx
  │   │   │   ├── Dashboard.jsx
  │   │   │   ├── Profile.jsx
  │   │   │   ├── Settings.jsx
  │   │   │   └── ...
  │   │   ├── routes/
  │   │   │   └── AppRoutes.jsx
  │   │   ├── services/
  │   │   │   └── api.js
  │   │   └── App.jsx
  │   └── package.json
  │
  ├── backend/
  │   ├── prisma/
  │   │   ├── schema.prisma
  │   │   └── migrations/
  │   │       └── 20261102_init_auth/
  │   │           └── migration.sql
  │   ├── src/
  │   │   ├── config/
  │   │   │   ├── env.js
  │   │   │   └── prisma.js
  │   │   ├── controllers/
  │   │   │   ├── auth.controller.js
  │   │   │   ├── health.controller.js
  │   │   │   └── user.controller.js
  │   │   ├── middleware/
  │   │   │   ├── auth.middleware.js
  │   │   │   ├── error.middleware.js
  │   │   │   ├── notFound.middleware.js
  │   │   │   ├── rateLimiter.middleware.js
  │   │   │   └── requestLogger.middleware.js
  │   │   ├── routes/
  │   │   │   ├── auth.routes.js
  │   │   │   ├── health.routes.js
  │   │   │   ├── user.routes.js
  │   │   │   └── index.js
  │   │   ├── services/
  │   │   │   └── email.service.js
  │   │   ├── utils/
  │   │   │   ├── cookies.js
  │   │   │   ├── jwt.js
  │   │   │   ├── password.js
  │   │   │   └── tokens.js
  │   │   ├── validators/
  │   │   │   └── auth.validator.js
  │   │   ├── app.js
  │   │   └── server.js
  │   └── tests/
  │       ├── api.test.js
  │       └── auth.test.js
  │
  ├── .env.example
  ├── package.json
  └── README.md
```

---

## 3. Database Schema & Architecture (Prisma 6.19.3)

InterviewAI features a normalized, production-grade PostgreSQL architecture across 7 core modules, comprising **20 models** and **15 domain enums**. Comprehensive documentation is available in [DATABASE.md](file:///c:/Users/Dell/InterviewAI/docs/DATABASE.md).

### Modules Overview:
- **Module A (User & Auth)**: `User`, `UserProfile`, `Session`, `EmailVerificationToken`, `PasswordResetToken`
- **Module B (Job Preparation)**: `PreparationSession`, `JobDescription`, `JobAnalysis`
- **Module C (Interview Questions)**: `InterviewQuestion`, `QuestionAttempt`
- **Module D (Coding Arena)**: `CodingChallenge`, `CodingTestCase`, `CodingSubmission`
- **Module E (Mock Interview & Evaluation)**: `MockInterview`, `InterviewMessage`, `InterviewEvaluation`
- **Module F (Learning & Progress)**: `ImprovementPlan`, `LearningTask`, `UserProgress`, `ImprovementRecommendation`
- **Module G (Performance & AI Telemetry)**: `PerformanceReport`, `AIUsageLog`

### Migrations & Database Utilities:
- **Additive SQL Migration**: `backend/prisma/migrations/20261102_phase4_complete_database/migration.sql`
- **Idempotent Seed Data**: `backend/prisma/seed.js`
- **Database Service Layer**: `backend/src/services/db.service.js` (ownership verification, pagination, transaction handling, dashboard analytics)
- **Runtime Validation**: `backend/src/validators/database.validator.js` (Zod schemas for preparation, attempts, submissions, and telemetry)

### Database Commands:
```powershell
# Validate Prisma schema
npm run prisma:validate

# Generate Prisma Client
npm run prisma:generate

# Execute idempotent database seed
npm run db:seed
```

---

## 4. Authentication Architecture & Security

### Token Lifecycle & Dual-Token Strategy
1. **Access Token (JWT)**:
   - Valid for **15 minutes**.
   - Kept **strictly in-memory** (in `api.js` and `AuthContext`). Never exposed to `localStorage` or `sessionStorage` to mitigate XSS vulnerabilities.
   - Sent via the `Authorization: Bearer <token>` header.
2. **Refresh Token**:
   - Cryptographically random 64-character token valid for **7 days**.
   - Stored in an **HttpOnly, Secure, SameSite=Lax** cookie at path `/api/auth`.
   - Stored in PostgreSQL strictly as a SHA-256 hash.
   - **Rotated on every `/api/auth/refresh` call**: A new refresh token is issued and the old one invalidated.
   - **Token Reuse Detection**: If a revoked refresh token is presented, the server alerts and immediately revokes all active sessions for that user.
3. **Automatic Client Refresh Interceptor**:
   - When any API call receives a 401 response, an Axios interceptor holds outgoing requests in a queue and issues a single `/api/auth/refresh` call.
   - Upon success, all pending requests are replayed with the new access token.
   - Upon refresh failure, the user is cleanly redirected to `/login`.

---

## 5. API Endpoints

### Authentication (`/api/auth/*`)
| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register user, create profile, dispatch verification email | 10 / 15m |
| `POST` | `/api/auth/login` | Authenticate credentials, set HttpOnly refresh cookie, issue access JWT | 10 / 15m |
| `POST` | `/api/auth/refresh` | Verify refresh cookie, rotate token, issue new access JWT | - |
| `POST` | `/api/auth/logout` | Revoke session and clear refresh cookie | - |
| `GET` | `/api/auth/me` | Fetch authenticated user and profile (`requireAuth`) | - |
| `POST` | `/api/auth/verify-email` | Validate verification token and mark account verified | 10 / 15m |
| `POST` | `/api/auth/resend-verification` | Resend verification link | 10 / 15m |
| `POST` | `/api/auth/forgot-password` | Send password reset email (generic response for security) | 5 / 15m |
| `POST` | `/api/auth/reset-password` | Set new password, revoke all active sessions | 5 / 15m |
| `PATCH` | `/api/auth/change-password` | Change password for authenticated user (`requireAuth`) | - |
| `GET` | `/api/auth/sessions` | List active device sessions (`requireAuth`) | - |
| `DELETE` | `/api/auth/sessions/:id` | Revoke a specific active session (`requireAuth`) | - |
| `DELETE` | `/api/auth/sessions` | Terminate all other sessions (`requireAuth`) | - |

### User Profile (`/api/users/*`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | View authenticated candidate profile | `Bearer JWT` |
| `PATCH` | `/api/users/profile` | Update candidate profile & competencies | `Bearer JWT` |

### Job Preparation & Workspace (`/api/preparations/*`)
Comprehensive documentation is available in [JOB_PREPARATION_MODULE.md](file:///c:/Users/Dell/InterviewAI/docs/JOB_PREPARATION_MODULE.md).

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/preparations` | Create new preparation session and job description | `Bearer JWT` |
| `POST` | `/api/preparations/upload-doc` | Upload document (PDF / DOCX / TXT) & extract text | `Bearer JWT` |
| `GET` | `/api/preparations` | List candidate preparations (search, filters, pagination) | `Bearer JWT` |
| `GET` | `/api/preparations/stats` | Aggregate candidate statistics for dashboard | `Bearer JWT` |
| `GET` | `/api/preparations/:id` | View preparation workspace details | `Bearer JWT` |
| `PATCH` | `/api/preparations/:id` | Update preparation metadata & focus preferences | `Bearer JWT` |
| `DELETE` | `/api/preparations/:id` | Soft delete / archive preparation session | `Bearer JWT` |
| `PATCH` | `/api/preparations/:id/restore` | Restore archived preparation session | `Bearer JWT` |
| `DELETE` | `/api/preparations/:id/permanent` | Permanently delete preparation session | `Bearer JWT` |
| `GET` | `/api/preparations/:id/description` | View full job description text | `Bearer JWT` |
| `PATCH` | `/api/preparations/:id/description` | Update job description text | `Bearer JWT` |

### Health Probes (`/api/health/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/health/database` | PostgreSQL connection health probe |

---

## 6. Frontend Routes

### Public & Authentication Routes:
- `/` - Product Landing Page
- `/login` - Candidate Sign In (with password visibility toggle and redirect persistence)
- `/register` - Account Registration (with real-time password strength meter)
- `/forgot-password` - Password Recovery Request
- `/reset-password/:token` - Set New Password
- `/verify-email` - Email Verification Status & Resend Link

### Protected Candidate Workspace Routes:
- `/dashboard` - Overview & analytics
- `/preparations` - Job description dossiers & sessions
- `/preparations/new` - Create preparation session
- `/preparations/:id` - Preparation workspace
- `/preparations/:id/analysis` - AI-Powered Job Description Analysis Dashboard (Phase 6)
- `/practice/technical` - Technical interview practice
- `/practice/hr` - HR & behavioral practice (STAR framework)
- `/coding` - Coding arena
- `/system-design` - System design studio
- `/mock-interviews` - Live AI mock interviews
- `/reports` - AI performance evaluation reports
- `/improvement-plan` - Personalized learning roadmap
- `/history` - Previous interview archive
- `/profile` - Candidate dossier & competency management
- `/settings` - Security, password update, active sessions, and theme preferences

---

## 7. AI-Powered Job Description Analysis (Phase 6)

Phase 6 incorporates a structured OpenAI integration engine (`backend/src/services/openai.service.js`) deconstructing job descriptions:

1. **Job Overview & Role Breakdown**: Title, company, seniority, work arrangement (Onsite/Remote/Hybrid), and recruiter executive summary.
2. **Interview Difficulty Score**: Dynamic 1–100 difficulty rating with technical and experience complexity rationales.
3. **Technical Competencies Matrix**: Categorized across Programming Languages, Frontend, Backend, Databases, Cloud & DevOps, and Tools with required vs. preferred classification and context quotes.
4. **Behavioral Competencies**: Soft skills prioritized by hiring criticality.
5. **Experience Expectations**: Minimum/maximum years, fresh graduate eligibility, and explicit requirements.
6. **Key Responsibilities**: Prioritized responsibilities with category tags.
7. **Qualifications Breakdown**: Mandatory credentials vs. preferred qualifications.
8. **Technology Stack**: Grouped technology badges.
9. **Skill Gap Benchmarking**: Direct alignment with the candidate's profile credentials, match status badges (`MATCHED`, `PARTIAL_MATCH`, `GAP`, `UNKNOWN`), and targeted improvement actions.
10. **Actionable Recommendations**: Strategic prep focus items and JD view modals.

---

## 8. Testing Commands

Execute automated tests from the repository root:

```powershell
# Run backend API and authentication test suite
npm run test:backend

# Run frontend architecture and security audit test suite
npm run test:frontend

# Build optimized production bundle
npm run build
```

---

## 8. Running the Application

### Development Mode:
```powershell
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### Production Mode (Single-Port):
```powershell
npm run build
npm run start
```
The Express server serves the compiled frontend and API on a single port at `http://localhost:5000`.

---

## 9. Phase 9: Online Coding Practice & Execution Engine

InterviewAI includes an isolated algorithmic coding practice arena featuring:
- **Monaco Code Editor**: Professional syntax highlighting, indentation, auto-bracket completion, line numbers, shortcuts (`Ctrl+Enter` to Run, `Ctrl+Shift+Enter` to Submit), and light/dark theme toggles.
- **Multi-Language Support**: JavaScript (Node.js), Python 3, Java (OpenJDK), C++, C, and TypeScript.
- **Isolated Provider Architecture**: Integrates Piston and Judge0 CE execution APIs. Code is never executed on the application host.
- **Sample vs Hidden Test Evaluation**: Run executes public/sample cases; Submit evaluates all cases, securely shielding hidden inputs and expected outputs.
- **Multi-Tenant Ownership & Rate Limiting**: All submissions and challenges enforce preparation ownership and rate limits (12 req / 60s).

---

## 10. Phase 10: AI Mock Interview Engine

InterviewAI features a realistic, interviewer-led AI Mock Interview experience:
- **6 Configurable Interview Modes**: `TECHNICAL`, `HR`, `CODING`, `SYSTEM_DESIGN`, `SCENARIO`, and `MIXED`.
- **Customizable Interviewer Personas**: 5 distinct personality modifiers (`Professional`, `Friendly`, `Strict`, `Supportive`, `Challenging`).
- **Live Conversational Arena**: Single-question turn pacing, context-aware follow-up probing, live timer, candidate answer textarea with keyboard shortcuts, and control actions (`CLARIFY`, `HINT`, `SKIP`).
- **Session Lifecycle & State Invariants**: Robust start, pause, resume, and conclusion flows with automatic duration tracking.
- **Audit-Ready Transcript Viewer**: Read-only conversation review with real-time text search, role filters, and clipboard export.
- **Context Compaction**: Retains rolling window of the last 10 messages for upstream LLM prompts to prevent token blowup while persisting 100% of conversation history in PostgreSQL.

---

## 11. Phase 11: AI Evaluation, Answer Analysis & Performance Reporting Engine

InterviewAI includes a comprehensive, multi-source evaluation and reporting engine:
- **Multi-Source Evaluation**: Evaluates Phase 8 single question practice attempts (`QuestionAttempt`), Phase 9 coding challenge submissions (`CodingSubmission`), and Phase 10 complete mock interviews (`MockInterview`).
- **Transparent Multi-Criterion Rubrics**: Versioned rubrics (`1.0.0`) for all 6 categories (`TECHNICAL`, `HR`, `SYSTEM_DESIGN`, `SCENARIO`, `CODING`, `MIXED`) with criterion weights strictly summing to 1.0 (100%).
- **Grounded Coding Evaluation**: Coding Functional Correctness (40%) is calculated directly from actual test execution pass rates (`testCasesPassed / totalTestCases * 100`). Code quality, asymptotic complexity (Big-O time and space), and modularity are evaluated by AI, with absolute zero leakage of hidden test case inputs and expected outputs.
- **Evidence-Based Insights**: Generates structured feedback including specific strengths with quoted evidence, targeted weaknesses with actionable guidance, missing concepts, and improved sample model answers.
- **Performance Analytics**: Aggregated KPIs, 0–100 score distribution, 6-tier performance classifications (`Excellent`, `Very Good`, `Good`, `Average`, `Needs Improvement`, `Poor`), category breakdowns, and chronological score progression.
- **Actionable Improvement Recommendations**: Severity-ranked recommendations (`CRITICAL`, `IMPORTANT`, `OPTIONAL`) linked with 2-way synchronization to the Phase 8 `ImprovementPlan` (accepting a recommendation automatically spawns an actionable `LearningTask`).
- **Comprehensive Performance Reports**: Detailed candidate dossier reports with category scores, competency evaluations, and print-ready CSS formatting for direct PDF export.

---

## 12. Phase 12: Analytics, Skill Gap Benchmarking & Personalized Improvement Plan Engine

InterviewAI features a continuous learning and performance optimization engine:
- **Performance Analytics Dashboard (`/analytics`)**: Real-time KPI summaries (attempt counts, evaluated score average, task completion rate, active learning streak), domain score cards with delta comparisons against previous periods, Recharts visualizations (performance trends, category breakdown, activity distributions), and date range filters (`7d`, `30d`, `90d`, `6m`, `all`).
- **Skill Gap Benchmarking (`/analytics/skill-gaps`)**: Compares job description requirements from Phase 6 (`JobAnalysis`) with verified candidate evaluation records. Classifies competencies into `STRONG`, `DEVELOPING`, `NEEDS_IMPROVEMENT`, and `NOT_ASSESSED`. Distinguishes required vs preferred skills and surfaces prioritized remediation actions.
- **Personalized Improvement Plans (`/improvement-plan`)**: AI-assisted and custom roadmaps synthesized from actual evaluation weaknesses, missing concepts, and target competencies. Supports plan statuses (`ACTIVE`, `COMPLETED`, `PAUSED`, `ARCHIVED`), target completion dates, and automatic progress recalculation.
- **Learning Task Management (`/learning-tasks`)**: Granular milestone tracking with search, category/priority/status filters, overdue detection, duration estimates, and two-way status transitions.
- **Continuous Progress Tracking (`/progress`)**: Velocity metrics, task completion percentage ($\frac{\text{Completed}}{\text{Eligible}} \times 100$), active streak tracking, unlocked milestone achievements, and an audit-ready timeline of all practice events.
- **Backend Architecture & Routes**:
  - `GET /api/analytics/*` (overview, performance, categories, trends, activity, filters)
  - `GET /api/skill-gaps/*` (benchmarks, detail, analyze)
  - `POST /api/improvement-plans/*` (CRUD, AI generation, status management)
  - `POST /api/learning-tasks/*` (CRUD, status transitions, progress recalculation)
  - `GET /api/progress/*` (overview, milestones, timeline)

---

### Phase 13 – Complete Full-Stack Integration
- **Centralized API Architecture**: Seamless client API re-exporting (`preparationService`, `practiceService`, `codingService`, `mockInterviewService`, `evaluationService`, `analyticsService`) with automatic JWT access token attachment and refresh concurrency queue.
- **Cross-Module Workflows**:
  - Job Preparation -> AI Analysis -> Personalized Question Generation & Challenges
  - Question Practice -> Hints & Drafts -> Answer Submission -> Phase 11 AI Evaluation
  - Coding Arena -> Monaco IDE -> Sandbox Execution -> Phase 11 Coding Quality Evaluation
  - Live Mock Interview -> Conversation History -> Review Transcript -> Phase 11 Evaluation
  - AI Evaluation -> Criterion Scoring & Feedback -> Official Reports -> AI Improvement Plans -> Learning Tasks -> Progress Milestones
- **Single-Port Production Serving**: Integrated Express static serving (`frontend/dist`) with client-side SPA routing fallback.
- **Robust Multi-Tenant Security**: Enforces `401 Unauthorized` for unauthenticated requests and `403 Forbidden` across cross-user resource access attempts.
- **Automated Verification**:
  - Backend Integration Suite: `tests/phase13_integration.test.js` (17 tests covering all 10 core integration workflows).
  - Backend Suite: 261 / 261 tests passing across 83 test suites.
  - Frontend Suite: 23 / 23 tests passing across 1 test suite.




