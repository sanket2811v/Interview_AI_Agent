import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import { disconnectPrisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE_NAME } from '../src/utils/cookies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const frontendDistPath = path.resolve(rootDir, 'frontend/dist');

/**
 * In-memory HTTP request dispatcher for Express application testing
 */
function requestApp(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new stream.Duplex({
      read() {},
      write(_chunk, _encoding, callback) {
        callback();
      }
    });
    socket.remoteAddress = '127.0.0.1';
    socket.encrypted = false;

    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = { host: 'localhost', ...headers };

    let rawBody = '';
    if (body !== null) {
      rawBody = typeof body === 'string' ? body : JSON.stringify(body);
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = Buffer.byteLength(rawBody).toString();
    }

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    const chunks = [];
    const origWrite = res.write;
    const origEnd = res.end;

    res.write = function (chunk, ...args) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return origWrite.apply(res, [chunk, ...args]);
    };

    res.end = function (chunk, ...args) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      origEnd.apply(res, [chunk, ...args]);
    };

    res.on('finish', () => {
      const responseText = Buffer.concat(chunks).toString('utf8');
      let parsedBody = responseText;
      try {
        parsedBody = JSON.parse(responseText);
      } catch {}

      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsedBody,
        rawText: responseText
      });
    });

    res.on('error', reject);

    app(req, res);

    if (rawBody) {
      req.push(Buffer.from(rawBody));
    }
    req.push(null);
  });
}

