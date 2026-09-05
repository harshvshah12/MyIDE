import { NextRequest, NextResponse } from 'next/server';
import { getCapabilities, saveCapabilities } from '@/lib/storage';
import { Capability } from '@/types';

export async function GET() {
  try {
    const capabilities = getCapabilities();
    return NextResponse.json({ success: true, capabilities });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list capabilities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const capabilities = getCapabilities();

    const newCap: Capability = {
      id: `cap-${Date.now()}`,
      name: body.name,
      ownerId: 'user-harsh',
      ownerName: 'Harsh (You)',
      provider: body.provider,
      modelId: body.modelId,
      type: body.type || 'model',
      description: body.description || 'Custom capability',
      isShareable: true,
      activeEntitlementsCount: 0,
      totalUsageCount: 0,
      createdAt: Date.now(),
    };

    capabilities.unshift(newCap);
    saveCapabilities(capabilities);

    return NextResponse.json({ success: true, capability: newCap });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add capability' },
      { status: 500 }
    );
  }
}
