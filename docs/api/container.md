# @path-ioc/container API Reference

> ⚠️ **Status & Experimental Notice**: `@path-ioc/container` was created as an experimental proof-of-concept and benchmark package to evaluate synchronous getter-based lazy loading against traditional JS IoC frameworks (e.g. InversifyJS). Due to strict single-point access constraints, **it is not recommended for standard production use and has no active iteration plans**. For production applications, please directly use `@path-ioc/core` and `@path-ioc/unplugin`.

`@path-ioc/container` provides demand-driven subgraph slicing and explores 4 execution scheduling models (Async vs. Turbo).

---

## Execution Scheduling Matrix

Combining `strategy` (`eager` | `demand`) and `mode` (`async` | `turbo`) yields four scheduling models:

| Paradigm (`strategy` + `mode`) | Trigger Mechanism | Physical Characteristics | Intended Scenario |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | Container creation | Full DAG topological pre-warming with non-enumerable `$ready` promise | Asynchronous pre-warming experiments |
| **`eager` + `turbo`** | Container creation | Pure synchronous pre-warming on creation; throws if an async module is encountered | Synchronous utility test suites |
| **`demand` + `async`** | Property access | Forward subgraph slicing; property access returns a Promise. **Note**: Must be awaited sequentially; concurrent accesses throw a mutex conflict error | Demand-driven async slicing tests |
| **`demand` + `turbo`** | Property access | Evaluates subgraph synchronously upon property access with zero Promise latency; throws Fail-Fast on dependency cycles | Synchronous batch pipelines |

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

---

### `extractSubModules(graph, ...entryPoints)`

Extracts a minimal array of raw modules containing the target entrypoints and their downstream transitive dependencies.

- **Type Signature**:
  ```typescript
  function extractSubModules(
    graph: CompiledModuleGraph,
    ...entryPoints: string[]
  ): { key: string; module: IOCModule }[];
  ```
- **Parameters**:
  - `graph`: Pre-compiled static module graph.
  - `entryPoints`: Target entrypoint module names (supports short names or full paths).
- **Returns**:
  - Array of extracted raw module descriptors. To construct a runnable container, pass these to `compileModuleGraph(subModules)`.
