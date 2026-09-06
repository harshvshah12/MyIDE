import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { handleApiError, apiSuccess } from '@/lib/api/response';
import {
  createProject,
  getProject,
  listProjectsInWorkspace,
  updateProject,
  deleteProject,
} from '@/lib/workspace/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const projectId = searchParams.get('projectId');

    if (projectId) {
      const project = await getProject(user.id, projectId);
      return apiSuccess({ project });
    }

    if (workspaceId) {
      const projects = await listProjectsInWorkspace(user.id, workspaceId);
      return apiSuccess({ projects });
    }

    return NextResponse.json(
      { success: false, error: 'Either workspaceId or projectId is required' },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { workspaceId, name, slug, path, kind, stack } = body;

    if (!workspaceId || !name || !slug) {
      return NextResponse.json(
        { success: false, error: 'workspaceId, name, and slug are required' },
        { status: 400 }
      );
    }

    const project = await createProject(user.id, {
      workspaceId,
      name,
      slug,
      path,
      kind,
      stack,
    });

    return apiSuccess({ project }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { projectId, name, kind, stack, path } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const project = await updateProject(user.id, projectId, {
      name,
      kind,
      stack,
      path,
    });

    return apiSuccess({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const deleted = await deleteProject(user.id, projectId);
    return apiSuccess({ deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
