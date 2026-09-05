import { NextRequest, NextResponse } from 'next/server';
import {
  getFileTree,
  readWorkspaceFile,
  writeWorkspaceFile,
  createWorkspaceItem,
  deleteWorkspaceItem
} from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isTree = searchParams.get('tree') === 'true';
    const filePath = searchParams.get('path');

    if (isTree) {
      const tree = getFileTree();
      return NextResponse.json({ success: true, tree });
    }

    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Path parameter required' }, { status: 400 });
    }

    const content = readWorkspaceFile(filePath);
    return NextResponse.json({ success: true, path: filePath, content });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'File operation failed' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, content } = body;

    if (!path || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Path and content string required' },
        { status: 400 }
      );
    }

    writeWorkspaceFile(path, content);
    return NextResponse.json({ success: true, path });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save file' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, type } = body;

    if (!path || !['file', 'directory'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Valid path and type (file|directory) required' },
        { status: 400 }
      );
    }

    createWorkspaceItem(path, type);
    return NextResponse.json({ success: true, path, type });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ success: false, error: 'Path parameter required' }, { status: 400 });
    }

    deleteWorkspaceItem(path);
    return NextResponse.json({ success: true, path });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
