import type { ProviderAdapter, ModelCapabilityMetadata } from '../types.ts';
import type { ProviderConnection } from '../../schema/entities.ts';
import { decryptSecret } from '../../crypto.ts';
import { KNOWN_MODEL_CAPABILITIES } from '../registry.ts';

export class LocalDaemonAdapter implements ProviderAdapter {
  public readonly provider = 'local' as const;

  public async testConnection(connection: ProviderConnection): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      let endpoint = 'http://localhost:11434/v1';
      if (connection.encryptedCredential) {
        try {
          const decrypted = decryptSecret(connection.encryptedCredential);
          if (decrypted.startsWith('http://') || decrypted.startsWith('https://')) {
            endpoint = decrypted;
          }
        } catch {
          // fallback
        }
      }

      // Fast check with 3s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Probe models endpoint
      const res = await fetch(`${endpoint}/models`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return {
          success: false,
          latencyMs,
          error: `Local daemon returned status ${res.status}`,
        };
      }

      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        return {
          success: false,
          latencyMs,
          error: 'Local daemon probe timed out (3s). Ensure Ollama/vLLM is running.',
        };
      }
      return {
        success: false,
        latencyMs,
        error: `Cannot reach local daemon: ${err.message || 'Connection refused'}`,
      };
    }
  }

  public async listModels(_connection: ProviderConnection): Promise<ModelCapabilityMetadata[]> {
    return Object.values(KNOWN_MODEL_CAPABILITIES).filter((m) => m.provider === 'local');
  }

  public async healthCheck(connection: ProviderConnection): Promise<{
    healthy: boolean;
    message?: string;
  }> {
    const test = await this.testConnection(connection);
    return { healthy: test.success, message: test.error };
  }

  public async execute(
    connection: ProviderConnection,
    request: ProviderExecutionRequest,
    options?: { signal?: AbortSignal }
  ): Promise<ProviderExecutionResult> {
    const startTime = Date.now();
    let endpoint = 'http://localhost:11434/v1';
    if (connection.encryptedCredential) {
      try {
        const decrypted = decryptSecret(connection.encryptedCredential);
        if (decrypted.startsWith('http://') || decrypted.startsWith('https://')) {
          endpoint = decrypted;
        }
      } catch {
        // fallback
      }
    }

    // Clean up base URL for OpenAI-compatible completions
    const baseUrl = endpoint.replace(/\/+$/, '');
    const chatUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    // Normalize model ID for local daemon (strip suffix if needed)
    let localModel = request.modelId;
    if (localModel === 'llama-3.3-70b-local') {
      localModel = 'llama3.3:latest';
    }

    const payload = {
      model: localModel,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      let errDetail = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errDetail = errJson.error.message;
        }
      } catch {
        // ignore
      }
      throw new Error(`Local daemon execution failed: ${errDetail}`);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    const text = choice?.message?.content || '';

    const inputTokens = json.usage?.prompt_tokens || Math.ceil(request.prompt.length / 4);
    const outputTokens = json.usage?.completion_tokens || Math.ceil(text.length / 4);
    const totalTokens = inputTokens + outputTokens;

    // Local model compute cost is 0 USD
    return {
      content: text,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd: 0,
      },
      durationMs,
      finishReason: 'stop',
    };
  }
}
