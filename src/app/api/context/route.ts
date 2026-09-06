import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { handleApiError, apiSuccess } from '@/lib/api/response';
import { resolveActiveContext } from '@/lib/workspace/service';

const WORKSPACE_COOKIE = 'myide_workspace_id';
const PROJECT_COOKIE = 'myide_project_id';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);

    // Read requested workspace & project from searchParams, then fallback to cookies
    const searchParams = request.nextUrl.searchParams;
    const cookieWorkspace = request.cookies.get(WORKSPACE_COOKIE)?.value;
    const cookieProject = request.cookies.get(PROJECT_COOKIE)?.value;

    const requestedWorkspace = searchParams.get('workspaceId') || cookieWorkspace;
    const requestedProject = searchParams.get('projectId') || cookieProject;

    const context = await resolveActiveContext(user.id, requestedWorkspace, requestedProject);

    const response = apiSuccess({ context });

    // Sync cookies if active context is determined
    if (context.workspace) {
      response.cookies.set(WORKSPACE_COOKIE, context.workspace.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    if (context.project) {
      response.cookies.set(PROJECT_COOKIE, context.project.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { workspaceId, projectId } = body;

    const context = await resolveActiveContext(user.id, workspaceId, projectId);

    const response = apiSuccess({ context });

    if (context.workspace) {
      response.cookies.set(WORKSPACE_COOKIE, context.workspace.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    if (context.project) {
      response.cookies.set(PROJECT_COOKIE, context.project.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      // Clear project cookie if workspace has no projects
      response.cookies.delete(PROJECT_COOKIE);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
