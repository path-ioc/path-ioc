# Contributing to Path-IoC

Thank you for your interest in contributing to **Path-IoC**! We welcome bug fixes, documentation improvements, performance optimizations, and architectural enhancements.

Please take a few moments to review this guide before submitting a Pull Request.

---

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, constructive, and focused on building world-class engineering solutions.

---

## Local Development Setup

### Prerequisites
- **Node.js**: `>= 18.0.0` (LTS version recommended)
- **pnpm**: `>= 9.0.0` (This project uses pnpm workspaces)

### Initial Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/path-ioc.git
   cd path-ioc
   ```
2. Install all dependencies and link internal packages:
   ```bash
   pnpm install
   ```
3. Build all workspace packages:
   ```bash
   pnpm build
   ```

---

## Common Development Commands

| Command | Description | Purpose |
| :--- | :--- | :--- |
| `pnpm build` | Compiles all packages in topological order | Verifies production bundle outputs |
| `pnpm dev` | Starts `tsup --watch` across all packages | Live local cross-package development |
| `pnpm test` | Runs core unit test suites | Fast feedback during coding (~500ms) |
| `pnpm test:all` | Runs all unit tests + Playground builds (Vite, Webpack, Rspack) | Mandatory check before PR submission |
| `pnpm bench` | Runs DAG compilation and container instantiation benchmarks | Evaluates graph algorithm optimizations |
| `pnpm docs:dev` | Starts local VitePress documentation server | Preview documentation changes locally |
| `pnpm docs:build` | Builds production documentation assets | Ensures documentation builds cleanly |
| `pnpm changeset` | Prompts for package change type and description | Required for any package versioning change |

---

## Testing & Quality Assurance

Path-IoC enforces a two-tier testing strategy:
1. **Core Unit Tests (`pnpm test`)**:
   - Covers `@path-ioc/core`, `@path-ioc/container`, `@path-ioc/unplugin`, and `@path-ioc/pack`.
   - Validates Kahn's topological sort, circular dependency fail-fast detection, demand proxy slicing, and aspect interception.
2. **Full Matrix Integration Tests (`pnpm test:all`)**:
   - Validates real-world application builds located under `playground/`:
     - `container-test-app`: Tests turbo vs async modes and edge error handling.
     - `full-test-app`: Validates real DOM rendering across Vite, Webpack 5, and Rspack bundlers.
     - `modules-merge-test-app`: Validates cross-application dynamic module merging.

> **Before submitting a PR, ensure that `pnpm test:all` passes with zero errors.**

---

## Changesets & Versioning Workflow

Path-IoC uses [Changesets](https://github.com/changesets/changesets) for automated versioning and NPM publishing.

If your Pull Request modifies packages under `packages/`, you **must** generate a changeset:

```bash
pnpm changeset
```

1. Select which packages are modified using the spacebar.
2. Choose the semver bump type (`patch`, `minor`, or `major`).
3. Enter a concise summary of the change.
4. Commit the generated markdown file under `.changeset/` along with your code.

---

## Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature (e.g., `feat(unplugin): add support for rolldown`)
- `fix:` A bug fix (e.g., `fix(core): resolve edge case in cycle traversal`)
- `perf:` Performance improvement (e.g., `perf(core): optimize Kahn queue allocation`)
- `docs:` Documentation updates
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding or updating tests
- `chore:` Tooling, CI, or dependency maintenance

---

## Pull Request Guidelines

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and write corresponding test coverage.
3. Run `pnpm test:all` and `pnpm docs:build` locally.
4. Generate a changeset (`pnpm changeset`) if applicable.
5. Push your branch and open a PR against `path-ioc/main`.
6. Verify that GitHub Actions CI passes all checks.
