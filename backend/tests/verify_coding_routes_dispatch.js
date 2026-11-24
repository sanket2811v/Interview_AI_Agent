import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';

function dispatchMockRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const socket = { remoteAddress: '127.0.0.1', encrypted: false };
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.socket = socket;
    req.connection = socket;
    req.headers = {
      'content-type': 'application/json',
      host: 'localhost:5000',
      ...headers
    };

    const res = new http.ServerResponse(req);
    let rawBody = '';
    res.write = (chunk) => {
      rawBody += chunk;
      return true;
    };
    res.end = (chunk) => {
      if (chunk) rawBody += chunk;
      let parsed = null;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        parsed = rawBody;
      }
      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: parsed
      });
    };

    if (body !== null) {
      req.push(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.push(null);

    try {
      app.handle(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function runAudit() {
  console.log('=== CODING ARENA ROUTE DISPATCH & VALIDATION AUDIT ===\n');

  // Test 1: POST /api/coding/run with empty body (must return 400 validation error, NEVER 404)
  console.log('Test 1: POST /api/coding/run with empty body');
  const res1 = await dispatchMockRequest('POST', '/api/coding/run', {});
  console.log(`Status: ${res1.statusCode}`);
  console.log(`Body:`, res1.body);
  assert.equal(res1.statusCode, 400, 'Expected 400 Validation Error for empty body, not 404');
  assert.equal(res1.body.success, false);
  assert.equal(res1.body.message, 'Validation failed');
  console.log('-> PASS: POST /api/coding/run exists and rejected empty payload with 400 Validation Error\n');

  // Test 2: POST /api/run top-level alias with empty body (must return 400 validation error, NEVER 404)
  console.log('Test 2: POST /api/run (alias) with empty body');
  const res2 = await dispatchMockRequest('POST', '/api/run', {});
  console.log(`Status: ${res2.statusCode}`);
  assert.equal(res2.statusCode, 400, 'Expected 400 Validation Error for alias');
  console.log('-> PASS: POST /api/run alias exists and rejected empty payload with 400 Validation Error\n');

  // Test 3: GET /api/coding/languages (must return 200 with language list)
  console.log('Test 3: GET /api/coding/languages');
  const res3 = await dispatchMockRequest('GET', '/api/coding/languages');
  console.log(`Status: ${res3.statusCode}, Languages count: ${res3.body?.data?.languages?.length}`);
  assert.equal(res3.statusCode, 200);
  assert.ok(res3.body?.data?.languages?.length >= 8);
  console.log('-> PASS: GET /api/coding/languages returns 200 with full language suite\n');

  // Test 4: GET /api/coding/starter-code?language=java (must return 200 with Main.java)
  console.log('Test 4: GET /api/coding/starter-code?language=java');
  const res4 = await dispatchMockRequest('GET', '/api/coding/starter-code?language=java');
  console.log(`Status: ${res4.statusCode}, File: ${res4.body?.data?.fileName}`);
  assert.equal(res4.statusCode, 200);
  assert.equal(res4.body?.data?.fileName, 'Main.java');
  console.log('-> PASS: Starter code for Java correctly resolves Main.java\n');

  // Test 5: Verify that non-existent route returns 404 as expected
  console.log('Test 5: GET /api/coding/nonexistent-route-xyz');
  const res5 = await dispatchMockRequest('GET', '/api/coding/nonexistent-route-xyz');
  console.log(`Status: ${res5.statusCode}`);
  assert.equal(res5.statusCode, 404);
  assert.ok(res5.body?.message?.includes('Resource not found'));
  console.log('-> PASS: Undefined routes correctly hit 404 notFoundHandler\n');

  console.log('=== ALL 5 ROUTE DISPATCH TESTS PASSED PERFECTLY ===');
  process.exit(0);
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
