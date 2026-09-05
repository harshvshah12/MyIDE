import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { getEvidenceRecords } from '@/lib/storage';

export async function GET() {
  try {
    const evidence = getEvidenceRecords();

    return new Promise<NextResponse>((resolve) => {
      exec('git status --short', { cwd: process.cwd() }, (error, stdout, stderr) => {
        const statusOutput = stdout || (error ? stderr : 'Working tree clean');
        resolve(
          NextResponse.json({
            success: true,
            status: statusOutput,
            evidence,
          })
        );
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Git status failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Commit message required' },
        { status: 400 }
      );
    }

    // Sanitize commit message against shell injection
    const sanitizedMsg = message.replace(/"/g, '\\"');

    return new Promise<NextResponse>((resolve) => {
      exec(
        `git add -A ; git commit -m "${sanitizedMsg}"`,
        { cwd: process.cwd(), shell: 'powershell.exe' },
        (error, stdout, stderr) => {
          exec('git status --short', { cwd: process.cwd() }, (_, statusOut) => {
            resolve(
              NextResponse.json({
                success: !error,
                stdout: stdout || '',
                stderr: stderr || '',
                newStatus: statusOut || 'Working tree clean',
                exitCode: error ? 1 : 0,
              })
            );
          });
        }
      );
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Commit failed' },
      { status: 500 }
    );
  }
}
