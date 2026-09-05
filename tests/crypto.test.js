const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const MASTER_SECRET = 'test-secret-key-for-unit-tests-32b!';

function getDerivedKey(salt) {
  return crypto.pbkdf2Sync(MASTER_SECRET, salt, 100000, 32, 'sha256');
}

function encryptSecret(plainText) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getDerivedKey(salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(encryptedPayload) {
  const parts = encryptedPayload.split(':');
  const [saltHex, ivHex, tagHex, cipherHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');
  const key = getDerivedKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

test('AES-256-GCM Encryption and Decryption Roundtrip', () => {
  const apiKey = 'sk-proj-1234567890abcdefABCDEF_SECRET_KEY';
  const encrypted = encryptSecret(apiKey);

  assert.notStrictEqual(encrypted, apiKey);
  assert.strictEqual(encrypted.split(':').length, 4);

  const decrypted = decryptSecret(encrypted);
  assert.strictEqual(decrypted, apiKey);
});

test('Tampered ciphertext should fail authentication', () => {
  const apiKey = 'super-secret-token';
  const encrypted = encryptSecret(apiKey);
  const parts = encrypted.split(':');
  
  // Tamper with cipher text
  const tamperedCipher = 'ff' + parts[3].slice(2);
  const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCipher}`;

  assert.throws(() => {
    decryptSecret(tamperedPayload);
  });
});
