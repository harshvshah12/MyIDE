import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserRepository, ProviderConnectionRepository } from '@/lib/db/repositories';
import { encryptSecret, maskSecret } from '@/lib/crypto';
import { signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';
import type { User } from '@/lib/schema/entities';

/**
 * Mock OIDC Endpoint for Development & Deterministic E2E Testing
 *
 * GATED: Strictly blocked in production environments.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email') || 'dev.student@mit.edu';
  const name = searchParams.get('name') || 'Dev Student';
  const sub = searchParams.get('sub') || 'google_sub_mock_12345';
  const avatarUrl = searchParams.get('avatarUrl') || undefined;

  let user = UserRepository.findByEmail(email);
  const now = Date.now();

  if (!user) {
    const slug = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const newId = `usr_${slug}_${crypto.randomBytes(3).toString('hex')}`;
    const newUser: User = {
      id: newId,
      email,
      name,
      avatarUrl,
      authProvider: 'google',
      authProviderId: sub,
      createdAt: now,
      updatedAt: now,
    };
    user = UserRepository.save(newUser);
  }

  // Auto-provision Google Gemini provider connection for mock Google sign-in
  const existingGoogleConn = ProviderConnectionRepository.listByOwner(user.id).find(
    (c) => c.provider === 'google'
  );
  if (!existingGoogleConn) {
    const demoToken = 'ya29.a0AfH6SMA_mock_google_oauth_gemini_token';
    ProviderConnectionRepository.save({
      id: `pconn_google_${crypto.randomBytes(4).toString('hex')}`,
      ownerId: user.id,
      provider: 'google',
      authMethod: 'oauth',
      encryptedCredential: encryptSecret(demoToken),
      maskedCredential: maskSecret(demoToken),
      status: 'active',
      availableModels: [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-3.8-flash',
      ],
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
  const token = signSessionToken({
    sessionId,
    userId: user.id,
    email: user.email,
    issuedAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  });

  const redirect = searchParams.get('redirect') || '/';
  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.headers.append('Set-Cookie', createSessionCookieHeader(token));

  return response;
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const email = body.email || 'dev.student@mit.edu';
    const name = body.name || 'Dev Student';
    const sub = body.sub || 'google_sub_mock_12345';
    const avatarUrl = body.avatarUrl || undefined;

    let user = UserRepository.findByEmail(email);
    const now = Date.now();

    if (!user) {
      const slug = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const newId = `usr_${slug}_${crypto.randomBytes(3).toString('hex')}`;
      const newUser: User = {
        id: newId,
        email,
        name,
        avatarUrl,
        authProvider: 'google',
        authProviderId: sub,
        createdAt: now,
        updatedAt: now,
      };
      user = UserRepository.save(newUser);
    }

    // Auto-provision Google Gemini provider connection for mock Google sign-in
    const existingGoogleConn = ProviderConnectionRepository.listByOwner(user.id).find(
      (c) => c.provider === 'google'
    );
    if (!existingGoogleConn) {
      const demoToken = 'ya29.a0AfH6SMA_mock_google_oauth_gemini_token';
      ProviderConnectionRepository.save({
        id: `pconn_google_${crypto.randomBytes(4).toString('hex')}`,
        ownerId: user.id,
        provider: 'google',
        authMethod: 'oauth',
        encryptedCredential: encryptSecret(demoToken),
        maskedCredential: maskSecret(demoToken),
        status: 'active',
        availableModels: [
          'gemini-2.5-pro',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-3.8-flash',
        ],
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const token = signSessionToken({
      sessionId,
      userId: user.id,
      email: user.email,
      issuedAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json({ success: true, user, token });
    response.headers.append('Set-Cookie', createSessionCookieHeader(token));
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
