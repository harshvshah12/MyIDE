import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getFileTree,
  readWorkspaceFile,
  writeWorkspaceFile,
  createWorkspaceItem,
  deleteWorkspaceItem
} from '@/lib/storage';
import { requireUser } from '@/lib/auth/session';
import { validateProjectFileAccess } from '@/lib/workspace/service';
import { handleApiError } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isTree = searchParams.get('tree') === 'true';
    const filePath = searchParams.get('path');
    const projectId = searchParams.get('projectId');

    // Scoped Project File Access if projectId is provided
    if (projectId) {
      const user = await requireUser(request);
      if (isTree) {
        const { project } = await validateProjectFileAccess(user.id, projectId, '.');
        const tree = getFileTree(project.path);
        return NextResponse.json({ success: true, tree });
      }

      if (!filePath) {
        return NextResponse.json({ success: false, error: 'Path parameter required' }, { status: 400 });
      }

      const { absolutePath } = await validateProjectFileAccess(user.id, projectId, filePath);
      if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
        return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
      }
      const content = fs.readFileSync(absolutePath, 'utf8');
      return NextResponse.json({ success: true, path: filePath, content });
    }

    if (isTree) {
      const tree = getFileTree();
      return NextResponse.json({ success: true, tree });
    }

    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Path parameter required' }, { status: 400 });
    }

    const content = readWorkspaceFile(filePath);
    return NextResponse.json({ success: true, path: filePath, content });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: filePath, content, projectId } = body;

    if (!filePath || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Path and content string required' },
        { status: 400 }
      );
    }

    // Scoped Project File Write if projectId is provided
    if (projectId) {
      const user = await requireUser(request);
      const { absolutePath } = await validateProjectFileAccess(user.id, projectId, filePath);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(absolutePath, content, 'utf8');
      return NextResponse.json({ success: true, path: filePath });
    }

    writeWorkspaceFile(filePath, content);
    return NextResponse.json({ success: true, path: filePath });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: itemPath, type, projectId } = body;

    if (!itemPath || !['file', 'directory'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Valid path and type (file|directory) required' },
        { status: 400 }
      );
    }

    // Scoped Project Item Creation
    if (projectId) {
      const user = await requireUser(request);
      const { absolutePath } = await validateProjectFileAccess(user.id, projectId, itemPath);
      if (type === 'directory') {
        fs.mkdirSync(absolutePath, { recursive: true });
      } else {
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(absolutePath)) {
          fs.writeFileSync(absolutePath, '', 'utf8');
        }
      }
      return NextResponse.json({ success: true, path: itemPath, type });
    }

    createWorkspaceItem(itemPath, type);
    return NextResponse.json({ success: true, path: itemPath, type });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deletePath = searchParams.get('path');
    const projectId = searchParams.get('projectId');

    if (!deletePath) {
      return NextResponse.json({ success: false, error: 'Path parameter required' }, { status: 400 });
    }

    // Scoped Project Item Deletion
    if (projectId) {
      const user = await requireUser(request);
      const { absolutePath } = await validateProjectFileAccess(user.id, projectId, deletePath);
      if (fs.existsSync(absolutePath)) {
        const stat = fs.statSync(absolutePath);
        if (stat.isDirectory()) {
          fs.rmSync(absolutePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(absolutePath);
        }
      }
      return NextResponse.json({ success: true, path: deletePath });
    }

    deleteWorkspaceItem(deletePath);
    return NextResponse.json({ success: true, path: deletePath });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
