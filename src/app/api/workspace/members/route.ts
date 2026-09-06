import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { handleApiError, apiSuccess } from '@/lib/api/response';
import {
  listWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from '@/lib/workspace/service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
    }

    const members = await listWorkspaceMembers(user.id, workspaceId);
    return apiSuccess({ members });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { workspaceId, emailOrUserId, role } = body;

    if (!workspaceId || !emailOrUserId || !role) {
      return NextResponse.json(
        { success: false, error: 'workspaceId, emailOrUserId, and role are required' },
        { status: 400 }
      );
    }

    const member = await addWorkspaceMember(user.id, workspaceId, emailOrUserId, role);
    return apiSuccess({ member }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const { workspaceId, targetUserId, role } = body;

    if (!workspaceId || !targetUserId || !role) {
      return NextResponse.json(
        { success: false, error: 'workspaceId, targetUserId, and role are required' },
        { status: 400 }
      );
    }

    const member = await updateWorkspaceMemberRole(user.id, workspaceId, targetUserId, role);
    return apiSuccess({ member });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const targetUserId = searchParams.get('targetUserId');

    if (!workspaceId || !targetUserId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId and targetUserId are required' },
        { status: 400 }
      );
    }

    const removed = await removeWorkspaceMember(user.id, workspaceId, targetUserId);
    return apiSuccess({ removed });
  } catch (error) {
    return handleApiError(error);
  }
}
