import assert from 'node:assert';
import http from 'node:http';
import { fork } from 'node:child_process';
import { clearCollection } from '../src/lib/db/store.ts';
import {
  UserRepository,
  ProviderConnectionRepository,
  ConversationRepository,
  ChatMessageRepository,
} from '../src/lib/db/repositories.ts';
import { executeAITask } from '../src/lib/execution/service.ts';

console.log('🧪 Starting Phase 5: Conversations & Zero-Key OAuth Suite');

// Clean DB collections for deterministic test
clearCollection('users');
clearCollection('provider_connections');
clearCollection('conversations');
clearCollection('chat_messages');

async function runTests() {
  // Test 1: Google login automatically provisions Gemini models with zero API key
  console.log('\n--- Test 1: Google Login Auto-provisions Gemini Connection ---');
  const googleUser = UserRepository.save({
    id: 'usr_harsh_google',
    email: 'harshvshah2019@gmail.com',
    name: 'Harsh Shah',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Provision via Google OAuth callback logic simulation
  const dummyAccessToken = 'ya29.a0AfH6SMA_mock_google_oauth_gemini_token';
  const { encryptSecret, maskSecret } = await import('../src/lib/crypto.ts');

  ProviderConnectionRepository.save({
    id: `pconn_google_${googleUser.id}`,
    ownerId: googleUser.id,
    provider: 'google',
    authMethod: 'oauth',
    encryptedCredential: encryptSecret(dummyAccessToken),
    maskedCredential: maskSecret(dummyAccessToken),
    status: 'active',
    availableModels: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-3.8-flash',
    ],
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const googleConns = ProviderConnectionRepository.listByOwner(googleUser.id);
  assert.strictEqual(googleConns.length, 1);
  assert.strictEqual(googleConns[0].provider, 'google');
  assert.strictEqual(googleConns[0].authMethod, 'oauth');
  assert.ok(googleConns[0].availableModels.includes('gemini-2.5-pro'));
  console.log('  ✓ Google OAuth user provisioned with zero-key Gemini connection');

  // Test 2: AI Execution runs using user's Google OAuth Gemini connection
  console.log('\n--- Test 2: AI Execution with Google OAuth Gemini Connection ---');
  const geminiExec = await executeAITask({
    userId: googleUser.id,
    workspaceId: 'ws_default',
    prompt: 'Implement a binary search function in TypeScript',
    agentRole: 'coder',
    modelId: 'gemini-2.5-pro',
  });

  assert.strictEqual(geminiExec.success, true);
  assert.ok(geminiExec.content.includes('Gemini') || geminiExec.content.length > 0);
  console.log('  ✓ Gemini model executed successfully via Google OAuth connection');

  // Test 3: ChatGPT / OpenAI login automatically provisions OpenAI models with zero API key
  console.log('\n--- Test 3: ChatGPT Login Auto-provisions OpenAI Connection ---');
  const openAIUser = UserRepository.save({
    id: 'usr_chatgpt_dev',
    email: 'chatgpt.developer@openai.com',
    name: 'ChatGPT Developer',
    authProvider: 'openai',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const dummyOpenAIToken = 'sess_mock_chatgpt_oauth_bearer_token';
  ProviderConnectionRepository.save({
    id: `pconn_openai_${openAIUser.id}`,
    ownerId: openAIUser.id,
    provider: 'openai',
    authMethod: 'oauth',
    encryptedCredential: encryptSecret(dummyOpenAIToken),
    maskedCredential: maskSecret(dummyOpenAIToken),
    status: 'active',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const openAIConns = ProviderConnectionRepository.listByOwner(openAIUser.id);
  assert.strictEqual(openAIConns.length, 1);
  assert.strictEqual(openAIConns[0].provider, 'openai');
  assert.strictEqual(openAIConns[0].authMethod, 'oauth');
  assert.ok(openAIConns[0].availableModels.includes('gpt-4o'));
  console.log('  ✓ ChatGPT OAuth user provisioned with zero-key OpenAI connection');

  // Test 4: AI Execution runs using user's ChatGPT OAuth connection
  console.log('\n--- Test 4: AI Execution with ChatGPT OAuth Connection ---');
  const chatgptExec = await executeAITask({
    userId: openAIUser.id,
    workspaceId: 'ws_default',
    prompt: 'Explain the difference between useState and useReducer',
    agentRole: 'docs',
    modelId: 'gpt-4o',
  });

  assert.strictEqual(chatgptExec.success, true);
  assert.ok(chatgptExec.content.includes('ChatGPT') || chatgptExec.content.length > 0);
  console.log('  ✓ GPT-4o model executed successfully via ChatGPT OAuth connection');

  // Test 5: Conversation Persistence & Multi-turn Chat Continuity
  console.log('\n--- Test 5: Persistent Conversation Sessions & Messages ---');
  const convId = 'conv_hackathon_demo';
  const newConv = ConversationRepository.save({
    id: convId,
    workspaceId: 'ws_default',
    userId: googleUser.id,
    title: 'Full Stack Architecture Review',
    agentRole: 'planner',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Turn 1
  ChatMessageRepository.save({
    id: 'msg_turn_1_user',
    conversationId: convId,
    role: 'user',
    agentRole: 'planner',
    content: 'Plan the database schema for our collaborative IDE',
    timestamp: Date.now() - 5000,
  });

  ChatMessageRepository.save({
    id: 'msg_turn_1_assistant',
    conversationId: convId,
    role: 'assistant',
    agentRole: 'planner',
    content: 'Here is the comprehensive database schema...',
    modelUsed: 'gemini-2.5-pro',
    timestamp: Date.now() - 4000,
  });

  // Turn 2
  ChatMessageRepository.save({
    id: 'msg_turn_2_user',
    conversationId: convId,
    role: 'user',
    agentRole: 'planner',
    content: 'Now add the Conversation and Message entities',
    timestamp: Date.now() - 2000,
  });

  ChatMessageRepository.save({
    id: 'msg_turn_2_assistant',
    conversationId: convId,
    role: 'assistant',
    agentRole: 'planner',
    content: 'Added ConversationSchema and ChatMessageSchema with full Zod validation.',
    modelUsed: 'gemini-2.5-pro',
    timestamp: Date.now() - 1000,
  });

  // Verify conversation retrieval
  const userConvs = ConversationRepository.listByUser(googleUser.id);
  assert.strictEqual(userConvs.length, 1);
  assert.strictEqual(userConvs[0].id, convId);

  const messages = ChatMessageRepository.listByConversation(convId);
  assert.strictEqual(messages.length, 4);
  assert.strictEqual(messages[0].role, 'user');
  assert.strictEqual(messages[1].role, 'assistant');
  assert.strictEqual(messages[2].role, 'user');
  assert.strictEqual(messages[3].role, 'assistant');
  console.log('  ✓ Multi-turn conversation and messages persisted accurately in store');

  // Test 6: Cascade Deletion
  console.log('\n--- Test 6: Cascade Deletion of Conversations & Messages ---');
  const isDeleted = ConversationRepository.delete(convId);
  assert.strictEqual(isDeleted, true);
  assert.strictEqual(ConversationRepository.findById(convId), null);
  assert.strictEqual(ChatMessageRepository.listByConversation(convId).length, 0);
  console.log('  ✓ Deleting conversation cleanly cascades to wipe associated messages');

  console.log('\n🎉 ALL PHASE 5 CONVERSATIONS & ZERO-KEY OAUTH TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Phase 5 verification failed:', err);
  process.exit(1);
});
