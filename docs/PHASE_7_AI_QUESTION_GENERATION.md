# Phase 7: AI-Powered Interview Question Generation Specification

## 1. Overview & Architectural Role

Phase 7 implements **AI-Powered Interview Question Generation** for InterviewAI. It transforms structured job description intelligence (produced in Phase 6) and user preparation profiles into personalized interview questions and coding challenges across five primary question categories:

1. **Technical Questions (`TECHNICAL`)**: Deep architectural, language-specific, framework-focused, and domain-specific questions grounded in required and preferred skills.
2. **Behavioral / HR Questions (`HR`)**: Competency, leadership, team dynamics, conflict resolution, and behavioral questions structured for the STAR methodology.
3. **Coding Challenges (`CODING`)**: Algorithmic and programmatic challenges complete with starter code, constraints, sample test cases, and hidden evaluation test cases.
4. **System Design Questions (`SYSTEM_DESIGN`)**: Architecture, scalability, data flow, distributed systems, and trade-off analysis scenarios.
5. **Scenario-Based Questions (`SCENARIO`)**: Practical situational dilemmas, incident post-mortems, on-call firefighting, and workplace trade-offs.

---

## 2. Generation Pipeline & Data Flow

```
[ Candidate Profile + Prep Config ]
               │
               ▼
   [ Saved Job Description ] ──── Phase 6 ───► [ Structured Job Analysis ]
                                                       │
                                                       ▼
                                         [ Context-Grounded Prompt Engine ]
                                                       │ (Anti-jailbreak / XML Boundary)
                                                       ▼
                                         [ OpenAI GPT-4o-mini API / Mock ]
                                                       │
                                                       ▼
                                         [ Strict Zod Schema Validation ]
                                                       │
                                                       ▼
                                       [ Transactional Prisma Persistence ]
                                        ├── InterviewQuestion (PostgreSQL)
                                        ├── CodingChallenge (PostgreSQL)
                                        └── CodingTestCase (PostgreSQL)
                                                       │
                                                       ▼
                                      [ Candidate Question Bank UI / API ]
                                       (Hidden Test Cases Masked on Client)
```

---

## 3. Strict Pre-requisite: Phase 6 Analysis Guard

Question generation requires a completed Phase 6 `JobAnalysis`. If a user attempts to generate questions for a preparation session that lacks an AI analysis:
- **HTTP Status**: `400 Bad Request`
- **Error Code**: `ANALYSIS_REQUIRED`
- **Frontend Behavior**: Displays a warning card with a one-click redirect to `/preparations/:id/analysis`.

---

## 4. Prompt Engineering & Anti-Jailbreak Security

- **Prompt Version**: `QUESTION_PROMPT_VERSION = '1.0.0'`
- **Context Isolation**: The raw job description and candidate background are encapsulated inside `<UNTRUSTED_JOB_CONTEXT>` tags.
- **System Directives**: Explicit instructions instruct the LLM to ignore meta-instructions, bypass requests, or prompt injections inside the candidate text or job description.
- **Structured Output**: Output must adhere strictly to valid RFC 8259 JSON format matching our Zod validation schemas.

---

## 5. Question Categories & Data Models

### 5.1 Standard Interview Questions (`InterviewQuestion`)
- `id`: UUID (Primary Key)
- `preparationSessionId`: Foreign Key referencing `PreparationSession`
- `category`: `TECHNICAL` | `HR` | `CODING` | `SYSTEM_DESIGN` | `SCENARIO`
- `difficulty`: `EASY` | `MEDIUM` | `HARD` | `EXPERT`
- `question`: Core prompt text
- `description`: Contextual background, constraints, or scenario details
- `referenceAnswer`: Ideal answer or comprehensive discussion points
- `explanation`: Why this question matters for the role and what interviewers look for
- `tags`: Array of skills and topics covered (e.g., `["React", "Virtual DOM", "Performance"]`)
- `evaluationRubric`: JSON object containing grading criteria (Excellent, Good, Needs Improvement)

### 5.2 Coding Challenges (`CodingChallenge`)
- `id`: UUID (Primary Key)
- `preparationSessionId`: Foreign Key referencing `PreparationSession`
- `title`: Challenge title
- `slug`: URL-friendly identifier
- `difficulty`: `EASY` | `MEDIUM` | `HARD` | `EXPERT`
- `description`: Detailed markdown problem description
- `starterCode`: Boilerplate skeleton code per language
- `solutionCode`: Reference implementation
- `hints`: Progressive hints for candidates
- `timeLimit`: Execution timeout in milliseconds (default: 2000ms)
- `memoryLimit`: Execution memory cap in MB (default: 256MB)

