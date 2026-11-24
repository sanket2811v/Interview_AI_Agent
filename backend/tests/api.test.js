import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import stream from 'node:stream';
import app from '../src/app.js';
import { disconnectPrisma } from '../src/config/prisma.js';

/**
 * Executes requests directly against Express in-memory using Duplex stream sockets.
 * Runs at native in-process speed without requiring external TCP network binds.
 */
function requestApp(app, { method = 'GET', url = '/', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const socket = new stream.Duplex({
      read() {},
      write(chunk, encoding, callback) {
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
        body: parsedBody
      });
    });

    res.on('error', reject);

    // Dispatch request into Express app
    app(req, res);

    if (rawBody) {
      req.push(Buffer.from(rawBody));
    }
    req.push(null);
  });
}

describe('InterviewAI Backend API Test Suite', () => {
  after(async () => {
    await disconnectPrisma();
  });

  // 1. Backend health endpoint
  test('1. GET /api/health returns 200 with valid payload', async () => {
    const response = await requestApp(app, { method: 'GET', url: '/api/health' });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'InterviewAI API is running');
    assert.ok(response.body.environment);
    assert.ok(response.body.timestamp);
    assert.ok(!isNaN(Date.parse(response.body.timestamp)));
  });

  // 2. Database connectivity endpoint
  test('2. GET /api/health/database checks PostgreSQL via Prisma', async () => {
    const response = await requestApp(app, { method: 'GET', url: '/api/health/database' });

    assert.ok([200, 503].includes(response.status));
    assert.ok(typeof response.body.success === 'boolean');
    assert.ok(response.body.database === 'connected' || response.body.database === 'disconnected');
    assert.ok(response.body.timestamp);

    // Security check: Never expose database passwords or credentials
    const responseString = JSON.stringify(response.body);
    assert.ok(!responseString.includes('postgresql://'));
    assert.ok(!responseString.includes('password'));
    assert.ok(!responseString.includes('Sanket@2811'));
  });

  // 3. Invalid API routes (404 handling)
  test('3. GET /api/non-existent-route returns 404 with JSON structure', async () => {
    const response = await requestApp(app, { method: 'GET', url: '/api/invalid-endpoint-path' });

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.ok(response.body.message.includes('Resource not found'));
    assert.ok(response.body.timestamp);
  });

  // 4. Centralized error handling for malformed JSON
  test('4. Malformed JSON payload is caught by centralized error middleware (400)', async () => {
    const response = await requestApp(app, {
      method: 'POST',
      url: '/api/health',
      headers: { 'content-type': 'application/json' },
      body: '{"badJson": invalid}'
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.ok(response.body.message.includes('Malformed JSON'));
    assert.ok(response.body.timestamp);
  });

  // 5. Frontend API client connection simulation (CORS headers)
  test('5. Frontend client connection simulation (CORS headers)', async () => {
    const response = await requestApp(app, {
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'http://localhost:5173' }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.headers['access-control-allow-origin']);
  });
});
