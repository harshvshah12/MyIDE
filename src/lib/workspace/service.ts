import path from 'path';
import fs from 'fs';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  Project,
  User,
} from '../schema/entities.ts';
import {
  WorkspaceSchema,
  WorkspaceMemberSchema,
  ProjectSchema,
} from '../schema/entities.ts';
import {
  WorkspaceRepository,
  WorkspaceMemberRepository,
  ProjectRepository,
  UserRepository,
} from '../db/repositories.ts';
import {
  requireWorkspaceMember,
  requireWorkspaceRole,
  requireProjectAccess,
} from '../auth/authorization.ts';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../auth/errors.ts';

/**
 * Workspace & Project Domain Service
 *
 * Implements core domain logic for multi-tenant workspace hierarchies,
 * membership administration, project scoping, and context resolution.
 */

// -----------------------------------------------------------------
// 1. Workspace Operations
// -----------------------------------------------------------------

export interface CreateWorkspaceDTO {
  name: string;
  slug: string;
  description?: string;
  rootDirectory?: string;
}

export interface WorkspaceSummary extends Workspace {
  currentUserRole: WorkspaceRole;
  membersCount: number;
  projectsCount: number;
}

export async function createWorkspace(
  userId: string,
  dto: CreateWorkspaceDTO
): Promise<{ workspace: Workspace; membership: WorkspaceMember }> {
  const user = UserRepository.findById(userId);
  if (!user) {
    throw new NotFoundError(`User "${userId}" not found.`);
  }

  // Validate slug uniqueness
  const cleanSlug = dto.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  if (cleanSlug.length < 2) {
    throw new ValidationError('Workspace slug must be at least 2 characters.');
  }

  const existingSlug = WorkspaceRepository.findBySlug(cleanSlug);
  if (existingSlug) {
    throw new ValidationError(`Workspace slug "${cleanSlug}" is already taken.`);
  }

  const now = Date.now();
  const workspaceId = `ws_${cleanSlug}_${Math.random().toString(36).substring(2, 7)}`;
  const rootDir = dto.rootDirectory || path.resolve(process.cwd(), 'workspaces', cleanSlug);

  const workspace: Workspace = {
    id: workspaceId,
    slug: cleanSlug,
    name: dto.name.trim(),
    description: dto.description?.trim(),
    rootDirectory: rootDir,
    ownerId: userId,
    createdAt: now,
    updatedAt: now,
  };

  // Validate with Zod before writing
  WorkspaceSchema.parse(workspace);
  WorkspaceRepository.save(workspace);

  // Automatically establish Owner membership
  const membership: WorkspaceMember = {
    id: `wsm_${workspaceId}_${userId}`,
    workspaceId,
    userId,
    role: 'owner',
    joinedAt: now,
  };
  WorkspaceMemberSchema.parse(membership);
  WorkspaceMemberRepository.save(membership);

  return { workspace, membership };
}

export async function getWorkspace(
  userId: string,
  workspaceId: string
): Promise<WorkspaceSummary> {
  const member = await requireWorkspaceMember(workspaceId, userId);
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" not found.`);
  }

  const members = WorkspaceMemberRepository.listByWorkspace(workspaceId);
  const projects = ProjectRepository.listByWorkspace(workspaceId);

  return {
    ...workspace,
    currentUserRole: member.role,
    membersCount: Math.max(members.length, 1),
    projectsCount: projects.length,
  };
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
  const allWorkspaces = WorkspaceRepository.list();
  const userMemberships = WorkspaceMemberRepository.listByUser(userId);
  const membershipMap = new Map<string, WorkspaceMember>();
  for (const m of userMemberships) {
    membershipMap.set(m.workspaceId, m);
  }

  const visibleWorkspaces: WorkspaceSummary[] = [];

  for (const ws of allWorkspaces) {
    let role: WorkspaceRole | null = null;

    if (ws.ownerId === userId) {
      role = 'owner';
    } else if (membershipMap.has(ws.id)) {
      role = membershipMap.get(ws.id)!.role;
    }

    if (role) {
      const members = WorkspaceMemberRepository.listByWorkspace(ws.id);
      const projects = ProjectRepository.listByWorkspace(ws.id);
      visibleWorkspaces.push({
        ...ws,
        currentUserRole: role,
        membersCount: Math.max(members.length, 1),
        projectsCount: projects.length,
      });
    }
  }

  return visibleWorkspaces;
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  updates: Partial<Pick<Workspace, 'name' | 'description' | 'rootDirectory'>>
): Promise<Workspace> {
  await requireWorkspaceRole(workspaceId, userId, ['owner', 'admin']);
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" not found.`);
  }

  const updated: Workspace = {
    ...workspace,
    name: updates.name ? updates.name.trim() : workspace.name,
    description: updates.description !== undefined ? updates.description?.trim() : workspace.description,
    rootDirectory: updates.rootDirectory || workspace.rootDirectory,
    updatedAt: Date.now(),
  };

  WorkspaceSchema.parse(updated);
  return WorkspaceRepository.save(updated);
}

