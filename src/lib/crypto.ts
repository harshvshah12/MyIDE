import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;

const DEFAULT_SALT = Buffer.from('fabric-security-salt-2026');
const MASTER_SECRET = process.env.FABRIC_MASTER_KEY || 'fabric-local-dev-secret-key-32bytes!';

function getDerivedKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(MASTER_SECRET, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts sensitive string using AES-256-GCM.
 * Output format: hex string composed of salt:iv:tag:ciphertext
 */
export function encryptSecret(plainText: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getDerivedKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts secret encrypted with encryptSecret.
 * NEVER call this on client side or expose the output to API responses.
 */
export function decryptSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format');
  }

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

/**
 * Safely masks an API key or secret for UI display.
 * Example: 'AIzaSyD-1234567890abcdef' -> 'AIza••••••••cdef'
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
