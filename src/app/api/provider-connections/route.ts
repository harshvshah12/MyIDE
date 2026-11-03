import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser, signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';
import { UserRepository } from '@/lib/db/repositories';
import {
  listProviderConnections,
  createProviderConnection,
  migrateLegacyVault,
} from '@/lib/providers/service';
import { handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ success: true, connections: [] });
    }
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
    let user = await getCurrentUser(request);
    let autoSessionToken: string | null = null;

    if (!user) {
      const defaultEmail = 'developer@myide.local';
      user = UserRepository.findByEmail(defaultEmail);
      if (!user) {
        const newId = `usr_dev_${crypto.randomBytes(3).toString('hex')}`;
        user = UserRepository.save({
          id: newId,
          email: defaultEmail,
          name: 'Developer',
          authProvider: 'local',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
      autoSessionToken = signSessionToken({
        sessionId,
        userId: user.id,
        email: user.email,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    }

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

    const response = NextResponse.json({ success: true, connection }, { status: 201 });
    if (autoSessionToken) {
      response.headers.append('Set-Cookie', createSessionCookieHeader(autoSessionToken));
    }
    return response;
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
