import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { constantTimeEqual } from '../crypto.ts';
import { UserRepository } from '../db/repositories.ts';
import type { User } from '../schema/entities.ts';

interface StoredCredential {
  userId: string;
  email: string;
  hash: string;
  salt: string;
  updatedAt: number;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const CREDS_DIR = isServerless ? path.join(os.tmpdir(), 'myide', 'data') : path.resolve(process.cwd(), 'data', 'auth');
const CREDS_FILE = path.join(CREDS_DIR, 'credentials.json');

function ensureCredsDir() {
  if (!fs.existsSync(CREDS_DIR)) {
    try {
      fs.mkdirSync(CREDS_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function readCredentials(): StoredCredential[] {
  ensureCredsDir();
  if (!fs.existsSync(CREDS_FILE)) return [];
  try {
    const raw = fs.readFileSync(CREDS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeCredentials(creds: StoredCredential[]): void {
  ensureCredsDir();
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), 'utf8');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function registerUserWithPassword(name: string, email: string, password: string): User {
  const cleanEmail = email.trim().toLowerCase();
  const existing = UserRepository.findByEmail(cleanEmail);
  if (existing) {
    throw new Error(`An account with email ${cleanEmail} already exists.`);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);

  const slug = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
  const userId = `usr_${slug}_${crypto.randomBytes(3).toString('hex')}`;
  const now = Date.now();

  const user: User = {
    id: userId,
    email: cleanEmail,
    name: name.trim() || 'Developer',
    authProvider: 'local',
    createdAt: now,
    updatedAt: now,
  };

  UserRepository.save(user);

  const creds = readCredentials();
  creds.push({
    userId,
    email: cleanEmail,
    hash,
    salt,
    updatedAt: now,
  });
  writeCredentials(creds);

  return user;
}

export function verifyUserCredentials(email: string, password: string): User | null {
  const cleanEmail = email.trim().toLowerCase();
  const user = UserRepository.findByEmail(cleanEmail);
  if (!user) return null;

  const creds = readCredentials();
  const record = creds.find((c) => c.email === cleanEmail || c.userId === user.id);
  if (!record) {
    // If user was created without password (e.g. quickstart/oauth), allow password creation or return null
    return null;
  }

  const calculatedHash = hashPassword(password, record.salt);
  if (constantTimeEqual(calculatedHash, record.hash)) {
    return user;
  }

  return null;
}
