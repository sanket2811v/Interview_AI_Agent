import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword, validatePasswordStrength } from '../src/utils/password.js';
import { jwt, JsonWebTokenError, TokenExpiredError } from '../src/utils/jwt.js';
import { generateRandomToken, hashToken, generateAuthTokens } from '../src/utils/tokens.js';
import { cookieParser } from '../src/utils/cookies.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} from '../src/validators/auth.validator.js';
import { requireAuth } from '../src/middleware/auth.middleware.js';
import app from '../src/app.js';

describe('InterviewAI Phase 3 Authentication & Security Test Suite', () => {
  // 1. Password Complexity Validation
  describe('1. Password Policy & Complexity', () => {
    test('Rejects passwords under 8 characters', () => {
      const res = validatePasswordStrength('Ab1!');
      assert.equal(res.valid, false);
      assert.ok(res.message.includes('8 characters'));
    });

    test('Rejects passwords missing uppercase letters', () => {
      const res = validatePasswordStrength('password123!');
      assert.equal(res.valid, false);
      assert.ok(res.message.includes('uppercase'));
    });

    test('Rejects passwords missing lowercase letters', () => {
      const res = validatePasswordStrength('PASSWORD123!');
      assert.equal(res.valid, false);
      assert.ok(res.message.includes('lowercase'));
    });

    test('Rejects passwords missing numeric digits', () => {
      const res = validatePasswordStrength('PasswordLong!');
      assert.equal(res.valid, false);
      assert.ok(res.message.includes('number'));
    });

    test('Rejects passwords missing special characters', () => {
      const res = validatePasswordStrength('Password1234');
      assert.equal(res.valid, false);
      assert.ok(res.message.includes('special character'));
    });

    test('Accepts compliant complex password', () => {
      const res = validatePasswordStrength('SecureP@ssw0rd2026!');
      assert.equal(res.valid, true);
    });
  });

  // 2. Cryptographic Password Hashing & Constant-Time Verification
  describe('2. Cryptographic Password Hashing (scrypt / timing-safe)', () => {
    test('Hashes password with random salt and matches original', async () => {
      const password = 'SuperSecret123$#';
      const hash = await hashPassword(password);

      assert.ok(hash.startsWith('scrypt$'), 'Hash should be scrypt format');
      assert.ok(!hash.includes(password), 'Hash must never contain plaintext password');

      const isMatch = await comparePassword(password, hash);
      assert.equal(isMatch, true, 'Original password must verify successfully');

      const isWrongMatch = await comparePassword('IncorrectPassword1!', hash);
      assert.equal(isWrongMatch, false, 'Incorrect password must be rejected');
    });

    test('Two identical passwords produce distinct hashes due to random salt', async () => {
      const password = 'IdenticalPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      assert.notEqual(hash1, hash2, 'Hashes must differ due to unique salts');
      assert.equal(await comparePassword(password, hash1), true);
      assert.equal(await comparePassword(password, hash2), true);
    });
  });

  // 3. JWT Signing, Verification, and Expiration
  describe('3. JWT Access Token Architecture (HS256)', () => {
    const testSecret = 'test_jwt_secret_key_long_enough_for_security_32';

    test('Signs payload and verifies claims correctly', () => {
      const payload = { userId: 'usr-1234', email: 'test@interviewai.dev' };
      const token = jwt.sign(payload, testSecret, { expiresIn: '15m' });

      assert.ok(typeof token === 'string' && token.split('.').length === 3);

      const decoded = jwt.verify(token, testSecret);
      assert.equal(decoded.userId, 'usr-1234');
      assert.equal(decoded.email, 'test@interviewai.dev');
      assert.ok(decoded.iat);
      assert.ok(decoded.exp);
      assert.equal(decoded.exp - decoded.iat, 900); // 15 minutes
    });

    test('Rejects tokens tampered with an invalid signature', () => {
      const token = jwt.sign({ userId: 'usr-1234' }, testSecret);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature`;

      assert.throws(() => jwt.verify(tamperedToken, testSecret), JsonWebTokenError);
    });

    test('Rejects tokens verified with the wrong secret', () => {
      const token = jwt.sign({ userId: 'usr-1234' }, testSecret);
      assert.throws(() => jwt.verify(token, 'different_wrong_secret_key_123'), JsonWebTokenError);
    });

    test('Rejects expired JWT tokens', () => {
      // Create a token expired in the past
      const token = jwt.sign({ userId: 'usr-expired', iat: 1000 }, testSecret, { expiresIn: '1s' });
      assert.throws(() => jwt.verify(token, testSecret), TokenExpiredError);
    });
  });

  // 4. Token Generation & Hashing for Sessions & Recovery
  describe('4. Token Security & Hashing', () => {
    test('Generates cryptographically random 64-character hex tokens', () => {
      const t1 = generateRandomToken();
      const t2 = generateRandomToken();

      assert.equal(t1.length, 64);
      assert.equal(t2.length, 64);
      assert.notEqual(t1, t2);
    });

    test('SHA-256 token hash is deterministic and collision-safe', () => {
      const raw = 'my-verification-token-sample';
      const hash1 = hashToken(raw);
      const hash2 = hashToken(raw);

      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64);
      assert.notEqual(raw, hash1);
    });

    test('generateAuthTokens creates paired access JWT and refresh token hash', () => {
      const user = { id: 'usr-555', email: 'dev@interviewai.dev', isEmailVerified: true };
      const tokens = generateAuthTokens(user);

      assert.ok(tokens.accessToken);
      assert.ok(tokens.rawRefreshToken);
      assert.ok(tokens.refreshTokenHash);
      assert.ok(tokens.refreshExpiresAt instanceof Date);
      assert.equal(tokens.refreshTokenHash, hashToken(tokens.rawRefreshToken));
    });
  });

  // 5. Registration & Login Zod Validation
  describe('5. Input Validation Schemas', () => {
    test('Registration schema enforces required fields and password matching', () => {
      // Successful registration payload
      const valid = registerSchema.safeParse({
        name: 'Alex Rivera',
        email: 'ALEX@INTERVIEWAI.DEV',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        termsAccepted: true
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.email, 'alex@interviewai.dev'); // normalized to lowercase

      // Passwords do not match
      const mismatch = registerSchema.safeParse({
        name: 'Alex Rivera',
        email: 'alex@interviewai.dev',
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword123!',
        termsAccepted: true
      });
      assert.equal(mismatch.success, false);

      // Terms not accepted
      const noTerms = registerSchema.safeParse({
        name: 'Alex Rivera',
        email: 'alex@interviewai.dev',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        termsAccepted: false
      });
      assert.equal(noTerms.success, false);
    });

    test('Login schema enforces email and non-empty password', () => {
      const valid = loginSchema.safeParse({
        email: 'User@Example.COM',
        password: 'anyPassword'
      });
      assert.equal(valid.success, true);
      assert.equal(valid.data.email, 'user@example.com');

      const invalidEmail = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'pwd'
      });
      assert.equal(invalidEmail.success, false);
    });

    test('Change password schema rejects identical old and new passwords', () => {
      const rejected = changePasswordSchema.safeParse({
        currentPassword: 'CurrentPassword123!',
        newPassword: 'CurrentPassword123!',
        confirmPassword: 'CurrentPassword123!'
      });
      assert.equal(rejected.success, false);
      assert.ok(
        rejected.error.issues.some((i) => i.message.includes('cannot be the same'))
      );
    });
  });

  // 6. Cookie Parser Middleware
  describe('6. Cookie Parser Middleware', () => {
    test('Parses multiple incoming cookies into req.cookies object', () => {
      const req = {
        headers: {
          cookie: 'interviewai_refresh_token=secret_refresh_val; theme=dark; session=abc%20123'
        }
      };
      const res = {};
      cookieParser(req, res, () => {});

      assert.equal(req.cookies.interviewai_refresh_token, 'secret_refresh_val');
      assert.equal(req.cookies.theme, 'dark');
      assert.equal(req.cookies.session, 'abc 123');
    });

    test('Handles missing cookie header safely with empty object', () => {
      const req = { headers: {} };
      const res = {};
      cookieParser(req, res, () => {});
      assert.deepEqual(req.cookies, {});
    });
  });

  // 7. Authentication Middleware Protection
  describe('7. Authentication Middleware Security', () => {
    test('Returns 401 when Authorization header is missing', async () => {
      const req = { headers: {} };
      let statusCalled = null;
      let jsonPayload = null;

      const res = {
        status(code) {
          statusCalled = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
          return this;
        }
      };

      await requireAuth(req, res, () => {});
      assert.equal(statusCalled, 401);
      assert.equal(jsonPayload.success, false);
      assert.ok(jsonPayload.message.includes('Missing Bearer'));
    });

    test('Returns 401 when token has invalid signature', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token.signature' } };
      let statusCalled = null;
      let jsonPayload = null;

      const res = {
        status(code) {
          statusCalled = code;
          return this;
        },
        json(data) {
          jsonPayload = data;
          return this;
        }
      };

      await requireAuth(req, res, () => {});
      assert.equal(statusCalled, 401);
      assert.equal(jsonPayload.code, 'INVALID_TOKEN');
    });
  });
});

