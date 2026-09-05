import { NextRequest, NextResponse } from 'next/server';
import {
  getEntitlements,
  saveEntitlements,
  revokeEntitlement,
  revokeAllSharedAccess,
  getCapabilities
} from '@/lib/storage';
import { Entitlement } from '@/types';

export async function GET() {
  try {
    const entitlements = getEntitlements();
    return NextResponse.json({ success: true, entitlements });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list entitlements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { capabilityId, grantedToUserName, spendingLimitUsd, maxRequests } = body;

    const capabilities = getCapabilities();
    const cap = capabilities.find((c) => c.id === capabilityId);

    const newEntitlement: Entitlement = {
      id: `ent-${Date.now()}`,
      capabilityId,
      capabilityName: cap ? cap.name : 'Shared Capability',
      ownerId: 'user-harsh',
      ownerName: 'Harsh',
      grantedToUserId: `user-${grantedToUserName.toLowerCase()}`,
      grantedToUserName,
      projectId: 'smartvision-edge',
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000 * 7, // 7 days
      spendingLimitUsd: spendingLimitUsd || 10.0,
      spentUsd: 0,
      maxRequests: maxRequests || 50,
      requestsCount: 0,
      allowedModels: [cap?.modelId || 'gemini-3.8-flash'],
      allowedTools: ['readFile', 'editFile'],
      status: 'active',
    };

    const entitlements = getEntitlements();
    entitlements.unshift(newEntitlement);
    saveEntitlements(entitlements);

    return NextResponse.json({ success: true, entitlement: newEntitlement });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create entitlement' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isRevokeAll = searchParams.get('all') === 'true';
    const entId = searchParams.get('id');

    if (isRevokeAll) {
      const revokedCount = revokeAllSharedAccess('user-harsh');
      return NextResponse.json({ success: true, revokedCount });
    }

    if (!entId) {
      return NextResponse.json({ success: false, error: 'Entitlement ID required' }, { status: 400 });
    }

    const success = revokeEntitlement(entId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Revocation failed' },
      { status: 500 }
    );
  }
}
