# @path-ioc/container API Reference

> ⚠️ **Status & Experimental Notice**: `@path-ioc/container` was created as an experimental proof-of-concept and benchmark package to evaluate dynamic getter-based lazy loading against traditional JS IoC frameworks (e.g. InversifyJS, Awilix). Due to strict single-point access constraints, **it is not recommended for standard production use and has no active iteration plans**. For production applications, please directly use the standard `@path-ioc/core` and `@path-ioc/unplugin`.

`@path-ioc/container` provides demand-driven subgraph slicing and explores 4 execution scheduling models (Async vs. Turbo).

---

## Physical Laws & Architecture Philosophy (`async` vs. `turbo`)

In the JavaScript single-threaded execution model, **"Asynchronous Initialization"** and **"Dynamic Runtime Dependency Sensing"** are physically irreconcilable:

- **Physical Reason**: JavaScript's Proxy dynamic getter (`c.foo`) is purely synchronous; it cannot suspend execution mid-flight to await an asynchronous microtask.
  - **`async` mode**: Modules must explicitly declare `dependencies` beforehand to compile a static DAG, allowing topological `await` execution to achieve **100% native reactive topological concurrency** (cascaded asynchronously via `Promise.all`);
  - **`turbo` mode**: **Strictly forbids asynchronous `main` factories** (throws `[Turbo Mode] Async module is not supported` if a Promise is returned). Because the synchronous call stack never suspends, **modules can completely omit `dependencies`**, relying on Proxy Dynamic Getters to synchronously traverse and hydrate dependencies on demand; calling-phase mutual references avoid deadlocks naturally, while initialization-phase circular deadlocks trigger a call stack overflow or are caught by static DFS Fail-Fast interception.

---

## Execution Scheduling Matrix

Combining `strategy` (`eager` | `demand`) and `mode` (`async` | `turbo`) yields four scheduling models:

| Paradigm (`strategy` + `mode`) | Trigger Mechanism | Physical Characteristics | Intended Scenario |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | Container creation | Full DAG topological pre-warming with non-enumerable `$ready: Promise<void>` attached | Asynchronous pre-warming experiments |
| **`eager` + `turbo`** | Container creation | Pure synchronous pre-warming on creation; forbids async `main` factories (throws on Promise); supports omitting `dependencies` | Synchronous utility test suites |
| **`demand` + `async`** | Property access | Forward subgraph slicing; property access returns a Promise. **Note**: Must be awaited sequentially; concurrent accesses throw a mutex conflict error | Demand-driven async slicing tests |
| **`demand` + `turbo`** | Property access | Evaluates subgraph synchronously upon property access with zero Promise latency; **fully supports omitting `dependencies`**; strictly forbids async `main`; throws Fail-Fast on dependency cycles | Synchronous batch pipelines |

---

## Core Methods

### `createContainer(graph, options)`

Instantiates a container proxy governed by the specified strategy and mode.

- **Type Signature**:
  ```typescript
  function createContainer(
    graph: CompiledModuleGraph,
    options: CreateContainerOptions
  ): Record<string, unknown>;
  ```
- **Options (`CreateContainerOptions`)**:
  - `strategy`: `'eager'` | `'demand'` (Required)
  - `mode`: `'async'` | `'turbo'` (Required)
  - *(Note: In `eager + async` mode, a non-enumerable `$ready: Promise<void>` is attached to the returned object)*

- **Usage Example**:
  ```typescript
  import { compileModuleGraph } from "@path-ioc/core";
  import { createContainer } from "@path-ioc/container";

  const graph = compileModuleGraph(rawModules);

  // Pure synchronous demand-driven container (supports omitting dependencies)
  const container = createContainer(graph, {
    strategy: "demand",
    mode: "turbo",
  });

  // Synchronous traversal and hydration triggered on first property access
  const service = container.myService;
  ```

---

## Internal Mechanism: Forward Subgraph Slicing (`extractSubModules`)

In `demand` mode, when a caller accesses an uninitialized property (such as `container.UserPage`), the container does not instantiate all modules. Instead, the internal algorithm `extractSubModules` dynamically extracts the minimum required subgraph:

1. **Graph Traversal**: Starting from the entry point, it performs a depth-first search through `resolvedDepsMap` to collect all transitive forward dependencies;
2. **Purification**: Strictly filters out unrelated modules, leaving only the target module and its direct/indirect prerequisites;
3. **Local Re-compilation & Hydration**: Passes the minimal raw module subset to `compileModuleGraph(subModules)` for immediate on-demand hydration.

*(Note: `extractSubModules` is an internal implementation algorithm within `@path-ioc/container`, not exposed as a public API export. It is invoked automatically by the Proxy Getter).*
