# Phase 10: AI Mock Interview Engine

## 1. Executive Summary

Phase 10 transforms InterviewAI into an interactive, real-time AI mock interview platform. Users can participate in simulated interviewer-led rounds tailored directly to their target job descriptions, required skills, chosen difficulty, experience level, and interviewer personality styles.

The system enforces strict single-question turn pacing, contextual follow-up probing, adaptive mid-interview control actions (`CLARIFY`, `HINT`, `SKIP`), session state transitions (`IN_PROGRESS`, `PAUSED`, `COMPLETED`), and multi-tenant conversation persistence in PostgreSQL.

In accordance with Phase 10 boundaries, this phase strictly implements the conversational and simulation engine without evaluating or scoring answers (which is reserved exclusively for Phase 11).

---

## 2. Technology Stack & Key Architectural Decisions

- **Backend Runtime**: Node.js ESM + Express.js 5
- **ORM & Database**: Prisma ORM 6.19.3 + PostgreSQL
- **AI Completion Provider**: OpenAI API (`gpt-4o-mini` default) with structured JSON contracts
- **Context Compaction**: Retains rolling window of the last 10 messages for upstream LLM prompts to prevent context window bloat and manage latency, while persisting 100% of conversation turns in the database.
- **Frontend Stack**: React 18, Vite 6, Tailwind CSS, Lucide React, React Router DOM v7
- **Multi-Tenant Isolation**: Cryptographic user ownership verification on all sessions, preparations, and transcripts (`403 Forbidden` on unauthorized access).

---

## 3. Database Schema Architecture

Additive migration: `backend/prisma/migrations/20261103_phase10_mock_interview_engine/migration.sql`

### 3.1 Model Extensions: `MockInterview`
```prisma
model MockInterview {
  id                      String              @id @default(uuid())
  userId                  String
  preparationSessionId    String
  title                   String?
  interviewType           InterviewType       @default(TECHNICAL)
  status                  MockInterviewStatus @default(IN_PROGRESS)
  difficulty              Difficulty          @default(MEDIUM)
  experienceLevel         ExperienceLevel     @default(MID)
  durationMinutes         Int?                @default(30)
  duration                Int?                // Total practiced time in seconds
  questionLimit           Int                 @default(5)
  interviewerPersonality  String              @default("Professional")
  language                String              @default("English")
  preferences             Json?               @default("{}")
  currentQuestionIndex    Int                 @default(1)
  totalQuestions          Int                 @default(5)
  startedAt               DateTime?           @default(now())
  pausedAt                DateTime?
  resumedAt               DateTime?
  completedAt             DateTime?
  lastActivityAt          DateTime            @default(now())
  contextSummary          String?
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  user                    User                @relation(...)
  preparationSession      PreparationSession  @relation(...)
  messages                InterviewMessage[]
  evaluations             Evaluation[]
}
```

### 3.2 Model Extensions: `InterviewMessage`
```prisma
model InterviewMessage {
  id               String       @id @default(uuid())
  mockInterviewId  String
  role             MessageRole  // SYSTEM | USER | ASSISTANT
  content          String
  messageType      MessageType  @default(TEXT)
  sequenceNumber   Int
  questionId       String?
  parentMessageId  String?
  metadata         Json?
  createdAt        DateTime     @default(now())

  mockInterview    MockInterview @relation(...)
}
```

### 3.3 Enums
- **`InterviewType`**: `TECHNICAL`, `HR`, `CODING`, `SYSTEM_DESIGN`, `SCENARIO`, `MIXED`
- **`MockInterviewStatus`**: `CREATED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`, `ABANDONED`, `FAILED`
- **`MessageType`**: `TEXT`, `AUDIO`, `CODE`, `SYSTEM_EVENT`, `INTRODUCTION`, `MAIN_QUESTION`, `FOLLOW_UP`, `ANSWER`, `CLARIFICATION`, `HINT`, `CLOSING`

---

## 4. Prompt Engineering & Anti-Jailbreak Safeguards

