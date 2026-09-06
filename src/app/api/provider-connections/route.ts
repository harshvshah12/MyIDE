import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import {
  listProviderConnections,
  createProviderConnection,
  migrateLegacyVault,
} from '@/lib/providers/service';
import { handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    // Optionally migrate legacy vault on first load if user has 0 connections
    await migrateLegacyVault(user.id);
    const connections = await listProviderConnections(user.id);
    return NextResponse.json({ success: true, connections });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const provider = body.provider || body.providerId;
    let credential = body.credential || body.apiKey;
    const authMethod = body.authMethod;
    const endpointUrl = body.endpointUrl || body.baseUrl;

    if (provider === 'local' && !credential) {
      credential = endpointUrl || 'http://127.0.0.1:11434';
    }

    if (!provider || !credential) {
      return NextResponse.json(
        { success: false, error: 'Provider and credential string required' },
        { status: 400 }
      );
    }

    const connection = await createProviderConnection(user.id, {
      provider,
      credential,
      authMethod,
      endpointUrl,
    });

    return NextResponse.json({ success: true, connection }, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
