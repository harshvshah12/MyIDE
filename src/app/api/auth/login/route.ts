import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyUserCredentials } from '@/lib/auth/credentials';
import { signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = verifyUserCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const token = signSessionToken({
      sessionId,
      userId: user.id,
      email: user.email,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user,
    });

    response.headers.append('Set-Cookie', createSessionCookieHeader(token));
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
