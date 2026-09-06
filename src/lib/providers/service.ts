import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ProviderConnection } from '../schema/entities.ts';
import { ProviderConnectionRepository } from '../db/repositories.ts';
import { ProviderRegistry } from './registry.ts';
import { encryptSecret, maskSecret } from '../crypto.ts';
import { NotFoundError, ForbiddenError } from '../auth/errors.ts';

export interface CreateProviderConnectionInput {
  provider: 'google' | 'anthropic' | 'openai' | 'openrouter' | 'local';
  authMethod?: 'api_key' | 'oauth' | 'local_daemon';
  credential: string;
  endpointUrl?: string;
}

export interface MaskedProviderConnection {
  id: string;
  ownerId: string;
  provider: 'google' | 'anthropic' | 'openai' | 'openrouter' | 'local';
  authMethod: 'api_key' | 'oauth' | 'local_daemon';
  maskedCredential: string;
  maskedKey?: string;
  status: 'active' | 'error' | 'revoked' | 'untested';
  errorMessage?: string;
  availableModels: string[];
  usageCount: number;
  lastTestedAt?: number;
  createdAt: number;
  updatedAt: number;
}

function toMasked(conn: ProviderConnection): MaskedProviderConnection {
  return {
    id: conn.id,
    ownerId: conn.ownerId,
    provider: conn.provider,
    authMethod: conn.authMethod,
    maskedCredential: conn.maskedCredential,
    maskedKey: conn.maskedCredential,
    status: conn.status,
    errorMessage: conn.errorMessage,
    availableModels: conn.availableModels,
    usageCount: conn.usageCount,
    lastTestedAt: conn.lastTestedAt,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
}

/**
 * Creates a new Provider Connection for the authenticated user.
 */
export async function createProviderConnection(
  userId: string,
  input: CreateProviderConnectionInput
): Promise<MaskedProviderConnection> {
  if (input.provider === 'local' && !input.credential) {
    input.credential = input.endpointUrl || 'http://127.0.0.1:11434';
  }

  if (!input.credential || typeof input.credential !== 'string') {
    throw new Error('Valid credential string required.');
  }

  const allowedProviders = ['google', 'anthropic', 'openai', 'openrouter', 'local'];
  if (!allowedProviders.includes(input.provider)) {
    throw new Error(`Invalid provider: ${input.provider}`);
  }

  const now = Date.now();
  const id = `pconn_${input.provider}_${crypto.randomBytes(3).toString('hex')}`;
  const encryptedCredential = encryptSecret(input.credential.trim());
  const maskedCredential =
    input.provider === 'local'
      ? input.credential.trim()
      : maskSecret(input.credential.trim());

  const authMethod =
    input.authMethod || (input.provider === 'local' ? 'local_daemon' : 'api_key');

  let connection: ProviderConnection = {
    id,
    ownerId: userId,
    provider: input.provider,
    authMethod,
    encryptedCredential,
    maskedCredential,
    status: 'untested',
    availableModels: [],
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Perform immediate test
  const adapter = ProviderRegistry.get(input.provider);
  if (adapter) {
    try {
      const test = await adapter.testConnection(connection);
      connection.status = test.success ? 'active' : 'error';
      connection.errorMessage = test.error;
      connection.lastTestedAt = Date.now();
      const models = await adapter.listModels(connection);
      connection.availableModels = models.map((m) => m.modelId);
    } catch (err: any) {
      connection.status = 'error';
      connection.errorMessage = err.message || 'Initial connection test failed';
    }
  }

  const saved = ProviderConnectionRepository.save(connection);
  return toMasked(saved);
}

/**
 * Retrieves a single Provider Connection verifying owner boundaries.
 */
export async function getProviderConnection(
  userId: string,
  connectionId: string
): Promise<MaskedProviderConnection> {
  const connection = ProviderConnectionRepository.findById(connectionId);
  if (!connection) {
    throw new NotFoundError(`Provider connection "${connectionId}" not found.`);
  }

  if (connection.ownerId !== userId) {
    throw new ForbiddenError(
      `Access denied: You do not own provider connection "${connectionId}".`
    );
  }

  return toMasked(connection);
}

/**
 * Lists all Provider Connections owned by the authenticated user.
 */
export async function listProviderConnections(
  userId: string
): Promise<MaskedProviderConnection[]> {
  const connections = ProviderConnectionRepository.listByOwner(userId);
  return connections.map(toMasked);
}

/**
 * Tests an existing Provider Connection.
 */
export async function testProviderConnection(
  userId: string,
  connectionId: string
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const connection = ProviderConnectionRepository.findById(connectionId);
  if (!connection) {
    throw new NotFoundError(`Provider connection "${connectionId}" not found.`);
  }

  if (connection.ownerId !== userId) {
    throw new ForbiddenError(
      `Access denied: You do not own provider connection "${connectionId}".`
    );
  }

  const adapter = ProviderRegistry.get(connection.provider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider "${connection.provider}".`);
  }

  const test = await adapter.testConnection(connection);

  // Update connection status
  const updated: ProviderConnection = {
    ...connection,
    status: test.success ? 'active' : 'error',
    errorMessage: test.error,
    lastTestedAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (test.success) {
    try {
      const models = await adapter.listModels(connection);
      updated.availableModels = models.map((m) => m.modelId);
    } catch {
      // ignore model discovery failure
    }
  }

  ProviderConnectionRepository.save(updated);
  return {
    success: test.success,
    latencyMs: test.latencyMs,
    status: test.success ? 'active' : 'error',
    error: test.error,
  };
}

/**
 * Deletes a Provider Connection verifying owner boundaries.
 */
export async function deleteProviderConnection(
  userId: string,
  connectionId: string
): Promise<boolean> {
  const connection = ProviderConnectionRepository.findById(connectionId);
  if (!connection) {
    throw new NotFoundError(`Provider connection "${connectionId}" not found.`);
  }

  if (connection.ownerId !== userId) {
    throw new ForbiddenError(
      `Access denied: You do not own provider connection "${connectionId}".`
    );
  }

  return ProviderConnectionRepository.delete(connectionId);
}

/**
 * Migrates legacy data/vault.json credentials into user provider connections.
 */
export async function migrateLegacyVault(userId: string): Promise<number> {
  const vaultPath = path.join(process.cwd(), 'data', 'vault.json');
  if (!fs.existsSync(vaultPath)) return 0;

  try {
    const raw = fs.readFileSync(vaultPath, 'utf8');
    const legacyVault = JSON.parse(raw);
    let migratedCount = 0;

    const existing = ProviderConnectionRepository.listByOwner(userId);
    const existingProviders = new Set(existing.map((c) => c.provider));

    for (const [provider, rawEncrypted] of Object.entries(legacyVault)) {
      const p = provider.toLowerCase() as CreateProviderConnectionInput['provider'];
      if (!existingProviders.has(p) && typeof rawEncrypted === 'string') {
        try {
          // decrypt with legacy or crypto
          const { decryptSecret } = await import('../crypto.ts');
          const plainKey = decryptSecret(rawEncrypted);
          await createProviderConnection(userId, {
            provider: p,
            credential: plainKey,
          });
          migratedCount++;
        } catch {
          // skip invalid or corrupted legacy keys
        }
      }
    }

    return migratedCount;
  } catch {
    return 0;
  }
}
