import { NextRequest, NextResponse } from 'next/server';
import { generatePkce, generateStateNonce } from '@/lib/auth/oauth';
import { buildOpenAIAuthUrl } from '@/lib/auth/oauth-openai';
import { getOpenAIOAuthConfig } from '@/lib/auth/openai-oauth-config';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/openai`;
  const oauthConfig = getOpenAIOAuthConfig();

  if (!oauthConfig.isConfigured || !oauthConfig.clientId) {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    if (isDemo || process.env.NODE_ENV !== 'production') {
      // In development or when demo=true, redirect to seamless local OpenAI login
      const mockUrl = new URL('/api/auth/mock-openai', origin);
      mockUrl.searchParams.set('email', 'chatgpt.developer@openai.com');
      mockUrl.searchParams.set('name', 'ChatGPT Developer');
      mockUrl.searchParams.set('redirect', '/');
      return NextResponse.redirect(mockUrl);
    }

    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'OpenAI OAuth Client ID & Secret must be configured in OpenAI Platform.',
        redirectUri,
        instructions: `Create an OAuth app with Authorized Redirect URI: ${redirectUri}`,
      },
      { status: 400 }
    );
  }

  const { codeVerifier, codeChallenge } = generatePkce();
  const state = generateStateNonce();

  const authUrl = buildOpenAIAuthUrl({
    clientId: oauthConfig.clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  const response = NextResponse.redirect(authUrl);
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';

  // Store PKCE verifier and state nonce in short-lived HTTP-only cookies
  response.headers.append(
    'Set-Cookie',
    `myide_openai_oauth_state=${encodeURIComponent(state)}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax${secureFlag}`
  );
  response.headers.append(
    'Set-Cookie',
    `myide_openai_oauth_verifier=${encodeURIComponent(codeVerifier)}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax${secureFlag}`
  );

  return response;
}
