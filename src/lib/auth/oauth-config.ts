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

const DEFAULT_ENC_CLIENT_ID =
  '46b99f397e1dd531a8e3d84a4f055408:dec086c9fdc807fa7049c7f1:8ffc5946783c71e31f4fe003b75179f7:61e473732dbba2a4cb36b50560cd2f5d5399e64380a6699d9c10b7e333db9cad945de2f9ddbf491d7d438d794812f15a273341d2014b0b5aee2dc49cfc27f3ab1aca6954b1fff0ca';
const DEFAULT_ENC_CLIENT_SECRET =
  'a4491149116dfe84d47962f34d3ffcbb:15772f82e87d3076c17bf9e3:931062935ad79ad7db8785987d89c264:3e5082e4dcba0d5e0fa6063c3ab12a283331df534445a910cae5d486eb8779eeb25b7a';

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

  // 3. Fallback to default encrypted client credentials
  try {
    const clientId = decryptSecret(DEFAULT_ENC_CLIENT_ID);
    const clientSecret = decryptSecret(DEFAULT_ENC_CLIENT_SECRET);
    return {
      clientId,
      clientSecret,
      isConfigured: true,
    };
  } catch {
    return {
      clientId: envClientId?.trim(),
      clientSecret: envClientSecret?.trim(),
      isConfigured: false,
    };
  }
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
