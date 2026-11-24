# InterviewAI — Production Build, Deployment & ngrok Tunneling Guide

This guide details the production deployment, single-port unified architecture, environment configuration, and ngrok tunneling procedures for **InterviewAI**.

---

## 1. Production Architecture Overview

InterviewAI is architected as a **Single-Port Unified Production Application**:
- **Application Host & Port:** Express.js running on `http://localhost:5000`
- **Frontend SPA:** React 19 + Vite compiled into static assets (`frontend/dist/`)
- **API Endpoints:** Mounted under `/api/*` with strict precedence
- **Client-Side Routing Fallback:** Non-API GET requests serve `frontend/dist/index.html` allowing React Router deep-links (`/dashboard`, `/practice`, `/mock-interviews`) to function seamlessly
- **Authentication:** In-memory Access JWT tokens paired with secure `HttpOnly`, `SameSite=Lax`, `Path=/api/auth` refresh cookies
- **Reverse Proxy / Tunnel:** ngrok Quick Tunnel exposing exclusively the Express application port (`5000`) over public HTTPS

```
[ User Browser / Web Client ]
              │
              ▼ (Public HTTPS)
    [ ngrok Quick Tunnel ]
              │ (Forwarding)
              ▼
[ Express Single-Port Server: 5000 ]
  ├── GET /api/* ──────────────► REST API Controllers & Services ──► PostgreSQL (Prisma)
  ├── Static Assets ───────────► frontend/dist/assets/*
  └── Deep Links (e.g. /login) ─► frontend/dist/index.html (React Router SPA)
```

---

## 2. Prerequisites & System Requirements

Before running the application in production mode:
- **Operating System:** Windows 10/11 (PowerShell 5.1+ or PowerShell 7+)
- **Node.js:** v18.0.0+ (Tested on v24.13.0)
- **Package Manager:** npm v9.0.0+
- **Database:** PostgreSQL 14+ (Local instance or cloud connection on port 5432)
- **Tunneling:** ngrok CLI (v3+)

---

## 3. Environment Variable Configuration

Create or verify the `.env` file in the project root or `backend/.env`. A template is provided in `.env.example`:

```env
# Database Connection (Prisma)
DATABASE_URL="postgresql://postgres:password@localhost:5432/interview_ai?schema=public"

# Application Server Settings
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:5000
BACKEND_URL=http://localhost:5000

# Authentication & Security
JWT_ACCESS_SECRET="your_secure_32_char_jwt_access_secret_key!"
JWT_REFRESH_SECRET="your_secure_32_char_jwt_refresh_secret_key!"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# OpenAI Configuration (Phase 6 AI Job Description Analysis & Mock Interviews)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
OPENAI_TIMEOUT_MS=60000

# Code Execution Sandbox Engine (Phase 9)
CODE_EXECUTION_PROVIDER="piston"
CODE_EXECUTION_ENABLED=true
CODE_EXECUTION_API_URL="https://emkc.org/api/v2/piston"

# Frontend Build Time Settings
VITE_API_BASE_URL=/api
VITE_APP_NAME="InterviewAI"
```

> [!IMPORTANT]
> - Never commit `.env` containing real credentials to version control.
> - When running behind ngrok HTTPS, `trust proxy` in Express automatically detects HTTPS from `X-Forwarded-Proto` and issues secure cookies.

---

## 4. Production Deployment Workflow (Step-by-Step)

### Step 1: Validate Database & Prisma Schema
Open a PowerShell terminal in the project root:
```powershell
# Validate the Prisma database schema
npm run prisma:validate
```

### Step 2: Build the Production Frontend
Compile the React application into optimized production chunks:
```powershell
# Compiles React SPA into frontend/dist/
npm run build
```
Verify that `frontend/dist/index.html` and `frontend/dist/assets/` are generated.

### Step 3: Start the Unified Express Server
Launch the production server on port 5000:
```powershell
# Start Express serving both API and Frontend SPA
npm start
```

Expected startup output:
```text
[INFO] ===================================================
[INFO] 🚀 InterviewAI Unified Production Server Started
[INFO] 📡 Port: 5000
[INFO] 🌐 Environment: production
[INFO] 💻 Single-Port Architecture: Serving React SPA (frontend/dist)
[INFO] 🔗 Application URL: http://localhost:5000
[INFO] 🔗 API Health: http://localhost:5000/api/health
[INFO] 🗄️ Database Health: http://localhost:5000/api/health/database
[INFO] ===================================================
```

