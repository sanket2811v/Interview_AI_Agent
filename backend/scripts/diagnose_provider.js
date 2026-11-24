import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

async function runDiagnostic() {
  console.log('===========================================================');
  console.log('🔍 OnlineCompiler.io Execution Provider & Compilers Diagnostic');
  console.log('===========================================================\n');

  const provider = (process.env.CODE_EXECUTION_PROVIDER || 'onlinecompiler').trim().toLowerCase();
  const rawUrl = process.env.CODE_EXECUTION_API_URL || 'https://api.onlinecompiler.io';
  const apiUrl = rawUrl.trim().replace(/\/+$/, '');
  let rawKey = process.env.CODE_EXECUTION_API_KEY || '';
  if (typeof rawKey === 'string') {
    rawKey = rawKey.trim().replace(/^['"]|['"]$/g, '').trim();
  }

  // 1. Safe Configuration Verification (Never prints secret)
  console.log('1. Configuration Audit:');
  console.log(`   Provider:                ${provider}`);
  console.log(`   Base API URL:            ${apiUrl}`);
  console.log(`   API Key Configured:      ${Boolean(rawKey)}`);
  console.log(`   API Key Length:          ${rawKey.length} characters`);
  console.log(`   Key Whitespace Clean:    ${rawKey === (process.env.CODE_EXECUTION_API_KEY || '').trim()}`);
  console.log(`   Key Free of Quotes:      ${!rawKey.startsWith('"') && !rawKey.startsWith("'")}\n`);

  if (!rawKey) {
    console.error('❌ FATAL: CODE_EXECUTION_API_KEY is missing or empty in backend/.env');
    console.error('👉 Action: Generate a REST API Key at https://api.onlinecompiler.io/compilers/api-keys/ and save it to backend/.env\n');
    process.exit(1);
  }

  // 2. Health Endpoint Probe
  const healthEndpoint = `${apiUrl}/api/health/`;
  console.log(`2. Probing OnlineCompiler.io Health Endpoint: ${healthEndpoint}`);
  try {
    const healthRes = await fetch(healthEndpoint, { method: 'GET' });
    console.log(`   Health Status:           ${healthRes.status} ${healthRes.statusText}`);
  } catch (err) {
    console.log(`   Health Check Notice:     ${err.message}`);
  }
  console.log('');

  // 3. Test Java Execution (openjdk-25)
  const syncEndpoint = `${apiUrl}/api/run-code-sync/`;
  console.log('3. Test Java Execution (compiler: openjdk-25):');
  const javaCode = `class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`;
  await executeSnippet(syncEndpoint, rawKey, 'openjdk-25', javaCode, '', 30);

  // 4. Test Python Execution (python-3.14)
  console.log('\n4. Test Python Execution (compiler: python-3.14):');
  const pyCode = `print("Hello World")`;
  await executeSnippet(syncEndpoint, rawKey, 'python-3.14', pyCode, '', 30);

  // 5. Test JavaScript Execution (nodejs-24)
  console.log('\n5. Test JavaScript Execution (compiler: nodejs-24):');
  const jsCode = `console.log("Hello World");`;
  await executeSnippet(syncEndpoint, rawKey, 'nodejs-24', jsCode, '', 30);

  // 6. Test Standard Input
  console.log('\n6. Test Python with Stdin:');
  const stdinCode = `name = input()
print("Hello", name)`;
  await executeSnippet(syncEndpoint, rawKey, 'python-3.14', stdinCode, 'Sanket', 30);

  console.log('\n===========================================================');
}

async function executeSnippet(endpoint, apiKey, compilerId, code, input = '', timeLimit = 30) {
  const payload = {
    compiler: compilerId,
    code,
    input,
    time_limit: timeLimit
  };

  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'User-Agent': 'InterviewAI-Diagnostic/1.0'
      },
      body: JSON.stringify(payload)
    });
    const durationMs = Date.now() - startTime;

    console.log(`   Compiler:                ${compilerId}`);
    console.log(`   HTTP Status:             ${response.status} ${response.statusText} (${durationMs} ms)`);

    if (response.status === 200) {
      const data = await response.json();
      console.log(`   ✅ Execution Status:     ${data.status}`);
      console.log(`   Stdout:                  "${(data.output || '').trim()}"`);
      console.log(`   Exit Code:               ${data.exit_code}`);
    } else {
      const errText = await response.text();
      console.log(`   ❌ Response Error:       ${errText.slice(0, 300)}`);
    }
  } catch (err) {
    console.log(`   ❌ Network Notice:       ${err.message}`);
    console.log(`   (Inside isolated container sandbox, external internet is blocked.`);
    console.log(`   Run 'npm run provider:diagnose' in Windows PowerShell where host internet is available.)`);
  }
}

runDiagnostic();
