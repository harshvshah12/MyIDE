import crypto from 'crypto';
import { UserRepository } from '../src/lib/db/repositories.ts';

const secret = 'myide-session-secret-hmac-key-minimum-32-chars';

function createSignedToken(userId, email, sessionId = 'sess_' + crypto.randomBytes(8).toString('hex')) {
  const session = {
    sessionId,
    userId,
    email,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const payloadStr = JSON.stringify(session);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadB64);
  const signature = hmac.digest('hex');
  return { token: `${payloadB64}.${signature}`, sessionId };
}

async function runPhase3Verification() {
  console.log('===============================================================');
  console.log('PHASE 3 LIVE BOUNDARY & SECURITY VERIFICATION SUITE');
  console.log('===============================================================');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  // Seed test users
  UserRepository.save({
    id: 'usr_alice_test',
    email: 'alice@lab.mit.edu',
    name: 'Alice Researcher',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  UserRepository.save({
    id: 'usr_bob_test',
    email: 'bob@lab.mit.edu',
    name: 'Bob Peer',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // Generate test identities
  const userA = createSignedToken('usr_alice_test', 'alice@lab.mit.edu');
  const userB = createSignedToken('usr_bob_test', 'bob@lab.mit.edu');

  // -------------------------------------------------------------
  // FLOW E: Authentication Lifecycle & /api/auth/me
  // -------------------------------------------------------------
  console.log('\n--- FLOW E: AUTHENTICATION LIFECYCLE ---');

  // Test unauthenticated access to /api/auth/me
  const resUnauth = await fetch(`${BASE_URL}/api/auth/me`);
  const unauthData = await resUnauth.json();
  assert(resUnauth.status === 200 && unauthData.authenticated === false, '1. Unauthenticated /api/auth/me returns authenticated: false');

  // Test authenticated /api/auth/me with Bearer token
  const resAuthA = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${userA.token}` },
  });
  const authAData = await resAuthA.json();
  assert(resAuthA.status === 200 && authAData.authenticated === true && authAData.user.email === 'alice@lab.mit.edu', '2. Bearer token authenticates Alice via /api/auth/me');

  // Test Cookie authentication
  const resCookieA = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': `myide_session=${encodeURIComponent(userA.token)}` },
  });
  const cookieAData = await resCookieA.json();
  assert(resCookieA.status === 200 && cookieAData.authenticated === true && cookieAData.user.id === 'usr_alice_test', '3. HttpOnly Cookie authenticates Alice via /api/auth/me');

  // -------------------------------------------------------------
  // FLOW F: Provider Connections & Latency Probe
  // -------------------------------------------------------------
  console.log('\n--- FLOW F: PROVIDER CONNECTIONS & LATENCY PROBE ---');

  // 1. User A creates a Google Gemini connection
  const resCreateGoogle = await fetch(`${BASE_URL}/api/provider-connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      providerId: 'google',
      label: "Alice's Gemini 1.5 Pro",
      apiKey: 'AIzaSyDemoSecretKeyForTesting1234567890',
    }),
  });
  const googleData = await resCreateGoogle.json();
  console.log('DEBUG resCreateGoogle:', resCreateGoogle.status, googleData);
  assert(resCreateGoogle.status === 201 && googleData.success, '4. Alice creates Google Gemini connection');
  const googleConnId = googleData.connection?.id;

  // Verify key is masked in creation response
  assert(
    googleData.connection?.maskedKey?.includes('••••') && !googleData.connection?.maskedKey?.includes('DemoSecretKey'),
    '5. Creation response masks credential (zero plaintext leak)'
  );

  // 2. User A creates a Local Daemon connection (Ollama)
  const resCreateLocal = await fetch(`${BASE_URL}/api/provider-connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userA.token}`,
    },
    body: JSON.stringify({
      providerId: 'local',
      label: 'Local Ollama Daemon',
      baseUrl: 'http://127.0.0.1:11434',
    }),
  });
  const localData = await resCreateLocal.json();
  assert(resCreateLocal.status === 201 && localData.success, '6. Alice creates Local Daemon connection');
  const localConnId = localData.connection?.id;

  // 3. User A lists provider connections
  const resListA = await fetch(`${BASE_URL}/api/provider-connections`, {
    headers: { 'Authorization': `Bearer ${userA.token}` },
  });
  const listAData = await resListA.json();
  assert(
    resListA.status === 200 &&
    listAData.connections.length >= 2 &&
    listAData.connections.every((c) => !c.encryptedCredential && c.maskedKey !== 'AIzaSyDemoSecretKeyForTesting1234567890'),
    '7. Alice lists connections with masked credentials and zero raw ciphertext/plaintext leakage'
  );

  // 4. Test connectivity probe (latency ping) on Local Daemon
  const resTestLocal = await fetch(`${BASE_URL}/api/provider-connections/${localConnId}/test`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userA.token}` },
  });
  const testLocalData = await resTestLocal.json();
  const testInfo = testLocalData.test || testLocalData;
  assert(
    resTestLocal.status === 200 && (testInfo.status === 'active' || testInfo.status === 'error'),
    `8. Latency probe executes against local daemon adapter (status: ${testInfo.status}, latency: ${testInfo.latencyMs}ms)`
  );

  // -------------------------------------------------------------
  // FLOW H: Cross-User Provider Boundary Enforcement
  // -------------------------------------------------------------
  console.log('\n--- FLOW H: CROSS-USER PROVIDER BOUNDARY ENFORCEMENT ---');

  // User B lists connections: must NOT see Alice's connections
  const resListB = await fetch(`${BASE_URL}/api/provider-connections`, {
    headers: { 'Authorization': `Bearer ${userB.token}` },
  });
  const listBData = await resListB.json();
  const aliceConnVisibleToBob = listBData.connections.some((c) => c.id === googleConnId || c.id === localConnId);
  assert(resListB.status === 200 && !aliceConnVisibleToBob, "9. Bob's connection list isolates and completely excludes Alice's connections");

  // User B attempts to GET Alice's connection by ID
  const resGetBob = await fetch(`${BASE_URL}/api/provider-connections/${googleConnId}`, {
    headers: { 'Authorization': `Bearer ${userB.token}` },
  });
  assert(resGetBob.status === 403, "10. Bob attempting GET Alice's connection by ID returns 403 Forbidden");

  // User B attempts to ping/test Alice's connection
  const resTestBob = await fetch(`${BASE_URL}/api/provider-connections/${googleConnId}/test`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userB.token}` },
  });
  assert(resTestBob.status === 403, "11. Bob attempting to test/ping Alice's connection returns 403 Forbidden");

  // User B attempts to DELETE Alice's connection
  const resDeleteBob = await fetch(`${BASE_URL}/api/provider-connections/${googleConnId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${userB.token}` },
  });
  assert(resDeleteBob.status === 403, "12. Bob attempting to DELETE Alice's connection returns 403 Forbidden");

  // -------------------------------------------------------------
  // FLOW G: Session Invalidation & Logout
  // -------------------------------------------------------------
  console.log('\n--- FLOW G: SESSION INVALIDATION & LOGOUT ---');

  // Alice logs out via /api/auth/logout with her session cookie
  const resLogout = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Cookie': `myide_session=${encodeURIComponent(userA.token)}`,
    },
  });
  const logoutSetCookie = resLogout.headers.get('set-cookie');
  assert(
    resLogout.status === 200 &&
    (logoutSetCookie?.includes('Max-Age=0') || logoutSetCookie?.includes('Expires=Thu, 01 Jan 1970')),
    '13. POST /api/auth/logout clears session cookie with Max-Age=0'
  );

  // Subsequent request using revoked token to protected endpoint returns 401
  const resRevokedReq = await fetch(`${BASE_URL}/api/provider-connections`, {
    headers: {
      'Cookie': `myide_session=${encodeURIComponent(userA.token)}`,
    },
  });
  assert(resRevokedReq.status === 401, '14. Revoked session token is immediately blocked with 401 Unauthorized');

  // Verify Alice can clean up local connection with a fresh token
  const freshAlice = createSignedToken('usr_alice_test', 'alice@lab.mit.edu');
  const resDel = await fetch(`${BASE_URL}/api/provider-connections/${localConnId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${freshAlice.token}` },
  });
  assert(resDel.status === 200, "15. Owner Alice with valid fresh token can delete connection");

  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Verification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
