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
}
