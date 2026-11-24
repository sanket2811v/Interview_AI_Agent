# InterviewAI – Complete Project Setup, Commands, Paths and Execution Guide

This document provides the definitive, production-verified, step-by-step instructions to configure, run, test, build, and deploy the **InterviewAI** platform on Windows using PowerShell, Node.js, Express, React (Vite), PostgreSQL, Prisma, and ngrok.

---

## 1. Project Overview

InterviewAI is an enterprise-grade AI-powered interview preparation platform featuring:
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, React Router 7.
- **Backend**: Node.js (ES Modules), Express.js 5, Helmet, CORS, Morgan, Zod validation.
- **Database & ORM**: PostgreSQL (port `5432`), Prisma ORM 6.19 (`backend/prisma/schema.prisma`).
- **AI Engine**: OpenAI GPT-4o-mini integration for job description analysis, question bank generation, and mock interview evaluation.
- **Code Execution**: Piston Sandbox integration for algorithm coding challenges.
- **Production Architecture**: Unified single-port Express server (`http://localhost:5000`) serving both the compiled React SPA from `frontend/dist` and all `/api/*` REST endpoints.

---

## 2. Actual Project Root & Path Directory

Always open the root folder in Cursor or VS Code:

| Role | Exact Absolute Windows Path |
|---|---|
| **Project Root (Open this in Cursor)** | `C:\Users\Dell\InterviewAI` |
| **Backend Directory** | `C:\Users\Dell\InterviewAI\backend` |
| **Frontend Directory** | `C:\Users\Dell\InterviewAI\frontend` |
| **Prisma Schema** | `C:\Users\Dell\InterviewAI\backend\prisma\schema.prisma` |
| **Prisma Migrations** | `C:\Users\Dell\InterviewAI\backend\prisma\migrations` |
| **Backend Entry Point** | `C:\Users\Dell\InterviewAI\backend\src\server.js` |
| **Express Application** | `C:\Users\Dell\InterviewAI\backend\src\app.js` |
| **Frontend Source** | `C:\Users\Dell\InterviewAI\frontend\src` |
| **Frontend Production Build Output** | `C:\Users\Dell\InterviewAI\frontend\dist` |
| **Backend Uploads Directory** | `C:\Users\Dell\InterviewAI\backend\uploads` |

---

## 3. Complete Folder Structure

```
C:\Users\Dell\InterviewAI
├── package.json                   # Root orchestrator scripts (dev, build, start, tests, prisma)
├── package-lock.json              # Root dependency lockfile
├── .env.example                   # Global environment variable template
├── RUN_PROJECT.md                 # Complete project setup and execution documentation
├── AGENTS.md                      # Antigravity autonomous development rules
├── backend/                       # Express.js REST API service
│   ├── package.json               # Backend dependencies (Express 5, Prisma 6, Zod, etc.)
│   ├── .env                       # Backend active environment variables (DO NOT COMMIT)
│   ├── .env.example               # Backend template
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL models and enums
│   │   ├── seed.js                # Idempotent database seeder (Alex Rivera demo candidate)
│   │   └── migrations/            # Version-controlled SQL migrations (Phase 1 through 12)
│   ├── src/
│   │   ├── server.js              # HTTP server entry point & graceful shutdown
│   │   ├── app.js                 # Express middleware, single-port SPA serving & router mounting
│   │   ├── config/                # env.js, prisma.js, database health probes
│   │   ├── controllers/           # auth, preparation, practice, mock, evaluation, analytics
│   │   ├── middleware/            # auth, error, validation, requestLogger, notFound
│   │   ├── routes/                # index.js and all modular sub-routers
│   │   ├── services/              # AI, evaluation, mock interview, coding engine services
│   │   └── utils/                 # cookies, tokens, logger, password hashing
│   └── tests/                     # 99 test suites (304 unit & integration tests)
├── frontend/                      # React 18 SPA (Vite)
│   ├── package.json               # Frontend dependencies (React, Recharts, Lucide, Tailwind)
│   ├── vite.config.js             # Vite config with /api proxy to http://localhost:5000
│   ├── tailwind.config.js         # Responsive design breakpoints (320px to 1920px)
│   ├── dist/                      # Production build output served by Express
│   ├── src/
│   │   ├── main.jsx               # React DOM entry point
│   │   ├── App.jsx                # Theme & Context providers
│   │   ├── routes/AppRoutes.jsx   # Client-side routes (public, auth, workspace, practice)
│   │   ├── layouts/               # DashboardLayout, AuthLayout, MainLayout
│   │   ├── pages/                 # 25+ application pages (Dashboard, MockInterviews, etc.)
│   │   ├── components/            # UI components, navigation, modals, charts
│   │   └── services/              # Axios API client (api.js, preparationService, etc.)
│   └── tests/                     # Frontend architectural & 14-viewport responsiveness tests
└── uploads/                       # Temporary file uploads
```

