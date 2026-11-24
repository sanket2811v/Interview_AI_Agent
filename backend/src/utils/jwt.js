import crypto from 'node:crypto';

export class JsonWebTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JsonWebTokenError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message, expiredAt) {
    super(message);
    this.name = 'TokenExpiredError';
    this.expiredAt = expiredAt;
  }
}

function base64urlEncode(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  return buf.toString('base64url');
}

function base64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function parseDuration(duration) {
  if (typeof duration === 'number') return duration;
  if (!duration || typeof duration !== 'string') return 900; // default 15m

  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 900;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return value;
  }
}

/**
 * Standard RFC 7519 JWT implementation using HMAC-SHA256 (HS256)
 */
export const jwt = {
  sign(payload, secret, options = {}) {
    if (!secret || typeof secret !== 'string') {
      throw new Error('JWT secret must be a non-empty string');
    }

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const claims = { ...payload };

    if (!claims.iat) {
      claims.iat = now;
    }

    if (options.expiresIn) {
      claims.exp = claims.iat + parseDuration(options.expiresIn);
    }

    const encodedHeader = base64urlEncode(header);
    const encodedPayload = base64urlEncode(claims);
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest();

    const encodedSignature = base64urlEncode(signature);
    return `${dataToSign}.${encodedSignature}`;
  },

  verify(token, secret) {
    if (!token || typeof token !== 'string') {
      throw new JsonWebTokenError('jwt must be provided');
    }
    if (!secret || typeof secret !== 'string') {
      throw new Error('secret must be a non-empty string');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new JsonWebTokenError('jwt malformed');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // Verify signature with constant-time equality
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();

    const actualSignature = Buffer.from(encodedSignature, 'base64url');

    if (expectedSignature.length !== actualSignature.length || !crypto.timingSafeEqual(expectedSignature, actualSignature)) {
      throw new JsonWebTokenError('invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(base64urlDecode(encodedPayload));
    } catch {
      throw new JsonWebTokenError('invalid token payload');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now >= payload.exp) {
      throw new TokenExpiredError('jwt expired', new Date(payload.exp * 1000));
    }

    return payload;
  },

  decode(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      return JSON.parse(base64urlDecode(parts[1]));
    } catch {
      return null;
    }
  }
};

export default jwt;

