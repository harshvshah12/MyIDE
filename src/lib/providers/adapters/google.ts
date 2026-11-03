import type { ProviderAdapter, ModelCapabilityMetadata } from '../types.ts';
import type { ProviderConnection } from '../../schema/entities.ts';
import { decryptSecret } from '../../crypto.ts';
import { KNOWN_MODEL_CAPABILITIES } from '../registry.ts';

export class GoogleGeminiAdapter implements ProviderAdapter {
  public readonly provider = 'google' as const;

  public async testConnection(connection: ProviderConnection): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const apiKey = decryptSecret(connection.encryptedCredential);
      // Fast probe to Google Gemini models list endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'MyIDE-IntelligenceFabric/1.0' },
        }
      );
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        let errMessage = `Google API returned status ${res.status}`;
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
    return Object.values(KNOWN_MODEL_CAPABILITIES).filter((m) => m.provider === 'google');
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

    // Normalize model ID for Google Generative AI API
    let apiModelId = request.modelId;
    if (apiModelId.includes('pro')) {
      apiModelId = 'gemini-1.5-pro';
    } else if (apiModelId.includes('2.0') || apiModelId.includes('2.5')) {
      apiModelId = 'gemini-2.0-flash';
    } else {
      apiModelId = 'gemini-1.5-flash';
    }

    const payload: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 4096,
      },
    };

    if (request.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelId}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      throw new Error(`Google Gemini execution failed: ${errDetail}`);
    }

    const json = await res.json();
    const candidate = json.candidates?.[0];
    const textPart = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    const inputTokens = json.usageMetadata?.promptTokenCount || Math.ceil(request.prompt.length / 4);
    const outputTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(textPart.length / 4);
    const totalTokens = inputTokens + outputTokens;

    const modelCap = KNOWN_MODEL_CAPABILITIES[request.modelId] || KNOWN_MODEL_CAPABILITIES['gemini-3.8-flash'];
    const costPer1kInput = modelCap?.costPer1kInputUsd ?? 0.00015;
    const costPer1kOutput = modelCap?.costPer1kOutputUsd ?? 0.0006;
    const costUsd = Number(((inputTokens / 1000) * costPer1kInput + (outputTokens / 1000) * costPer1kOutput).toFixed(6));

    const finishReasonMap: Record<string, ProviderExecutionResult['finishReason']> = {
      STOP: 'stop',
      MAX_TOKENS: 'length',
      SAFETY: 'content_filter',
      RECITATION: 'content_filter',
    };

    return {
      content: textPart,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd,
      },
      durationMs,
      finishReason: finishReasonMap[candidate?.finishReason] || 'stop',
    };
  }
}
