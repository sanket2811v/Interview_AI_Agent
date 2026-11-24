import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Check root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const rootEnv = {
  provider: process.env.CODE_EXECUTION_PROVIDER,
  url: process.env.CODE_EXECUTION_API_URL,
  keyConfigured: Boolean(process.env.CODE_EXECUTION_API_KEY),
  keyLength: process.env.CODE_EXECUTION_API_KEY ? process.env.CODE_EXECUTION_API_KEY.trim().length : 0,
  hasWhitespace: process.env.CODE_EXECUTION_API_KEY ? process.env.CODE_EXECUTION_API_KEY !== process.env.CODE_EXECUTION_API_KEY.trim() : false,
  startsWithQuote: process.env.CODE_EXECUTION_API_KEY ? (process.env.CODE_EXECUTION_API_KEY.startsWith('"') || process.env.CODE_EXECUTION_API_KEY.startsWith("'")) : false
};

// 2. Check backend .env
const backendEnvConfig = dotenv.config({ path: path.resolve(__dirname, '../.env') });
const backendParsed = backendEnvConfig.parsed || {};
const k = backendParsed.CODE_EXECUTION_API_KEY || process.env.CODE_EXECUTION_API_KEY;

const backendEnv = {
  provider: backendParsed.CODE_EXECUTION_PROVIDER || process.env.CODE_EXECUTION_PROVIDER,
  url: backendParsed.CODE_EXECUTION_API_URL || process.env.CODE_EXECUTION_API_URL,
  keyConfigured: Boolean(k),
  keyLength: k ? k.trim().length : 0,
  hasWhitespace: k ? k !== k.trim() : false,
  startsWithQuote: k ? (k.startsWith('"') || k.startsWith("'")) : false
};

console.log('Root .env diagnostic:', JSON.stringify(rootEnv, null, 2));
console.log('Backend .env diagnostic:', JSON.stringify(backendEnv, null, 2));
