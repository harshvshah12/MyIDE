import crypto from 'crypto';

const secret = 'myide-session-secret-hmac-key-minimum-32-chars';
function mk(id, email) {
  const s = JSON.stringify({ userId: id, email: email, issuedAt: Date.now(), expiresAt: Date.now() + 30*24*60*60*1000 });
  const b = Buffer.from(s).toString('base64url');
  const h = crypto.createHmac('sha256', secret).update(b).digest('hex');
  return b + '.' + h;
}

const OWNER_TOKEN = mk('usr_owner_1', 'owner@mit.edu');
const STRANGER_TOKEN = mk('usr_stranger_1', 'stranger@stanford.edu');

async function testBoundary() {
  console.log('=== VERIFYING FLOW D: AUTHORIZATION BOUNDARY SUITE ===');

  // Step 1: Owner creates workspace
  const resWs = await fetch('http://localhost:3000/api/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OWNER_TOKEN },
    body: JSON.stringify({ name: 'Perception Robotics', slug: 'perception-robotics' })
  });
  const wsData = await resWs.json();
  console.log('Step 1. Owner create workspace:', wsData.success, 'wsId:', wsData.workspace?.id);
  const wsId = wsData.workspace.id;

  // Step 2: Owner creates project
  const resProj = await fetch('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OWNER_TOKEN },
    body: JSON.stringify({ workspaceId: wsId, name: 'Object Detection', slug: 'object-detection', kind: 'research' })
  });
  const projData = await resProj.json();
  console.log('Step 2. Owner create project:', projData.success, 'projId:', projData.project?.id);
  const projId = projData.project.id;

  // Step 3: Owner creates file inside project
  const resWrite = await fetch('http://localhost:3000/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OWNER_TOKEN },
    body: JSON.stringify({ projectId: projId, path: 'pipeline.py', content: 'print("pipeline running")' })
  });
  console.log('Step 3. Owner create file:', (await resWrite.json()).success);

  // Boundary 1: Stranger accessing workspace
  const b1 = await fetch('http://localhost:3000/api/workspace?workspaceId=' + wsId, {
    headers: { 'Authorization': 'Bearer ' + STRANGER_TOKEN }
  });
  const b1Data = await b1.json();
  console.log('Boundary 1 (Stranger GET /api/workspace):', b1.status, 'workspaces visible:', b1Data.workspaces.length);

  // Boundary 2: Stranger accessing projects
  const b2 = await fetch('http://localhost:3000/api/projects?workspaceId=' + wsId, {
    headers: { 'Authorization': 'Bearer ' + STRANGER_TOKEN }
  });
  const b2Data = await b2.json();
  console.log('Boundary 2 (Stranger GET /api/projects):', b2.status, b2Data.error);

  // Boundary 3: Stranger context switch to forbidden workspace
  const b3 = await fetch('http://localhost:3000/api/context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + STRANGER_TOKEN },
    body: JSON.stringify({ workspaceId: wsId, projectId: projId })
  });
  const b3Data = await b3.json();
  console.log('Boundary 3 (Stranger POST /api/context):', b3.status, 'Active workspace:', b3Data.context?.workspace);

  // Boundary 4: Stranger reads project file tree
  const b4 = await fetch('http://localhost:3000/api/files?tree=true&projectId=' + projId, {
    headers: { 'Authorization': 'Bearer ' + STRANGER_TOKEN }
  });
  const b4Data = await b4.json();
  console.log('Boundary 4 (Stranger GET /api/files tree):', b4.status, b4Data.error);

  // Boundary 5: Stranger reads file
  const b5 = await fetch('http://localhost:3000/api/files?path=pipeline.py&projectId=' + projId, {
    headers: { 'Authorization': 'Bearer ' + STRANGER_TOKEN }
  });
  const b5Data = await b5.json();
  console.log('Boundary 5 (Stranger GET /api/files path):', b5.status, b5Data.error);

  // Boundary 6: Unauthenticated request to scoped file
  const b6 = await fetch('http://localhost:3000/api/files?path=pipeline.py&projectId=' + projId);
  const b6Data = await b6.json();
  console.log('Boundary 6 (Unauthenticated GET /api/files):', b6.status, b6Data.error);

  // Boundary 7: Path traversal attempt escapes project root
  const b7 = await fetch('http://localhost:3000/api/files?path=../../../../windows/system32/drivers/etc/hosts&projectId=' + projId, {
    headers: { 'Authorization': 'Bearer ' + OWNER_TOKEN }
  });
  const b7Data = await b7.json();
  console.log('Boundary 7 (Path Traversal GET /api/files):', b7.status, b7Data.error);

  // Legitimate 1: Owner reads file tree
  const l1 = await fetch('http://localhost:3000/api/files?tree=true&projectId=' + projId, {
    headers: { 'Authorization': 'Bearer ' + OWNER_TOKEN }
  });
  const l1Data = await l1.json();
  console.log('Legitimate 1 (Owner GET /api/files tree):', l1.status, 'nodes:', l1Data.tree?.map(t => t.name));

  // Legitimate 2: Owner reads file content
  const l2 = await fetch('http://localhost:3000/api/files?path=pipeline.py&projectId=' + projId, {
    headers: { 'Authorization': 'Bearer ' + OWNER_TOKEN }
  });
  const l2Data = await l2.json();
  console.log('Legitimate 2 (Owner GET /api/files content):', l2.status, 'content:', l2Data.content);
}

testBoundary();
