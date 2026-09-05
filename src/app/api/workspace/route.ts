import { NextResponse } from 'next/server';
import { DEFAULT_WORKSPACE_PATH, getFileTree, ensureDefaultWorkspace } from '@/lib/storage';

export async function GET() {
  try {
    ensureDefaultWorkspace();
    const tree = getFileTree();

    return NextResponse.json({
      success: true,
      workspace: {
        id: 'ws-smartvision',
        name: 'SmartVision Edge AI',
        rootPath: DEFAULT_WORKSPACE_PATH,
        collaborators: [
          { id: 'user-harsh', name: 'Harsh (You)', role: 'owner', color: '#6366F1' },
          { id: 'user-aarav', name: 'Aarav', role: 'editor', color: '#10B981' },
          { id: 'user-priya', name: 'Priya', role: 'editor', color: '#F59E0B' },
        ],
        filesCount: tree.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load workspace' },
      { status: 500 }
    );
  }
}
