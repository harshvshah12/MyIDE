import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { executeAITask } from '../src/lib/execution/service.ts';
import {
  UserRepository,
  WorkspaceRepository,
  ProviderConnectionRepository,
  CapabilityRepository,
  EntitlementRepository,
  EvidenceRepository,
} from '../src/lib/db/repositories.ts';
import { encryptSecret } from '../src/lib/crypto.ts';
import { ProviderRegistry } from '../src/lib/providers/registry.ts';

test('AI Execution Layer (Phase 4) Suite', async (t) => {
  // Setup isolated test entities
  const userId = `usr_exec_test_${crypto.randomBytes(3).toString('hex')}`;
  const workspaceId = `ws_exec_test_${crypto.randomBytes(3).toString('hex')}`;

  UserRepository.save({
    id: userId,
    email: 'developer@myide.local',
    name: 'Test Developer',
    authProvider: 'local',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  WorkspaceRepository.save({
    id: workspaceId,
    slug: 'test-workspace',
    name: 'Test Workspace',
    rootDirectory: 'X:\\MyIDE\\workspace',
    ownerId: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await t.test('1. executeAITask: Fallback simulation when no active provider connection exists', async () => {
    const result = await executeAITask({
      userId,
      workspaceId,
      prompt: 'Please optimize this Python script',
      agentRole: 'coder',
      modelId: 'gemini-3.8-flash',
      activeFilePath: 'worker.py',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isSimulated, true);
    assert.ok(result.simulationReason?.includes('No active API key or provider connection'));
    assert.ok(result.content.includes('Optimization Analysis'));
    assert.ok(result.proposedChange, 'Should propose optimized code for worker.py');
    assert.strictEqual(result.proposedChange?.targetPath, 'worker.py');
    assert.ok(result.evidenceId.startsWith('ev_'));

    // Check evidence was saved in repository
    const ev = EvidenceRepository.findById(result.evidenceId);
    assert.ok(ev, 'Evidence record must exist in repository');
    assert.strictEqual(ev?.userId, userId);
    assert.strictEqual(ev?.workspaceId, workspaceId);
  });

  await t.test('2. executeAITask: Executes inference with user-owned provider connection', async () => {
    const connId = `pconn_google_${crypto.randomBytes(3).toString('hex')}`;
    const plainApiKey = 'AIzaSyFakeKeyForExecutionTesting12345';

    ProviderConnectionRepository.save({
      id: connId,
      ownerId: userId,
      provider: 'google',
      authMethod: 'api_key',
      encryptedCredential: encryptSecret(plainApiKey),
      maskedCredential: 'AIza••••••••345',
      status: 'active',
      availableModels: ['gemini-3.8-flash'],
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mock Google adapter execute method for test isolation
    const googleAdapter = ProviderRegistry.get('google');
    assert.ok(googleAdapter);
    const originalExecute = googleAdapter.execute;

    let receivedRequest = null;
    googleAdapter.execute = async (conn, req) => {
      receivedRequest = req;
      return {
        content:
          'Here is your refactored Python function:\n\n```python\ndef compute_fast(a, b):\n    return a * b + 42\n```\n',
        usage: {
          inputTokens: 45,
          outputTokens: 32,
          totalTokens: 77,
          costUsd: 0.000025,
        },
        durationMs: 140,
        finishReason: 'stop',
      };
    };

    try {
      const result = await executeAITask({
        userId,
        workspaceId,
        prompt: 'Refactor compute function',
        agentRole: 'coder',
        modelId: 'gemini-3.8-flash',
        activeFilePath: 'math.py',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.isSimulated, false);
      assert.strictEqual(result.provider, 'google');
      assert.ok(result.proposedChange);
      assert.strictEqual(result.proposedChange?.targetPath, 'math.py');
      assert.ok(result.proposedChange?.newContent.includes('compute_fast'));
      assert.strictEqual(result.usage.totalTokens, 77);
      assert.strictEqual(result.usage.costUsd, 0.000025);

      // Verify connection usage count incremented
      const updatedConn = ProviderConnectionRepository.findById(connId);
      assert.strictEqual(updatedConn?.usageCount, 1);
    } finally {
      googleAdapter.execute = originalExecute;
    }
  });

  await t.test('3. executeAITask: Mode C Capability entitlement verification and execution', async () => {
    const ownerId = `usr_owner_${crypto.randomBytes(3).toString('hex')}`;
    const connId = `pconn_anthropic_${crypto.randomBytes(3).toString('hex')}`;
    const capId = `cap_claude_${crypto.randomBytes(3).toString('hex')}`;
    const entId = `ent_claude_${crypto.randomBytes(3).toString('hex')}`;

    ProviderConnectionRepository.save({
      id: connId,
      ownerId,
      provider: 'anthropic',
      authMethod: 'api_key',
      encryptedCredential: encryptSecret('sk-ant-test-key'),
      maskedCredential: 'sk-ant••••••••key',
      status: 'active',
      availableModels: ['claude-3-7-sonnet'],
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    CapabilityRepository.save({
      id: capId,
      providerConnectionId: connId,
      ownerId,
      name: 'Claude 3.7 Sonnet (Shared)',
      modelId: 'claude-3-7-sonnet',
      isShareable: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    EntitlementRepository.save({
      id: entId,
      capabilityId: capId,
      grantedToUserId: userId,
      grantedByUserId: ownerId,
      workspaceId,
      maxBudgetUsd: 5.0,
      spentBudgetUsd: 0.1,
      maxRequests: 50,
      usedRequests: 2,
      expiresAt: Date.now() + 86400000,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const anthropicAdapter = ProviderRegistry.get('anthropic');
    assert.ok(anthropicAdapter);
    const originalExecute = anthropicAdapter.execute;

    anthropicAdapter.execute = async () => ({
      content: 'Shared capability execution successful.',
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30, costUsd: 0.00015 },
      durationMs: 95,
      finishReason: 'stop',
    });

    try {
      const result = await executeAITask({
        userId,
        workspaceId,
        prompt: 'Check code quality',
        capabilityId: entId,
        modelId: 'claude-3-7-sonnet',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.isSimulated, false);
      assert.strictEqual(result.provider, 'anthropic');
      assert.ok(result.content.includes('Shared capability execution successful'));
    } finally {
      anthropicAdapter.execute = originalExecute;
    }
  });

  await t.test('4. executeAITask: Rejects expired or revoked entitlement', async () => {
    const expiredEntId = `ent_expired_${crypto.randomBytes(3).toString('hex')}`;
    EntitlementRepository.save({
      id: expiredEntId,
      capabilityId: 'cap_some_cap',
      grantedToUserId: userId,
      grantedByUserId: 'usr_other',
      workspaceId,
      maxBudgetUsd: 1.0,
      spentBudgetUsd: 0,
      maxRequests: 10,
      usedRequests: 0,
      expiresAt: Date.now() - 1000, // Expired
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await assert.rejects(
      async () => {
        await executeAITask({
          userId,
          workspaceId,
          prompt: 'Execute with expired grant',
          capabilityId: expiredEntId,
        });
      },
      (err) => err.code === 'CAPABILITY_ACCESS_DENIED'
    );
  });
});