export async function deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  // Only the owner can delete the workspace
  await requireWorkspaceRole(workspaceId, userId, ['owner']);

  // Cascade delete all associated projects and memberships
  const projects = ProjectRepository.listByWorkspace(workspaceId);
  for (const p of projects) {
    ProjectRepository.delete(p.id);
  }

  const members = WorkspaceMemberRepository.listByWorkspace(workspaceId);
  for (const m of members) {
    WorkspaceMemberRepository.delete(m.id);
  }

  return WorkspaceRepository.delete(workspaceId);
}

// -----------------------------------------------------------------
// 2. Membership Operations
// -----------------------------------------------------------------

export interface MemberWithUser extends WorkspaceMember {
  user: Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;
}

export async function listWorkspaceMembers(
  userId: string,
  workspaceId: string
): Promise<MemberWithUser[]> {
  await requireWorkspaceMember(workspaceId, userId);
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" not found.`);
  }

  const members = WorkspaceMemberRepository.listByWorkspace(workspaceId);
  const result: MemberWithUser[] = [];

  // Ensure owner is included
  const hasOwner = members.some((m) => m.userId === workspace.ownerId);
  if (!hasOwner) {
    members.unshift({
      id: `wsm_owner_${workspaceId}_${workspace.ownerId}`,
      workspaceId,
      userId: workspace.ownerId,
      role: 'owner',
      joinedAt: workspace.createdAt,
    });
  }

  for (const m of members) {
    const user = UserRepository.findById(m.userId);
    result.push({
      ...m,
      user: user
        ? { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }
        : { id: m.userId, name: 'Unknown User', email: 'unknown@example.com' },
    });
  }

  return result;
}

export async function addWorkspaceMember(
  callerUserId: string,
  workspaceId: string,
  targetEmailOrId: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<WorkspaceMember> {
  await requireWorkspaceRole(workspaceId, callerUserId, ['owner', 'admin']);
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" not found.`);
  }

  // Find target user by ID or email
  let targetUser = UserRepository.findById(targetEmailOrId);
  if (!targetUser) {
    targetUser = UserRepository.findByEmail(targetEmailOrId);
  }
  if (!targetUser) {
    throw new NotFoundError(`Target user "${targetEmailOrId}" not found.`);
  }

  if (targetUser.id === workspace.ownerId) {
    throw new ValidationError('Workspace owner already has full ownership rights.');
  }

  const existingMember = WorkspaceMemberRepository.findMember(workspaceId, targetUser.id);
  if (existingMember) {
    throw new ValidationError(`User "${targetUser.email}" is already a member of this workspace.`);
  }

  const membership: WorkspaceMember = {
    id: `wsm_${workspaceId}_${targetUser.id}`,
    workspaceId,
    userId: targetUser.id,
    role,
    joinedAt: Date.now(),
  };

  WorkspaceMemberSchema.parse(membership);
  return WorkspaceMemberRepository.save(membership);
}

