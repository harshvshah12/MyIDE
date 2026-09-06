import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
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
    const user = await requireUser(request);
    const body = await request.json();
    const { name, slug, description, rootDirectory } = body;

    const result = await createWorkspace(user.id, {
      name,
      slug,
      description,
      rootDirectory,
    });

    return apiSuccess(result, 201);
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
