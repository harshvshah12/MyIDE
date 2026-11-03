import { NextRequest, NextResponse } from 'next/server';
import { determineModelRoute } from '@/lib/router';
import { getCurrentUser } from '@/lib/auth/session';
import { readWorkspaceFile } from '@/lib/storage';
import { executeAITask } from '@/lib/execution/service';
import { AgentRole, ModelMode } from '@/types';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const userId = user?.id || 'usr_dev_local';

    const body = await request.json();
    const {
      prompt,
      agentRole = 'coder',
      mode = 'auto',
      manualModelId,
      capabilityId,
      capabilityOwnerName,
      activeFilePath,
    } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    let effectivePrompt = prompt.trim();
    let effectiveRole = agentRole as AgentRole;

    // Handle Antigravity Slash Commands
    if (effectivePrompt === '/help') {
      return NextResponse.json({
        success: true,
        reply: `### Antigravity Command Palette\n\n` +
          `Available built-in slash commands:\n` +
          `- **/plan <task>**: Autonomous task contract breakdown and architecture blueprint.\n` +
          `- **/fix <issue>**: Root-cause diagnostic and immediate side-by-side diff generation for active file.\n` +
          `- **/review**: Senior engineer code quality, performance, and best practices audit.\n` +
          `- **/security**: OWASP Top 10 boundary check, credential isolation, and path escape scan.\n` +
          `- **/test**: Generates comprehensive unit and integration test suite.\n` +
          `- **/terminal <cmd>**: Executes shell command directly in the sandbox and streams stdout/stderr.\n` +
          `- **/docs**: Generates complete technical specifications, ADRs, or README documentation.`,
        modelUsed: 'Antigravity Kernel',
        routingDecision: { selectedModelId: 'gemini-3.8-flash', rationale: 'Command palette query' },
        toolCalls: [],
      });
    }

    if (effectivePrompt.startsWith('/plan')) {
      effectiveRole = 'planner';
      effectivePrompt = effectivePrompt.replace(/^\/plan\s*/, '') || 'Create a full implementation plan for this project.';
    } else if (effectivePrompt.startsWith('/fix') || effectivePrompt.startsWith('/debug')) {
      effectiveRole = 'debugger';
      effectivePrompt = effectivePrompt.replace(/^\/(?:fix|debug)\s*/, '') || 'Identify and fix any bugs or edge cases in the active file.';
    } else if (effectivePrompt.startsWith('/review')) {
      effectiveRole = 'reviewer';
      effectivePrompt = effectivePrompt.replace(/^\/review\s*/, '') || 'Review this code for quality, performance, readability, and clean architecture.';
    } else if (effectivePrompt.startsWith('/security')) {
      effectiveRole = 'security';
      effectivePrompt = effectivePrompt.replace(/^\/security\s*/, '') || 'Audit this code for security vulnerabilities, OWASP flaws, and credential leaks.';
    } else if (effectivePrompt.startsWith('/test')) {
      effectiveRole = 'tester';
      effectivePrompt = effectivePrompt.replace(/^\/test\s*/, '') || 'Generate a comprehensive unit test suite with high coverage for this file.';
    } else if (effectivePrompt.startsWith('/docs')) {
      effectiveRole = 'docs';
      effectivePrompt = effectivePrompt.replace(/^\/docs\s*/, '') || 'Generate technical documentation and architecture overview for this module.';
    }

    // 1. Determine Model Route (Mode A Auto, Mode B Manual, Mode C Capability)
    const routingDecision = determineModelRoute({
      prompt: effectivePrompt,
      agentRole: effectiveRole,
      mode: mode as ModelMode,
      manualModelId,
      capabilityId,
      capabilityOwnerName,
      activeFilePath,
    });

    // 2. Resolve Workspace & Project Context from request or cookies
    const cookieStore = await cookies();
    const workspaceId =
      body.workspaceId ||
      cookieStore.get('myide_workspace_id')?.value ||
      'ws_default';
    const projectId =
      body.projectId ||
      cookieStore.get('myide_project_id')?.value ||
      undefined;

    // 3. Read active file context if available
    let activeFileContent = '';
    if (activeFilePath) {
      try {
        activeFileContent = readWorkspaceFile(activeFilePath);
      } catch {
        // file might be new or not found
      }
    }

    // 4. Central AI Execution
    const execution = await executeAITask({
      userId,
      workspaceId,
      projectId,
      prompt: effectivePrompt,
      agentRole: effectiveRole,
      modelId: routingDecision.selectedModelId,
      capabilityId,
      activeFilePath,
      activeFileContent,
    });

    return NextResponse.json({
      success: true,
      reply: execution.content,
      proposedChange: execution.proposedChange?.newContent || null,
      routingDecision,
      modelUsed: execution.modelName,
      capabilityUsed: capabilityId,
      toolCalls: execution.toolCalls || [],
      evidenceId: execution.evidenceId,
      usage: execution.usage,
      durationMs: execution.durationMs,
      isSimulated: execution.isSimulated,
      simulationReason: execution.simulationReason,
    });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'AI task execution failed',
        code: error.code || 'EXECUTION_ERROR',
      },
      { status }
    );
  }
}
