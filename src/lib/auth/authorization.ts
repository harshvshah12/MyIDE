import type {
  WorkspaceMember,
  WorkspaceRole,
  Project,
  Capability,
  Entitlement,
} from '../schema/entities.ts';
import {
  WorkspaceRepository,
  WorkspaceMemberRepository,
  ProjectRepository,
  CapabilityRepository,
  EntitlementRepository
} from '../db/repositories.ts';
import { ForbiddenError, NotFoundError } from './errors.ts';

/**
 * Authorization Boundaries
 *
 * Enforces resource ownership, workspace tenancy, project permissions,
 * and capability sharing entitlements.
 */

/**
 * Asserts that the given user is an active member of the workspace.
 * Throws ForbiddenError if not a member, or NotFoundError if workspace does not exist.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember> {
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" does not exist.`);
  }

  // Check direct workspace owner
  if (workspace.ownerId === userId) {
    return {
      id: `wsm_owner_${workspaceId}_${userId}`,
      workspaceId,
      userId,
      role: 'owner',
      joinedAt: workspace.createdAt,
    };
  }

  const member = WorkspaceMemberRepository.findMember(workspaceId, userId);
  if (!member) {
    throw new ForbiddenError(`User "${userId}" is not a member of workspace "${workspaceId}".`);
  }

  return member;
}

/**
 * Asserts that the user possesses one of the allowed roles in the workspace.
 */
export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceRole[]
): Promise<WorkspaceMember> {
  const member = await requireWorkspaceMember(workspaceId, userId);
  if (!allowedRoles.includes(member.role)) {
    throw new ForbiddenError(
      `Action requires role [${allowedRoles.join(', ')}], but user holds role "${member.role}".`
    );
  }
  return member;
}

/**
 * Asserts that the user has access to the given project via workspace tenancy.
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string
): Promise<Project> {
  const project = ProjectRepository.findById(projectId);
  if (!project) {
    throw new NotFoundError(`Project "${projectId}" not found.`);
  }

  // Must be member of the parent workspace
  await requireWorkspaceMember(project.workspaceId, userId);
  return project;
}

/**
 * Asserts that the given user is the legitimate owner of the capability.
 */
export async function requireCapabilityOwner(
  capabilityId: string,
  userId: string
): Promise<Capability> {
  const capability = CapabilityRepository.findById(capabilityId);
  if (!capability) {
    throw new NotFoundError(`Capability "${capabilityId}" not found.`);
  }

  if (capability.ownerId !== userId) {
    throw new ForbiddenError(
      `User "${userId}" is not the owner of capability "${capabilityId}".`
    );
  }

  return capability;
}

/**
 * Validates an entitlement in the authorization chain before an agent executes inference.
 *
 * Chain:
 * Capability exists
 * -> capability is shareable
 * -> recipient granted entitlement
 * -> entitlement is active
 * -> not expired
 * -> workspace/project scope valid
 * -> request & budget limits not exceeded
 *
 * Invariant: The recipient NEVER receives the owner's raw API credential.
 */
export async function validateEntitlementAccess(params: {
  entitlementId: string;
  userId: string;
  workspaceId: string;
  projectId?: string;
  modelId?: string;
  taskType?: string;
  estimatedCostUsd?: number;
}): Promise<{ allowed: boolean; reason?: string; entitlement?: Entitlement; capability?: Capability }> {
  const { entitlementId, userId, workspaceId, projectId, modelId, taskType, estimatedCostUsd = 0 } = params;

  const entitlement = EntitlementRepository.findById(entitlementId);
  if (!entitlement) {
    return { allowed: false, reason: 'Entitlement record not found.' };
  }

  // 1. Recipient check
  if (entitlement.grantedToUserId !== userId) {
    return { allowed: false, reason: 'Entitlement was issued to a different user.' };
  }

  // 2. Status check
  if (entitlement.status !== 'active') {
    return { allowed: false, reason: `Entitlement is ${entitlement.status}. Access denied.` };
  }

  // 3. Expiration check
  if (Date.now() > entitlement.expiresAt) {
    // Automatically mark as expired
    EntitlementRepository.save({ ...entitlement, status: 'expired' });
    return { allowed: false, reason: 'Entitlement has expired.' };
  }

  // 4. Workspace scope check
  if (entitlement.workspaceId !== workspaceId) {
    return { allowed: false, reason: 'Entitlement is not authorized for this workspace.' };
  }

  // 5. Project scope check
  if (entitlement.projectId && projectId && entitlement.projectId !== projectId) {
    return { allowed: false, reason: 'Entitlement is restricted to a different project.' };
  }

  // 6. Request count check
  if (entitlement.usedRequests >= entitlement.maxRequests) {
    EntitlementRepository.save({ ...entitlement, status: 'exhausted' });
    return { allowed: false, reason: 'Maximum request limit reached.' };
  }

  // 7. Budget limit check
  if (entitlement.spentBudgetUsd + estimatedCostUsd > entitlement.maxBudgetUsd) {
    EntitlementRepository.save({ ...entitlement, status: 'exhausted' });
    return { allowed: false, reason: 'Budget limit exceeded.' };
  }

  // 8. Model restriction check
  if (entitlement.allowedModels && modelId && !entitlement.allowedModels.includes(modelId)) {
    return { allowed: false, reason: `Model "${modelId}" is not permitted under this entitlement.` };
  }

  // 9. Task type check
  if (entitlement.allowedTaskTypes && taskType && !entitlement.allowedTaskTypes.includes(taskType)) {
    return { allowed: false, reason: `Task type "${taskType}" is not permitted under this entitlement.` };
  }

  // 10. Capability resolution
  const capability = CapabilityRepository.findById(entitlement.capabilityId);
  if (!capability) {
    return { allowed: false, reason: 'Backing capability does not exist.' };
  }

  return { allowed: true, entitlement, capability };
}