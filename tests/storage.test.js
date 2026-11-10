import { test } from 'node:test';
import assert from 'node:assert';
import { readCollection, writeCollection, clearCollection } from '../src/lib/db/store.ts';
import { UserSchema, WorkspaceSchema } from '../src/lib/schema/entities.ts';
import {
  UserRepository,
  WorkspaceRepository,
  CapabilityRepository,
  EntitlementRepository,
  ConversationRepository,
  ChatMessageRepository,
} from '../src/lib/db/repositories.ts';

test('Storage: Atomic Document Store writes and reads with schema validation', () => {
  clearCollection('test_users');

  const validUsers = [
    {
      id: 'usr_test_1',
      email: 'alex@example.com',
      name: 'Alex',
      authProvider: 'local',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'usr_test_2',
      email: 'sam@example.com',
      name: 'Sam',
      authProvider: 'google',
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  writeCollection('test_users', validUsers, UserSchema);
  const loaded = readCollection('test_users', UserSchema);

  assert.strictEqual(loaded.length, 2);
  assert.strictEqual(loaded[0].email, 'alex@example.com');
  assert.strictEqual(loaded[1].name, 'Sam');
});

test('Storage: writeCollection rejects invalid schema items atomically', () => {
  clearCollection('test_invalid');

  const badUsers = [
    {
      id: 'bad_id', // does not start with usr_
      email: 'bad-email',
      name: 'Test',
      authProvider: 'local',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  assert.throws(() => {
    writeCollection('test_invalid', badUsers, UserSchema);
  }, /Cannot write invalid entity/);

  // Assert target file was NOT created or remained empty
  const loaded = readCollection('test_invalid', UserSchema);
  assert.strictEqual(loaded.length, 0);
});

test('Storage: Repositories execute CRUD correctly', () => {
  clearCollection('workspaces');

  const ws = WorkspaceRepository.save({
    id: 'ws_test_ide',
    slug: 'myide-dev',
    name: 'MyIDE Development',
    rootDirectory: 'X:/MyIDE',
    ownerId: 'usr_test_1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const found = WorkspaceRepository.findById('ws_test_ide');
  assert.strictEqual(found?.name, 'MyIDE Development');

  const foundSlug = WorkspaceRepository.findBySlug('myide-dev');
  assert.strictEqual(foundSlug?.id, 'ws_test_ide');

  const deleted = WorkspaceRepository.delete('ws_test_ide');
  assert.strictEqual(deleted, true);
  assert.strictEqual(WorkspaceRepository.findById('ws_test_ide'), null);
});

test('Storage: Capability emergency revocation kill-switch terminates all active sessions', () => {
  clearCollection('capabilities');
  clearCollection('entitlements');

  const cap1 = CapabilityRepository.save({
    id: 'cap_owner_c1',
    providerConnectionId: 'pconn_1',
    ownerId: 'usr_owner_kill',
    name: 'Shared Model A',
    modelId: 'claude-3-7-sonnet',
    isShareable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const cap2 = CapabilityRepository.save({
    id: 'cap_owner_c2',
    providerConnectionId: 'pconn_1',
    ownerId: 'usr_owner_kill',
    name: 'Shared Model B',
    modelId: 'gemini-3.8-flash',
    isShareable: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Issue 2 active entitlements
  EntitlementRepository.save({
    id: 'ent_kill_1',
    capabilityId: cap1.id,
    grantedToUserId: 'usr_recipient_1',
    grantedByUserId: 'usr_owner_kill',
    workspaceId: 'ws_demo',
    maxBudgetUsd: 10,
    spentBudgetUsd: 0,
    maxRequests: 50,
    usedRequests: 0,
    expiresAt: Date.now() + 100000,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  EntitlementRepository.save({
    id: 'ent_kill_2',
    capabilityId: cap2.id,
    grantedToUserId: 'usr_recipient_2',
    grantedByUserId: 'usr_owner_kill',
    workspaceId: 'ws_demo',
    maxBudgetUsd: 10,
    spentBudgetUsd: 0,
    maxRequests: 50,
    usedRequests: 0,
    expiresAt: Date.now() + 100000,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Execute emergency kill switch
  const revokedCount = EntitlementRepository.revokeAllForOwner('usr_owner_kill');
  assert.strictEqual(revokedCount, 2);

  // Verify both entitlements are now 'revoked'
  assert.strictEqual(EntitlementRepository.findById('ent_kill_1')?.status, 'revoked');
  assert.strictEqual(EntitlementRepository.findById('ent_kill_2')?.status, 'revoked');
});

test('Storage: Conversation and ChatMessage repositories manage persistent chat history', () => {
  clearCollection('conversations');
  clearCollection('chat_messages');

  const conv = ConversationRepository.save({
    id: 'conv_session_1',
    workspaceId: 'ws_demo',
    userId: 'usr_student_1',
    title: 'Refactor Authentication Flow',
    agentRole: 'coder',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  assert.strictEqual(conv.id, 'conv_session_1');
  const foundConv = ConversationRepository.findById('conv_session_1');
  assert.strictEqual(foundConv?.title, 'Refactor Authentication Flow');

  // Save messages
  ChatMessageRepository.save({
    id: 'msg_1',
    conversationId: 'conv_session_1',
    role: 'user',
    content: 'Can you refactor the Google OAuth callback?',
    timestamp: 1000,
  });

  ChatMessageRepository.save({
    id: 'msg_2',
    conversationId: 'conv_session_1',
    role: 'assistant',
    agentRole: 'coder',
    content: 'Sure, here is the updated implementation with automatic Gemini provisioning.',
    modelUsed: 'gemini-2.5-pro',
    timestamp: 2000,
  });

  const messages = ChatMessageRepository.listByConversation('conv_session_1');
  assert.strictEqual(messages.length, 2);
  assert.strictEqual(messages[0].role, 'user');
  assert.strictEqual(messages[1].role, 'assistant');
  assert.strictEqual(messages[1].modelUsed, 'gemini-2.5-pro');

  // User conversation listing
  const userConvs = ConversationRepository.listByUser('usr_student_1');
  assert.strictEqual(userConvs.length, 1);

  // Deleting conversation cascades to delete messages
  const deleted = ConversationRepository.delete('conv_session_1');
  assert.strictEqual(deleted, true);
  assert.strictEqual(ConversationRepository.findById('conv_session_1'), null);
  assert.strictEqual(ChatMessageRepository.listByConversation('conv_session_1').length, 0);
});