File: `backend/src/prompts/mockInterview.prompt.js`

### 4.1 Mode Directives
1. **`TECHNICAL`**: Framework internals, data structures, concurrency, security, and real-world system nuances.
2. **`HR`**: STAR method format (Situation, Task, Action, Result), leadership, conflict resolution, culture fit.
3. **`CODING`**: Algorithm strategies, time/space complexity analysis, edge cases, data structures.
4. **`SYSTEM_DESIGN`**: Scalable architecture, distributed components, caching, failure modes, load balancing.
5. **`SCENARIO`**: Production crises, outages, database connection exhaustion, triage, and root-cause post-mortems.
6. **`MIXED`**: Holistic multi-dimensional evaluation combining technical depth, design, and teamwork.

### 4.2 Interviewer Personality Styles
- **`Professional`**: Balanced, formal, articulate, and objective.
- **`Friendly`**: Warm, encouraging, patient, and conversational.
- **`Strict`**: Rigorous, concise, demanding exact precision, quick to challenge vague assertions.
- **`Supportive`**: Mentoring, positive reinforcement, gentle nudges when stuck.
- **`Challenging`**: Devil’s advocate, continuously tests limits with tough edge cases.

### 4.3 Anti-Jailbreak Directives
- Candidate answers are strictly enclosed in `<candidate_answer>...</candidate_answer>` tags and treated as untrusted data.
- System instructions explicitly forbid prompt leakages, persona overrides (DAN, Developer Mode), or granting evaluation scores during the live interview.

---

## 5. REST API Specifications

Base URL: `/api/mock-interviews` (Protected by JWT Bearer Auth)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/mock-interviews` | Create and initialize a new mock interview session |
| `GET` | `/api/mock-interviews` | List user's sessions with pagination, status, and mode filtering |
| `GET` | `/api/mock-interviews/stats` | Aggregated user statistics (total, completed, in-progress, duration) |
| `GET` | `/api/mock-interviews/:interviewId` | Retrieve interview metadata and full ordered message transcript |
| `POST` | `/api/mock-interviews/:interviewId/messages` | Submit candidate answer; returns AI interviewer's follow-up or next question |
| `POST` | `/api/mock-interviews/:interviewId/action` | Perform control action (`CLARIFY`, `HINT`, `SKIP`) |
| `POST` | `/api/mock-interviews/:interviewId/pause` | Pause an in-progress interview |
| `POST` | `/api/mock-interviews/:interviewId/resume` | Resume a paused interview |
| `POST` | `/api/mock-interviews/:interviewId/end` | Conclude interview, compute final duration, append closing message |

---

## 6. Frontend Architecture

### 6.1 Pages
1. **`MockInterviews.jsx`** (`/mock-interviews`): Main dashboard featuring metric KPI cards, active session banners, mode filters, pagination, and session history cards.
2. **`CreateMockInterview.jsx`** (`/mock-interviews/new`): 3-step configuration wizard allowing target preparation selection, interview mode selection, difficulty/duration/question count tuning, and interviewer personality customization.
3. **`LiveMockInterview.jsx`** (`/mock-interviews/:interviewId`): Real-time conversational arena featuring:
   - Speech bubbles with role badges (`Interviewer`, `You`).
   - Elapsed timer and question progress indicators.
   - Pause/Resume controls.
   - Contextual candidate input textarea with keyboard submit shortcut (`Ctrl+Enter`).
   - Quick action bar: Request Clarification, Request Hint, Skip Question.
   - Professional confirmation modal for concluding the session.
4. **`InterviewReview.jsx`** (`/mock-interviews/:interviewId/history`): Read-only transcript viewer with real-time text search, role filters, copy to clipboard, and return navigation.

---

## 7. Automated Test Verification

All automated tests run cleanly and deterministically in Standard Sandbox Mode:

```bash
# Backend Test Suite (212 Tests, 58 Suites)
npm run test:backend

# Frontend Test Suite (18 Tests, 1 Suite)
npm run test:frontend

# Production Bundle Build
npm run build
```