---

## 4. Prerequisites

Verify that the following tools are installed and accessible in your Windows PowerShell terminal:

```powershell
node --version       # Expected: v18.x, v20.x, or v24.x
npm --version        # Expected: v9.x or v10.x
git --version        # Version control
```

---

## 5. Environment Configuration

### A. Backend Configuration (`backend/.env`)
The backend loads its configuration from `C:\Users\Dell\InterviewAI\backend\.env`. Ensure this file exists with the following configuration:

```env
# Server Port & Mode
PORT=5000
NODE_ENV=development

# PostgreSQL Connection String (Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/interview_ai?schema=public"

# Cross-Origin Resource Sharing
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:5000"

# JWT Authentication Secrets (Must be at least 32 characters)
JWT_ACCESS_SECRET="interviewai_super_secret_jwt_access_token_key_2026_secure!"
JWT_REFRESH_SECRET="interviewai_super_secret_jwt_refresh_token_key_2026_secure!"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cookie Security (false in local HTTP development, true in production HTTPS)
COOKIE_SECURE="false"
COOKIE_SAME_SITE="lax"

# Token Expiry Durations
PASSWORD_RESET_EXPIRES_MINUTES=30
EMAIL_VERIFICATION_EXPIRES_HOURS=24

# OpenAI Configuration (For JD Analysis, Question Generation, and AI Evaluations)
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o-mini"
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=2
OPENAI_MAX_INPUT_CHARS=30000
OPENAI_BASE_URL="https://api.openai.com/v1"

# Secure Code Execution Engine (Piston API)
CODE_EXECUTION_PROVIDER="piston"
CODE_EXECUTION_ENABLED="true"
CODE_EXECUTION_API_URL="https://emkc.org/api/v2/piston"
CODE_EXECUTION_API_KEY=""
CODE_EXECUTION_TIMEOUT_MS=30000
```

### B. Frontend Configuration (`frontend/.env`)
The frontend communicates through the relative `/api` path, which is reverse-proxied by Vite in development and served natively by Express in production:

```env
VITE_API_BASE_URL=/api
VITE_APP_NAME="InterviewAI"
```

> **Security Rule**: Real `.env` files are ignored by `.gitignore`. Never commit them to Git.

---

## 6. Dependency Installation

All dependencies can be installed in one step from the project root using the orchestrator script:

```powershell
# Open terminal in project root
cd "C:\Users\Dell\InterviewAI"

# Install root, backend, and frontend packages reproducibly
npm run install:all
```

Alternatively, you can install them separately in their respective directories:

```powershell
# 1. Root dependencies (concurrently)
cd "C:\Users\Dell\InterviewAI"
npm install

# 2. Backend dependencies (Express, Prisma, Zod, Helmet, etc.)
cd "C:\Users\Dell\InterviewAI\backend"
npm install

# 3. Frontend dependencies (React, Vite, Recharts, Lucide, Tailwind)
cd "C:\Users\Dell\InterviewAI\frontend"
npm install
```

---

## 7. PostgreSQL Database Startup & Verification

### Step 1: Start PostgreSQL Service in Windows
Run PowerShell as Administrator and check or start the PostgreSQL service:

```powershell
# Check PostgreSQL service status
Get-Service *postgres*

# Start the PostgreSQL service (Version 18)
Start-Service postgresql-x64-18
```

*Or, if using standard Windows Command Prompt (Admin):*
```cmd
net start postgresql-x64-18
```

### Step 2: Verify PostgreSQL Connectivity
Verify that PostgreSQL is actively listening on localhost port `5432`:

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```
*Expected output: `TcpTestSucceeded : True`*

### Step 3: Create the Database (If not already created)
Ensure the target database (`interview_ai`) exists:

```powershell
# Check databases
psql -U postgres -c "SELECT datname FROM pg_database WHERE datname='interview_ai';"

