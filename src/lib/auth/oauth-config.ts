import path from 'path';
import fs from 'fs';
import os from 'os';
import { encryptSecret, decryptSecret } from '../crypto.ts';

interface StoredOAuthConfig {
  encryptedClientId: string;
  encryptedClientSecret: string;
  updatedAt: number;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const CONFIG_DIR = isServerless ? path.join(os.tmpdir(), 'myide', 'config') : path.resolve(process.cwd(), 'data', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'oauth.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

export function getGoogleOAuthConfig(): {
  clientId?: string;
  clientSecret?: string;
  isConfigured: boolean;
} {
  // 1. Check environment variables first
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId.trim(),
      clientSecret: envClientSecret.trim(),
      isConfigured: true,
    };
  }

  // 2. Check encrypted persisted configuration
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const data: StoredOAuthConfig = JSON.parse(raw);
      if (data.encryptedClientId && data.encryptedClientSecret) {
        const clientId = decryptSecret(data.encryptedClientId);
        const clientSecret = decryptSecret(data.encryptedClientSecret);
        return {
          clientId,
          clientSecret,
          isConfigured: true,
        };
      }
    }
  } catch (err) {
    console.error('Failed to read persisted OAuth config:', err);
  }

  return {
    clientId: envClientId?.trim(),
    clientSecret: envClientSecret?.trim(),
    isConfigured: false,
  };
}

export function saveGoogleOAuthConfig(clientId: string, clientSecret: string): void {
  if (!clientId || !clientSecret) {
    throw new Error('Both Google Client ID and Client Secret are required.');
  }

  ensureConfigDir();
  const encryptedClientId = encryptSecret(clientId.trim());
  const encryptedClientSecret = encryptSecret(clientSecret.trim());

  const config: StoredOAuthConfig = {
    encryptedClientId,
    encryptedClientSecret,
    updatedAt: Date.now(),
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}
