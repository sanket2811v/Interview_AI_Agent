import crypto from 'node:crypto';

/**
 * Modern NIST/OWASP compliant password hashing using scrypt with random salt.
 * Compatible with standard secure authentication requirements.
 */
const SCRYPT_PARAMS = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
  keyLen: 64
};

/**
 * Validate password complexity:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
};

/**
 * Hashes a plaintext password with a 16-byte cryptographically secure salt.
 * Format: scrypt$N=16384,r=8,p=1$hexSalt$hexHash
 */
export const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(
      password,
      salt,
      SCRYPT_PARAMS.keyLen,
      { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p },
      (err, derivedKey) => {
        if (err) return reject(err);
        const hash = derivedKey.toString('hex');
        resolve(`scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt}$${hash}`);
      }
    );
  });
};

/**
 * Verifies a plaintext password against a stored hash using constant-time comparison.
 */
export const comparePassword = (password, storedHash) => {
  return new Promise((resolve) => {
    if (!password || !storedHash || typeof storedHash !== 'string') {
      return resolve(false);
    }

    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      return resolve(false);
    }

    const salt = parts[2];
    const originalHash = Buffer.from(parts[3], 'hex');

    crypto.scrypt(
      password,
      salt,
      originalHash.length,
      { N: SCRYPT_PARAMS.N, r: SCRYPT_PARAMS.r, p: SCRYPT_PARAMS.p },
      (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          // Constant-time comparison to prevent timing attacks
          const isMatch = crypto.timingSafeEqual(originalHash, derivedKey);
          resolve(isMatch);
        } catch {
          resolve(false);
        }
      }
    );
  });
};

/**
 * Bcrypt-compatible interface wrapper
 */
export const bcrypt = {
  hash: (password, rounds = 10) => hashPassword(password),
  compare: (password, hash) => comparePassword(password, hash)
};

export default {
  validatePasswordStrength,
  hashPassword,
  comparePassword,
  bcrypt
};

