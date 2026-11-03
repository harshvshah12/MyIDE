import crypto from 'crypto';
import { UserRepository, EvidenceRepository } from '../src/lib/db/repositories.ts';

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

async function runPhase4BoundaryVerification() {
  console.log('===============================================================');
  console.log('PHASE 4 LIVE BOUNDARY & EXECUTION VERIFICATION SUITE');
  console.log('===============================================================');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  // Seed test user
  const aliceId = 'usr_alice_p4_test';
  UserRepository.save({
    id: aliceId,
    email: 'alice.p4@lab.mit.edu',
    name: 'Alice Phase4',
    authProvider: 'google',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const { token: aliceToken } = createSignedToken(aliceId, 'alice.p4@lab.mit.edu');
  const aliceCookie = `myide_session=${aliceToken}; myide_workspace_id=ws_p4_test`;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. POST /api/chat with empty prompt -> 400
    console.log('\n--- Test 1: Empty Prompt Rejection ---');
    const res1 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: aliceCookie,
      },
      body: JSON.stringify({ prompt: '' }),
    });
    assert(res1.status === 400, `Empty prompt returns HTTP 400 (got ${res1.status})`);
    const data1 = await res1.json();
    assert(data1.success === false, 'success is false');

    // 2. POST /api/chat standard coding task -> 200 with ExecutionResult
    console.log('\n--- Test 2: Standard AI Task Execution ---');
    const res2 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: aliceCookie,
      },
      body: JSON.stringify({
        prompt: 'Optimize the inference loop in Python',
        agentRole: 'coder',
        mode: 'auto',
        activeFilePath: 'inference.py',
      }),
    });
    assert(res2.status === 200, `Valid chat request returns HTTP 200 (got ${res2.status})`);
    const data2 = await res2.json();
    assert(data2.success === true, 'Response reports success: true');
    assert(typeof data2.reply === 'string' && data2.reply.length > 20, 'Reply contains meaningful response text');
    assert(data2.usage && typeof data2.usage.totalTokens === 'number', 'Usage contains normalized totalTokens');
    assert(typeof data2.durationMs === 'number', 'Response contains execution durationMs');
    assert(typeof data2.evidenceId === 'string' && data2.evidenceId.startsWith('ev_'), 'Evidence ID is generated');
    assert(data2.proposedChange !== undefined, 'proposedChange field is present');

    // 3. Verify backend evidence persistence
    console.log('\n--- Test 3: Backend Evidence Record Persistence ---');
    const ev = EvidenceRepository.findById(data2.evidenceId);
    assert(ev !== null, 'Evidence record persisted in EvidenceRepository');
    assert(ev?.userId === aliceId, `Evidence bound to authenticated userId (${ev?.userId})`);
    assert(ev?.verificationStatus === 'passed', 'Evidence status marked as passed');

    // 4. POST /api/chat security audit role
    console.log('\n--- Test 4: Security Audit Role Execution ---');
    const res4 = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: aliceCookie,
      },
      body: JSON.stringify({
        prompt: 'Audit secret boundaries in this workspace',
        agentRole: 'security',
        mode: 'auto',
      }),
    });
    assert(res4.status === 200, `Security role returns HTTP 200 (got ${res4.status})`);
    const data4 = await res4.json();
    assert(data4.reply.includes('Security Audit') || data4.reply.includes('Secret'), 'Security reply generated');

    console.log('\n===============================================================');
    console.log(`PHASE 4 BOUNDARY VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Boundary test runner error:', err);
    process.exit(1);
  }
}

runPhase4BoundaryVerification();
