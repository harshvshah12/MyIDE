import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ObsidianVaultNote } from '@/types';

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || 'C:\\projects\\orchestra-brain';

export async function GET() {
  try {
    const notes: ObsidianVaultNote[] = [];

    // Allowlisted core notes to scan safely
    const allowlisted = [
      { file: 'Preferences.md', title: 'Global Preferences & Taste', kind: 'global' },
      { file: 'routes.md', title: 'Routes & Jump Table', kind: 'workflow' },
      { file: 'WORKFLOW.md', title: 'The Unified Orchestra Loop', kind: 'workflow' },
      { file: 'ARCHITECTURE.md', title: 'Architecture & Sync System', kind: 'architecture' },
      { file: 'memory/decisions.md', title: 'Lasting Workflow Decisions', kind: 'memory' },
    ];

    for (const item of allowlisted) {
      const fullPath = path.join(VAULT_PATH, item.file);
      if (fs.existsSync(fullPath)) {
        const raw = fs.readFileSync(fullPath, 'utf8');
        // Extract first 140 characters as preview excerpt
        const clean = raw.replace(/^---[\s\S]*?---/, '').trim();
        const excerpt = clean.slice(0, 150).replace(/\n/g, ' ') + '...';

        notes.push({
          path: item.file,
          title: item.title,
          kind: item.kind,
          excerpt,
          selectedForContext: item.file === 'Preferences.md',
        });
      }
    }

    return NextResponse.json({
      success: true,
      vaultPath: VAULT_PATH,
      notes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to scan Obsidian vault' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { selectedPaths } = body;

    // In a production system, these paths are cached in project context session
    return NextResponse.json({
      success: true,
      selectedCount: selectedPaths?.length || 0,
      activeContexts: selectedPaths,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update context' },
      { status: 500 }
    );
  }
}
