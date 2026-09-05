import { test } from 'node:test';
import assert from 'node:assert';
import {
  UserSchema,
  WorkspaceSchema,
  WorkspaceMemberSchema,
  ProjectSchema,
  ProviderConnectionSchema,
  CapabilitySchema,
  EntitlementSchema,
  ProjectMemorySchema,
  EvidenceSchema,
} from '../src/lib/schema/entities.ts';

test('Schema: UserSchema validation', () => {
  const validUser = {
    id: 'usr_12345678',
    email: 'engineer@college.edu',
    name: 'Student Dev',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const parsed = UserSchema.safeParse(validUser);
  assert.strictEqual(parsed.success, true);

  // Invalid email
  const invalid = UserSchema.safeParse({ ...validUser, email: 'not-an-email' });
  assert.strictEqual(invalid.success, false);

  // Invalid ID prefix
  const invalidId = UserSchema.safeParse({ ...validUser, id: 'bad_id' });
  assert.strictEqual(invalidId.success, false);
});

test('Schema: Workspace & Member schemas validation', () => {
  const ws = {
    id: 'ws_robotics',
    slug: 'robotics-arm',
    name: 'Robotics Team Arm',
    rootDirectory: 'X:/Robotics',
    ownerId: 'usr_harsh',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  assert.strictEqual(WorkspaceSchema.safeParse(ws).success, true);

  const member = {
    id: 'wsm_1',
    workspaceId: 'ws_robotics',
    userId: 'usr_harsh',
    role: 'owner',
    joinedAt: Date.now(),
  };
  assert.strictEqual(WorkspaceMemberSchema.safeParse(member).success, true);

  // Invalid role
  assert.strictEqual(
    WorkspaceMemberSchema.safeParse({ ...member, role: 'superadmin' }).success,
    false
  );
});

test('Schema: ProviderConnection & Capability schemas validation', () => {
  const pconn = {
    id: 'pconn_google_1',
    ownerId: 'usr_harsh',
    provider: 'google',
    authMethod: 'api_key',
    encryptedCredential: 'salt:iv:tag:cipher',
    maskedCredential: 'AIza••••••••1234',
    status: 'active',
    availableModels: ['gemini-3.8-flash', 'gemini-3.1-pro'],
    usageCount: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  assert.strictEqual(ProviderConnectionSchema.safeParse(pconn).success, true);

  const cap = {
    id: 'cap_claude_1',
    providerConnectionId: 'pconn_google_1',
    ownerId: 'usr_harsh',
    name: "Harsh's Claude 3.7",
    description: 'Shared for hackathon',
    modelId: 'claude-3-7-sonnet',
    isShareable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  assert.strictEqual(CapabilitySchema.safeParse(cap).success, true);
});

test('Schema: Entitlement validation rejects negative limits and invalid enums', () => {
  const ent = {
    id: 'ent_100',
    capabilityId: 'cap_claude_1',
    grantedToUserId: 'usr_teammate',
    grantedByUserId: 'usr_harsh',
    workspaceId: 'ws_robotics',
    maxBudgetUsd: 10.0,
    spentBudgetUsd: 1.25,
    maxRequests: 50,
    usedRequests: 8,
    expiresAt: Date.now() + 86400000,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  assert.strictEqual(EntitlementSchema.safeParse(ent).success, true);

  // Negative budget should fail
  assert.strictEqual(
    EntitlementSchema.safeParse({ ...ent, maxBudgetUsd: -5 }).success,
    false
  );

  // Invalid status should fail
  assert.strictEqual(
    EntitlementSchema.safeParse({ ...ent, status: 'unknown_status' }).success,
    false
  );
});

test('Schema: Evidence schema enforces privacy minimization', () => {
  const evidence = {
    id: 'ev_123',
    workspaceId: 'ws_robotics',
    taskId: 'task-1',
    userId: 'usr_harsh',
    agentRole: 'coder',
    modelId: 'gemini-3.8-flash',
    taskSummary: 'Implement PID controller logic',
    filesInspected: ['control.py'],
    filesModified: ['control.py'],
    toolsExecuted: [{ name: 'readFile', status: 'success', durationMs: 45 }],
    verificationStatus: 'passed',
    costUsd: 0.0008,
    durationMs: 1250,
    createdAt: Date.now(),
  };
  assert.strictEqual(EvidenceSchema.safeParse(evidence).success, true);
});