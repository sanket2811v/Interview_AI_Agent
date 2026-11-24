# Phase 8: Interview Practice Engine Specification

## 1. Overview & Architectural Role

Phase 8 implements the **Interview Practice Engine** for InterviewAI. It transforms the AI-generated questions and coding challenges from Phase 7 into an interactive, multi-category practice environment.

Key capabilities:
1. **Interactive Workspace**: Multiline answer drafting, code snippet explanations, and system design structures.
2. **Sequential Hint Delivery**: Progressive hint reveals that prevent overwhelming the candidate while preserving practice difficulty.
3. **Reference Benchmarks**: On-demand reveal of model answers, evaluation rubrics, and expected architectural concepts.
4. **Draft & Persistence State**: Continuous auto/manual draft saving and full attempt history tracking.
5. **Self-Assessment & Review**: Candidate self-ratings (1–5 stars), "Needs Review" flags, bookmarking for revision, and personal takeaways.
6. **Practice History & Telemetry**: Comprehensive practice history dashboard (`/practice/history`) and real-time statistics tracking.

---

## 2. Practice Workflow Architecture

```
[ Preparation Session (Phase 5) ] ───► [ Phase 6 Job Analysis ] ───► [ Phase 7 Question Bank ]
                                                                               │
                                                                               ▼
                                                            [ Configure Practice Session ]
                                                             ├── Category (Tech/HR/Coding/Design/Scenario)
                                                             ├── Difficulty (Easy/Medium/Hard/Expert/Mixed)
                                                             └── Filter (All/Unattempted/Needs Review)
                                                                               │
                                                                               ▼
                                                             [ Active Practice Workspace ]
                                                             ├── 1. Read Question & Context
                                                             ├── 2. Sequential Hints (Hidden by default)
                                                             ├── 3. Formulate Answer & Save Draft
                                                             ├── 4. Submit Answer (QuestionAttempt)
                                                             ├── 5. Reveal Model Reference Answer
                                                             ├── 6. Self-Assessment (1-5 Stars, Review Flag)
                                                             └── 7. Next Question / Complete Session
                                                                               │
                                                                               ▼
                                                             [ Practice History & Analytics ]
                                                             ├── PostgreSQL Database Persistence
                                                             └── Real-Time Mastery Statistics
```

---

## 3. Supported Practice Categories

- **Technical (`TECHNICAL`)**: Language internals, framework concurrency, database indexing, caching strategies, and system edge cases.
- **HR & Behavioral (`HR`)**: STAR methodology, leadership scenarios, cross-functional communication, conflict resolution, and career objectives.
- **Coding Practice (`CODING`)**: Algorithmic problem statements, complexity constraints, sample input/output, hints, and textual approach / pseudocode formulation (without server-side execution in Phase 8).
- **System Design (`SYSTEM_DESIGN`)**: Distributed architecture, storage schemas, API contracts, scalability trade-offs, and failure recovery.
- **Scenario-Based (`SCENARIO`)**: Production incident triage, on-call debugging, performance bottlenecks, and changing business requirements.

---

## 4. Sequential Hint & Reference Answer Systems

### 4.1 Hint Delivery System
- Hints are initially masked.
- Candidates reveal hints one at a time via `POST /api/practice/sessions/:sessionId/questions/:questionId/hints/reveal`.
- The backend tracks revealed hint indices in the candidate's active draft/attempt record (`revealedHints: [0, 1]`).
- Candidates are not penalized for viewing hints.

### 4.2 Reference Answer System
- Reference answers, architectural explanations, and expected concepts remain withheld until explicitly toggled.
- Prevents premature answer revelation.
- Candidates can cross-reference their formulation against the benchmark answer and checklist.

---

## 5. Database Architecture & Additive Migration

