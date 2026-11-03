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

    // 1. Determine Model Route (Mode A Auto, Mode B Manual, Mode C Capability)
    const routingDecision = determineModelRoute({
      prompt: prompt.trim(),
      agentRole: agentRole as AgentRole,
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
      prompt: prompt.trim(),
      agentRole: agentRole as AgentRole,
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