export async function updateWorkspaceMemberRole(
  callerUserId: string,
  workspaceId: string,
  targetUserId: string,
  newRole: 'admin' | 'member' | 'viewer'
): Promise<WorkspaceMember> {
  const caller = await requireWorkspaceRole(workspaceId, callerUserId, ['owner', 'admin']);
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" not found.`);
  }

  if (targetUserId === workspace.ownerId) {
    throw new ForbiddenError('Cannot change the role of the workspace owner.');
  }

  if (caller.role === 'admin' && targetUserId === callerUserId) {
    throw new ForbiddenError('Admins cannot modify their own role.');
  }

  const targetMember = WorkspaceMemberRepository.findMember(workspaceId, targetUserId);
  if (!targetMember) {
    throw new NotFoundError(`Member "${targetUserId}" not found in workspace.`);
  }

  // Admins cannot demote other admins or touch owner
  if (caller.role === 'admin' && targetMember.role === 'admin') {
    throw new ForbiddenError('Admins cannot alter the role of other admins.');
  }

  const updated: WorkspaceMember = {
    ...targetMember,
    role: newRole,
  };

  return WorkspaceMemberRepository.save(updated);
}

export async function removeWorkspaceMember(
  callerUserId: string,
  workspaceId: string,
  targetUserId: string
): Promise<boolean> {
  const caller = await requireWorkspaceMember(workspaceId, callerUserId);
  const workspace = WorkspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${workspaceId}" not found.`);
  }

  if (targetUserId === workspace.ownerId) {
    throw new ForbiddenError('Cannot remove the workspace owner.');
  }

  const isSelf = callerUserId === targetUserId;

  // Non-owner and non-admin can only remove themselves (leave)
  if (!isSelf && caller.role !== 'owner' && caller.role !== 'admin') {
    throw new ForbiddenError('Only workspace owners or admins can remove other members.');
  }

  const targetMember = WorkspaceMemberRepository.findMember(workspaceId, targetUserId);
  if (!targetMember) {
    return false;
  }

  // Admins cannot remove other admins
  if (caller.role === 'admin' && targetMember.role === 'admin' && !isSelf) {
    throw new ForbiddenError('Admins cannot remove other admins.');
  }

  return WorkspaceMemberRepository.delete(targetMember.id);
}

// -----------------------------------------------------------------
// 3. Project Operations
// -----------------------------------------------------------------

export interface CreateProjectDTO {
  workspaceId: string;
  name: string;
  slug: string;
  path?: string;
  kind?: Project['kind'];
  stack?: string[];
}

export async function createProject(
  userId: string,
  dto: CreateProjectDTO
): Promise<Project> {
  // Viewers cannot create projects
  await requireWorkspaceRole(dto.workspaceId, userId, ['owner', 'admin', 'member']);
  const workspace = WorkspaceRepository.findById(dto.workspaceId);
  if (!workspace) {
    throw new NotFoundError(`Workspace "${dto.workspaceId}" not found.`);
  }

  const cleanSlug = dto.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  if (cleanSlug.length < 2) {
    throw new ValidationError('Project slug must be at least 2 characters.');
  }

  // Check slug uniqueness within workspace
  const workspaceProjects = ProjectRepository.listByWorkspace(dto.workspaceId);
  if (workspaceProjects.some((p) => p.slug === cleanSlug)) {
    throw new ValidationError(`Project with slug "${cleanSlug}" already exists in this workspace.`);
  }

  const now = Date.now();
  const projectId = `proj_${cleanSlug}_${Math.random().toString(36).substring(2, 7)}`;
  const projPath = dto.path || path.join(workspace.rootDirectory, cleanSlug);

  const project: Project = {
    id: projectId,
    workspaceId: dto.workspaceId,
    name: dto.name.trim(),
    slug: cleanSlug,
    path: projPath,
    kind: dto.kind || 'hackathon',
    stack: dto.stack || ['nextjs', 'typescript'],
    createdAt: now,
    updatedAt: now,
  };

  ProjectSchema.parse(project);
  return ProjectRepository.save(project);
}

export async function getProject(userId: string, projectId: string): Promise<Project> {
  return requireProjectAccess(projectId, userId);
}