### 5.1 `PracticeSession` Model
```prisma
model PracticeSession {
  id                   String                @id @default(uuid())
  userId               String
  preparationSessionId String
  title                String
  selectedCategories   Json                  @default("[]")
  difficulty           DifficultyLevel       @default(MEDIUM)
  totalQuestions       Int                   @default(0)
  attemptedQuestions   Int                   @default(0)
  completedQuestions   Int                   @default(0)
  skippedQuestions     Int                   @default(0)
  currentQuestionIndex Int                   @default(0)
  status               PracticeSessionStatus @default(IN_PROGRESS)
  startedAt            DateTime              @default(now())
  lastActivityAt       DateTime              @default(now())
  completedAt          DateTime?
  durationSeconds      Int                   @default(0)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  user                 User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  preparationSession   PreparationSession    @relation(fields: [preparationSessionId], references: [id], onDelete: Cascade)
  attempts             QuestionAttempt[]
}
```

### 5.2 Extended `QuestionAttempt` Model
Enhanced with:
- `practiceSessionId`: Foreign key to `PracticeSession`.
- `attemptNumber`: Incremental counter per user per question.
- `answerFormat`: `TEXT`, `CODE`, or `SYSTEM_DESIGN_STRUCTURED`.
- `revealedHints`: Array of revealed hint indices.
- `isBookmarked`: Revision bookmark boolean.
- `needsReview`: Improvement flag boolean.
- `selfRating`: 1–5 candidate self-rating.
- `personalNotes`: Candidate takeaways.
- `draftSavedAt` & `submittedAt`: Granular timestamps.

---

## 6. Backend API Route Catalog

All endpoints require verified JWT authentication (`requireAuth`) and enforce strict multi-tenant data ownership:

| HTTP Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/preparations/:id/practice/sessions` | Starts a new interactive practice session |
| `GET` | `/api/preparations/:id/practice/sessions` | Lists practice sessions for a preparation |
| `GET` | `/api/practice/sessions/:sessionId` | Retrieves session state, questions, and drafts |
| `POST` | `/api/practice/sessions/:sessionId/resume` | Resumes an in-progress practice session |
| `POST` | `/api/practice/sessions/:sessionId/complete` | Marks session completed and records duration |
| `PUT` | `/api/practice/sessions/:sessionId/questions/:questionId/draft` | Saves an answer draft |
| `POST` | `/api/practice/sessions/:sessionId/questions/:questionId/attempts` | Submits a final answer attempt |
| `POST` | `/api/practice/sessions/:sessionId/questions/:questionId/hints/reveal` | Sequentially reveals a hint |
| `GET` | `/api/questions/:questionId/attempts` | Retrieves past attempts for a question |
| `GET` | `/api/questions/:questionId/reference-answer` | Retrieves reference answer and explanation |
| `PATCH` | `/api/questions/:questionId/review` | Updates bookmark, needs-review, and self-rating |
| `GET` | `/api/practice/history` | Retrieves user practice history with pagination |
| `GET` | `/api/practice/stats` | Returns aggregated practice statistics |

---

## 7. Frontend Interface & Routing

- `/preparations/:id/practice`: Primary Interactive Practice Workspace (`InterviewPractice.jsx`).
- `/practice/history` and `/history`: Practice History & Analytics Dashboard (`History.jsx`).
- Navigation buttons integrated in `PreparationWorkspace.jsx` and `QuestionBank.jsx`.

---

## 8. Automated Testing & Verification Commands

```powershell
# Run backend test suite (includes 21 Phase 8 tests)
npm run test:backend

# Run frontend architecture and UI component audit (includes 14 tests)
npm run test:frontend

# Execute production build
npm run build
```

---

## 9. Known Limitations & Phase 9 Scope Boundaries

1. **Code Execution Sandbox**: Phase 8 supports textual approach, pseudocode, and algorithm explanations for coding problems. In accordance with strict application security rules, no user code is compiled or executed on the Express server. Full code sandboxing, test execution runtimes, and Monaco Editor are reserved for Phase 9.
2. **Audio Mock Interviews**: Live speech-to-text recording, audio streaming, and voice conversational mock rounds are reserved for future mock interview phases.

