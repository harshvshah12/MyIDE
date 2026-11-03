import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthConfig, saveGoogleOAuthConfig } from '@/lib/auth/oauth-config';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;
  const config = getGoogleOAuthConfig();

  return NextResponse.json({
    success: true,
    isConfigured: config.isConfigured,
    clientId: config.clientId ? `${config.clientId.substring(0, 12)}...` : undefined,
    redirectUri,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Google Client ID and Client Secret are required' },
        { status: 400 }
      );
    }

    saveGoogleOAuthConfig(clientId, clientSecret);

    return NextResponse.json({
      success: true,
      message: 'Google OAuth credentials encrypted and saved successfully.',
      isConfigured: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save OAuth configuration' },
      { status: 500 }
    );
  }
}
