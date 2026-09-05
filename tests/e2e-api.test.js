const test = require('node:test');
const assert = require('node:assert');

const BASE_URL = 'http://127.0.0.1:3000';

test('E2E: GET / loads HTML studio shell', async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assert.match(text, /FABRIC/i);
});

test('E2E: GET /api/workspace returns active project metadata', async () => {
  const res = await fetch(`${BASE_URL}/api/workspace`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.workspace.name, 'SmartVision Edge AI');
  assert.strictEqual(data.workspace.collaborators.length, 3);
});

test('E2E: GET /api/files?tree=true returns file hierarchy', async () => {
  const res = await fetch(`${BASE_URL}/api/files?tree=true`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.tree));
  assert.ok(data.tree.some(f => f.name === 'inference.py'));
  assert.ok(data.tree.some(f => f.name === 'README.md'));
});

test('E2E: GET /api/models returns configured models', async () => {
  const res = await fetch(`${BASE_URL}/api/models`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.models.some(m => m.id === 'gemini-3.8-flash'));
  assert.ok(data.models.some(m => m.id === 'claude-3-7-sonnet'));
});

test('E2E: GET /api/obsidian bridges to vault with selective scoping', async () => {
  const res = await fetch(`${BASE_URL}/api/obsidian`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.notes));
  assert.ok(data.notes.some(n => n.path === 'Preferences.md'));
});

test('E2E: POST /api/terminal runs command in workspace safely', async () => {
  const res = await fetch(`${BASE_URL}/api/terminal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'python --version' }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.exitCode, 0);
  assert.match(data.stdout, /Python 3/);
});

test('E2E: POST /api/chat auto-routes security audit to Claude 3.7 Sonnet', async () => {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Audit OAuth tokens for CSRF vulnerabilities',
      agentRole: 'security',
      mode: 'auto',
      activeFilePath: 'inference.py'
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.routingDecision.selectedModelId, 'claude-3-7-sonnet');
  assert.strictEqual(data.routingDecision.riskLevel, 'critical');
  assert.match(data.reply, /Security Audit Report/);
});

test('E2E: POST /api/chat auto-routes documentation to Gemini 3.8 Flash High', async () => {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Update README installation steps',
      agentRole: 'docs',
      mode: 'auto',
      activeFilePath: 'README.md'
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.routingDecision.selectedModelId, 'gemini-3.8-flash');
  assert.strictEqual(data.routingDecision.riskLevel, 'low');
});

test('E2E: GET & POST /api/intelligence answers contextual project questions', async () => {
  const res = await fetch(`${BASE_URL}/api/intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Why did we choose Monaco Editor?' }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.match(data.answer, /Monaco Editor/);
});

test('E2E: DELETE /api/entitlements?all=true triggers Emergency Revocation', async () => {
  const res = await fetch(`${BASE_URL}/api/entitlements?all=true`, { method: 'DELETE' });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.revokedCount >= 0);
});