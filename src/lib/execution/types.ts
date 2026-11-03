/**
 * Typed Execution Contracts for MyIDE AI Execution Layer (Phase 4)
 *
 * Provides normalized, provider-agnostic request and response structures
 * across Google Gemini, Anthropic Claude, OpenAI, and Local Daemons.
 */

export interface ExecutionUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface ExecutionRequest {
  userId: string;
  workspaceId: string;
  projectId?: string;
  prompt: string;
  systemPrompt?: string;
  agentRole?: string;
  modelId?: string;
  provider?: 'google' | 'anthropic' | 'openai' | 'openrouter' | 'local';
  capabilityId?: string;
  temperature?: number;
  maxTokens?: number;
  activeFilePath?: string;
  activeFileContent?: string;
  timeoutMs?: number;
}

export interface ProposedCodeChange {
  targetPath: string;
  newContent: string;
}

export interface ExecutionResult {
  success: boolean;
  content: string;
  modelId: string;
  modelName: string;
  provider: string;
  usage: ExecutionUsage;
  durationMs: number;
  evidenceId: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  isSimulated?: boolean;
  simulationReason?: string;
  proposedChange?: ProposedCodeChange;
  toolCalls?: Array<{
    id: string;
    toolName: string;
    arguments: Record<string, unknown>;
    status: 'pending' | 'running' | 'success' | 'failed' | 'rejected';
    output?: string;
  }>;
}

export class ExecutionError extends Error {
  public readonly code: string;
  public readonly provider?: string;
  public readonly status?: number;

  constructor(message: string, code: string = 'EXECUTION_FAILED', provider?: string, status?: number) {
    super(message);
    this.name = 'ExecutionError';
    this.code = code;
    this.provider = provider;
    this.status = status;
  }
}

export class ProviderUnavailableError extends ExecutionError {
  constructor(provider: string, details?: string) {
    super(
      `Provider "${provider}" is currently unreachable or unconfigured.${details ? ' ' + details : ''}`,
      'PROVIDER_UNAVAILABLE',
      provider,
      503
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class ModelNotFoundError extends ExecutionError {
  constructor(modelId: string) {
    super(`Model "${modelId}" is not recognized or not available.`, 'MODEL_NOT_FOUND', undefined, 404);
    this.name = 'ModelNotFoundError';
  }
}
