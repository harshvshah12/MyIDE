# Routing Specification: Three-Mode Intelligent Model Router

This specification defines the behavior of the Model Routing Subsystem (`src/lib/router.ts`) in Project Intelligence Fabric.

---

## 1. Mode A: Intelligent Auto Routing (Quality First)

### Invariant
**Quality always takes priority over cost.**

### Inputs
* User prompt string
* Active file context (filename, path, language)
* Optional multi-file context tags

### Heuristic Scoring Algorithm
1. **Security & Auth Detection**:
   * Keywords: `auth`, `login`, `token`, `jwt`, `crypto`, `permission`, `csrf`, `xss`, `sql`, `secret`, `hash`.
   * Action: Immediately upgrades routing tier to **High Reasoning / Security Tier** (`Claude 3.7 Sonnet`).
2. **Architecture & Refactoring Detection**:
   * Keywords: `architecture`, `refactor`, `design pattern`, `database schema`, `restructure`, `redesign`, `system design`.
   * Action: Upgrades routing tier to **High Reasoning / Planning Tier** (`Claude 3.7 Sonnet`).
3. **Low-Risk / Rapid Tasks**:
   * Keywords: `docs`, `readme`, `rename`, `comment`, `format`, `lint`, `typo`.
   * Action: Routes to **High-Speed / Low-Latency Tier** (`Gemini 3.8 Flash High`).
4. **General Pair Programming & Edits**:
   * Standard coding tasks with single-file edits default to `Gemini 3.8 Flash High` for instant sub-second response times.

---

## 2. Mode B: Manual Model Selection (Never Auto-Switch)

### Invariant
**The user's explicit manual selection is sacred.**

When the user selects a specific model:
* The IDE will NEVER silently switch to another model, regardless of cost, latency, or perceived task complexity.
* If a model becomes unavailable, the system prompts the user explicitly rather than rerouting autonomously.

---

## 3. Mode C: Explicit Capability Binding

### Invariant
**Capability access is bound to granted entitlements with cryptographic enforcement.**

* The client specifies a `capabilityId`.
* The server resolves the associated `Entitlement` and checks:
  1. `status === "active"` (not revoked).
  2. `expiresAt > Date.now()`.
  3. `spentAmountUsd < maxBudgetUsd`.
  4. `usageCount < maxRequests`.
* If any condition fails, the request is rejected with a clear 403 authorization error.
* Zero raw credentials are ever returned to the client.