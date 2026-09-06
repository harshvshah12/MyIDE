import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  FileNode,
  Capability,
  Entitlement,
  ProjectMemory,
  ArchitecturalDecision,
  AIEvidence,
  User,
  Presence,
  ModelProvider
} from '@/types';
import { encryptSecret, decryptSecret, maskSecret } from './crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'vault.json');
const CAPABILITIES_FILE = path.join(DATA_DIR, 'capabilities.json');
const ENTITLEMENTS_FILE = path.join(DATA_DIR, 'entitlements.json');
const MEMORY_FILE = path.join(DATA_DIR, 'project_memory.json');
const EVIDENCE_FILE = path.join(DATA_DIR, 'evidence.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory presence state for active collaborative sessions
const activePresences: Map<string, Presence> = new Map();

// Helper to read JSON file safely
function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return fallback;
  }
}

// Helper to write JSON file safely
function writeJson<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// -------------------------------------------------------------
// WORKSPACE & FILE SYSTEM
// -------------------------------------------------------------

export const DEFAULT_WORKSPACE_PATH = path.join(process.cwd(), 'workspace', 'demo-project');

export function ensureDefaultWorkspace(): void {
  if (!fs.existsSync(DEFAULT_WORKSPACE_PATH)) {
    fs.mkdirSync(DEFAULT_WORKSPACE_PATH, { recursive: true });
  }

  const readmePath = path.join(DEFAULT_WORKSPACE_PATH, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readmeContent = `# SmartVision AI - Edge Object Detection
Collaborative student research project.

## Team
- **Harsh** (Lead / ML & Architecture)
- **Aarav** (Edge Firmware / ESP32)
- **Priya** (Web Dashboard / Next.js)

## Architecture
- Core inference: TensorRT / ONNX Runtime
- Realtime telemetry: WebSocket
- UI: Next.js + Tailwind + Monaco
`;
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
  }

  const pyPath = path.join(DEFAULT_WORKSPACE_PATH, 'inference.py');
  if (!fs.existsSync(pyPath)) {
    const mainPy = `"""
SmartVision Edge Pipeline
Initial prototype for campus hackathon.
"""
import time

def process_frame(frame_data):
    # Simulated object detection inference
    start_time = time.time()
    detections = [
        {"class": "robot_arm", "confidence": 0.94, "bbox": [120, 45, 300, 280]},
        {"class": "part_defect", "confidence": 0.88, "bbox": [150, 80, 40, 40]}
    ]
    latency_ms = (time.time() - start_time) * 1000
    return {"detections": detections, "latency_ms": latency_ms}

if __name__ == "__main__":
    print("Inference engine ready. Awaiting camera stream...")
`;
    fs.writeFileSync(pyPath, mainPy, 'utf8');
  }
}

export function getFileTree(dirPath: string = DEFAULT_WORKSPACE_PATH): FileNode[] {
  ensureDefaultWorkspace();
  if (!fs.existsSync(dirPath)) return [];

  function scan(currentPath: string): FileNode[] {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        nodes.push({
          id: relativePath,
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: scan(fullPath),
        });
      } else {
        const ext = path.extname(entry.name).slice(1);
        const stats = fs.statSync(fullPath);
        nodes.push({
          id: relativePath,
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          lastModified: stats.mtimeMs,
          language: getLanguageFromExtension(ext),
        });
      }
    }

    // Sort directories first, then alphabetical
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  }

  return scan(dirPath);
}

export function readWorkspaceFile(relativePath: string): string {
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(DEFAULT_WORKSPACE_PATH, safeRelative);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

export function writeWorkspaceFile(relativePath: string, content: string): void {
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(DEFAULT_WORKSPACE_PATH, safeRelative);
  const parentDir = path.dirname(fullPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
}

export function createWorkspaceItem(relativePath: string, type: 'file' | 'directory'): void {
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(DEFAULT_WORKSPACE_PATH, safeRelative);
  if (type === 'directory') {
    fs.mkdirSync(fullPath, { recursive: true });
  } else {
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, '', 'utf8');
    }
  }
}

