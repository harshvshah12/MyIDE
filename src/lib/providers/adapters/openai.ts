import type { ProviderAdapter, ModelCapabilityMetadata } from '../types.ts';
import type { ProviderConnection } from '../../schema/entities.ts';
import { decryptSecret } from '../../crypto.ts';
import { KNOWN_MODEL_CAPABILITIES } from '../registry.ts';

export class OpenAIAdapter implements ProviderAdapter {
  public readonly provider = 'openai' as const;

  public async testConnection(connection: ProviderConnection): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const apiKey = decryptSecret(connection.encryptedCredential);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch('https://api.openai.com/v1/models', {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'MyIDE-IntelligenceFabric/1.0',
        },
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        let errMessage = `OpenAI API returned status ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error?.message) {
            errMessage = body.error.message;
          }
        } catch {
          // ignore
        }
        return { success: false, latencyMs, error: errMessage };
      }

      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      if (err.name === 'AbortError') {
        return { success: false, latencyMs, error: 'Connection timed out (5s)' };
      }
      return { success: false, latencyMs, error: err.message || 'Connection test failed' };
    }
  }

  public async listModels(_connection: ProviderConnection): Promise<ModelCapabilityMetadata[]> {
    return Object.values(KNOWN_MODEL_CAPABILITIES).filter((m) => m.provider === 'openai');
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
    const apiKey = decryptSecret(connection.encryptedCredential);

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const payload = {
      model: request.modelId || 'gpt-4o',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'MyIDE-IntelligenceFabric/1.0',
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
      throw new Error(`OpenAI execution failed: ${errDetail}`);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    const text = choice?.message?.content || '';

    const inputTokens = json.usage?.prompt_tokens || Math.ceil(request.prompt.length / 4);
    const outputTokens = json.usage?.completion_tokens || Math.ceil(text.length / 4);
    const totalTokens = inputTokens + outputTokens;

    const modelCap = KNOWN_MODEL_CAPABILITIES[request.modelId] || KNOWN_MODEL_CAPABILITIES['gpt-4o'];
    const costPer1kInput = modelCap?.costPer1kInputUsd ?? 0.0025;
    const costPer1kOutput = modelCap?.costPer1kOutputUsd ?? 0.01;
    const costUsd = Number(((inputTokens / 1000) * costPer1kInput + (outputTokens / 1000) * costPer1kOutput).toFixed(6));

    const finishReasonMap: Record<string, ProviderExecutionResult['finishReason']> = {
      stop: 'stop',
      length: 'length',
      content_filter: 'content_filter',
      tool_calls: 'tool_calls',
    };

    return {
      content: text,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
      },
      durationMs,
      finishReason: finishReasonMap[choice?.finish_reason] || 'stop',
    };
  }
}