# Create database if missing
psql -U postgres -c "CREATE DATABASE interview_ai;"
```

---

## 8. Prisma Database Commands

All Prisma commands can be run directly from the project root (`C:\Users\Dell\InterviewAI`):

### 1. Validate Prisma Schema
Verifies schema syntax and relationship consistency:
```powershell
cd "C:\Users\Dell\InterviewAI"
npm run prisma:validate
```
*Expected Output: `The schema at prisma\schema.prisma is valid 🚀`*

### 2. Generate Prisma Client
Generates the strongly-typed Prisma Client into `backend/src/generated/prisma-client`:
```powershell
npm run prisma:generate
```

### 3. Check Migration Status
Inspects applied and pending migrations:
```powershell
npm run prisma:status
```

### 4. Deploy Migrations to PostgreSQL
Applies all unapplied migrations to the PostgreSQL database safely:
```powershell
npm run prisma:deploy
```

### 4b. Direct Schema Synchronization (Safe Alternative for Fresh Databases)
Directly synchronizes all PostgreSQL tables from schema.prisma (auto-creates database if missing):
```powershell
npm run prisma:push
```

### 4c. Automatic Migration Repair & P3009 Healing
If Prisma reports `Error: P3009 (failed migration found in target database)`, run this command from the project root to automatically clear the failed state and apply all pending migrations safely without needing `npx`:
```powershell
npm run prisma:repair
```

### 5. Seed Demonstration Data (Optional & Safe)
Idempotently seeds sample candidate Alex Rivera (`candidate.demo@interviewai.dev` / `DemoP@ssw0rd2026!`):
```powershell
npm run prisma:seed
```

### 6. Launch Prisma Studio (Database GUI)
Opens an interactive browser-based database inspector at `http://localhost:5555`:
```powershell
npm run prisma:studio
```

> **SAFETY WARNING**: Never run `npx prisma migrate reset` in a production environment as it drops all existing tables and data.

---

## 9. How to Run in Development Mode

You have two execution options for local development:

### Option A: Unified Concurrent Startup (Recommended - 1 Terminal)
Runs both Backend and Frontend concurrently in a single PowerShell window:

```powershell
# Terminal 1 (Project Root)
cd "C:\Users\Dell\InterviewAI"
npm run dev
```

- **Backend Address**: `http://localhost:5000`
- **Frontend Address**: `http://localhost:5173`
- Both logs stream in the same terminal prefixed with `[BACKEND]` and `[FRONTEND]`.

---

### Option B: Separate Terminals (2 Terminals)

#### Terminal 1 – Express Backend
```powershell
cd "C:\Users\Dell\InterviewAI"
npm run dev:backend
```
*Expected Output:*
```
[INFO] Prisma Client initialized
[INFO] Server listening on port 5000
[INFO] Application URL: http://localhost:5000
```

#### Terminal 2 – Vite React Frontend
```powershell
cd "C:\Users\Dell\InterviewAI"
npm run dev:frontend
```
*Expected Output:*
```
  VITE v6.1.0  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open `http://localhost:5173` in your web browser. All requests to `/api/*` are automatically proxied to `http://localhost:5000`.

---

## 10. How to Run in Production Mode (Single-Port Architecture)

InterviewAI's production architecture is designed to run completely through **ONE port** (`http://localhost:5000`), where Express serves both the pre-built React SPA and all REST APIs.

### Step 1: Build the React Frontend
Compiles all frontend JSX, CSS, and assets into `frontend/dist`:

```powershell
cd "C:\Users\Dell\InterviewAI"
npm run build
```
*Expected Output: `✓ built in ~30s` with output in `frontend/dist`.*

### Step 2: Start the Production Server
Starts Express in production mode:

```powershell
cd "C:\Users\Dell\InterviewAI"
npm run start
```
*Expected Output:*
```
===================================================
🚀 InterviewAI Unified Production Server Started
📡 Port: 5000
🌐 Environment: production
💻 Single-Port Architecture: Serving React SPA (frontend/dist)
🔗 Application URL: http://localhost:5000
🔗 API Health: http://localhost:5000/api/health
🗄️ Database Health: http://localhost:5000/api/health/database
===================================================
```

Open `http://localhost:5000` in your browser. All pages, React Router deep links (`/dashboard`, `/practice`, etc.), and `/api/*` endpoints work seamlessly through port 5000.

---

## 11. How to Expose the Application via ngrok Quick Tunnel

Expose your single-port production server to the internet using ngrok:

### Step 1: Ensure Express is Running
Ensure the Express server is actively running on port 5000 (`npm run start` or `npm run dev:backend`).

