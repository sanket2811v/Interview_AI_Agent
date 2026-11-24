# Phase 9: Online Coding Practice & Secure Code Execution Engine

## 1. Overview
The **Online Coding Practice and Secure Code Execution Engine** transforms InterviewAI into a high-performance algorithmic coding platform. Users can write, test, and submit algorithmic solutions against sample and hidden evaluation test cases in a sandboxed, isolated execution environment.

---

## 2. Supported Programming Languages
InterviewAI supports 6 standard programming languages with customized starter templates, stdin ingestion patterns, and execution settings:

| Language | Identifier | Extension | Compiler / Runtime | Default Time Limit | Default Memory Limit |
|---|---|---|---|---|---|
| **JavaScript** | `javascript` | `.js` | Node.js 18.15.0 | 3000 ms | 128 MB |
| **Python** | `python` | `.py` | Python 3.10.0 | 4000 ms | 128 MB |
| **TypeScript** | `typescript` | `.ts` | TypeScript 5.0.3 | 4000 ms | 128 MB |
| **Java** | `java` | `.java` | OpenJDK 15.0.2 / 17 | 5000 ms | 256 MB |
| **C++** | `cpp` | `.cpp` | GCC 10.2.0 | 3000 ms | 128 MB |
| **C** | `c` | `.c` | GCC 10.2.0 | 3000 ms | 128 MB |

---

## 3. Isolated Execution Provider Architecture

```
+-------------------------------------------------------------------+
|                        Frontend Client                            |
|             (Monaco Editor + Results Panel + Tabs)                |
+---------------------------------+---------------------------------+
                                  | HTTP (JWT Auth)
                                  v
+-------------------------------------------------------------------+
|                      Express.js Backend API                       |
|           /api/coding/challenges/:id/run  &  /submit              |
|                                                                   |
|   1. Multi-Tenant Authorization Check (User owns Preparation)      |
|   2. Rate Limiting (12 requests / 60 seconds per user)            |
|   3. Input Validation (Max 50 KB source code size)                |
|   4. Retrieve Test Cases (Sample + Hidden)                        |
|                                                                   |
|              +-------------------------------------+              |
|              |     CodeExecutionService Adapter    |              |
|              +------------------+------------------+              |
|                                 |                                 |
|            +--------------------+--------------------+            |
|            |                    |                    |            |
|            v                    v                    v            |
|     Piston Provider      Judge0 Provider       Mock Provider      |
+------------+--------------------+--------------------+------------+
             |                    |
             v                    v
  +--------------------+  +--------------------+
  |   EMKC Piston API  |  |  Judge0 CE Engine  |
  | (Isolated Sandbox) |  | (Isolated Sandbox) |
  +--------------------+  +--------------------+
```

### Safety Rules
1. **Never Execute on Host**: No user-submitted code is ever executed inside Express, Node.js, or the application host machine.
2. **Hidden Test Protection**: Hidden test case inputs and expected outputs are never returned to the frontend or persisted in client-accessible logs.
3. **Graceful 503 Guard**: If no execution provider is configured or if the provider is disabled, endpoints return a clean `503 Service Unavailable` without crashing the application.

---

## 4. Environment Variables Configuration

Add the following variables to `backend/.env`:

```env
# Code Execution Engine Settings
CODE_EXECUTION_PROVIDER=piston
CODE_EXECUTION_ENABLED=true
CODE_EXECUTION_API_URL=https://emkc.org/api/v2/piston
CODE_EXECUTION_API_KEY=
CODE_EXECUTION_TIMEOUT_MS=30000
CODE_EXECUTION_MAX_SOURCE_SIZE=50000
CODE_EXECUTION_MAX_CONCURRENT_REQUESTS=3
```

- For Judge0 CE:
  ```env
  CODE_EXECUTION_PROVIDER=judge0
  CODE_EXECUTION_API_URL=https://judge0-ce.p.rapidapi.com
  CODE_EXECUTION_API_KEY=your_rapidapi_key
  CODE_EXECUTION_API_HOST=judge0-ce.p.rapidapi.com
  ```

---

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/coding/languages` | Returns supported languages and starter code metadata |
| `GET` | `/api/coding/challenges/:id` | Returns challenge details with masked hidden test cases |
| `GET` | `/api/coding/challenges/:id/starter-code` | Retrieves starter template for selected language |
| `POST` | `/api/coding/challenges/:id/run` | Executes code against sample/public test cases only |
| `POST` | `/api/coding/challenges/:id/submit` | Evaluates solution against visible and hidden test cases, persists submission |
| `GET` | `/api/coding/challenges/:id/submissions` | Lists user's paginated previous submissions for this challenge |
| `GET` | `/api/coding/submissions/:id` | Retrieves submission details and code |
| `GET` | `/api/coding/submissions/history` | Retrieves user's global coding submission history |
| `GET` | `/api/coding/stats` | Aggregates accurate user coding statistics (acceptance rate, problems solved) |

---

## 6. Frontend Coding Workspace (`/coding/:challengeId`)
- **Monaco Code Editor**: Line numbers, syntax highlighting, dark/light themes, Tab indentation handling, bracket closing, and shortcuts (`Ctrl+Enter` to Run, `Ctrl+Shift+Enter` to Submit).
- **Problem Description Panel**: Problem statement, input/output formats, constraints, sample cases with one-click copy, and progressive hint reveal.
- **Execution Results Panel**: Test results tab with per-case pass/fail badges, execution output terminal tab, and historical submissions tab with one-click "Load Code" action.
- **Responsive Layout**: Resilient 12-column desktop split and 3-tab mobile switcher tested from 320px to 1920px.

