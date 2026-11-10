import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserRepository, ProviderConnectionRepository } from '@/lib/db/repositories';
import { encryptSecret, maskSecret } from '@/lib/crypto';
import { signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';
import type { User } from '@/lib/schema/entities';

/**
 * Mock OpenAI / ChatGPT OIDC Endpoint for Development & Instant Testing
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email') || 'chatgpt.developer@openai.com';
  const name = searchParams.get('name') || 'ChatGPT Developer';
  const sub = searchParams.get('sub') || 'openai_sub_mock_12345';
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
      authProvider: 'openai',
      authProviderId: sub,
      createdAt: now,
      updatedAt: now,
    };
    user = UserRepository.save(newUser);
  }

  // Provision OpenAI Provider Connection
  const existingOpenAIConn = ProviderConnectionRepository.listByOwner(user.id).find(
    (c) => c.provider === 'openai'
  );
  if (!existingOpenAIConn) {
    const mockToken = 'sess_mock_chatgpt_oauth_bearer_token';
    ProviderConnectionRepository.save({
      id: `pconn_openai_${crypto.randomBytes(4).toString('hex')}`,
      ownerId: user.id,
      provider: 'openai',
      authMethod: 'oauth',
      encryptedCredential: encryptSecret(mockToken),
      maskedCredential: maskSecret(mockToken),
      status: 'active',
      availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
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
    const email = body.email || 'chatgpt.developer@openai.com';
    const name = body.name || 'ChatGPT Developer';
    const sub = body.sub || 'openai_sub_mock_12345';
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
        authProvider: 'openai',
        authProviderId: sub,
        createdAt: now,
        updatedAt: now,
      };
      user = UserRepository.save(newUser);
    }

    const existingOpenAIConn = ProviderConnectionRepository.listByOwner(user.id).find(
      (c) => c.provider === 'openai'
    );
    if (!existingOpenAIConn) {
      const mockToken = 'sess_mock_chatgpt_oauth_bearer_token';
      ProviderConnectionRepository.save({
        id: `pconn_openai_${crypto.randomBytes(4).toString('hex')}`,
        ownerId: user.id,
        provider: 'openai',
        authMethod: 'oauth',
        encryptedCredential: encryptSecret(mockToken),
        maskedCredential: maskSecret(mockToken),
        status: 'active',
        availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
