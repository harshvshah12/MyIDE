# Project Intelligence Fabric (MyIDE)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Security](https://img.shields.io/badge/Crypto-AES--256--GCM-green?style=for-the-badge&logo=shield)](https://nodejs.org/api/crypto.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Collaborative AI-Native IDE for Student Teams, Hackathons, Robotics & ML Research**

[Explore Architecture](ARCHITECTURE.md) • [Getting Started](#quick-start) • [Routing System](#intelligent-model-routing) • [Capability Sharing](#zero-leak-capability-sharing) • [Contributing](CONTRIBUTING.md)

</div>

---

## 🌟 The Vision

Student engineering teams across hackathons, robotics labs, and research groups waste hours context-switching between fragmented tools: code editors, separate web AI chats, scattered API keys, disconnected terminals, GitHub clients, and disjointed team documentation.

**Project Intelligence Fabric** unifies this entire workflow into a single, high-performance, collaborative developer workstation:

$$\text{Code} + \text{Humans} + \text{AI Models} + \text{Agents} + \text{Knowledge} + \text{Collaboration} + \text{Git} + \text{Project Memory} + \text{Capability Sharing}$$

Built from the ground up with a custom **Dark Obsidian Luxe** aesthetic, zero generic AI bloat, native Monaco code editing, and a mathematically enforced zero-leak cryptographic boundary.

---

## 🚀 Core Capabilities

### 1. 🔀 Three Distinct Model-Selection Modes
* **Mode A — Intelligent Quality-First Auto Router**:
  * Evaluates incoming task complexity, risk level, multi-file scope, and security sensitivity.
  * **Quality always takes priority over cost!** Automatically routes architectural refactors and security reviews to high-reasoning tier models (`Claude 3.7 Sonnet`), while routing rapid single-file edits, unit tests, and documentation to low-latency models (`Gemini 3.8 Flash High`).
  * **Explainable Routing ("Why?")**: An interactive explanation modal breaks down evaluated criteria and routing decisions without exposing private model reasoning tokens.
* **Mode B — Strict Manual Model Selection**:
  * When a developer selects a specific model, the system locks to that model and **never silently switches away**.
* **Mode C — Explicit Capability Binding**:
  * Direct binding to team-authorized capabilities (e.g., `Friend A — Claude`, `Lab RTX 4090 Agent`) with strict entitlement validation.

### 2. 🛡️ Zero-Leak Credential & Entitlement Boundary
* **No Raw Keys in Prompts or Bundles**: Raw API keys never touch the client, never render in browser bundles, and are strictly excluded from AI prompts and Git.
* **AES-256-GCM Encryption at Rest**: Secrets are encrypted using AES-256-GCM with 12-byte initialization vectors (IV), 16-byte authentication tags, and PBKDF2 key derivation.
* **Scoped Team Entitlements**: Share model access with teammates under strict usage constraints: maximum USD budget, maximum request count, and automatic expiration.
* **Emergency Revocation Kill Switches**: Instant per-entitlement revocation or one-click workspace-wide emergency kill switch (`REVOKE ALL ACCESS`).

### 3. 💻 Monaco Multi-Tab Code Studio
* Full VS Code Monaco Editor (`@monaco-editor/react`) integration with custom **Dark Obsidian** theme.
* Multi-tab document manager with dirty state indicators (`*`), live cursor tracking, and instant `Ctrl+S` saving.
* **Side-by-Side & Inline Diff Viewer**: Review AI-proposed changes before accepting or rejecting them into the working tree.
* Real-time directory file explorer with search filtering and live file/folder CRUD.

### 4. 🤖 8 Specialized AI Agent Roles
Each agent role is equipped with dedicated system prompts and strict Task Contracts:
* **Planner**: Deconstructs requirements into milestone execution roadmaps.
* **Researcher**: Explores technologies, algorithms, and documentation.
* **Coder**: Writes production-grade implementations and clean refactors.
* **Debugger**: Diagnoses runtime exceptions, memory leaks, and logic errors.
* **Tester**: Generates unit, integration, and E2E regression test suites.
* **Reviewer**: Inspects code quality, edge cases, and maintainability.
* **Security**: Audits injection risks, CORS/CSRF vulnerabilities, and secret boundary leaks.
* **Docs**: Generates high-quality technical specifications and API docs.

### 5. 🧠 Project Intelligence & Dynamic Obsidian Vault Bridge
* **Project Memory Store**: Contextual engine storing architectural decisions (ADRs), stack choices, and post-mortems. Answers queries like *"Why did we choose Monaco Editor?"*.
* **Dynamic Obsidian Brain Connector**: Seamlessly links to the user's Obsidian Vault at `C:\projects\orchestra-brain`. Features selective privacy scoping—developers choose exactly which notes to expose to AI context while keeping personal diaries and private career notes locked.

### 6. 🌿 Git-Integrated AI Provenance & Evidence
* Visual diff review of working tree modifications against `HEAD`.
* Conventional Git commit message generator (`feat:`, `fix:`, `refactor:`, `docs:`).
* Full AI provenance audit log tracking every code modification, user prompt, selected model, tools invoked, estimated token cost, and verification result.

### 7. ⚡ Sandboxed Terminal & Command Runner
* Integrated terminal pane supporting arbitrary shell commands with command history navigation.
* Quick-action execution presets (e.g. `python inference.py`, `npm test`).
* Real-time execution duration timers and process exit codes.

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |         Monaco Code Studio UI         |
                                  |   (Dark Obsidian Luxe / React 19)     |
                                  +-------------------+-------------------+
                                                      |
                          +---------------------------+---------------------------+
                          |                           |                           |
              +-----------v-----------+   +-----------v-----------+   +-----------v-----------+
              |   Model Routing Hub   |   |   Agent Dock (8 Roles)|   |  Terminal & Workspace |
              | Mode A / Mode B / C   |   |     Task Contracts    |   |     Command Runner    |
              +-----------+-----------+   +-----------+-----------+   +-----------+-----------+
                          |                           |                           |
                          +---------------------------+---------------------------+
                                                      |
                                    +-----------------v-----------------+
                                    |     Next.js 15 API Layer          |
                                    |  (/api/chat, /api/models, etc.)   |
                                    +-----------------+-----------------+
                                                      |
                        +-----------------------------+-----------------------------+
                        |                                                           |
          +-------------v-------------+                               +-------------v-------------+
          |  Zero-Leak Security Vault |                               |  Project Intelligence &   |
          |   PBKDF2 + AES-256-GCM    |                               |     Obsidian Brain        |
          | Scoped Team Entitlements  |                               |   Selective Privacy Sync  |
          +---------------------------+                               +---------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **UI Library** | [React 19](https://react.dev/) + [Lucide React](https://lucide.dev/) Icons |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) via `@monaco-editor/react` |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) with Dark Obsidian palette |
| **Cryptography** | Node.js `crypto` (AES-256-GCM, PBKDF2, constant-time verification) |
| **Testing** | Node.js Native Test Runner (`node:test`) + [Playwright](https://playwright.dev/) E2E |

---

## 🚦 Quick Start

### Prerequisites
* **Node.js**: v18.18.0 or higher (v20+ recommended)
* **npm**: v9.0.0 or higher
* **Git**: v2.30 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/harshvshah12/MyIDE.git
cd MyIDE
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy the example environment template:
```bash
cp .env.example .env.local
```
Configure your optional master encryption key and model provider keys:
```env
# Master AES-256-GCM vault key (automatically derives PBKDF2 key)
VAULT_MASTER_SECRET=your-super-secret-hex-or-passphrase

# Optional Direct Provider Keys (can also be added via the UI Vault)
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Verification & Test Suites

The codebase includes comprehensive unit tests and live API integration tests:

### Run Cryptographic & Routing Unit Tests
```bash
npm test
```
* **Coverage**: AES-256-GCM roundtrip encryption, ciphertext tamper detection, Mode A quality routing, Mode B manual adherence, Mode C capability binding, and entitlement quota enforcement.

### Run End-to-End API Tests
```bash
npm run test:e2e
```
* **Coverage**: Workspace tree queries, model discovery, sandboxed terminal runner, chat routing, project memory Q&A, and emergency kill switches.

---

## 📚 Documentation Directory

* [ARCHITECTURE.md](ARCHITECTURE.md) — Comprehensive technical architecture, data flows, and security boundaries.
* [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines, code standards, and PR process.
* [SECURITY.md](SECURITY.md) — Security policy, cryptographic specifications, and vulnerability disclosure.
* [LICENSE](LICENSE) — MIT License terms.

---

## 👥 Authors & Acknowledgments

Engineered by **Harsh Shah** ([@harshvshah12](https://github.com/harshvshah12)) for hackathons, engineering college projects, and advanced software/robotics development.

Special thanks to the Google DeepMind Antigravity team, Monaco Editor contributors, and the Next.js team.