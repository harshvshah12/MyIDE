const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Test entitlement logic
function checkEntitlementPermission(entitlement, now = Date.now()) {
  if (!entitlement) {
    return { allowed: false, reason: 'No active entitlement found' };
  }
  if (entitlement.status === 'revoked') {
    return { allowed: false, reason: 'Revoked by owner' };
  }
  if (now > entitlement.expiresAt) {
    return { allowed: false, reason: 'Entitlement expired' };
  }
  if (entitlement.requestsCount >= entitlement.maxRequests) {
    return { allowed: false, reason: 'Request limit exceeded' };
  }
  if (entitlement.spentUsd >= entitlement.spendingLimitUsd) {
    return { allowed: false, reason: 'Budget limit exceeded' };
  }
  return { allowed: true };
}

test('Entitlement permission check allows active valid entitlement', () => {
  const ent = {
    id: 'ent-1',
    status: 'active',
    expiresAt: Date.now() + 100000,
    maxRequests: 10,
    requestsCount: 2,
    spendingLimitUsd: 5.0,
    spentUsd: 1.2
  };
  const res = checkEntitlementPermission(ent);
  assert.strictEqual(res.allowed, true);
});

test('Entitlement permission rejects revoked entitlement immediately', () => {
  const ent = {
    id: 'ent-2',
    status: 'revoked',
    expiresAt: Date.now() + 100000,
    maxRequests: 10,
    requestsCount: 2,
    spendingLimitUsd: 5.0,
    spentUsd: 1.2
  };
  const res = checkEntitlementPermission(ent);
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.reason, 'Revoked by owner');
});

test('Entitlement permission rejects expired entitlement', () => {
  const ent = {
    id: 'ent-3',
    status: 'active',
    expiresAt: Date.now() - 5000, // expired 5 seconds ago
    maxRequests: 10,
    requestsCount: 2,
    spendingLimitUsd: 5.0,
    spentUsd: 1.2
  };
  const res = checkEntitlementPermission(ent);
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.reason, 'Entitlement expired');
});

test('Entitlement permission rejects when budget or request limit reached', () => {
  const entReq = {
    id: 'ent-4',
    status: 'active',
    expiresAt: Date.now() + 100000,
    maxRequests: 5,
    requestsCount: 5, // reached
    spendingLimitUsd: 10.0,
    spentUsd: 2.0
  };
  assert.strictEqual(checkEntitlementPermission(entReq).allowed, false);

  const entBudget = {
    id: 'ent-5',
    status: 'active',
    expiresAt: Date.now() + 100000,
    maxRequests: 50,
    requestsCount: 5,
    spendingLimitUsd: 10.0,
    spentUsd: 10.0 // reached
  };
  assert.strictEqual(checkEntitlementPermission(entBudget).allowed, false);
});
