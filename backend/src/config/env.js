import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicit absolute paths for both root and backend environment files
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');

// 1. Load root .env if it exists
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// 2. Load backend/.env if it exists (allows backend-specific overrides, but never shadows a non-empty key with an empty string)
if (fs.existsSync(backendEnvPath)) {
  const backendParsed = dotenv.parse(fs.readFileSync(backendEnvPath, 'utf8'));
  for (const [key, val] of Object.entries(backendParsed)) {
    // Only override if the backend value is non-empty, or if process.env[key] is not yet set
    const trimmedVal = typeof val === 'string' ? val.trim() : val;
    if (trimmedVal !== '' && trimmedVal !== '""' && trimmedVal !== "''") {
      process.env[key] = val;
    } else if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// 3. Fallback: If process.env.OPENAI_API_KEY is empty or missing, check root .env directly
if ((!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) && fs.existsSync(rootEnvPath)) {
  const rootParsed = dotenv.parse(fs.readFileSync(rootEnvPath, 'utf8'));
  if (rootParsed.OPENAI_API_KEY && rootParsed.OPENAI_API_KEY.trim()) {
    process.env.OPENAI_API_KEY = rootParsed.OPENAI_API_KEY.trim();
  }
}

// 4. Code Execution fallback: ensure CODE_EXECUTION_API_KEY is loaded and cleaned
if ((!process.env.CODE_EXECUTION_API_KEY || !process.env.CODE_EXECUTION_API_KEY.trim()) && fs.existsSync(backendEnvPath)) {
  const backendParsed = dotenv.parse(fs.readFileSync(backendEnvPath, 'utf8'));
  if (backendParsed.CODE_EXECUTION_API_KEY && backendParsed.CODE_EXECUTION_API_KEY.trim()) {
    process.env.CODE_EXECUTION_API_KEY = backendParsed.CODE_EXECUTION_API_KEY.trim().replace(/^['"]|['"]$/g, '');
  }
}

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  BACKEND_URL: z.string().default('http://localhost:5000'),

  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().default('interviewai_access_secret_development_key_32chars!'),
  JWT_REFRESH_SECRET: z.string().default('interviewai_refresh_secret_development_key_32chars!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cookie Settings
  COOKIE_SECURE: z.string().default('false').transform((val) => val === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // SMTP Email Settings
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('InterviewAI <no-reply@interviewai.dev>'),

  // Token Lifetimes
  PASSWORD_RESET_EXPIRES_MINUTES: z.string().default('30').transform((val) => parseInt(val, 10)),
  EMAIL_VERIFICATION_EXPIRES_HOURS: z.string().default('24').transform((val) => parseInt(val, 10)),

  // OpenAI Configuration (Phase 6)
  OPENAI_API_KEY: z
    .string()
    .optional()
    .default('')
    .transform((val) => (typeof val === 'string' ? val.trim().replace(/^['"]|['"]$/g, '') : '')),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TIMEOUT_MS: z.string().default('60000').transform((val) => parseInt(val, 10)),
  OPENAI_MAX_RETRIES: z.string().default('2').transform((val) => parseInt(val, 10)),
  OPENAI_MAX_INPUT_CHARS: z.string().default('30000').transform((val) => parseInt(val, 10)),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),

  // Code Execution Configuration (Phase 9)
  CODE_EXECUTION_PROVIDER: z.string().default('onlinecompiler').transform((val) => val.trim().toLowerCase()),
  CODE_EXECUTION_ENABLED: z.string().default('true').transform((val) => val === 'true'),
  CODE_EXECUTION_API_URL: z.string().default('https://api.onlinecompiler.io').transform((val) => val.trim().replace(/\/+$/, '')),
  CODE_EXECUTION_API_KEY: z
    .string()
    .optional()
    .default('')
    .transform((val) => (typeof val === 'string' ? val.trim().replace(/^['"]|['"]$/g, '') : '')),
  CODE_EXECUTION_TIMEOUT_MS: z.string().default('30000').transform((val) => parseInt(val, 10))
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;
export default env;