### Step 2: Open a New PowerShell Terminal and Start ngrok
```powershell
# In a new, separate PowerShell terminal:
ngrok http 5000
```

### Step 3: Access via Public HTTPS URL
ngrok will display a forwarding address, for example:
```
Forwarding                    https://a1b2-c3d4.ngrok-free.app -> http://localhost:5000
```

1. Open the HTTPS URL in any web browser or mobile phone: `https://<generated-subdomain>.ngrok-free.app`.
2. Login or register a test account.
3. Test all application features over the public HTTPS tunnel.
4. Express has `app.set('trust proxy', 1)` enabled, ensuring client IP and protocol detection work smoothly behind the ngrok tunnel.

> **Note**: Quick Tunnel URLs are temporary for testing and change upon tunnel restart. Stop the tunnel at any time by pressing `Ctrl + C`.

---

## 12. Verification & Automated Test Suites

Run the automated test suites from the project root:

```powershell
cd "C:\Users\Dell\InterviewAI"

# 1. Run all Backend tests (304 tests across 99 suites)
npm run test:backend

# 2. Run all Frontend tests (34 tests: UI architecture & 14 responsive viewports)
npm run test:frontend

# 3. Verify Single-Port Production Routing (9 validation checks)
node backend/tests/verify_single_port.js
```

### Interactive Browser Health Checks
- **Liveness Probe**: `http://localhost:5000/api/health` -> `{"status":"ok","timestamp":"..."}`
- **Database Probe**: `http://localhost:5000/api/health/database` -> `{"connected":true,"responseTimeMs":...}`
- **Frontend SPA**: `http://localhost:5000/` -> Renders Landing Page
- **Direct Deep Link**: `http://localhost:5000/login` -> Renders Login Page

---

## 13. Troubleshooting & Common Solutions

| Issue | Cause | PowerShell Solution |
|---|---|---|
| **The table `public.practice_sessions` or `public.users` does not exist (`P2021`)** | Prisma migrations were not applied to PostgreSQL | The backend now includes automatic schema synchronization on startup via `schemaGuard.js`. You can also manually apply all migrations safely with: `npm run prisma:deploy` |
| **Database column `coding_challenges.questionId` does not exist (`P2022`)** | Phase 9 migration was not applied to the coding challenges table | Automatically resolved by `schemaGuard.js` on backend startup, or run: `npm run prisma:deploy` |
| **Port 5000 already in use** | A previous Node process is still running | Find and kill the process: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force` |
| **Port 5173 already in use** | A previous Vite process is running | Find and kill the process: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force` |
| **Database connection refused (`P1001`)** | PostgreSQL service is stopped | Start PostgreSQL service: `Start-Service postgresql-x64-18` (or `net start postgresql-x64-18`) |
| **Prisma Client not found** | Client has not been generated | Run: `npm run prisma:generate` |
| **EPERM during `npm run build`** | Windows file lock by anti-virus or indexer | Re-run `npm run build`; the transient lock will resolve |
| **404 on page refresh in production** | Missing SPA fallback | Confirm `frontend/dist/index.html` exists (`npm run build`) |
| **ngrok command not found** | ngrok is not in Windows system PATH | Download ngrok from `ngrok.com`, extract `ngrok.exe`, and add to PATH or run directly via `.\ngrok.exe http 5000` |
| **ngrok session expired / authtoken** | Unauthenticated ngrok session limit reached | Run `ngrok config add-authtoken <YOUR_TOKEN>` (token is from your free ngrok dashboard) |

### Verifying PostgreSQL Tables and Columns Manually
To check that all tables and columns exist in PostgreSQL:
```powershell
# 1. Verify practice_sessions table
psql -U postgres -d interview_ai -c "\d practice_sessions"

# 2. Verify coding_challenges columns including questionId
psql -U postgres -d interview_ai -c "\d coding_challenges"

# 3. Check migration history
psql -U postgres -d interview_ai -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC;"
```

---

## 14. Shutdown Commands

To stop any running service safely:
1. **In Terminal**: Press `Ctrl + C` in the respective PowerShell terminal. Type `Y` and press `Enter` if prompted.
2. **Graceful Server Shutdown**: Express automatically intercepts `SIGINT` (Ctrl+C), terminates incoming requests, cleanly disconnects the Prisma Client, and exits with code 0.
3. **Stop PostgreSQL Service (Optional)**:
   ```powershell
   Stop-Service postgresql*
   ```

