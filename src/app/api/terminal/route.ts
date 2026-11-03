import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import { DEFAULT_WORKSPACE_PATH } from '@/lib/storage';
import { ProjectRepository, WorkspaceRepository } from '@/lib/db/repositories';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, projectId, workspaceId } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Command string required' },
        { status: 400 }
      );
    }

    // Safety checks against destructive system commands
    const lower = command.trim().toLowerCase();
    if (lower.startsWith('format ') || lower.includes('rm -rf /') || lower.includes('rmdir /s /q c:')) {
      return NextResponse.json(
        { success: false, error: 'Command blocked by security sandbox' },
        { status: 403 }
      );
    }

    // Determine target execution directory
    let targetDir = DEFAULT_WORKSPACE_PATH;
    if (projectId) {
      const proj = ProjectRepository.findById(projectId);
      if (proj && proj.path) {
        targetDir = proj.path;
      }
    } else if (workspaceId) {
      const ws = WorkspaceRepository.findById(workspaceId);
      if (ws && ws.rootDirectory) {
        targetDir = ws.rootDirectory;
      }
    }

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch {
      // ignore
    }

    // Normalize cross-platform shell commands
    let cmdToRun = command.trim();
    const isWindows = process.platform === 'win32';
    if (!isWindows) {
      if (cmdToRun === 'dir') cmdToRun = 'ls -la';
      else if (cmdToRun.startsWith('dir ')) cmdToRun = cmdToRun.replace(/^dir\s+/, 'ls -la ');
      else if (cmdToRun === 'cls') cmdToRun = 'clear';
      else if (cmdToRun.startsWith('type ')) cmdToRun = cmdToRun.replace(/^type\s+/, 'cat ');
    }

    return new Promise<NextResponse>((resolve) => {
      const startTime = Date.now();
      exec(
        cmdToRun,
        {
          cwd: targetDir,
          timeout: 20000, // 20-second execution timeout
          maxBuffer: 1024 * 1024 * 5, // 5MB buffer
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          resolve(
            NextResponse.json({
              success: !error,
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: error ? (error.code ?? 1) : 0,
              durationMs,
              cwd: targetDir,
            })
          );
        }
      );
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Execution failed' },
      { status: 500 }
    );
  }
}
