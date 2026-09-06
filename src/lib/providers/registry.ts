import type { ProviderAdapter, ModelCapabilityMetadata } from './types.ts';
import type { ProviderConnection } from '../schema/entities.ts';

/**
 * Provider Registry
 *
 * Manages registered ProviderAdapters and exposes model discovery interfaces.
 */
class ProviderRegistryService {
  private adapters = new Map<string, ProviderAdapter>();

  public register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  public get(provider: string): ProviderAdapter | null {
    return this.adapters.get(provider) || null;
  }

  public listProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}

import { GoogleGeminiAdapter } from './adapters/google.ts';
import { AnthropicAdapter } from './adapters/anthropic.ts';
import { OpenAIAdapter } from './adapters/openai.ts';
import { LocalDaemonAdapter } from './adapters/local.ts';

export const ProviderRegistry = new ProviderRegistryService();

// Register concrete provider adapters
ProviderRegistry.register(new GoogleGeminiAdapter());
ProviderRegistry.register(new AnthropicAdapter());
ProviderRegistry.register(new OpenAIAdapter());
ProviderRegistry.register(new LocalDaemonAdapter());

/**
 * Built-in Base Metadata for Configured Models
 */
export const KNOWN_MODEL_CAPABILITIES: Record<string, ModelCapabilityMetadata> = {
  'gemini-3.8-flash': {
    modelId: 'gemini-3.8-flash',
    provider: 'google',
    name: 'Gemini 3.8 Flash High',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    reasoningTier: 'high',
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    codingScore: 9.2,
    architectureScore: 8.7,
    securityReviewScore: 8.5,
    costPer1kInputUsd: 0.00015,
    costPer1kOutputUsd: 0.0006,
    isAvailable: true,
  },
  'gemini-3.7-flash': {
    modelId: 'gemini-3.7-flash',
    provider: 'google',
    name: 'Gemini 3.7 Flash High',
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    reasoningTier: 'medium',
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    codingScore: 8.9,
    architectureScore: 8.3,
    securityReviewScore: 8.1,
    costPer1kInputUsd: 0.0001,
    costPer1kOutputUsd: 0.0004,
    isAvailable: true,
  },
  'gemini-3.1-pro': {
    modelId: 'gemini-3.1-pro',
    provider: 'google',
    name: 'Gemini 3.1 Pro High',
    contextWindow: 2097152,
    maxOutputTokens: 65536,
    reasoningTier: 'high',
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    codingScore: 9.6,
    architectureScore: 9.8,
    securityReviewScore: 9.7,
    costPer1kInputUsd: 0.00125,
    costPer1kOutputUsd: 0.005,
    isAvailable: true,
  },
  'claude-3-7-sonnet': {
    modelId: 'claude-3-7-sonnet',
    provider: 'anthropic',
    name: 'Claude 3.7 Sonnet',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    reasoningTier: 'high',
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    codingScore: 9.8,
    architectureScore: 9.9,
    securityReviewScore: 9.9,
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.015,
    isAvailable: true,
  },
  'gpt-4o': {
    modelId: 'gpt-4o',
    provider: 'openai',
    name: 'OpenAI GPT-4o',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    reasoningTier: 'high',
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    codingScore: 9.1,
    architectureScore: 9.0,
    securityReviewScore: 9.0,
    costPer1kInputUsd: 0.0025,
    costPer1kOutputUsd: 0.01,
    isAvailable: true,
  },
  'llama-3.3-70b-local': {
    modelId: 'llama-3.3-70b-local',
    provider: 'local',
    name: 'Ollama LLaMA 3.3 70B (Local)',
    contextWindow: 32768,
    maxOutputTokens: 4096,
    reasoningTier: 'medium',
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
    codingScore: 8.2,
    architectureScore: 7.9,
    securityReviewScore: 7.8,
    costPer1kInputUsd: 0.0,
    costPer1kOutputUsd: 0.0,
    isAvailable: true,
  },
};