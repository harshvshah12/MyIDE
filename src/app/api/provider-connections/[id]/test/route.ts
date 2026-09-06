import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { testProviderConnection } from '@/lib/providers/service';
import { handleApiError } from '@/lib/api/response';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const result = await testProviderConnection(user.id, id);
    return NextResponse.json({ success: true, test: result, ...result });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
