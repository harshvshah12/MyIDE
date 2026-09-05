import crypto from 'crypto';
import type { User } from '../schema/entities.ts';
import { UserRepository } from '../db/repositories.ts';
import { UnauthorizedError } from './errors.ts';
import { constantTimeEqual } from '../crypto.ts';

/**
 * Authentication & Identity Primitives
 *
 * Architecture:
 * - Decoupled from specific auth providers (Google OAuth, GitHub, email).
 * - Phase 3 will plug Google OAuth into this identity abstraction.
 * - Local developer bypass (DEV_AUTH_BYPASS) is strictly forbidden in production.
 */

export interface AuthSession {
  userId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_COOKIE_NAME = 'myide_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'myide-session-secret-hmac-key-minimum-32-chars';

/**
 * Signs a session payload using HMAC-SHA256.
 * Token format: base64(payload) + "." + hex(signature)
 */
export function signSessionToken(session: AuthSession): string {
  const payloadStr = JSON.stringify(session);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payloadB64);
  const signature = hmac.digest('hex');
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and parses a signed session token.
 * Returns null if the token is tampered, malformed, or expired.
 */
export function verifySessionToken(token: string): AuthSession | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payloadB64);
  const expectedSignature = hmac.digest('hex');

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const session: AuthSession = JSON.parse(payloadStr);

    if (session.expiresAt && Date.now() > session.expiresAt) {
      return null; // Expired
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user from the incoming request or session.
 *
 * Evaluation Order:
 * 1. Authorization: Bearer <signed-token> header
 * 2. Cookie: myide_session=<signed-token>
 * 3. Isolated DEV_AUTH_BYPASS (strictly blocked in production)
 */
export async function getCurrentUser(request?: Request): Promise<User | null> {
  // 1. Try Bearer header
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const session = verifySessionToken(token);
      if (session) {
        return UserRepository.findById(session.userId);
      }
    }

    // 2. Try Cookie
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) {
        const token = decodeURIComponent(match[1]);
        const session = verifySessionToken(token);
        if (session) {
          return UserRepository.findById(session.userId);
        }
      }
    }
  }

  // 3. Explicit Developer Bypass (ONLY if explicitly enabled AND never in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const devBypassEnabled = process.env.DEV_AUTH_BYPASS === 'true';

  if (!isProduction && devBypassEnabled) {
    // Isolated, documented developer identity for local testing
    const devEmail = 'dev@local.myide';
    let devUser = UserRepository.findByEmail(devEmail);
    if (!devUser) {
      devUser = UserRepository.save({
        id: 'usr_dev_local',
        email: devEmail,
        name: 'Local Developer',
        authProvider: 'local',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return devUser;
  }

  return null;
}

/**
 * Asserts that a request is authenticated, or throws UnauthorizedError (HTTP 401).
 */
export async function requireUser(request?: Request): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new UnauthorizedError('Authentication required. Please sign in.');
  }
  return user;
}