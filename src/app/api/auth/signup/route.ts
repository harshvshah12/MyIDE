import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { registerUserWithPassword } from '@/lib/auth/credentials';
import { signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const user = registerUserWithPassword(name, email, password);
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
      message: 'Account created successfully',
      user,
    }, { status: 201 });

    response.headers.append('Set-Cookie', createSessionCookieHeader(token));
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Signup failed' },
      { status: 400 }
    );
  }
}
