# Path-IoC Playground

This directory contains three physically isolated, representative integration test projects that validate Path-IoC across various execution runtimes, bundlers, and topological scenarios.

For the comprehensive coverage test report, see [TEST_REPORT.md](./TEST_REPORT.md).

---

## Directory Architecture

```text
playground/
├── full-test-app/           # 1. Full-cycle application: Multi-bundler builds (Vite, Webpack, Rspack) + DOM rendering
├── modules-merge-test-app/  # 2. Cross-application & micro-frontend topology merging
└── container-test-app/      # 3. Mode comparison & edge fail-fast exception suites (Pure Node.js)
```

---

## Playground Projects

### 1. `full-test-app`
- **Purpose**: Real-world application simulating complete IoC container lifecycle with database connection, Redis cache, ORM entities, AOP aspect interception, and React DOM mounting.
- **Bundler Verification**: Validates production builds across three major modern bundlers:
  ```bash
  # Inside playground/full-test-app
  pnpm run build:vite       # Vite build verification
  pnpm run build:webpack    # Webpack 5 build verification
  pnpm run build:rspack     # ByteDance Rspack build verification
  pnpm test                 # Vitest DOM & runtime assertions
  ```

### 2. `modules-merge-test-app`
- **Purpose**: Tests dynamic topological merging of local and remote mesh modules, simulating micro-frontend architectures where independently bundled modules are composed into a unified DAG at runtime.
- **Commands**:
  ```bash
  # Inside playground/modules-merge-test-app
  pnpm test                 # Cross-app runtime merge assertions
  pnpm build                # Production bundle verification
  ```

### 3. `container-test-app`
- **Purpose**: Pure Node.js runtime verifying container modes and fail-fast behaviors:
  - Demand Proxy lazy loading
  - Turbo synchronous mode vs. async mode boundaries
  - Circular dependency detection and fail-fast error catching
  - Malformed module declaration interception
- **Commands**:
  ```bash
  # Inside playground/container-test-app
  pnpm test                 # Executes runtime assertions via tsx
  ```

---

## Monorepo CI Integration

All three playground test suites and bundler builds are aggregated at the monorepo root:

```bash
# Run all unit tests and full playground matrix
pnpm test:all
```

This command is executed automatically on every push and pull request within the GitHub Actions CI pipeline (`.github/workflows/ci.yml`).

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc).
