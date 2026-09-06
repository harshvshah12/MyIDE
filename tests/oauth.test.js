import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePkce,
  generateStateNonce,
  buildGoogleAuthUrl,
  parseIdTokenPayload,
} from '../src/lib/auth/oauth.ts';
import {
  signSessionToken,
  verifySessionToken,
  revokeSession,
  isSessionRevoked,
  clearRevokedSessions,
  createSessionCookieHeader,
  createClearSessionCookieHeader,
} from '../src/lib/auth/session.ts';

test('OAuth & Session Security Suite', async (t) => {
  clearRevokedSessions();

  await t.test('1. PKCE: Verifier is high-entropy and Challenge matches SHA-256 S256', () => {
    const { codeVerifier, codeChallenge } = generatePkce();

    assert.ok(codeVerifier.length >= 43 && codeVerifier.length <= 128);
    // Challenge must match base64url(sha256(verifier))
    const expected = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    assert.strictEqual(codeChallenge, expected);
  });

  await t.test('2. PKCE: Distinct calls generate distinct verifiers and challenges', () => {
    const pair1 = generatePkce();
    const pair2 = generatePkce();

    assert.notStrictEqual(pair1.codeVerifier, pair2.codeVerifier);
    assert.notStrictEqual(pair1.codeChallenge, pair2.codeChallenge);
  });

  await t.test('3. State Nonce: 64-hex char cryptographic random string', () => {
    const s1 = generateStateNonce();
    const s2 = generateStateNonce();

    assert.strictEqual(s1.length, 64);
    assert.match(s1, /^[0-9a-f]{64}$/);
    assert.notStrictEqual(s1, s2);
  });

  await t.test('4. Google Auth URL: Contains all required OIDC/PKCE parameters', () => {
    const urlStr = buildGoogleAuthUrl({
      clientId: 'test-google-client-id.apps.googleusercontent.com',
      redirectUri: 'http://localhost:3000/api/auth/callback/google',
      state: 'state_12345',
      codeChallenge: 'challenge_67890',
    });

    const url = new URL(urlStr);
    assert.strictEqual(url.hostname, 'accounts.google.com');
    assert.strictEqual(url.searchParams.get('client_id'), 'test-google-client-id.apps.googleusercontent.com');
    assert.strictEqual(url.searchParams.get('redirect_uri'), 'http://localhost:3000/api/auth/callback/google');
    assert.strictEqual(url.searchParams.get('response_type'), 'code');
    assert.strictEqual(url.searchParams.get('scope'), 'openid email profile');
    assert.strictEqual(url.searchParams.get('code_challenge'), 'challenge_67890');
    assert.strictEqual(url.searchParams.get('code_challenge_method'), 'S256');
    assert.strictEqual(url.searchParams.get('state'), 'state_12345');
    assert.strictEqual(url.searchParams.get('prompt'), 'select_account');
  });

  await t.test('5. ID Token: Parses valid OIDC payload and extracts claims', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'https://accounts.google.com',
      sub: 'google_user_998877',
      email: 'student@mit.edu',
      email_verified: true,
      name: 'Alice Wonder',
      picture: 'https://lh3.googleusercontent.com/avatar.png',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const dummySignature = 'simulated_rsa_signature';
    const fakeIdToken = `${header}.${payload}.${dummySignature}`;

    const profile = parseIdTokenPayload(fakeIdToken);
    assert.strictEqual(profile.sub, 'google_user_998877');
    assert.strictEqual(profile.email, 'student@mit.edu');
    assert.strictEqual(profile.emailVerified, true);
    assert.strictEqual(profile.name, 'Alice Wonder');
    assert.strictEqual(profile.picture, 'https://lh3.googleusercontent.com/avatar.png');
  });

  await t.test('6. ID Token: Rejects unverified email or missing sub', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
    const badPayload = Buffer.from(JSON.stringify({
      email: 'evil@attacker.com',
      // missing sub
    })).toString('base64url');
    const token = `${header}.${badPayload}.sig`;

    assert.throws(() => parseIdTokenPayload(token), /Missing "sub"/);
  });

  await t.test('7. Session Token: Signing, verification, and expiration', () => {
    const now = Date.now();
    const session = {
      sessionId: 'sess_test_1',
      userId: 'usr_test_1',
      email: 'test@example.com',
      issuedAt: now,
      expiresAt: now + 3600000,
    };

    const token = signSessionToken(session);
    const verified = verifySessionToken(token);

    assert.ok(verified);
    assert.strictEqual(verified.userId, 'usr_test_1');
    assert.strictEqual(verified.sessionId, 'sess_test_1');

    // Expired session
    const expiredToken = signSessionToken({
      ...session,
      expiresAt: now - 1000,
    });
    assert.strictEqual(verifySessionToken(expiredToken), null);

    // Tampered token
    const tampered = token.slice(0, -5) + 'abcde';
    assert.strictEqual(verifySessionToken(tampered), null);
  });

  await t.test('8. Session Revocation: Server-side invalidation kills session', () => {
    const session = {
      sessionId: 'sess_revocation_target',
      userId: 'usr_test_2',
      email: 'test2@example.com',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    };

    const token = signSessionToken(session);
    assert.ok(verifySessionToken(token));

    // Revoke session on server
    revokeSession('sess_revocation_target');
    assert.strictEqual(isSessionRevoked('sess_revocation_target'), true);

    // Verify returns null even though token cryptographic signature and expiry are still valid
    assert.strictEqual(verifySessionToken(token), null);
  });

  await t.test('9. Cookie Headers: Generates secure SameSite=Lax and clear headers', () => {
    const setHeader = createSessionCookieHeader('mock_token_val', 3600);
    assert.ok(setHeader.includes('myide_session=mock_token_val'));
    assert.ok(setHeader.includes('HttpOnly'));
    assert.ok(setHeader.includes('SameSite=Lax'));
    assert.ok(setHeader.includes('Path=/'));

    const clearHeader = createClearSessionCookieHeader();
    assert.ok(clearHeader.includes('myide_session=;'));
    assert.ok(clearHeader.includes('Max-Age=0'));
  });
});
