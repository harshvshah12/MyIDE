# Contributing to Project Intelligence Fabric

Thank you for contributing to **Project Intelligence Fabric (MyIDE)**! This document outlines our development process, coding standards, and pull request guidelines.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors regardless of background, identity, or skill level.

---

## Development Workflow

### 1. Fork & Clone
```bash
git clone https://github.com/harshvshah12/MyIDE.git
cd MyIDE
```

### 2. Create a Feature Branch
```bash
git checkout -b feat/your-feature-name
```
Branch naming conventions:
* `feat/` for new features or capabilities
* `fix/` for bug fixes
* `perf/` for performance optimizations
* `docs/` for documentation updates
* `refactor/` for structural refactoring

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Verification Suites
Before committing any changes, run the test suites:
```bash
# Unit & Cryptographic tests
npm test

# End-to-End API tests (requires running server)
npm run test:e2e
```

---

## Coding Standards

### TypeScript
* Strict typing: Avoid `any` whenever possible. Use well-defined interfaces from `src/types/index.ts`.
* Component structure: Prefer functional components with explicit prop interfaces.

### Styling & Theme (Dark Obsidian Luxe)
* We strictly adhere to the **Dark Obsidian Luxe** design system:
  * Primary Canvas: `#090D16` (`bg-[#090D16]`)
  * Elevated Cards: `#111726` (`bg-[#111726]`)
  * Header/Terminal Bar: `#0B101D` (`bg-[#0B101D]`)
  * Borders: `border-white/10` or `border-white/15`
  * Text Primary: `text-slate-100` or `text-slate-200`
  * Accents: Indigo (`text-indigo-400`), Cyan (`text-cyan-400`), Purple (`text-purple-400`)
* **No generic purple-on-black AI slop.** Micro-interactions should be snappy (150–250ms).

### Security Rules
* **Zero secret leaks**: Never hardcode API keys, secrets, or bearer tokens in code or test fixtures.
* Always use `src/lib/crypto.ts` for handling sensitive credentials.
* Never expose raw keys in responses to the client.

---

## Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short summary>

[optional body]
```

Examples:
* `feat(router): add latency threshold scoring to Mode A`
* `fix(editor): prevent cursor reset on tab switch`
* `docs(readme): add installation guide for Ubuntu`
* `test(crypto): add PBKDF2 salt collision regression test`

---

## Submitting a Pull Request

1. Push your branch to GitHub.
2. Open a Pull Request against `main`.
3. Fill out the PR template with a clear description of the problem solved and test results.
4. Ensure all CI checks pass.