### Step 4: Verify Local Single-Port Operation
Open your web browser and test the following endpoints:
1. **Frontend Landing:** `http://localhost:5000` (Loads React landing page)
2. **Client Route Deep-Link:** `http://localhost:5000/login` (Direct navigation to Login page)
3. **API Health Check:** `http://localhost:5000/api/health` (Returns JSON `{ success: true, ... }`)
4. **Database Health Check:** `http://localhost:5000/api/health/database` (Returns DB connectivity status)
5. **Unknown API 404:** `http://localhost:5000/api/unknown-endpoint` (Returns JSON 404, NOT HTML)

---

## 5. ngrok Quick Tunnel Configuration

To expose the application to the internet via a public HTTPS URL:

### Step 5a: Confirm ngrok Installation
If ngrok is not installed or the Windows App execution alias is disabled:
- **Download Official Binary:** Download `ngrok-v3-stable-windows-amd64.zip` from [https://ngrok.com/download](https://ngrok.com/download)
- **Extract Binary:** Extract `ngrok.exe` into a directory on your PATH (e.g., `C:\Windows\System32` or `C:\Users\<User>\bin`).
- **Authenticate Account:**
  ```powershell
  ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
  ```

### Step 5b: Start the Public Tunnel
In a second PowerShell terminal, run:
```powershell
ngrok http 5000
```

### Step 5c: Retrieve and Access the Public URL
The terminal will display forwarding details:
```text
Session Status                online
Account                       Candidate (Plan: Free)
Forwarding                    https://abc-123.ngrok-free.app -> http://localhost:5000
```
- Copy the `https://*.ngrok-free.app` URL.
- Open it in your web browser or share it for external verification.

---

## 6. Public HTTPS Verification Checklist

When accessing the application via the ngrok HTTPS URL:
- [ ] **Home Page:** Landing page loads with dark/light theme and assets.
- [ ] **Static Assets:** CSS, SVG icons, and JavaScript chunks load with HTTP 200 from `https://*.ngrok-free.app/assets/*`.
- [ ] **Authentication:** Register or Login with credentials. Verify that the refresh token cookie is delivered with `HttpOnly` and `SameSite=Lax`.
- [ ] **SPA Navigation:** Navigate across `/dashboard`, `/practice`, `/coding`, `/mock-interviews`, and `/analytics`. Refresh the page on any deep route; verify it reloads cleanly without 404s.
- [ ] **REST API Communication:** Network tab shows API calls directed to `/api/*` on the same public origin.
- [ ] **Security Headers:** Response headers contain `X-Content-Type-Options: nosniff` and `X-Frame-Options: SAMEORIGIN`.

---

## 7. Stopping the Application

To shut down the deployment:
1. **Stop ngrok:** Press `Ctrl + C` in the ngrok PowerShell terminal.
2. **Stop Express:** Press `Ctrl + C` in the backend PowerShell terminal. The server will trigger graceful shutdown:
   ```text
   [WARN] Received SIGINT. Initiating graceful shutdown...
   [INFO] HTTP server closed. Ceasing request processing.
   [INFO] Prisma Client disconnected cleanly
   [INFO] Graceful shutdown completed successfully.
   ```

---

## 8. Troubleshooting Guide

| Issue | Root Cause | Solution |
|:---|:---|:---|
| **Port 5000 Already in Use** | Another process is holding port 5000. | In PowerShell run: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess \| Stop-Process -Force` |
| **Prisma Cannot Reach DB (P1001)** | PostgreSQL service is stopped or port 5432 is unreachable. | Start PostgreSQL: `net start postgresql-x64-16` or check services console (`services.msc`). |
| **ngrok 'The file cannot be accessed'** | Windows 0-byte execution alias is active instead of real binary. | Disable alias in *Settings > Apps > Advanced App Settings > App Execution Aliases*, or place physical `ngrok.exe` in `C:\Windows\System32`. |
| **SPA Refresh Returns 404** | Static middleware missing client-side catch-all fallback. | Verify lines 58–72 in `backend/src/app.js` route non-API GET requests to `frontend/dist/index.html`. |
| **Cookie Dropped on ngrok** | Express did not trust ngrok reverse proxy. | Confirm `app.set('trust proxy', 1);` is configured in `backend/src/app.js`. |
| **Vite Build Memory Error** | Rollup exceeded Node.js memory limit. | Run: `$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run build` |

