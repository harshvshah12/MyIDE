import { readCollection, writeCollection } from './store.ts';
import type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  ProviderConnection,
  Capability,
  Entitlement,
  ProjectMemory,
  Evidence,
} from '../schema/entities.ts';
import {
  UserSchema,
  WorkspaceSchema,
  WorkspaceMemberSchema,
  ProjectSchema,
  ProviderConnectionSchema,
  CapabilitySchema,
  EntitlementSchema,
  ProjectMemorySchema,
  EvidenceSchema,
} from '../schema/entities.ts';

// -------------------------------------------------------------
// 1. User Repository
// -------------------------------------------------------------
export const UserRepository = {
  list(): User[] {
    return readCollection<User>('users', UserSchema);
  },
  findById(id: string): User | null {
    return this.list().find((u) => u.id === id) || null;
  },
  findByEmail(email: string): User | null {
    return this.list().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  save(user: User): User {
    const users = this.list();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...user, updatedAt: Date.now() };
    } else {
      users.push(user);
    }
    writeCollection('users', users, UserSchema);
    return user;
  },
  delete(id: string): boolean {
    const users = this.list();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    writeCollection('users', filtered, UserSchema);
    return true;
  },
};

// -------------------------------------------------------------
// 2. Workspace Repository
// -------------------------------------------------------------
export const WorkspaceRepository = {
  list(): Workspace[] {
    return readCollection<Workspace>('workspaces', WorkspaceSchema);
  },
  findById(id: string): Workspace | null {
    return this.list().find((w) => w.id === id) || null;
  },
  findBySlug(slug: string): Workspace | null {
    return this.list().find((w) => w.slug === slug) || null;
  },
  listByOwner(ownerId: string): Workspace[] {
    return this.list().filter((w) => w.ownerId === ownerId);
  },
  save(workspace: Workspace): Workspace {
    const workspaces = this.list();
    const index = workspaces.findIndex((w) => w.id === workspace.id);
    if (index >= 0) {
      workspaces[index] = { ...workspace, updatedAt: Date.now() };
    } else {
      workspaces.push(workspace);
    }
    writeCollection('workspaces', workspaces, WorkspaceSchema);
    return workspace;
  },
  delete(id: string): boolean {
    const workspaces = this.list();
    const filtered = workspaces.filter((w) => w.id !== id);
    if (filtered.length === workspaces.length) return false;
    writeCollection('workspaces', filtered, WorkspaceSchema);
    return true;
  },
};

// -------------------------------------------------------------
// 3. Workspace Member Repository
// -------------------------------------------------------------
export const WorkspaceMemberRepository = {
  list(): WorkspaceMember[] {
    return readCollection<WorkspaceMember>('workspace_members', WorkspaceMemberSchema);
  },
  findById(id: string): WorkspaceMember | null {
    return this.list().find((m) => m.id === id) || null;
  },
  findMember(workspaceId: string, userId: string): WorkspaceMember | null {
    return this.list().find((m) => m.workspaceId === workspaceId && m.userId === userId) || null;
  },
  listByWorkspace(workspaceId: string): WorkspaceMember[] {
    return this.list().filter((m) => m.workspaceId === workspaceId);
  },
  listByUser(userId: string): WorkspaceMember[] {
    return this.list().filter((m) => m.userId === userId);
  },
  save(member: WorkspaceMember): WorkspaceMember {
    const members = this.list();
    const index = members.findIndex((m) => m.id === member.id);
    if (index >= 0) {
      members[index] = member;
    } else {
      members.push(member);
    }
    writeCollection('workspace_members', members, WorkspaceMemberSchema);
    return member;
  },
  delete(id: string): boolean {
    const members = this.list();
    const filtered = members.filter((m) => m.id !== id);
    if (filtered.length === members.length) return false;
    writeCollection('workspace_members', filtered, WorkspaceMemberSchema);
    return true;
  },
};

// -------------------------------------------------------------
// 4. Project Repository
// -------------------------------------------------------------
export const ProjectRepository = {
  list(): Project[] {
    return readCollection<Project>('projects', ProjectSchema);
  },
  findById(id: string): Project | null {
    return this.list().find((p) => p.id === id) || null;
  },
  listByWorkspace(workspaceId: string): Project[] {
    return this.list().filter((p) => p.workspaceId === workspaceId);
  },
  save(project: Project): Project {
    const projects = this.list();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...project, updatedAt: Date.now() };
    } else {
      projects.push(project);
    }
    writeCollection('projects', projects, ProjectSchema);
    return project;
  },
  delete(id: string): boolean {
    const projects = this.list();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) return false;
    writeCollection('projects', filtered, ProjectSchema);
    return true;
  },
};

// -------------------------------------------------------------
// 5. Provider Connection Repository
// -------------------------------------------------------------
export const ProviderConnectionRepository = {
  list(): ProviderConnection[] {
    return readCollection<ProviderConnection>('provider_connections', ProviderConnectionSchema);
  },
  findById(id: string): ProviderConnection | null {
    return this.list().find((c) => c.id === id) || null;
  },
  listByOwner(ownerId: string): ProviderConnection[] {
    return this.list().filter((c) => c.ownerId === ownerId);
  },
  findByOwnerAndProvider(ownerId: string, provider: ProviderConnection['provider']): ProviderConnection | null {
    return this.list().find((c) => c.ownerId === ownerId && c.provider === provider) || null;
  },
  save(conn: ProviderConnection): ProviderConnection {
    const connections = this.list();
    const index = connections.findIndex((c) => c.id === conn.id);
    if (index >= 0) {
      connections[index] = { ...conn, updatedAt: Date.now() };
    } else {
      connections.push(conn);
    }
    writeCollection('provider_connections', connections, ProviderConnectionSchema);
    return conn;
  },
  delete(id: string): boolean {
    const connections = this.list();
    const filtered = connections.filter((c) => c.id !== id);
    if (filtered.length === connections.length) return false;
    writeCollection('provider_connections', filtered, ProviderConnectionSchema);
    return true;
  },
};

