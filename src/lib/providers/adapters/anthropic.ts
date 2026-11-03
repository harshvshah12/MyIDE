import type { ProviderAdapter, ModelCapabilityMetadata } from '../types.ts';
import type { ProviderConnection } from '../../schema/entities.ts';
import { decryptSecret } from '../../crypto.ts';
import { KNOWN_MODEL_CAPABILITIES } from '../registry.ts';

export class AnthropicAdapter implements ProviderAdapter {
  public readonly provider = 'anthropic' as const;

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

      // Probe call to messages API with 1 token
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        let errMessage = `Anthropic API returned status ${res.status}`;
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
    return Object.values(KNOWN_MODEL_CAPABILITIES).filter((m) => m.provider === 'anthropic');
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

    // Normalize Anthropic model ID
    let apiModelId = request.modelId;
    if (apiModelId.includes('3-7-sonnet') || apiModelId.includes('3-5-sonnet')) {
      apiModelId = 'claude-3-5-sonnet-latest';
    } else if (apiModelId.includes('haiku')) {
      apiModelId = 'claude-3-5-haiku-latest';
    }

    const payload: any = {
      model: apiModelId,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      messages: [{ role: 'user', content: request.prompt }],
    };

    if (request.systemPrompt) {
      payload.system = request.systemPrompt;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
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
      throw new Error(`Anthropic execution failed: ${errDetail}`);
    }

    const json = await res.json();
    const text = json.content
      ?.filter((block: any) => block.type === 'text')
      ?.map((block: any) => block.text)
      ?.join('') || '';

    const inputTokens = json.usage?.input_tokens || Math.ceil(request.prompt.length / 4);
    const outputTokens = json.usage?.output_tokens || Math.ceil(text.length / 4);
    const totalTokens = inputTokens + outputTokens;

    const modelCap = KNOWN_MODEL_CAPABILITIES[request.modelId] || KNOWN_MODEL_CAPABILITIES['claude-3-7-sonnet'];
    const costPer1kInput = modelCap?.costPer1kInputUsd ?? 0.003;
    const costPer1kOutput = modelCap?.costPer1kOutputUsd ?? 0.015;
    const costUsd = Number(((inputTokens / 1000) * costPer1kInput + (outputTokens / 1000) * costPer1kOutput).toFixed(6));

    const finishReasonMap: Record<string, ProviderExecutionResult['finishReason']> = {
      end_turn: 'stop',
      max_tokens: 'length',
      stop_sequence: 'stop',
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
      finishReason: finishReasonMap[json.stop_reason] || 'stop',
    };
  }
}
