import { NextRequest, NextResponse } from 'next/server';
import { saveCredential, listConfiguredCredentials } from '@/lib/storage';
import { ModelProvider } from '@/types';

export async function GET() {
  try {
    const configured = listConfiguredCredentials();
    return NextResponse.json({ success: true, credentials: configured });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list credentials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { success: false, error: 'Provider and key string required' },
        { status: 400 }
      );
    }

    saveCredential(provider as ModelProvider, key);
    return NextResponse.json({ success: true, provider, status: 'encrypted_at_rest' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to encrypt credential' },
      { status: 500 }
    );
  }
}
