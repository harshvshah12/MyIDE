import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  revokeSession,
  createClearSessionCookieHeader,
} from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  // 1. Invalidate session server-side if present
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie) {
    const session = verifySessionToken(cookie);
    if (session?.sessionId) {
      revokeSession(session.sessionId);
    }
  }

  // 2. Clear cookies
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';

  response.headers.append('Set-Cookie', createClearSessionCookieHeader());
  response.headers.append(
    'Set-Cookie',
    `myide_workspace_id=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`
  );
  response.headers.append(
    'Set-Cookie',
    `myide_project_id=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`
  );

  return response;
}
