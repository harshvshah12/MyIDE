import { ProviderConnection } from '../schema/entities.ts';

/**
 * Model Capability & Reasoning Metadata
 *
 * Exposes detailed capability dimensions to allow future intelligent routers
 * to evaluate whether a model reliably satisfies task criteria.
 */
export interface ModelCapabilityMetadata {
  modelId: string;
  provider: 'google' | 'anthropic' | 'openai' | 'openrouter' | 'local';
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  reasoningTier: 'high' | 'medium' | 'fast' | 'none';
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  codingScore: number; // 1-10
  architectureScore: number; // 1-10
  securityReviewScore: number; // 1-10
  costPer1kInputUsd: number;
  costPer1kOutputUsd: number;
  isAvailable: boolean;
}

/**
 * Provider Adapter Contract
 *
 * Separates provider communication, testing, and capability discovery
 * from the high-level intelligent router.
 */
export interface ProviderAdapter {
  readonly provider: ProviderConnection['provider'];

  /**
   * Validates provider credentials and reports connection latency.
   */
  testConnection(connection: ProviderConnection): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }>;

  /**
   * Retrieves live model list and capability metadata supported by this connection.
   */
  listModels(connection: ProviderConnection): Promise<ModelCapabilityMetadata[]>;

  /**
   * Checks real-time provider uptime and quota health.
   */
  healthCheck(connection: ProviderConnection): Promise<{
    healthy: boolean;
    message?: string;
  }>;
}

/**
 * Provider Execution Request Payload
 */
export interface ProviderExecutionRequest {
  modelId: string;
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Provider Execution Result Payload
 */
export interface ProviderExecutionResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  durationMs: number;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
}