# Zero-Leak Capability Sharing & Entitlements Specification

## 1. Threat Model & Design Goals

In student hackathons and research labs, team members frequently share access to expensive frontier models (e.g. Claude 3.7 Sonnet, GPT-4o, or local GPU nodes).
Traditional practices involve pasting raw API keys into shared Slack/Discord channels or commit histories, causing:
* Key leakage to Git
* Runaway API spend
* Inability to revoke access without breaking everyone's workflow

Project Intelligence Fabric solves this through **Virtual Capability Entitlements**.

---

## 2. Abstraction Layers

1. **Vault Layer (`data/credentials.json`)**:
   * Stores encrypted provider keys (`AES-256-GCM`).
   * Keys are only ever decrypted in Node.js server memory during upstream HTTPS dispatch.
2. **Capability Layer (`data/capabilities.json`)**:
   * Defines a sharable capability: `name`, `provider`, `modelId`, `ownerId`, `isShareable`.
3. **Entitlement Layer (`data/entitlements.json`)**:
   * Grants a specific user access with hard constraints:
     * `maxBudgetUsd`: Hard spending limit.
     * `maxRequests`: Maximum request count.
     * `expiresAt`: Automatic expiration timestamp.
     * `status`: `active` | `revoked` | `exhausted` | `expired`.

---

## 3. Emergency Revocation (Kill Switch)

* **Granular Revocation**: Capability owners can click "Revoke Access" next to any user. Invalidation is instantaneous.
* **Workspace Kill Switch**: "REVOKE ALL ACCESS" terminates all issued entitlements across all teammates with a single atomic operation.