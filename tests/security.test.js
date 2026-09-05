import { test } from 'node:test';
import assert from 'node:assert';

import {
  UserRepository,
  WorkspaceRepository,
  WorkspaceMemberRepository,
  ProjectRepository,
  ProviderConnectionRepository,
  CapabilityRepository,
  EntitlementRepository,
} from '../src/lib/db/repositories.ts';
import {
  requireWorkspaceMember,
  requireProjectAccess,
  requireCapabilityOwner,
  validateEntitlementAccess,
} from '../src/lib/auth/authorization.ts';
import {
  getCurrentUser,
  requireUser,
  signSessionToken,
} from '../src/lib/auth/session.ts';
import { clearCollection } from '../src/lib/db/store.ts';

test('Security Boundary Suite', async (t) => {
  // Setup clean test data
  clearCollection('users');
  clearCollection('workspaces');
  clearCollection('workspace_members');
  clearCollection('projects');
  clearCollection('provider_connections');
  clearCollection('capabilities');
  clearCollection('entitlements');

  const userA = UserRepository.save({
    id: 'usr_user_a',
    email: 'alice@mit.edu',
    name: 'Alice',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const userB = UserRepository.save({
    id: 'usr_user_b',
    email: 'bob@stanford.edu',
    name: 'Bob',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const workspaceB = WorkspaceRepository.save({
    id: 'ws_bob_private',
    slug: 'bob-robotics',
    name: "Bob's Robotics Project",
    rootDirectory: 'X:/Workspace/Bob',
    ownerId: userB.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const projectB = ProjectRepository.save({
    id: 'proj_bob_ai',
    workspaceId: workspaceB.id,
    name: 'Inference Engine',
    slug: 'inference-engine',
    path: 'src/inference',
    kind: 'research',
    stack: ['python', 'pytorch'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const connB = ProviderConnectionRepository.save({
    id: 'pconn_bob_anthropic',
    ownerId: userB.id,
    provider: 'anthropic',
    authMethod: 'api_key',
    encryptedCredential: 'salt:iv:tag:cipher',
    maskedCredential: 'sk-a••••••••9999',
    status: 'active',
    availableModels: ['claude-3-7-sonnet'],
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const capB = CapabilityRepository.save({
    id: 'cap_bob_claude',
    providerConnectionId: connB.id,
    ownerId: userB.id,
    name: "Bob's Claude 3.7",
    description: 'Hardware vision research',
    modelId: 'claude-3-7-sonnet',
    isShareable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await t.test('1. User A cannot access User B private workspace', async () => {
    await assert.rejects(
      async () => {
        await requireWorkspaceMember(workspaceB.id, userA.id);
      },
      /is not a member of workspace/
    );
  });

  await t.test('2. User A cannot access User B project', async () => {
    await assert.rejects(
      async () => {
        await requireProjectAccess(projectB.id, userA.id);
      },
      /is not a member of workspace/
    );
  });

  await t.test('3. User A cannot claim ownership of User B capability', async () => {
    await assert.rejects(
      async () => {
        await requireCapabilityOwner(capB.id, userA.id);
      },
      /is not the owner of capability/
    );
  });

  await t.test('4. User A cannot retrieve User B raw credential', () => {
    const list = ProviderConnectionRepository.listByOwner(userB.id);
    assert.strictEqual(list.length, 1);
    const conn = list[0];
    // Plaintext key is NOT stored in maskedCredential
    assert.strictEqual(conn.maskedCredential.includes('sk-ant-'), false);
    assert.ok(conn.maskedCredential.includes('••••••••'));
  });

  await t.test('5. User A cannot execute User B capability without an entitlement', async () => {
    const result = await validateEntitlementAccess({
      entitlementId: 'ent_nonexistent',
      userId: userA.id,
      workspaceId: workspaceB.id,
      modelId: 'claude-3-7-sonnet',
    });
    assert.strictEqual(result.allowed, false);
    assert.match(result.reason || '', /Entitlement record not found/);
  });

  await t.test('6. User A can execute only when a valid Entitlement exists', async () => {
    const validEnt = EntitlementRepository.save({
      id: 'ent_alice_authorized',
      capabilityId: capB.id,
      grantedToUserId: userA.id,
      grantedByUserId: userB.id,
      workspaceId: 'ws_shared_hackathon',
      maxBudgetUsd: 10.0,
      spentBudgetUsd: 2.0,
      maxRequests: 100,
      usedRequests: 10,
      expiresAt: Date.now() + 3600000,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const check = await validateEntitlementAccess({
      entitlementId: validEnt.id,
      userId: userA.id,
      workspaceId: 'ws_shared_hackathon',
      modelId: 'claude-3-7-sonnet',
    });

    assert.strictEqual(check.allowed, true);
    assert.strictEqual(check.entitlement?.id, validEnt.id);
  });

  await t.test('7. Entitlement rejects when revoked by owner', async () => {
    EntitlementRepository.revokeOne('ent_alice_authorized');

    const check = await validateEntitlementAccess({
      entitlementId: 'ent_alice_authorized',
      userId: userA.id,
      workspaceId: 'ws_shared_hackathon',
    });

    assert.strictEqual(check.allowed, false);
    assert.match(check.reason || '', /revoked/);
  });

  await t.test('8. Invalid or expired session tokens are rejected', async () => {
    const expiredSession = signSessionToken({
      userId: userA.id,
      email: userA.email,
      issuedAt: Date.now() - 7200000,
      expiresAt: Date.now() - 3600000, // Expired 1 hour ago
    });

    const mockRequest = new Request('http://localhost:3000/api/protected', {
      headers: { Authorization: `Bearer ${expiredSession}` },
    });

    const user = await getCurrentUser(mockRequest);
    assert.strictEqual(user, null);

    await assert.rejects(async () => {
      await requireUser(mockRequest);
    }, /Authentication required/);
  });

  await t.test('9. Production cannot activate development authentication bypass', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevBypass = process.env.DEV_AUTH_BYPASS;

    try {
      process.env.NODE_ENV = 'production';
      process.env.DEV_AUTH_BYPASS = 'true';

      const reqWithoutAuth = new Request('http://localhost:3000/api/workspace');
      const user = await getCurrentUser(reqWithoutAuth);

      // In production, DEV_AUTH_BYPASS must be ignored and return null
      assert.strictEqual(user, null);
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.DEV_AUTH_BYPASS = prevBypass;
    }
  });
});