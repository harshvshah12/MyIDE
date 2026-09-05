import { z } from 'zod';

/**
 * 1. User Entity Schema
 */
export const UserSchema = z.object({
  id: z.string().startsWith('usr_'),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  authProvider: z.enum(['google', 'github', 'local']),
  authProviderId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * 2. Workspace Entity Schema
 */
export const WorkspaceSchema = z.object({
  id: z.string().startsWith('ws_'),
  slug: z.string().min(2),
  name: z.string().min(1),
  description: z.string().optional(),
  rootDirectory: z.string().min(1),
  ownerId: z.string().startsWith('usr_'),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

/**
 * 3. WorkspaceMember Entity Schema
 */
export const WorkspaceMemberSchema = z.object({
  id: z.string().startsWith('wsm_'),
  workspaceId: z.string().startsWith('ws_'),
  userId: z.string().startsWith('usr_'),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  joinedAt: z.number(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;
export type WorkspaceRole = WorkspaceMember['role'];

/**
 * 4. Project Entity Schema
 */
export const ProjectSchema = z.object({
  id: z.string().startsWith('proj_'),
  workspaceId: z.string().startsWith('ws_'),
  name: z.string().min(1),
  slug: z.string().min(2),
  path: z.string().min(1),
  kind: z.enum(['college', 'personal', 'hiring-cv', 'hackathon', 'research']),
  stack: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Project = z.infer<typeof ProjectSchema>;

/**
 * 5. ProviderConnection Entity Schema
 */
export const ProviderConnectionSchema = z.object({
  id: z.string().startsWith('pconn_'),
  ownerId: z.string().startsWith('usr_'),
  provider: z.enum(['google', 'anthropic', 'openai', 'openrouter', 'local']),
  authMethod: z.enum(['api_key', 'oauth', 'local_daemon']),
  encryptedCredential: z.string(),
  maskedCredential: z.string(),
  status: z.enum(['active', 'error', 'revoked', 'untested']),
  errorMessage: z.string().optional(),
  availableModels: z.array(z.string()).default([]),
  usageCount: z.number().nonnegative().default(0),
  lastTestedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ProviderConnection = z.infer<typeof ProviderConnectionSchema>;

/**
 * 6. Capability Entity Schema
 */
export const CapabilitySchema = z.object({
  id: z.string().startsWith('cap_'),
  providerConnectionId: z.string().startsWith('pconn_'),
  ownerId: z.string().startsWith('usr_'),
  name: z.string().min(1),
  description: z.string().default(''),
  modelId: z.string().min(1),
  isShareable: z.boolean().default(false),
  allowedWorkspaces: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Capability = z.infer<typeof CapabilitySchema>;

/**
 * 7. Entitlement Entity Schema
 */
export const EntitlementSchema = z.object({
  id: z.string().startsWith('ent_'),
  capabilityId: z.string().startsWith('cap_'),
  grantedToUserId: z.string().startsWith('usr_'),
  grantedByUserId: z.string().startsWith('usr_'),
  workspaceId: z.string().startsWith('ws_'),
  projectId: z.string().startsWith('proj_').optional(),
  allowedModels: z.array(z.string()).optional(),
  allowedTaskTypes: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
  maxBudgetUsd: z.number().nonnegative(),
  spentBudgetUsd: z.number().nonnegative().default(0),
  maxRequests: z.number().int().nonnegative(),
  usedRequests: z.number().int().nonnegative().default(0),
  expiresAt: z.number(),
  status: z.enum(['active', 'revoked', 'exhausted', 'expired']).default('active'),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

/**
 * 8. ProjectMemory Entity Schema
 */
export const ProjectMemorySchema = z.object({
  id: z.string().startsWith('mem_'),
  workspaceId: z.string().startsWith('ws_'),
  projectId: z.string().startsWith('proj_').optional(),
  category: z.enum(['decision', 'convention', 'architecture', 'postmortem']),
  title: z.string().min(1),
  decision: z.string().min(1),
  why: z.string().min(1),
  consequences: z.string().optional(),
  createdByUserId: z.string().startsWith('usr_'),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ProjectMemory = z.infer<typeof ProjectMemorySchema>;

/**
 * 9. Evidence Entity Schema (Privacy-Preserving Provenance)
 */
export const EvidenceSchema = z.object({
  id: z.string().startsWith('ev_'),
  workspaceId: z.string().startsWith('ws_'),
  projectId: z.string().startsWith('proj_').optional(),
  taskId: z.string().min(1),
  userId: z.string().startsWith('usr_'),
  agentRole: z.string().min(1),
  modelId: z.string().min(1),
  capabilityId: z.string().startsWith('cap_').optional(),
  // Privacy notice: full prompt is not stored by default; summary or prompt hash only
  taskSummary: z.string().min(1),
  filesInspected: z.array(z.string()).default([]),
  filesModified: z.array(z.string()).default([]),
  toolsExecuted: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      durationMs: z.number().nonnegative(),
    })
  ).default([]),
  verificationStatus: z.enum(['passed', 'failed', 'skipped']),
  costUsd: z.number().nonnegative().default(0),
  durationMs: z.number().nonnegative().default(0),
  createdAt: z.number(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * Store Envelope Schema with Schema Versioning
 */
export const StoreEnvelopeSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    _version: z.number().int().positive(),
    _updatedAt: z.number(),
    data: z.array(itemSchema),
  });