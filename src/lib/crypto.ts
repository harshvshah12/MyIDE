import crypto from 'crypto';

/**
 * Hardened Cryptographic Security Subsystem
 *
 * Algorithms & Standards:
 * - Cipher: AES-256-GCM (Authenticated symmetric encryption)
 * - Key Derivation: PBKDF2 with HMAC-SHA512, 100,000 iterations, 32-byte key length
 * - Nonce/IV: 12-byte cryptographically random bytes per encryption operation
 * - Authentication Tag: 16-byte GCM authentication tag for tamper proofing
 * - Side-Channel Defense: Constant-time comparison via crypto.timingSafeEqual
 *
 * Invariant:
 * Raw plaintext credentials must never leave the server process boundary.
 * Never pass decrypted credentials to client components or serializable responses.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;

/**
 * Resolves the master secret from environment variables.
 * In production, strictly requires a high-entropy key and rejects insecure fallbacks.
 */
function getMasterSecret(): string {
  const envKey = process.env.FABRIC_MASTER_KEY || process.env.VAULT_MASTER_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!envKey) {
    if (isProduction) {
      throw new Error(
        'FATAL: In production, FABRIC_MASTER_KEY or VAULT_MASTER_SECRET must be explicitly defined.'
      );
    }
    // Deterministic dev fallback strictly for non-production environments
    return 'fabric-local-dev-fallback-key-32bytes-long!';
  }

  if (isProduction && envKey.length < 32) {
    throw new Error('FATAL: Production master key must be at least 32 characters long.');
  }

  return envKey;
}

/**
 * Derives a 32-byte key from the master secret using PBKDF2-HMAC-SHA512 and a random salt.
 */
function deriveKey(salt: Buffer): Buffer {
  const master = getMasterSecret();
  return crypto.pbkdf2Sync(master, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts sensitive plaintext using AES-256-GCM.
 * Output format: hex(salt):hex(iv):hex(authTag):hex(ciphertext)
 */
export function encryptSecret(plainText: string): string {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    throw new Error('Cannot encrypt empty or non-string secret');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    salt.toString('hex'),
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * Decrypts a payload produced by encryptSecret.
 * Verifies authenticity tag; throws an Error if the ciphertext has been tampered with.
 *
 * NEVER call this on client-side code or expose the output to API responses.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (typeof encryptedPayload !== 'string') {
    throw new Error('Invalid payload: string expected');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format: expected salt:iv:tag:ciphertext');
  }

  const [saltHex, ivHex, tagHex, cipherHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');

  if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('Invalid cryptographic component lengths');
  }

  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error: any) {
    throw new Error('Decryption failed: ciphertext corrupted or authentication tag mismatch');
  }
}

/**
 * Masks a secret string for safe UI presentation without revealing sensitive entropy.
 * Example: 'sk-ant-api03-abcdef1234567890' -> 'sk-a••••••••7890'
 */
export function maskSecret(secret: string): string {
  if (!secret || typeof secret !== 'string') return '';
  if (secret.length <= 8) return '••••••••';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Constant-time string equality check to prevent timing side-channel attacks on tokens or hashes.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Redacts common API key patterns from log strings or debug outputs before printing.
 */
export function redactCredentials(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/(sk-[a-zA-Z0-9_\-]{20,})/g, 'sk-••••••••[REDACTED]')
    .replace(/(AIza[a-zA-Z0-9_\-]{20,})/g, 'AIza••••••••[REDACTED]')
    .replace(/(ghp_[a-zA-Z0-9]{30,})/g, 'ghp_••••••••[REDACTED]')
    .replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{20,}/gi, '$1••••••••[REDACTED]');
}

/**
 * Generates a high-entropy cryptographically secure random token (e.g. for invite codes or session IDs).
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}