describe('InterviewAI Phase 15: Production Build & Deployment Verification', () => {
  after(async () => {
    await disconnectPrisma();
  });

  // =========================================================================
  // 1. Production Build & Static Asset Verification
  // =========================================================================
  describe('1. Production Build Output & Single-Port Assets', () => {
    test('Frontend dist directory and index.html exist and are valid', () => {
      assert.ok(fs.existsSync(frontendDistPath), 'frontend/dist directory must exist');
      const indexPath = path.join(frontendDistPath, 'index.html');
      assert.ok(fs.existsSync(indexPath), 'frontend/dist/index.html must exist');

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      assert.ok(indexContent.includes('<div id="root"></div>') || indexContent.includes('id="root"'),
        'index.html must define the React root mounting container');
      assert.ok(indexContent.includes('/assets/'), 'index.html must reference bundled production assets');
    });

    test('Bundled production assets exist without leaked development source maps', () => {
      const assetsDir = path.join(frontendDistPath, 'assets');
      assert.ok(fs.existsSync(assetsDir), 'frontend/dist/assets must exist');

      const files = fs.readdirSync(assetsDir);
      assert.ok(files.length > 5, 'Production assets directory must contain compiled chunks');

      // Verify zero sourcemap leakage in production assets
      const sourcemaps = files.filter(f => f.endsWith('.map'));
      assert.equal(sourcemaps.length, 0, 'Production build must not expose .map sourcemap files');
    });
  });

  // =========================================================================
  // 2. Single-Port Serving & React Router SPA Deep Linking
  // =========================================================================
  describe('2. Single-Port Serving & Client-Side Routing Fallback', () => {
    test('Root GET request "/" serves frontend/dist/index.html', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/'
      });

      assert.equal(res.status, 200);
      assert.ok(typeof res.rawText === 'string');
      assert.ok(res.rawText.includes('InterviewAI') || res.rawText.includes('root'));
    });

    test('Deep client-side routes (/login, /dashboard, /practice) fall back to index.html', async () => {
      const clientRoutes = ['/login', '/register', '/dashboard', '/practice', '/mock-interviews', '/analytics'];

      for (const route of clientRoutes) {
        const res = await requestApp(app, {
          method: 'GET',
          url: route
        });

        assert.equal(res.status, 200, `Client route ${route} must return 200 with index.html`);
        assert.ok(res.rawText.includes('root') || res.rawText.includes('InterviewAI'),
          `Client route ${route} must serve SPA index.html fallback`);
      }
    });

    test('API routes maintain precedence over frontend static fallback', async () => {
      const res = await requestApp(app, {
        method: 'GET',
        url: '/api/health'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(typeof res.body, 'object');
      assert.equal(typeof res.body.message, 'string');
      // Must NOT be the HTML page
      assert.equal(typeof res.rawText === 'string' && res.rawText.includes('<!DOCTYPE html>'), false);
    });

    test('Unknown API routes return JSON error and NEVER serve index.html', async () => {
      const unknownApiUrls = [
        '/api/unknown-endpoint-xyz',
        '/api/health/undefined-probe',
        '/api/v99/unknown-service'
      ];

      for (const url of unknownApiUrls) {
        const res = await requestApp(app, {
          method: 'GET',
          url
        });

        assert.equal(res.status, 404, `Expected 404 for ${url}`);
        assert.equal(typeof res.body, 'object');
        assert.equal(res.body.success, false);
        assert.ok(res.body.message.includes('Resource not found'));
        assert.equal(res.rawText.includes('<!DOCTYPE html>'), false, 'API 404 must not return index.html');
      }
    });
  });

  // =========================================================================
  // 3. Reverse Proxy & ngrok HTTPS Cookie Security
  // =========================================================================
  describe('3. Reverse Proxy & ngrok HTTPS Hardening', () => {
    test('Express application enables trusted proxy for reverse proxy tunnels', () => {
      assert.ok(app.get('trust proxy'), 'app.set("trust proxy", 1) must be active for ngrok HTTPS');
    });

    test('setRefreshTokenCookie sets HttpOnly, SameSite=lax, and Path=/api/auth', () => {
      let cookieSet = null;
      const mockRes = {
        cookie(name, val, opts) {
          cookieSet = { name, val, opts };
        },
        req: { secure: false, headers: {} }
      };

      setRefreshTokenCookie(mockRes, 'test-refresh-token-val');

      assert.ok(cookieSet !== null);
      assert.equal(cookieSet.name, REFRESH_COOKIE_NAME);
      assert.equal(cookieSet.val, 'test-refresh-token-val');
      assert.equal(cookieSet.opts.httpOnly, true);
      assert.equal(cookieSet.opts.path, '/api/auth');
      assert.equal(cookieSet.opts.sameSite, 'lax');
    });

    test('setRefreshTokenCookie automatically enables secure: true when HTTPS forwarded by ngrok', () => {
      let cookieSet = null;
      const mockRes = {
        cookie(name, val, opts) {
          cookieSet = { name, val, opts };
        },
        req: {
          secure: true,
          headers: { 'x-forwarded-proto': 'https' }
        }
      };

      setRefreshTokenCookie(mockRes, 'test-secure-token');

      assert.ok(cookieSet !== null);
      assert.equal(cookieSet.opts.secure, true, 'Cookie must be secure when accessed via HTTPS/ngrok');
    });
  });

  // =========================================================================
  // 4. Environment & Secrets Hygiene
  // =========================================================================
  describe('4. Environment Configuration & Secret Protection', () => {
    test('Root .gitignore protects all sensitive environment files and artifacts', () => {
      const gitignorePath = path.join(rootDir, '.gitignore');
      assert.ok(fs.existsSync(gitignorePath));
      const content = fs.readFileSync(gitignorePath, 'utf-8');

      assert.ok(content.includes('.env'));
      assert.ok(content.includes('node_modules/'));
      assert.ok(content.includes('dist/'));
    });

    test('Root .env.example contains placeholder values without leaking live secrets', () => {
      const envExamplePath = path.join(rootDir, '.env.example');
      assert.ok(fs.existsSync(envExamplePath));
      const content = fs.readFileSync(envExamplePath, 'utf-8');

      assert.ok(content.includes('DATABASE_URL='));
      assert.ok(content.includes('JWT_ACCESS_SECRET='));
      assert.ok(content.includes('OPENAI_API_KEY='));
      assert.ok(content.includes('CODE_EXECUTION_PROVIDER='));

      // Must not leak real active live secret tokens
      assert.ok(!content.includes('sk-proj-'));
      assert.ok(!content.includes('postgres://live_prod_secret'));
    });

    test('Frontend source files use relative /api base URL in production', () => {
      const apiServicePath = path.join(rootDir, 'frontend/src/services/api.js');
      const apiContent = fs.readFileSync(apiServicePath, 'utf-8');

      assert.ok(apiContent.includes("import.meta.env.VITE_API_BASE_URL || '/api'"),
        'Frontend must default to same-origin relative /api base URL');
    });

    test('DEPLOYMENT.md guide exists with complete Windows PowerShell instructions', () => {
      const guidePath = path.join(rootDir, 'DEPLOYMENT.md');
      assert.ok(fs.existsSync(guidePath), 'DEPLOYMENT.md must exist in project root');
      const guideContent = fs.readFileSync(guidePath, 'utf-8');

      assert.ok(guideContent.includes('npm run build'));
      assert.ok(guideContent.includes('npm start'));
      assert.ok(guideContent.includes('ngrok http 5000'));
      assert.ok(guideContent.includes('Single-Port'));
      assert.ok(guideContent.includes('Troubleshooting'));
    });
  });
});
