import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireUser, getCurrentUser, signSessionToken, createSessionCookieHeader } from '@/lib/auth/session';
import { UserRepository } from '@/lib/db/repositories';
import { handleApiError, apiSuccess } from '@/lib/api/response';
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  resolveActiveContext,
  listWorkspacesForUser,
} from '@/lib/workspace/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    const activeContext = await resolveActiveContext(user.id, workspaceId, projectId);
    const workspaces = await listWorkspacesForUser(user.id);

    return apiSuccess({
      workspaces,
      activeContext,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let user = await getCurrentUser(request);
    let autoSessionToken: string | null = null;

    if (!user) {
      // Auto-provision developer session on workspace initialization for zero-friction onboarding
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

    const body = await request.json().catch(() => ({}));
    const name = body?.name || 'Personal Workspace';
    const slug = body?.slug;
    const description = body?.description;
    const rootDirectory = body?.rootDirectory;

    const result = await createWorkspace(user.id, {
      name,
      slug,
      description,
      rootDirectory,
    });

    const response = apiSuccess(result, 201);
    if (autoSessionToken) {
      response.headers.append('Set-Cookie', createSessionCookieHeader(autoSessionToken));
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { workspaceId, name, description, rootDirectory } = body;

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
    }

    const updated = await updateWorkspace(user.id, workspaceId, {
      name,
      description,
      rootDirectory,
    });

    return apiSuccess({ workspace: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
    }

    const deleted = await deleteWorkspace(user.id, workspaceId);
    return apiSuccess({ deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
