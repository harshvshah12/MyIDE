import { NextRequest, NextResponse } from 'next/server';
import { determineModelRoute } from '@/lib/router';
import {
  recordEvidence,
  checkEntitlementPermission,
  readWorkspaceFile,
  writeWorkspaceFile,
  getDecryptedCredential
} from '@/lib/storage';
import { AgentRole, ModelMode } from '@/types';

export async function POST(request: NextRequest) {
  try {
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

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    // 1. Determine Model Route (Mode A Auto, Mode B Manual, Mode C Capability)
    const routingDecision = determineModelRoute({
      prompt,
      agentRole: agentRole as AgentRole,
      mode: mode as ModelMode,
      manualModelId,
      capabilityId,
      capabilityOwnerName,
      activeFilePath,
    });

    // 2. Entitlement verification for Mode C
    if (mode === 'capability' && capabilityId) {
      const check = checkEntitlementPermission('user-harsh', capabilityId);
      if (!check.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Capability execution denied: ${check.reason}`,
            routingDecision,
          },
          { status: 403 }
        );
      }
    }

    // 3. Read active file context if available
    let activeFileContent = '';
    if (activeFilePath) {
      try {
        activeFileContent = readWorkspaceFile(activeFilePath);
      } catch (e) {
        // file might be new or not found
      }
    }

    // 4. Generate contextual pair-programming response based on Agent Role and Prompt
    const lowerPrompt = prompt.toLowerCase();
    let reply = '';
    let proposedChange: string | null = null;
    const toolCalls: Array<{
      id: string;
      toolName: string;
      arguments: Record<string, unknown>;
      status: 'pending' | 'running' | 'success' | 'failed' | 'rejected';
      output?: string;
    }> = [];

    // Tool simulation for agent actions
    if (activeFilePath) {
      toolCalls.push({
        id: `tc-${Date.now()}-1`,
        toolName: 'readFile',
        arguments: { path: activeFilePath },
        status: 'success',
        output: `${activeFileContent.split('\n').length} lines inspected`,
      });
    }

    if (lowerPrompt.includes('optimize') || lowerPrompt.includes('refactor') || lowerPrompt.includes('speedup')) {
      reply = `### Optimization Analysis (${routingDecision.selectedModelName})\n\nI analyzed \`${activeFilePath || 'inference.py'}\`. We can eliminate runtime frame copying and pre-calculate bounding box transformations to increase inference throughput.`;
      
      if (activeFilePath?.endsWith('.py')) {
        proposedChange = `"""\nSmartVision Edge Pipeline - Optimized\nHigh-throughput inference worker with TensorRT buffer pooling.\n"""\nimport time\nimport numpy as np\n\nclass InferenceEngine:\n    def __init__(self, model_path="model.onnx"):\n        self.model_path = model_path\n        self.warmup()\n\n    def warmup(self):\n        # Pre-allocate pinned memory buffers\n        print("Warming up inference engine on local GPU...")\n\n    def process_frame(self, frame_data):\n        t0 = time.perf_counter()\n        # Optimized batch inference\n        detections = [\n            {"class": "robot_arm", "confidence": 0.96, "bbox": [120, 45, 300, 280]},\n            {"class": "part_defect", "confidence": 0.91, "bbox": [150, 80, 40, 40]}\n        ]\n        latency_ms = (time.perf_counter() - t0) * 1000\n        return {"detections": detections, "latency_ms": latency_ms, "status": "optimized"}\n\nif __name__ == "__main__":\n    engine = InferenceEngine()\n    print("Optimized inference engine online.")\n`;
        toolCalls.push({
          id: `tc-${Date.now()}-2`,
          toolName: 'proposeCodeDiff',
          arguments: { targetFile: activeFilePath },
          status: 'success',
          output: 'Side-by-side diff prepared for human verification',
        });
      }
    } else if (lowerPrompt.includes('auth') || lowerPrompt.includes('security') || agentRole === 'security') {
      reply = `### Security Audit Report (${routingDecision.selectedModelName})\n\n1. **Zero-Leak Validation**: API keys are isolated via AES-256-GCM and never exposed to the client.\n2. **Input Sanitization**: Terminal runner enforces a command sandbox preventing dangerous recursive deletes.\n3. **Entitlement Boundary**: Shared capabilities have strict expiration dates and spending caps.`;
      toolCalls.push({
        id: `tc-${Date.now()}-2`,
        toolName: 'auditSecretBoundaries',
        arguments: { scope: 'workspace' },
        status: 'success',
        output: 'Zero unencrypted credentials found in code',
      });
    } else if (lowerPrompt.includes('plan') || agentRole === 'planner') {
      reply = `### Task Contract Plan (${routingDecision.selectedModelName})\n\n- **Intent**: ${prompt}\n- **Scope**: \`${activeFilePath || 'workspace'}\`\n- **Allowed Tools**: \`readFile\`, \`proposeCodeDiff\`, \`runTests\`\n- **Quality Verification**: Unit test pass + latency benchmark < 25ms.`;
    } else {
      reply = `Understood. I have inspected your request using **${routingDecision.selectedModelName}** (${routingDecision.mode} mode).\n\n${routingDecision.rationale}\n\nEverything in your workspace is ready. You can test your code using the terminal or ask me to implement features.`;
    }

    // 5. Record Evidence & Provenance
    const evidence = recordEvidence({
      taskId: `task-${Date.now()}`,
      prompt,
      modelId: routingDecision.selectedModelId,
      modelName: routingDecision.selectedModelName,
      capabilityId: routingDecision.selectedCapabilityId,
      agentRole: agentRole as AgentRole,
      toolsUsed: toolCalls.map((t) => t.toolName),
      filesModified: proposedChange && activeFilePath ? [activeFilePath] : [],
      verificationResult: 'passed',
      costUsd: routingDecision.selectedModelId.includes('flash') ? 0.0008 : 0.0085,
      humanIntervention: proposedChange ? 'modified' : 'none',
    });

    return NextResponse.json({
      success: true,
      reply,
      proposedChange,
      routingDecision,
      modelUsed: routingDecision.selectedModelName,
      capabilityUsed: routingDecision.selectedCapabilityId,
      toolCalls,
      evidenceId: evidence.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Chat generation failed' },
      { status: 500 }
    );
  }
}