export async function listProjectsInWorkspace(
  userId: string,
  workspaceId: string
): Promise<Project[]> {
  await requireWorkspaceMember(workspaceId, userId);
  return ProjectRepository.listByWorkspace(workspaceId);
}

export async function updateProject(
  userId: string,
  projectId: string,
  updates: Partial<Pick<Project, 'name' | 'kind' | 'stack' | 'path'>>
): Promise<Project> {
  const project = await requireProjectAccess(projectId, userId);
  await requireWorkspaceRole(project.workspaceId, userId, ['owner', 'admin', 'member']);

  const updated: Project = {
    ...project,
    name: updates.name ? updates.name.trim() : project.name,
    kind: updates.kind || project.kind,
    stack: updates.stack || project.stack,
    path: updates.path || project.path,
    updatedAt: Date.now(),
  };

  ProjectSchema.parse(updated);
  return ProjectRepository.save(updated);
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const project = await requireProjectAccess(projectId, userId);
  await requireWorkspaceRole(project.workspaceId, userId, ['owner', 'admin']);
  return ProjectRepository.delete(projectId);
}

// -----------------------------------------------------------------
// 4. Project Context Resolution Engine
// -----------------------------------------------------------------

export interface ActiveProjectContext {
  workspace: Workspace | null;
  project: Project | null;
  role: WorkspaceRole | null;
  accessibleWorkspaces: WorkspaceSummary[];
  accessibleProjects: Project[];
}

export async function resolveActiveContext(
  userId: string,
  requestedWorkspaceId?: string,
  requestedProjectId?: string
): Promise<ActiveProjectContext> {
  const userWorkspaces = await listWorkspacesForUser(userId);

  if (userWorkspaces.length === 0) {
    return {
      workspace: null,
      project: null,
      role: null,
      accessibleWorkspaces: [],
      accessibleProjects: [],
    };
  }

  // 1. Resolve Workspace
  let activeWorkspaceSummary = requestedWorkspaceId
    ? userWorkspaces.find((w) => w.id === requestedWorkspaceId)
    : null;

  // Fallback to first accessible workspace if requested is invalid or inaccessible
  if (!activeWorkspaceSummary) {
    activeWorkspaceSummary = userWorkspaces[0];
  }

  const workspace: Workspace = {
    id: activeWorkspaceSummary.id,
    slug: activeWorkspaceSummary.slug,
    name: activeWorkspaceSummary.name,
    description: activeWorkspaceSummary.description,
    rootDirectory: activeWorkspaceSummary.rootDirectory,
    ownerId: activeWorkspaceSummary.ownerId,
    createdAt: activeWorkspaceSummary.createdAt,
    updatedAt: activeWorkspaceSummary.updatedAt,
  };

  // 2. Resolve Projects within Workspace
  const projects = ProjectRepository.listByWorkspace(workspace.id);

  let activeProject: Project | null = null;
  if (requestedProjectId) {
    activeProject = projects.find((p) => p.id === requestedProjectId) || null;
  }

  // Fallback to first project in workspace if requested is not found
  if (!activeProject && projects.length > 0) {
    activeProject = projects[0];
  }

  return {
    workspace,
    project: activeProject,
    role: activeWorkspaceSummary.currentUserRole,
    accessibleWorkspaces: userWorkspaces,
    accessibleProjects: projects,
  };
}

// -----------------------------------------------------------------
// 5. Scoped File Operations (Strict Project Boundary & Traversal Defense)
// -----------------------------------------------------------------

export async function validateProjectFileAccess(
  userId: string,
  projectId: string,
  relativeFilePath: string
): Promise<{ project: Project; absolutePath: string }> {
  const project = await requireProjectAccess(projectId, userId);

  const projectRootResolved = path.resolve(project.path);
  const absolutePath = path.resolve(projectRootResolved, relativeFilePath);

  // Traversal check: Ensure relative path does not escape project root
  const rel = path.relative(projectRootResolved, absolutePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new ForbiddenError('Path traversal detected. File path escapes project boundary.');
  }

  return { project, absolutePath };
}
