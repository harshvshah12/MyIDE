import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import {
  getProviderConnection,
  deleteProviderConnection,
} from '@/lib/providers/service';
import { handleApiError } from '@/lib/api/response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const connection = await getProviderConnection(user.id, id);
    return NextResponse.json({ success: true, connection });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    await deleteProviderConnection(user.id, id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
