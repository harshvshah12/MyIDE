import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIOAuthConfig, saveOpenAIOAuthConfig } from '@/lib/auth/openai-oauth-config';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/openai`;
  const config = getOpenAIOAuthConfig();

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
        { success: false, error: 'OpenAI Client ID and Client Secret are required' },
        { status: 400 }
      );
    }

    saveOpenAIOAuthConfig(clientId, clientSecret);

    return NextResponse.json({
      success: true,
      message: 'OpenAI OAuth credentials encrypted and saved successfully.',
      isConfigured: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save OpenAI OAuth configuration' },
      { status: 500 }
    );
  }
}
