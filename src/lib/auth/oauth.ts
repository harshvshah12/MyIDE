import crypto from 'crypto';

/**
 * OpenID Connect & PKCE Primitives (RFC 7636)
 */

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface GoogleOidcProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

/**
 * Generates a high-entropy code verifier for PKCE.
 * Range: 43-128 characters (using 64 random bytes -> 86 chars base64url).
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('base64url');
}

/**
 * Calculates the S256 code challenge for a given code verifier.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
}

/**
 * Generates a complete PKCE pair.
 */
export function generatePkce(): PkcePair {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

/**
 * Generates a cryptographically random state nonce to prevent CSRF.
 */
export function generateStateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Builds the Google OAuth 2.0 authorization URL.
 */
export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('access_type', 'offline');
  return url.toString();
}

/**
 * Exchanges authorization code for Google tokens.
 */
export async function exchangeGoogleAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ idToken: string; accessToken: string }> {
  const body = new URLSearchParams({
    code: params.code,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.id_token) {
    throw new Error('Google token exchange did not return an id_token.');
  }

  return {
    idToken: data.id_token,
    accessToken: data.access_token,
  };
}

/**
 * Parses and validates an OIDC profile from Google ID Token payload or userinfo.
 */
export function parseIdTokenPayload(idToken: string): GoogleOidcProfile {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: expected 3 parts');
  }

  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new Error('Missing "sub" in token payload');
    }
    if (!payload.email || typeof payload.email !== 'string') {
      throw new Error('Missing "email" in token payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name || payload.email.split('@')[0],
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    };
  } catch (err: any) {
    throw new Error(`Failed to parse ID token payload: ${err.message}`);
  }
}