// -------------------------------------------------------------
// 6. Capability Repository
// -------------------------------------------------------------
export const CapabilityRepository = {
  list(): Capability[] {
    return readCollection<Capability>('capabilities', CapabilitySchema);
  },
  findById(id: string): Capability | null {
    return this.list().find((c) => c.id === id) || null;
  },
  listByOwner(ownerId: string): Capability[] {
    return this.list().filter((c) => c.ownerId === ownerId);
  },
  listByConnection(connId: string): Capability[] {
    return this.list().filter((c) => c.providerConnectionId === connId);
  },
  save(cap: Capability): Capability {
    const caps = this.list();
    const index = caps.findIndex((c) => c.id === cap.id);
    if (index >= 0) {
      caps[index] = { ...cap, updatedAt: Date.now() };
    } else {
      caps.push(cap);
    }
    writeCollection('capabilities', caps, CapabilitySchema);
    return cap;
  },
  delete(id: string): boolean {
    const caps = this.list();
    const filtered = caps.filter((c) => c.id !== id);
    if (filtered.length === caps.length) return false;
    writeCollection('capabilities', filtered, CapabilitySchema);
    return true;
  },
};

// -------------------------------------------------------------
// 7. Entitlement Repository
// -------------------------------------------------------------
export const EntitlementRepository = {
  list(): Entitlement[] {
    return readCollection<Entitlement>('entitlements', EntitlementSchema);
  },
  findById(id: string): Entitlement | null {
    return this.list().find((e) => e.id === id) || null;
  },
  listByRecipient(userId: string): Entitlement[] {
    return this.list().filter((e) => e.grantedToUserId === userId);
  },
  listByCapability(capabilityId: string): Entitlement[] {
    return this.list().filter((e) => e.capabilityId === capabilityId);
  },
  listActiveByWorkspace(workspaceId: string): Entitlement[] {
    return this.list().filter((e) => e.workspaceId === workspaceId && e.status === 'active' && e.expiresAt > Date.now());
  },
  save(ent: Entitlement): Entitlement {
    const ents = this.list();
    const index = ents.findIndex((e) => e.id === ent.id);
    if (index >= 0) {
      ents[index] = { ...ent, updatedAt: Date.now() };
    } else {
      ents.push(ent);
    }
    writeCollection('entitlements', ents, EntitlementSchema);
    return ent;
  },
  revokeOne(id: string): boolean {
    const ent = this.findById(id);
    if (!ent) return false;
    this.save({ ...ent, status: 'revoked' });
    return true;
  },
  revokeAllForOwner(ownerId: string): number {
    // Find all capabilities owned by this user
    const caps = CapabilityRepository.listByOwner(ownerId);
    const capIds = new Set(caps.map((c) => c.id));
    const ents = this.list();
    let count = 0;

    for (const ent of ents) {
      if (capIds.has(ent.capabilityId) && ent.status === 'active') {
        ent.status = 'revoked';
        ent.updatedAt = Date.now();
        count++;
      }
    }

    if (count > 0) {
      writeCollection('entitlements', ents, EntitlementSchema);
    }
    return count;
  },
};

// -------------------------------------------------------------
// 8. Project Memory Repository
// -------------------------------------------------------------
export const ProjectMemoryRepository = {
  list(): ProjectMemory[] {
    return readCollection<ProjectMemory>('memories', ProjectMemorySchema);
  },
  findById(id: string): ProjectMemory | null {
    return this.list().find((m) => m.id === id) || null;
  },
  listByWorkspace(workspaceId: string): ProjectMemory[] {
    return this.list().filter((m) => m.workspaceId === workspaceId);
  },
  save(memory: ProjectMemory): ProjectMemory {
    const memories = this.list();
    const index = memories.findIndex((m) => m.id === memory.id);
    if (index >= 0) {
      memories[index] = { ...memory, updatedAt: Date.now() };
    } else {
      memories.push(memory);
    }
    writeCollection('memories', memories, ProjectMemorySchema);
    return memory;
  },
  delete(id: string): boolean {
    const memories = this.list();
    const filtered = memories.filter((m) => m.id !== id);
    if (filtered.length === memories.length) return false;
    writeCollection('memories', filtered, ProjectMemorySchema);
    return true;
  },
};

// -------------------------------------------------------------
// 9. Evidence Repository
// -------------------------------------------------------------
export const EvidenceRepository = {
  list(): Evidence[] {
    return readCollection<Evidence>('evidence', EvidenceSchema);
  },
  findById(id: string): Evidence | null {
    return this.list().find((e) => e.id === id) || null;
  },
  listByWorkspace(workspaceId: string, limit = 50): Evidence[] {
    return this.list()
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
  save(evidence: Evidence): Evidence {
    const list = this.list();
    list.unshift(evidence);
    // Keep max 2000 items in local workstation evidence log
    const trimmed = list.slice(0, 2000);
    writeCollection('evidence', trimmed, EvidenceSchema);
    return evidence;
  },
};