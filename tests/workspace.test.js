import { test } from 'node:test';
import assert from 'node:assert';
import {
  createWorkspace,
  getWorkspace,
  listWorkspacesForUser,
  updateWorkspace,
  deleteWorkspace,
  listWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  createProject,
  getProject,
  listProjectsInWorkspace,
  updateProject,
  deleteProject,
  resolveActiveContext,
  validateProjectFileAccess,
} from '../src/lib/workspace/service.ts';
import {
  UserRepository,
  WorkspaceRepository,
  WorkspaceMemberRepository,
  ProjectRepository,
} from '../src/lib/db/repositories.ts';
import { clearCollection } from '../src/lib/db/store.ts';

test('Workspace & Project Context Engine Suite', async (t) => {
  // Clean store collections before test run
  clearCollection('users');
  clearCollection('workspaces');
  clearCollection('workspace_members');
  clearCollection('projects');

  // Setup test users
  const userOwner = UserRepository.save({
    id: 'usr_owner_1',
    email: 'owner@mit.edu',
    name: 'Owner User',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const userAdmin = UserRepository.save({
    id: 'usr_admin_1',
    email: 'admin@mit.edu',
    name: 'Admin User',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const userMember = UserRepository.save({
    id: 'usr_member_1',
    email: 'member@mit.edu',
    name: 'Member User',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const userViewer = UserRepository.save({
    id: 'usr_viewer_1',
    email: 'viewer@mit.edu',
    name: 'Viewer User',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const userStranger = UserRepository.save({
    id: 'usr_stranger_1',
    email: 'stranger@stanford.edu',
    name: 'Stranger User',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  let testWorkspaceId = '';
  let testProjectId = '';

  await t.test('1. createWorkspace creates workspace and establishes owner membership', async () => {
    const { workspace, membership } = await createWorkspace(userOwner.id, {
      name: 'Autonomous Robotics Lab',
      slug: 'robotics-lab',
      description: 'ROS2 & Vision control',
    });

    testWorkspaceId = workspace.id;
    assert.strictEqual(workspace.slug, 'robotics-lab');
    assert.strictEqual(workspace.ownerId, userOwner.id);
    assert.strictEqual(membership.role, 'owner');
    assert.strictEqual(membership.userId, userOwner.id);

    // Verify persisted in repositories
    const found = WorkspaceRepository.findById(workspace.id);
    assert.ok(found);
    assert.strictEqual(found.name, 'Autonomous Robotics Lab');
  });

  await t.test('2. createWorkspace rejects duplicate slug', async () => {
    await assert.rejects(
      async () => {
        await createWorkspace(userOwner.id, {
          name: 'Another Lab',
          slug: 'robotics-lab',
        });
      },
      /already taken/
    );
  });

  await t.test('3. listWorkspacesForUser lists workspaces where user is owner or member', async () => {
    const list = await listWorkspacesForUser(userOwner.id);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].currentUserRole, 'owner');
    assert.strictEqual(list[0].id, testWorkspaceId);

    // Stranger has 0 workspaces
    const strangerList = await listWorkspacesForUser(userStranger.id);
    assert.strictEqual(strangerList.length, 0);
  });

  await t.test('4. Membership management: Owner adds admin, member, and viewer', async () => {
    const adminMem = await addWorkspaceMember(userOwner.id, testWorkspaceId, userAdmin.email, 'admin');
    assert.strictEqual(adminMem.role, 'admin');

    const memberMem = await addWorkspaceMember(userOwner.id, testWorkspaceId, userMember.id, 'member');
    assert.strictEqual(memberMem.role, 'member');

    const viewerMem = await addWorkspaceMember(userAdmin.id, testWorkspaceId, userViewer.email, 'viewer');
    assert.strictEqual(viewerMem.role, 'viewer');

    // List members
    const members = await listWorkspaceMembers(userMember.id, testWorkspaceId);
    assert.strictEqual(members.length, 4); // owner, admin, member, viewer
  });

  await t.test('5. Non-members cannot access workspace', async () => {
    await assert.rejects(
      async () => {
        await getWorkspace(userStranger.id, testWorkspaceId);
      },
      /is not a member/
    );
  });

  await t.test('6. Viewer cannot add members or update workspace', async () => {
    await assert.rejects(
      async () => {
        await addWorkspaceMember(userViewer.id, testWorkspaceId, userStranger.email, 'member');
      },
      /requires role/
    );

    await assert.rejects(
      async () => {
        await updateWorkspace(userViewer.id, testWorkspaceId, { name: 'Hacked Name' });
      },
      /requires role/
    );
  });

  await t.test('7. Admin cannot alter Owner role or promote to Owner', async () => {
    await assert.rejects(
      async () => {
        await updateWorkspaceMemberRole(userAdmin.id, testWorkspaceId, userOwner.id, 'viewer');
      },
      /Cannot change the role of the workspace owner/
    );
  });

  await t.test('8. Projects: Member can create project, Viewer cannot', async () => {
    await assert.rejects(
      async () => {
        await createProject(userViewer.id, {
          workspaceId: testWorkspaceId,
          name: 'Viewer Project',
          slug: 'viewer-proj',
        });
      },
      /requires role/
    );

    const project = await createProject(userMember.id, {
      workspaceId: testWorkspaceId,
      name: 'Perception Pipeline',
      slug: 'perception-pipeline',
      kind: 'research',
      stack: ['python', 'pytorch', 'ros2'],
    });

    testProjectId = project.id;
    assert.strictEqual(project.slug, 'perception-pipeline');
    assert.strictEqual(project.workspaceId, testWorkspaceId);

    // Verify duplicate slug in same workspace rejected
    await assert.rejects(
      async () => {
        await createProject(userMember.id, {
          workspaceId: testWorkspaceId,
          name: 'Duplicate Perception',
          slug: 'perception-pipeline',
        });
      },
      /already exists/
    );
  });

  await t.test('9. Project access control: Stranger cannot access project', async () => {
    await assert.rejects(
      async () => {
        await getProject(userStranger.id, testProjectId);
      },
      /is not a member/
    );
  });

  await t.test('10. Context Resolution: Resolves active workspace and project', async () => {
    const context = await resolveActiveContext(userMember.id, testWorkspaceId, testProjectId);
    assert.ok(context.workspace);
    assert.strictEqual(context.workspace.id, testWorkspaceId);
    assert.ok(context.project);
    assert.strictEqual(context.project.id, testProjectId);
    assert.strictEqual(context.role, 'member');
    assert.strictEqual(context.accessibleWorkspaces.length, 1);
    assert.strictEqual(context.accessibleProjects.length, 1);
  });

  await t.test('11. Context Resolution: Gracefully recovers from stale or inaccessible context', async () => {
    // Stale workspace ID that does not exist
    const context = await resolveActiveContext(userMember.id, 'ws_non_existent_999');
    // Falls back to user's first accessible workspace
    assert.ok(context.workspace);
    assert.strictEqual(context.workspace.id, testWorkspaceId);

    // Stale project ID that does not belong to workspace
    const contextProj = await resolveActiveContext(userMember.id, testWorkspaceId, 'proj_random_ghost');
    // Falls back to first valid project in workspace
    assert.ok(contextProj.project);
    assert.strictEqual(contextProj.project.id, testProjectId);
  });

  await t.test('12. Path Traversal Defense: Blocks path escapes outside project root', async () => {
    await assert.rejects(
      async () => {
        await validateProjectFileAccess(userMember.id, testProjectId, '../../../../windows/system32/cmd.exe');
      },
      /Path traversal detected/
    );
  });

  await t.test('13. Member removal and leave operations', async () => {
    // Member leaves workspace
    const left = await removeWorkspaceMember(userMember.id, testWorkspaceId, userMember.id);
    assert.strictEqual(left, true);

    // Member can no longer access workspace
    await assert.rejects(
      async () => {
        await getWorkspace(userMember.id, testWorkspaceId);
      },
      /is not a member/
    );
  });

  await t.test('14. deleteWorkspace cascades to delete projects and memberships', async () => {
    // Non-owner cannot delete workspace
    await assert.rejects(
      async () => {
        await deleteWorkspace(userAdmin.id, testWorkspaceId);
      },
      /requires role \[owner\]/
    );

    // Owner deletes workspace
    const deleted = await deleteWorkspace(userOwner.id, testWorkspaceId);
    assert.strictEqual(deleted, true);

    // Assert workspace gone
    assert.strictEqual(WorkspaceRepository.findById(testWorkspaceId), null);
    // Assert project gone
    assert.strictEqual(ProjectRepository.findById(testProjectId), null);
  });
});
