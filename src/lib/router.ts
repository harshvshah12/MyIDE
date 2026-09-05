import { ModelMode, RoutingDecision, AgentRole } from '@/types';
import { checkEntitlementPermission } from './storage';

export interface RouteRequestOptions {
  prompt: string;
  agentRole: AgentRole;
  mode: ModelMode;
  manualModelId?: string;
  capabilityId?: string;
  capabilityOwnerName?: string;
  activeFilePath?: string;
}

export function determineModelRoute(opts: RouteRequestOptions): RoutingDecision {
  const { prompt, agentRole, mode, manualModelId, capabilityId, capabilityOwnerName } = opts;
  const lowerPrompt = prompt.toLowerCase();

  // Mode B: Manual selection strictly preserved
  if (mode === 'manual' && manualModelId) {
    const modelNames: Record<string, string> = {
      'gemini-3.8-flash': 'Gemini 3.8 Flash High',
      'gemini-3.7-flash': 'Gemini 3.7 Flash High',
      'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
      'gpt-4o': 'OpenAI GPT-4o',
      'llama-3.3-70b-local': 'Ollama LLaMA 3.3 70B (Local)',
    };
    return {
      mode: 'manual',
      selectedModelId: manualModelId,
      selectedModelName: modelNames[manualModelId] || manualModelId,
      rationale: 'User explicitly selected this model in Manual Mode. The system will not automatically switch away.',
      taskComplexity: 'standard',
      riskLevel: 'medium',
      evaluatedFactors: {
        requiresHighReasoning: true,
        multiFileImpact: false,
        modifiesSecurityOrAuth: false,
        documentationOnly: false,
        toolCallingRequired: false,
      },
      qualityPrioritySatisfied: true,
    };
  }

  // Mode C: Explicit Capability selection strictly bound
  if (mode === 'capability' && capabilityId) {
    return {
      mode: 'capability',
      selectedModelId: capabilityId,
      selectedModelName: capabilityId.includes('claude')
        ? 'Claude 3.7 Sonnet (Shared)'
        : capabilityId.includes('gpt')
        ? 'GPT-4o (Shared)'
        : 'Shared Capability',
      selectedCapabilityId: capabilityId,
      capabilityOwnerName: capabilityOwnerName || 'Teammate',
      rationale: `Bound directly to capability ${capabilityId} authorized by ${capabilityOwnerName || 'grantor'}. System will not reinterpret as permission for another model.`,
      taskComplexity: 'standard',
      riskLevel: 'medium',
      evaluatedFactors: {
        requiresHighReasoning: true,
        multiFileImpact: false,
        modifiesSecurityOrAuth: false,
        documentationOnly: false,
        toolCallingRequired: false,
      },
      qualityPrioritySatisfied: true,
    };
  }

  // Mode A: Intelligent Auto Routing (Quality Always Over Cost!)
  const isSecurityOrAuth =
    lowerPrompt.includes('security') ||
    lowerPrompt.includes('auth') ||
    lowerPrompt.includes('vulnerab') ||
    lowerPrompt.includes('token') ||
    lowerPrompt.includes('encrypt') ||
    lowerPrompt.includes('audit') ||
    agentRole === 'security';

  const isArchitecturalOrMultiFile =
    lowerPrompt.includes('architect') ||
    lowerPrompt.includes('redesign') ||
    lowerPrompt.includes('database') ||
    lowerPrompt.includes('schema') ||
    lowerPrompt.includes('refactor') ||
    lowerPrompt.includes('full-stack') ||
    agentRole === 'planner';

  const isDocOrMeta =
    lowerPrompt.includes('readme') ||
    lowerPrompt.includes('comment') ||
    lowerPrompt.includes('doc') ||
    lowerPrompt.includes('summarize') ||
    lowerPrompt.includes('explain error') ||
    agentRole === 'docs';

  const isSimpleEdit =
    lowerPrompt.includes('rename') ||
    lowerPrompt.includes('format') ||
    lowerPrompt.includes('typo') ||
    lowerPrompt.length < 35;

  if (isSecurityOrAuth) {
    return {
      mode: 'auto',
      selectedModelId: 'claude-3-7-sonnet',
      selectedModelName: 'Claude 3.7 Sonnet',
      rationale:
        'Selected Claude 3.7 Sonnet because this task involves security, authentication, or vulnerability auditing, requiring high reasoning fidelity and independent verification.',
      taskComplexity: 'critical',
      riskLevel: 'critical',
      evaluatedFactors: {
        requiresHighReasoning: true,
        multiFileImpact: true,
        modifiesSecurityOrAuth: true,
        documentationOnly: false,
        toolCallingRequired: true,
      },
      qualityPrioritySatisfied: true,
    };
  }

  if (isArchitecturalOrMultiFile) {
    return {
      mode: 'auto',
      selectedModelId: 'claude-3-7-sonnet',
      selectedModelName: 'Claude 3.7 Sonnet',
      rationale:
        'Selected Claude 3.7 Sonnet because this task involves system architecture, multi-file refactoring, or database redesign requiring deep context reasoning.',
      taskComplexity: 'complex',
      riskLevel: 'high',
      evaluatedFactors: {
        requiresHighReasoning: true,
        multiFileImpact: true,
        modifiesSecurityOrAuth: false,
        documentationOnly: false,
        toolCallingRequired: true,
      },
      qualityPrioritySatisfied: true,
    };
  }

  if (isDocOrMeta || isSimpleEdit) {
    return {
      mode: 'auto',
      selectedModelId: 'gemini-3.8-flash',
      selectedModelName: 'Gemini 3.8 Flash High',
      rationale:
        'Selected Gemini 3.8 Flash because this is a low-risk documentation/formatting task where an ultra-fast, high-throughput model completes the work with minimal latency.',
      taskComplexity: isSimpleEdit ? 'simple' : 'meta',
      riskLevel: 'low',
      evaluatedFactors: {
        requiresHighReasoning: false,
        multiFileImpact: false,
        modifiesSecurityOrAuth: false,
        documentationOnly: true,
        toolCallingRequired: false,
      },
      qualityPrioritySatisfied: true,
    };
  }

  // Default Standard Coding & Debugging: Gemini 3.8 Flash High (Fast, 8.5 reasoning)
  return {
    mode: 'auto',
    selectedModelId: 'gemini-3.8-flash',
    selectedModelName: 'Gemini 3.8 Flash High',
    rationale:
      'Selected Gemini 3.8 Flash because this is a standard coding and test workflow where low latency and strong general reasoning deliver the best pair-programming flow.',
    taskComplexity: 'standard',
    riskLevel: 'medium',
    evaluatedFactors: {
      requiresHighReasoning: true,
      multiFileImpact: false,
      modifiesSecurityOrAuth: false,
      documentationOnly: false,
      toolCallingRequired: true,
    },
    qualityPrioritySatisfied: true,
  };
}
