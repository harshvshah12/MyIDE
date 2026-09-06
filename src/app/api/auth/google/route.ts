import { NextRequest, NextResponse } from 'next/server';
import { generatePkce, generateStateNonce, buildGoogleAuthUrl } from '@/lib/auth/oauth';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;

  if (!clientId) {
    // If not configured and in non-production, redirect to mock login if available
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      return NextResponse.redirect(new URL('/api/auth/mock', request.url));
    }
    return NextResponse.json(
      { success: false, error: 'Google OAuth Client ID is not configured in environment variables.' },
      { status: 500 }
    );
  }

  const { codeVerifier, codeChallenge } = generatePkce();
  const state = generateStateNonce();

  const authUrl = buildGoogleAuthUrl({
    clientId,
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
    `myide_oauth_state=${encodeURIComponent(state)}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax${secureFlag}`
  );
  response.headers.append(
    'Set-Cookie',
    `myide_oauth_verifier=${encodeURIComponent(codeVerifier)}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax${secureFlag}`
  );

  return response;
}
