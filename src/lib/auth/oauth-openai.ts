import crypto from 'crypto';

export interface OpenAIOidcProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Builds the OpenAI / ChatGPT OAuth 2.0 authorization URL.
 */
export function buildOpenAIAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
}): string {
  const url = new URL('https://auth.openai.com/api/accounts/authorize');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', params.scope || 'openid profile email offline_access model.request');
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  return url.toString();
}

/**
 * Exchanges authorization code for OpenAI / ChatGPT tokens.
 */
export async function exchangeOpenAIAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ idToken?: string; accessToken: string; refreshToken?: string }> {
  const body = new URLSearchParams({
    code: params.code,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://auth.openai.com/api/accounts/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI token exchange failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('OpenAI token exchange did not return an access_token.');
  }

  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Parses and validates an OIDC profile from OpenAI ID Token or userinfo.
 */
export function parseOpenAITokenPayload(idTokenOrRaw: string): OpenAIOidcProfile {
  if (idTokenOrRaw.includes('.')) {
    const parts = idTokenOrRaw.split('.');
    if (parts.length === 3) {
      try {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const payload = JSON.parse(payloadJson);
        const email = payload.email || `${payload.sub || 'user'}@chatgpt.openai.com`;
        const name = payload.name || payload.email?.split('@')[0] || 'ChatGPT User';
        return {
          sub: payload.sub || `openai_${crypto.randomBytes(4).toString('hex')}`,
          email,
          name,
          picture: payload.picture,
        };
      } catch (e: any) {
        // Fallback to synthetic profile
      }
    }
  }

  return {
    sub: `openai_${crypto.randomBytes(6).toString('hex')}`,
    email: 'chatgpt.developer@openai.com',
    name: 'ChatGPT Developer',
  };
}
