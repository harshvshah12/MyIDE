import { test } from 'node:test';
import assert from 'node:assert';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  constantTimeEqual,
  redactCredentials,
  generateSecureToken,
} from '../src/lib/crypto.ts';

test('Crypto: AES-256-GCM Encryption and Decryption Roundtrip', () => {
  const secret = 'sk-ant-api03-sample-high-entropy-secret-key-1234567890';
  const encrypted = encryptSecret(secret);

  assert.notStrictEqual(encrypted, secret);
  assert.match(encrypted, /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

  const decrypted = decryptSecret(encrypted);
  assert.strictEqual(decrypted, secret);
});

test('Crypto: Tampered ciphertext or altered authentication tag fails', () => {
  const secret = 'secret-prompt-api-key';
  const encrypted = encryptSecret(secret);
  const parts = encrypted.split(':');

  // Alter authentication tag
  const badTag = parts[2].replace(/[0-9a-f]/, (c) => (c === 'a' ? 'b' : 'a'));
  const tamperedPayload = `${parts[0]}:${parts[1]}:${badTag}:${parts[3]}`;

  assert.throws(() => {
    decryptSecret(tamperedPayload);
  }, /Decryption failed/);
});

test('Crypto: Constant-time equality checks', () => {
  assert.strictEqual(constantTimeEqual('super-secret-token-123', 'super-secret-token-123'), true);
  assert.strictEqual(constantTimeEqual('super-secret-token-123', 'super-secret-token-456'), false);
  assert.strictEqual(constantTimeEqual('short', 'much-longer-string'), false);
});

test('Crypto: maskSecret preserves prefix and suffix without revealing key', () => {
  const apiKey = 'sk-ant-api03-abcdefghijklmnop1234';
  const masked = maskSecret(apiKey);
  assert.strictEqual(masked, 'sk-a••••••••1234');

  // Short secrets masked completely
  assert.strictEqual(maskSecret('short'), '••••••••');
});

test('Crypto: redactCredentials sanitizes sensitive keys before logging', () => {
  const logMessage = 'Connecting with sk-ant-api03-abcdefghijklmnop1234567890 and AIzaSyD98765432101234567890';
  const sanitized = redactCredentials(logMessage);

  assert.ok(!sanitized.includes('sk-ant-api03-abcdefghijklmnop1234567890'));
  assert.ok(!sanitized.includes('AIzaSyD98765432101234567890'));
  assert.ok(sanitized.includes('[REDACTED]'));
});

test('Crypto: generateSecureToken outputs high-entropy unique strings', () => {
  const token1 = generateSecureToken(32);
  const token2 = generateSecureToken(32);
  assert.strictEqual(token1.length, 64);
  assert.notStrictEqual(token1, token2);
});