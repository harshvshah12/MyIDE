import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);

  const isDev = process.env.NODE_ENV !== 'production';

  if (!user) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      isDev,
      user: null,
    });
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    isDev,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      createdAt: user.createdAt,
    },
  });
}
