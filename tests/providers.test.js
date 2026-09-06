import { test } from 'node:test';
import assert from 'node:assert';
import {
  createProviderConnection,
  getProviderConnection,
  listProviderConnections,
  testProviderConnection,
  deleteProviderConnection,
} from '../src/lib/providers/service.ts';
import {
  UserRepository,
  ProviderConnectionRepository,
} from '../src/lib/db/repositories.ts';
import { clearCollection } from '../src/lib/db/store.ts';
import { decryptSecret } from '../src/lib/crypto.ts';

test('Provider Connection & Vault Suite', async (t) => {
  // Clean store
  clearCollection('users');
  clearCollection('provider_connections');

  const userAlice = UserRepository.save({
    id: 'usr_alice_1',
    email: 'alice@mit.edu',
    name: 'Alice',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const userBob = UserRepository.save({
    id: 'usr_bob_1',
    email: 'bob@stanford.edu',
    name: 'Bob',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  let aliceGeminiConnId = '';
  let aliceLocalConnId = '';

  await t.test('1. createProviderConnection: Encrypts credential at rest and masks for output', async () => {
    const rawKey = 'AIzaSyA_abcdef1234567890_test_key_xyz';
    const conn = await createProviderConnection(userAlice.id, {
      provider: 'google',
      credential: rawKey,
    });

    assert.ok(conn.id.startsWith('pconn_google_'));
    assert.strictEqual(conn.ownerId, userAlice.id);
    assert.strictEqual(conn.provider, 'google');
    assert.strictEqual(conn.authMethod, 'api_key');

    // Masked credential check
    assert.ok(conn.maskedCredential.includes('••••'));
    assert.ok(conn.maskedCredential.startsWith('AIza'));
    assert.ok(conn.maskedCredential.endsWith('_xyz'));

    // Raw key must NOT be on masked connection object
    assert.strictEqual(conn.encryptedCredential, undefined);
    assert.strictEqual(conn.credential, undefined);

    // Verify raw secret in underlying repository is AES-256-GCM encrypted
    const stored = ProviderConnectionRepository.findById(conn.id);
    assert.ok(stored);
    assert.notStrictEqual(stored.encryptedCredential, rawKey);
    assert.strictEqual(decryptSecret(stored.encryptedCredential), rawKey);

    aliceGeminiConnId = conn.id;
  });

  await t.test('2. listProviderConnections: Scoped strictly to owner', async () => {
    // Alice has 1 connection
    const aliceConns = await listProviderConnections(userAlice.id);
    assert.strictEqual(aliceConns.length, 1);
    assert.strictEqual(aliceConns[0].id, aliceGeminiConnId);

    // Bob has 0 connections
    const bobConns = await listProviderConnections(userBob.id);
    assert.strictEqual(bobConns.length, 0);
  });

  await t.test('3. Isolation Boundary: Bob cannot read Alice provider connection', async () => {
    await assert.rejects(
      async () => {
        await getProviderConnection(userBob.id, aliceGeminiConnId);
      },
      /Access denied: You do not own provider connection/
    );
  });

  await t.test('4. Isolation Boundary: Bob cannot test Alice provider connection', async () => {
    await assert.rejects(
      async () => {
        await testProviderConnection(userBob.id, aliceGeminiConnId);
      },
      /Access denied: You do not own provider connection/
    );
  });

  await t.test('5. Isolation Boundary: Bob cannot delete Alice provider connection', async () => {
    await assert.rejects(
      async () => {
        await deleteProviderConnection(userBob.id, aliceGeminiConnId);
      },
      /Access denied: You do not own provider connection/
    );
  });

  await t.test('6. Local Daemon: Handles offline endpoint gracefully with descriptive error', async () => {
    const conn = await createProviderConnection(userAlice.id, {
      provider: 'local',
      credential: 'http://127.0.0.1:59999/v1', // non-existent offline port
    });

    assert.ok(conn.id.startsWith('pconn_local_'));
    assert.strictEqual(conn.status, 'error');
    assert.ok(conn.errorMessage && conn.errorMessage.length > 0);

    aliceLocalConnId = conn.id;
  });

  await t.test('7. deleteProviderConnection: Owner deletes connection cleanly', async () => {
    const deleted = await deleteProviderConnection(userAlice.id, aliceLocalConnId);
    assert.strictEqual(deleted, true);

    const check = ProviderConnectionRepository.findById(aliceLocalConnId);
    assert.strictEqual(check, null);

    const remaining = await listProviderConnections(userAlice.id);
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].id, aliceGeminiConnId);
  });
});
