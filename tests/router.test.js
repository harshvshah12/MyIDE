const test = require('node:test');
const assert = require('node:assert');

// Unit test logic mirroring router.ts
function determineModelRoute(opts) {
  const { prompt, agentRole, mode, manualModelId, capabilityId } = opts;
  const lowerPrompt = prompt.toLowerCase();

  if (mode === 'manual' && manualModelId) {
    return {
      mode: 'manual',
      selectedModelId: manualModelId,
      rationale: 'User explicitly selected this model in Manual Mode.',
    };
  }

  if (mode === 'capability' && capabilityId) {
    return {
      mode: 'capability',
      selectedModelId: capabilityId,
      rationale: `Bound directly to capability ${capabilityId}.`,
    };
  }

  const isSecurity = lowerPrompt.includes('security') || lowerPrompt.includes('auth') || agentRole === 'security';
  const isArchitecture = lowerPrompt.includes('architect') || lowerPrompt.includes('redesign') || agentRole === 'planner';
  const isDoc = lowerPrompt.includes('readme') || lowerPrompt.includes('doc') || agentRole === 'docs';
  const isSimple = lowerPrompt.includes('rename') || lowerPrompt.length < 30;

  if (isSecurity) {
    return {
      mode: 'auto',
      selectedModelId: 'claude-3-7-sonnet',
      taskComplexity: 'critical',
      riskLevel: 'critical',
    };
  }

  if (isArchitecture) {
    return {
      mode: 'auto',
      selectedModelId: 'claude-3-7-sonnet',
      taskComplexity: 'complex',
      riskLevel: 'high',
    };
  }

  if (isDoc || isSimple) {
    return {
      mode: 'auto',
      selectedModelId: 'gemini-3.8-flash',
      taskComplexity: isSimple ? 'simple' : 'meta',
      riskLevel: 'low',
    };
  }

  return {
    mode: 'auto',
    selectedModelId: 'gemini-3.8-flash',
    taskComplexity: 'standard',
    riskLevel: 'medium',
  };
}

test('Mode A routes security audit to Claude 3.7 Sonnet', () => {
  const res = determineModelRoute({
    prompt: 'Audit authentication for OAuth session vulnerabilities and CSRF',
    agentRole: 'security',
    mode: 'auto'
  });
  assert.strictEqual(res.selectedModelId, 'claude-3-7-sonnet');
  assert.strictEqual(res.riskLevel, 'critical');
});

test('Mode A routes backend architectural redesign to Claude 3.7 Sonnet', () => {
  const res = determineModelRoute({
    prompt: 'Redesign the backend architecture with database connection pooling and sharding',
    agentRole: 'planner',
    mode: 'auto'
  });
  assert.strictEqual(res.selectedModelId, 'claude-3-7-sonnet');
  assert.strictEqual(res.taskComplexity, 'complex');
});

test('Mode A routes documentation or variable rename to Gemini 3.8 Flash High', () => {
  const resDoc = determineModelRoute({
    prompt: 'Update README installation instructions with npm command',
    agentRole: 'docs',
    mode: 'auto'
  });
  assert.strictEqual(resDoc.selectedModelId, 'gemini-3.8-flash');
  assert.strictEqual(resDoc.riskLevel, 'low');

  const resSimple = determineModelRoute({
    prompt: 'Rename these variables',
    agentRole: 'coder',
    mode: 'auto'
  });
  assert.strictEqual(resSimple.selectedModelId, 'gemini-3.8-flash');
  assert.strictEqual(resSimple.taskComplexity, 'simple');
});

test('Mode B strictly preserves manual choice and does not switch away', () => {
  const res = determineModelRoute({
    prompt: 'Rename these variables', // simple task that auto would route to flash
    agentRole: 'coder',
    mode: 'manual',
    manualModelId: 'claude-3-7-sonnet'
  });
  assert.strictEqual(res.selectedModelId, 'claude-3-7-sonnet');
  assert.strictEqual(res.mode, 'manual');
});

test('Mode C strictly binds to granted capability and does not switch away', () => {
  const res = determineModelRoute({
    prompt: 'Help me debug this memory leak',
    agentRole: 'debugger',
    mode: 'capability',
    capabilityId: 'cap-friend-aarav-gpt'
  });
  assert.strictEqual(res.selectedModelId, 'cap-friend-aarav-gpt');
  assert.strictEqual(res.mode, 'capability');
});
