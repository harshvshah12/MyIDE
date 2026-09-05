import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { DEFAULT_WORKSPACE_PATH } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Command string required' },
        { status: 400 }
      );
    }

    // Safety checks against dangerous system commands
    const lower = command.trim().toLowerCase();
    if (lower.startsWith('format ') || lower.includes('rm -rf /') || lower.includes('rmdir /s /q c:')) {
      return NextResponse.json(
        { success: false, error: 'Command blocked by security sandbox' },
        { status: 403 }
      );
    }

    return new Promise<NextResponse>((resolve) => {
      const startTime = Date.now();
      exec(
        command,
        {
          cwd: DEFAULT_WORKSPACE_PATH,
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
