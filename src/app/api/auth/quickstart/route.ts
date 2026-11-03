import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserRepository } from '@/lib/db/repositories';
import { signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';
import type { User } from '@/lib/schema/entities';

/**
 * Quickstart Developer Session Provisioner
 *
 * Provides instant 1-click access for developers and testing environments
 * without requiring third-party OAuth configuration.
 */
export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const email = body.email || 'developer@myide.local';
    const name = body.name || 'Developer';
    const now = Date.now();

    let user = UserRepository.findByEmail(email);
    if (!user) {
      const newId = `usr_dev_${crypto.randomBytes(4).toString('hex')}`;
      const newUser: User = {
        id: newId,
        email,
        name,
        authProvider: 'local',
        createdAt: now,
        updatedAt: now,
      };
      user = UserRepository.save(newUser);
    }

    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const token = signSessionToken({
      sessionId,
      userId: user.id,
      email: user.email,
      issuedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30-day session
    });

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user,
      token,
    });

    response.headers.append('Set-Cookie', createSessionCookieHeader(token, 30 * 24 * 60 * 60));
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support 1-click GET redirect (e.g. from a link or button)
  const postRes = await POST(request);
  const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/';
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  const setCookie = postRes.headers.get('set-cookie');
  if (setCookie) {
    response.headers.set('set-cookie', setCookie);
  }
  return response;
}