export function deleteWorkspaceItem(relativePath: string): void {
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(DEFAULT_WORKSPACE_PATH, safeRelative);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    py: 'python',
    md: 'markdown',
    html: 'html',
    css: 'css',
    cpp: 'cpp',
    c: 'c',
    rs: 'rust',
    go: 'go',
    sql: 'sql',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return map[ext.toLowerCase()] || 'plaintext';
}

// -------------------------------------------------------------
// CREDENTIAL VAULT (AES-256-GCM Encrypted at Rest)
// -------------------------------------------------------------

interface StoredCredential {
  provider: ModelProvider;
  encryptedKey: string;
  maskedKey: string;
  updatedAt: number;
}

export function saveCredential(provider: ModelProvider, plainKey: string): void {
  const encrypted = encryptSecret(plainKey);
  const masked = maskSecret(plainKey);

  const vault = readJson<Record<string, StoredCredential>>(SECRETS_FILE, {});
  vault[provider] = {
    provider,
    encryptedKey: encrypted,
    maskedKey: masked,
    updatedAt: Date.now(),
  };
  writeJson(SECRETS_FILE, vault);
}

export function getDecryptedCredential(provider: ModelProvider): string | null {
  const vault = readJson<Record<string, StoredCredential>>(SECRETS_FILE, {});
  const entry = vault[provider];
  if (!entry || !entry.encryptedKey) {
    // Check environment fallback
    if (provider === 'google' && process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    if (provider === 'openai' && process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    return null;
  }
  try {
    return decryptSecret(entry.encryptedKey);
  } catch (error) {
    console.error(`Failed to decrypt credential for ${provider}:`, error);
    return null;
  }
}

export function listConfiguredCredentials(): Array<{ provider: ModelProvider; maskedKey: string; updatedAt: number }> {
  const vault = readJson<Record<string, StoredCredential>>(SECRETS_FILE, {});
  return Object.values(vault).map(c => ({
    provider: c.provider,
    maskedKey: c.maskedKey,
    updatedAt: c.updatedAt,
  }));
}

// -------------------------------------------------------------
// CAPABILITIES & ENTITLEMENTS
// -------------------------------------------------------------

export function getCapabilities(): Capability[] {
  return readJson<Capability[]>(CAPABILITIES_FILE, [
    {
      id: 'cap-my-gemini',
      name: 'My Gemini 3.8 Flash High',
      ownerId: 'user-harsh',
      ownerName: 'Harsh (You)',
      provider: 'google',
      modelId: 'gemini-3.8-flash',
      type: 'model',
      description: 'Ultra-fast low-latency reasoning model for everyday editing and code completion',
      isShareable: true,
      activeEntitlementsCount: 2,
      totalUsageCount: 45,
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'cap-my-claude',
      name: 'My Claude 3.7 Sonnet',
      ownerId: 'user-harsh',
      ownerName: 'Harsh (You)',
      provider: 'anthropic',
      modelId: 'claude-3-7-sonnet',
      type: 'model',
      description: 'Deep architectural reasoning, hostile code review, and full-stack refactoring',
      isShareable: true,
      activeEntitlementsCount: 1,
      totalUsageCount: 28,
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'cap-friend-aarav-gpt',
      name: 'Aarav — GPT-4o High',
      ownerId: 'user-aarav',
      ownerName: 'Aarav (Friend)',
      provider: 'openai',
      modelId: 'gpt-4o',
      type: 'model',
      description: 'High performance multimodal model shared by Aarav for firmware & Python review',
      isShareable: false,
      activeEntitlementsCount: 1,
      totalUsageCount: 12,
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'cap-local-gpu',
      name: 'Local RTX 4090 ML Agent',
      ownerId: 'user-harsh',
      ownerName: 'Harsh (Local Workstation)',
      provider: 'local',
      modelId: 'llama-3.3-70b-q4',
      type: 'gpu',
      description: 'Zero-cost offline inference running via Ollama on local hardware',
      isShareable: true,
      activeEntitlementsCount: 1,
      totalUsageCount: 64,
      createdAt: Date.now() - 86400000 * 10,
    }
  ]);
}

export function saveCapabilities(capabilities: Capability[]): void {
  writeJson(CAPABILITIES_FILE, capabilities);
}

export function getEntitlements(): Entitlement[] {
  return readJson<Entitlement[]>(ENTITLEMENTS_FILE, [
    {
      id: 'ent-101',
      capabilityId: 'cap-my-claude',
      capabilityName: 'My Claude 3.7 Sonnet',
      ownerId: 'user-harsh',
      ownerName: 'Harsh',
      grantedToUserId: 'user-priya',
      grantedToUserName: 'Priya',
      projectId: 'smartvision-edge',
      createdAt: Date.now() - 86400000 * 2,
      expiresAt: Date.now() + 86400000 * 5,
      spendingLimitUsd: 15.0,
      spentUsd: 3.42,
      maxRequests: 50,
      requestsCount: 14,
      allowedModels: ['claude-3-7-sonnet'],
      allowedTools: ['readFile', 'editFile', 'runTests'],
      status: 'active',
    },
    {
      id: 'ent-102',
      capabilityId: 'cap-friend-aarav-gpt',
      capabilityName: 'Aarav — GPT-4o High',
      ownerId: 'user-aarav',
      ownerName: 'Aarav',
      grantedToUserId: 'user-harsh',
      grantedToUserName: 'Harsh',
      projectId: 'smartvision-edge',
      createdAt: Date.now() - 86400000,
      expiresAt: Date.now() + 86400000 * 3,
      spendingLimitUsd: 10.0,
      spentUsd: 1.85,
      maxRequests: 40,
      requestsCount: 9,
      allowedModels: ['gpt-4o'],
      allowedTools: ['readFile', 'editFile'],
      status: 'active',
    }
  ]);
}

export function saveEntitlements(entitlements: Entitlement[]): void {
  writeJson(ENTITLEMENTS_FILE, entitlements);
}

export function revokeEntitlement(entitlementId: string): boolean {
  const entitlements = getEntitlements();
  const index = entitlements.findIndex(e => e.id === entitlementId);
  if (index === -1) return false;
  entitlements[index].status = 'revoked';
  saveEntitlements(entitlements);
  return true;
}

export function revokeAllSharedAccess(ownerId: string): number {
  const entitlements = getEntitlements();
  let count = 0;
  for (const ent of entitlements) {
    if (ent.ownerId === ownerId && ent.status === 'active') {
      ent.status = 'revoked';
      count++;
    }
  }
  saveEntitlements(entitlements);
  return count;
}

export function checkEntitlementPermission(userId: string, capabilityId: string): { allowed: boolean; reason?: string } {
  const entitlements = getEntitlements();
  const ent = entitlements.find(e => e.grantedToUserId === userId && e.capabilityId === capabilityId);
  if (!ent) {
    return { allowed: false, reason: 'No active entitlement found for this user and capability' };
  }
  if (ent.status === 'revoked') {
    return { allowed: false, reason: 'This capability entitlement was revoked by the owner' };
  }
  if (Date.now() > ent.expiresAt) {
    return { allowed: false, reason: 'This capability entitlement has expired' };
  }
  if (ent.requestsCount >= ent.maxRequests) {
    return { allowed: false, reason: 'Request limit exceeded for this shared capability' };
  }
  if (ent.spentUsd >= ent.spendingLimitUsd) {
    return { allowed: false, reason: 'Spending budget limit reached for this shared capability' };
  }
  return { allowed: true };
}

// -------------------------------------------------------------
// PROJECT INTELLIGENCE & MEMORY
// -------------------------------------------------------------

export function getProjectMemory(): ProjectMemory {
  return readJson<ProjectMemory>(MEMORY_FILE, {
    architecture: 'Micro-service Edge Vision Hub: Python inference worker + Next.js web studio + WebSocket telemetry.',
    stack: ['Python 3.10', 'TensorRT', 'Next.js 15', 'Tailwind CSS v4', 'Monaco Editor', 'WebSockets'],
    conventions: [
      'Type annotations required on all Python functions',
      'Zero secrets in git repository',
      'Quality over cost in AI routing decisions',
      'Dark Obsidian Luxe styling for all UI components'
    ],
    decisions: [
      {
        id: 'dec-1',
        date: '2026-08-15',
        title: 'Use Monaco Editor for code pane',
        decision: 'Adopted Monaco Editor over raw textareas',
        why: 'Native VS Code keybindings, syntax highlighting, diff viewer, and syntax error diagnostics',
        consequences: 'Requires client-side dynamic loading; provides 10x better editing experience for students',
        tags: ['editor', 'ui', 'monaco']
      },
      {
        id: 'dec-2',
        date: '2026-08-20',
        title: 'Separate Credentials from Capabilities',
        decision: 'Split raw API keys from shareable capability entitlements',
        why: 'Enables safe friend-to-friend quota sharing without exposing private API keys',
        consequences: 'Zero risk of secret leakage; users can set spending caps and emergency revocations',
        tags: ['security', 'capabilities', 'entitlements']
      }
    ],
    knownBugs: [
      'High framerate inference occasionally throttles on low-tier edge nodes without hardware acceleration'
    ],
    successfulApproaches: [
      'Pre-allocating tensor memory buffers reduced camera pipeline latency by 40%',
      'Heuristic routing classifier selects fast Flash models for docs and Sonnet for multi-file refactors'
    ],
    failedApproaches: [
      'Attempted to use raw WebRTC for code syncing; WebSocket presence proved much more reliable and simple'
    ]
  });
}

export function saveProjectMemory(memory: ProjectMemory): void {
  writeJson(MEMORY_FILE, memory);
}

export function addDecision(decision: Omit<ArchitecturalDecision, 'id'>): ArchitecturalDecision {
  const memory = getProjectMemory();
  const newDecision: ArchitecturalDecision = {
    ...decision,
    id: `dec-${Date.now()}`
  };
  memory.decisions.unshift(newDecision);
  saveProjectMemory(memory);
  return newDecision;
}

// -------------------------------------------------------------
// AI EVIDENCE & PROVENANCE
// -------------------------------------------------------------

export function getEvidenceRecords(): AIEvidence[] {
  return readJson<AIEvidence[]>(EVIDENCE_FILE, []);
}

export function recordEvidence(evidence: Omit<AIEvidence, 'id' | 'timestamp'>): AIEvidence {
  const records = getEvidenceRecords();
  const entry: AIEvidence = {
    ...evidence,
    id: `evi-${uuidv4().slice(0, 8)}`,
    timestamp: Date.now()
  };
  records.unshift(entry);
  writeJson(EVIDENCE_FILE, records);
  return entry;
}

// -------------------------------------------------------------
// COLLABORATION PRESENCE
// -------------------------------------------------------------

export function updatePresence(presence: Presence): void {
  activePresences.set(presence.userId, {
    ...presence,
    lastActive: Date.now()
  });
}

export function getActivePresences(): Presence[] {
  const now = Date.now();
  // Filter out users inactive for more than 45 seconds
  const active: Presence[] = [];
  for (const [userId, pres] of activePresences.entries()) {
    if (now - pres.lastActive < 45000) {
      active.push(pres);
    } else {
      activePresences.delete(userId);
    }
  }
  return active;
}
