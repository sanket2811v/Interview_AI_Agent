import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import { disconnectPrisma } from '../src/config/prisma.js';

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
    req.headers = { host: 'localhost:5000', ...headers };

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
        rawLength: responseText.length,
        isHtml: typeof responseText === 'string' && responseText.toLowerCase().includes('<!doctype html>')
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

async function verify() {
  console.log('================================================================');
  console.log('InterviewAI Phase 15 Single-Port Unified Production Verification');
  console.log('================================================================\n');

  const testEndpoints = [
    { name: 'Root Landing Page', url: '/', expectedStatus: 200, expectHtml: true },
    { name: 'SPA Deep Link: /login', url: '/login', expectedStatus: 200, expectHtml: true },
    { name: 'SPA Deep Link: /dashboard', url: '/dashboard', expectedStatus: 200, expectHtml: true },
    { name: 'SPA Deep Link: /practice', url: '/practice', expectedStatus: 200, expectHtml: true },
    { name: 'SPA Deep Link: /mock-interviews', url: '/mock-interviews', expectedStatus: 200, expectHtml: true },
    { name: 'SPA Deep Link: /analytics', url: '/analytics', expectedStatus: 200, expectHtml: true },
    { name: 'API Liveness Health Check', url: '/api/health', expectedStatus: 200, expectHtml: false },
    { name: 'API Database Health Probe', url: '/api/health/database', expectedStatus: [200, 503], expectHtml: false },
    { name: 'API Undefined Route 404 Check', url: '/api/completely-undefined-xyz', expectedStatus: 404, expectHtml: false }
  ];

  const results = [];

  for (const ep of testEndpoints) {
    const res = await requestApp(app, { method: 'GET', url: ep.url });
    const statusMatch = Array.isArray(ep.expectedStatus)
      ? ep.expectedStatus.includes(res.status)
      : res.status === ep.expectedStatus;
    const htmlMatch = ep.expectHtml ? res.isHtml : !res.isHtml;
    const passed = statusMatch && htmlMatch;

    results.push({
      Target: ep.name,
      Route: ep.url,
      Status: res.status,
      Type: res.isHtml ? 'text/html (SPA)' : (res.headers['content-type'] || 'application/json'),
      Length: `${res.rawLength} B`,
      Result: passed ? 'PASS' : 'FAIL'
    });
  }

  console.table(results);
  await disconnectPrisma();

  const allPassed = results.every(r => r.Result === 'PASS');
  if (allPassed) {
    console.log('\n[PASS] All 9 single-port routes passed with 100% compliance.');
  } else {
    console.error('\n[FAIL] Some routes failed verification.');
    process.exit(1);
  }
}

verify().catch(console.error);
