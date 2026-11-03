import { NextRequest, NextResponse } from 'next/server';
import { generatePkce, generateStateNonce, buildGoogleAuthUrl } from '@/lib/auth/oauth';
import { getGoogleOAuthConfig } from '@/lib/auth/oauth-config';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;
  const oauthConfig = getGoogleOAuthConfig();

  if (!oauthConfig.isConfigured || !oauthConfig.clientId) {
    // Return friendly setup instructions with current redirectUri
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'Google OAuth Client ID & Secret must be configured in Google Cloud Console.',
        redirectUri,
        instructions: `Create an OAuth 2.0 Client ID in Google Cloud Console with Authorized Redirect URI: ${redirectUri}`,
      },
      { status: 400 }
    );
  }

  const { codeVerifier, codeChallenge } = generatePkce();
  const state = generateStateNonce();

  const authUrl = buildGoogleAuthUrl({
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
    `myide_oauth_state=${encodeURIComponent(state)}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax${secureFlag}`
  );
  response.headers.append(
    'Set-Cookie',
    `myide_oauth_verifier=${encodeURIComponent(codeVerifier)}; Path=/api/auth; Max-Age=600; HttpOnly; SameSite=Lax${secureFlag}`
  );

  return response;
}
