import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  exchangeGoogleAuthorizationCode,
  parseIdTokenPayload,
} from '@/lib/auth/oauth';
import { constantTimeEqual, encryptSecret, maskSecret } from '@/lib/crypto';
import { UserRepository, ProviderConnectionRepository } from '@/lib/db/repositories';
import { signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';
import { getGoogleOAuthConfig } from '@/lib/auth/oauth-config';
import type { User, ProviderConnection } from '@/lib/schema/entities';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { success: false, error: `Google authentication returned error: ${error}` },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { success: false, error: 'Missing code or state in OAuth callback' },
      { status: 400 }
    );
  }

  // 1. Validate state nonce against stored cookie
  const storedState = request.cookies.get('myide_oauth_state')?.value;
  if (!storedState || !constantTimeEqual(state, storedState)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired OAuth state parameter (CSRF detected)' },
      { status: 403 }
    );
  }

  // 2. Retrieve PKCE code verifier
  const codeVerifier = request.cookies.get('myide_oauth_verifier')?.value;
  if (!codeVerifier) {
    return NextResponse.json(
      { success: false, error: 'Missing PKCE code verifier cookie' },
      { status: 400 }
    );
  }

  const oauthConfig = getGoogleOAuthConfig();
  const clientId = oauthConfig.clientId;
  const clientSecret = oauthConfig.clientSecret;
  const redirectUri = `${request.nextUrl.origin}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { success: false, error: 'Google OAuth Client ID / Secret not configured' },
      { status: 500 }
    );
  }

  try {
    // 3. Exchange code for tokens
    const { idToken, accessToken } = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    // 4. Parse & validate OIDC ID token
    const profile = parseIdTokenPayload(idToken);
    if (!profile.emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Google account email is not verified' },
        { status: 403 }
      );
    }

    // 5. Upsert User in Repository
    let user = UserRepository.findByEmail(profile.email);
    const now = Date.now();

    if (user) {
      user = UserRepository.save({
        ...user,
        name: profile.name || user.name,
        avatarUrl: profile.picture || user.avatarUrl,
        authProvider: 'google',
        authProviderId: profile.sub,
        updatedAt: now,
      });
    } else {
      const slug = profile.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const newId = `usr_${slug}_${crypto.randomBytes(3).toString('hex')}`;
      const newUser: User = {
        id: newId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        authProvider: 'google',
        authProviderId: profile.sub,
        createdAt: now,
        updatedAt: now,
      };
      user = UserRepository.save(newUser);
    }

    // 5.1 Automatically provision / sync Google Gemini connection from Google OAuth Access Token
    if (accessToken) {
      const existingGoogleConn = ProviderConnectionRepository.listByOwner(user.id).find(
        (c) => c.provider === 'google'
      );
      const encryptedCredential = encryptSecret(accessToken);
      const maskedCredential = maskSecret(accessToken);
      const availableModels = [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-3.8-flash',
      ];

      if (existingGoogleConn) {
        ProviderConnectionRepository.save({
          ...existingGoogleConn,
          authMethod: 'oauth',
          encryptedCredential,
          maskedCredential,
          status: 'active',
          availableModels,
          updatedAt: now,
        });
      } else {
        const connId = `pconn_google_${crypto.randomBytes(4).toString('hex')}`;
        ProviderConnectionRepository.save({
          id: connId,
          ownerId: user.id,
          provider: 'google',
          authMethod: 'oauth',
          encryptedCredential,
          maskedCredential,
          status: 'active',
          availableModels,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 6. Generate signed session token with unique session ID
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const token = signSessionToken({
      sessionId,
      userId: user.id,
      email: user.email,
      issuedAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    });

    // 7. Clear temporary cookies and set session cookie
    const response = NextResponse.redirect(new URL('/', request.url));
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    response.headers.append('Set-Cookie', createSessionCookieHeader(token));
    response.headers.append(
      'Set-Cookie',
      `myide_oauth_state=; Path=/api/auth; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureFlag}`
    );
    response.headers.append(
      'Set-Cookie',
      `myide_oauth_verifier=; Path=/api/auth; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureFlag}`
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'OAuth code exchange failed' },
      { status: 500 }
    );
  }
}