### 5.3 Coding Test Cases (`CodingTestCase`) & Hidden Security
- `id`: UUID (Primary Key)
- `codingChallengeId`: Foreign Key referencing `CodingChallenge`
- `input`: Input arguments for execution
- `expectedOutput`: Anticipated correct output
- `isHidden`: Boolean flag
  * **Candidate Protection**: When fetching coding challenges via public candidate endpoints, any test case with `isHidden: true` has its input and expected output masked with `[Hidden evaluation input]` and `[Hidden evaluation output]` to prevent tampering and answer leakage.

---

## 6. API Route Catalog

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/preparations/:id/questions/generate` | Generates 5–20 questions using OpenAI | Yes |
| `GET` | `/api/preparations/:id/questions` | List questions with pagination, category & difficulty filters | Yes |
| `POST` | `/api/preparations/:id/questions/regenerate` | Re-generates questions for a specific category | Yes |
| `GET` | `/api/preparations/:id/coding-challenges` | List coding challenges (hidden test cases masked) | Yes |
| `GET` | `/api/preparations/:id/coding-challenges/:challengeId`| Get single coding challenge details | Yes |
| `GET` | `/api/questions/:questionId` | Get single question details | Yes |
| `PUT` / `PATCH` | `/api/questions/:questionId` | Update question, answer, rubric, or difficulty | Yes |
| `DELETE` | `/api/questions/:questionId` | Soft or hard remove question | Yes |

---

## 7. Frontend Question Bank Workspace

The Question Bank is accessible at `/preparations/:id/questions` and as Tab 3 in the main Preparation Workspace (`/preparations/:id`). Key frontend capabilities:
- **Category Filter Tabs**: Instant filtering by All, Technical, HR & Behavioral, Coding Arena, System Design, and Scenario Dilemmas.
- **Difficulty Badging**: Color-coded badges for Easy, Medium, Hard, and Expert questions.
- **Generation Modal**: Granular controls for category, target difficulty, question count (1–20), programming language, target skills selection, and skill-gap prioritization.
- **Inspectable Details**: Expandable ideal answers, key talking points, evaluation rubrics, and coding test cases.
- **Edit & Delete Modals**: Full customization and deletion workflows with user confirmations.

---

## 8. Duplicate Prevention & Batch Management

To prevent repetitive questions across multiple generation cycles:
1. **Existing Prompt Feed**: When constructing the OpenAI prompt, the last 20 generated question titles and challenge names are injected into the prompt under `PREVIOUSLY GENERATED QUESTIONS (DO NOT DUPLICATE THESE)`.
2. **Normalized Memory Hash Deduplication**: The backend normalizes question text (`.toLowerCase().trim()`) and strips out duplicates before executing the Prisma persistence transaction.
3. **Preservation on Category Regeneration**: Regenerating a category (`/api/preparations/:id/questions/regenerate`) leaves questions in other categories intact.

---

## 9. Telemetry & Token Tracking (`AIUsageLog`)

Every question generation call records operational metrics in PostgreSQL:
- `operationType`: `QUESTION_GENERATION`
- `model`: e.g. `gpt-4o-mini`
- `promptTokens`: Input tokens consumed
- `completionTokens`: Output tokens generated
- `totalTokens`: Sum of token usage
- `status`: `SUCCESS`, `RATE_LIMITED`, `TIMEOUT`, or `FAILED`
- `durationMs`: Total network roundtrip and validation latency

---

## 10. Automated Testing & Verification Commands

```powershell
# Run backend test suite (includes 23 Phase 7 tests)
npm run test:backend

# Run frontend architecture and UI component audit
npm run test:frontend

# Execute production build
npm run build
```

---

## 11. Known Limitations & Phase 8 Boundaries

1. **Sandboxed Code Execution**: In accordance with the system security architecture, no arbitrary user code is compiled or executed on the Express server. Full code sandboxing (e.g. Docker/isolate/WebAssembly) is reserved for future execution phases.
2. **Speech & Audio**: Voice recording, speech-to-text, and real-time audio evaluation are strictly reserved for Phase 8 (Mock Interview Execution).
3. **OpenAI API Key**: Requires an active `OPENAI_API_KEY` in `backend/.env` for live OpenAI network requests; automated test suites utilize high-fidelity mock interceptors.

