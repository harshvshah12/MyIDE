# Security Policy: Project Intelligence Fabric

## Overview

Security is a primary design objective for **Project Intelligence Fabric**. Because the platform coordinates AI model providers, sandboxed terminal processes, and shared capabilities across student engineering teams, strict security boundaries are enforced.

---

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 1.0.x | :white_check_mark: |
| < 1.0 | :x: |

---

## Core Security Invariants

1. **Zero Secret Leaks to Clients**:
   * Raw upstream credentials (OpenAI, Anthropic, Google, custom proxy keys) are stored encrypted at rest on the server (`data/credentials.json`) using AES-256-GCM.
   * Credentials never travel across the network to client browsers.
   * Client UI components only ever receive masked identifiers (`sk-ant-...490a`).

2. **Zero Secret Leaks to AI Prompts**:
   * Prompts constructed for LLM models are scrubbed to ensure API keys and private tokens are never included as prompt context.

3. **Scoped Entitlement Quotas**:
   * Shared capabilities are restricted by budget limits (USD) and maximum request quotas.
   * The server validates entitlement status on every request before dispatching upstream calls.

4. **Emergency Revocation Kill Switches**:
   * Capability owners can revoke individual teammate entitlements or execute a global emergency revocation (`REVOKE ALL ACCESS`), which instantly terminates all active shared sessions.

5. **Terminal Sandbox Boundaries**:
   * Command execution via `/api/terminal` is restricted to the active workspace directory.
   * Critical system commands that could compromise the host operating system are rejected.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability, please **do not open a public GitHub issue**.

Instead, please report it privately:
* **Email**: `harshvshah2019@gmail.com`
* **Subject**: `[SECURITY VULNERABILITY] Project Intelligence Fabric`

Please include:
* Description of the vulnerability.
* Steps to reproduce or proof-of-concept exploit.
* Potential impact.

We will acknowledge receipt within 48 hours and work with you on a responsible disclosure timeline.