export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
}

export interface Presence {
  userId: string;
  userName: string;
  userColor: string;
  activeFile?: string;
  cursor?: {
    lineNumber: number;
    column: number;
  };
  lastActive: number;
}

export type FileType = 'file' | 'directory';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileType;
  children?: FileNode[];
  size?: number;
  lastModified?: number;
  language?: string;
}

export interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  savedContent: string;
  isDirty: boolean;
  language: string;
  cursorPosition?: { lineNumber: number; column: number };
}

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  lastOpenedAt: number;
}

// AI Model Routing Modes
export type ModelMode = 'auto' | 'manual' | 'capability';
export type ModelProvider = 'google' | 'anthropic' | 'openai' | 'local';

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  costTier: 'free' | 'low' | 'medium' | 'high';
  reasoningScore: number; // 1-10
  speedScore: number; // 1-10
  status: 'available' | 'configured' | 'unavailable' | 'local_online' | 'local_offline';
  description: string;
  isDefault?: boolean;
}

export interface RoutingDecision {
  mode: ModelMode;
  selectedModelId: string;
  selectedModelName: string;
  selectedCapabilityId?: string;
  capabilityOwnerName?: string;
  rationale: string;
  taskComplexity: 'simple' | 'meta' | 'standard' | 'complex' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  evaluatedFactors: {
    requiresHighReasoning: boolean;
    multiFileImpact: boolean;
    modifiesSecurityOrAuth: boolean;
    documentationOnly: boolean;
    toolCallingRequired: boolean;
  };
  qualityPrioritySatisfied: boolean;
}

// Capability System
export type CapabilityType = 'model' | 'agent' | 'gpu' | 'tool';

export interface Capability {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  provider: ModelProvider;
  modelId: string;
  type: CapabilityType;
  description: string;
  isShareable: boolean;
  activeEntitlementsCount: number;
  totalUsageCount: number;
  createdAt: number;
}

export type EntitlementStatus = 'active' | 'revoked' | 'expired';

export interface Entitlement {
  id: string;
  capabilityId: string;
  capabilityName: string;
  ownerId: string;
  ownerName: string;
  grantedToUserId: string;
  grantedToUserName: string;
  projectId: string;
  createdAt: number;
  expiresAt: number;
  spendingLimitUsd: number;
  spentUsd: number;
  maxRequests: number;
  requestsCount: number;
  allowedModels: string[];
  allowedTools: string[];
  status: EntitlementStatus;
}

// Agent Framework
export type AgentRole =
  | 'planner'
  | 'researcher'
  | 'coder'
  | 'debugger'
  | 'tester'
  | 'reviewer'
  | 'security'
  | 'docs';

export interface TaskContract {
  id: string;
  intent: string;
  scope: string;
  projectId: string;
  userId: string;
  agentRole: AgentRole;
  selectedModelId: string;
  selectedCapabilityId?: string;
  contextFiles: string[];
  allowedTools: string[];
  budgetLimitUsd: number;
  verificationRequirements: string[];
  stopConditions: string[];
  status: 'draft' | 'executing' | 'verifying' | 'completed' | 'failed' | 'paused';
  createdAt: number;
  updatedAt: number;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  agentRole?: AgentRole;
  content: string;
  timestamp: number;
  modelUsed?: string;
  capabilityUsed?: string;
  routingRationale?: string;
  toolCalls?: Array<{
    id: string;
    toolName: string;
    arguments: Record<string, unknown>;
    status: 'pending' | 'running' | 'success' | 'failed' | 'rejected';
    output?: string;
  }>;
  evidenceId?: string;
}

// Project Intelligence
export interface ArchitecturalDecision {
  id: string;
  date: string;
  title: string;
  decision: string;
  why: string;
  consequences: string;
  tags: string[];
}

export interface ProjectMemory {
  architecture: string;
  stack: string[];
  conventions: string[];
  decisions: ArchitecturalDecision[];
  knownBugs: string[];
  successfulApproaches: string[];
  failedApproaches: string[];
}

export interface ObsidianVaultNote {
  path: string;
  title: string;
  kind?: string;
  excerpt: string;
  selectedForContext: boolean;
}

// Git Integration & Provenance
export interface GitFileDiff {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  originalContent: string;
  newContent: string;
  accepted: boolean;
}

export interface AIEvidence {
  id: string;
  taskId: string;
  timestamp: number;
  prompt: string;
  modelId: string;
  modelName: string;
  capabilityId?: string;
  agentRole: AgentRole;
  toolsUsed: string[];
  filesModified: string[];
  verificationResult: 'passed' | 'failed' | 'skipped';
  costUsd: number;
  humanIntervention: 'none' | 'modified' | 'accepted_all' | 'rejected_all';
}
