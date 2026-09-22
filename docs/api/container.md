# @path-ioc/container API Reference

`@path-ioc/container` provides advanced container extensions, offering demand-driven subgraph slicing and a dual-engine architecture (Async DAG Concurrency vs. Turbo Synchronous Resolution).

---

## The 4-Paradigm Execution Matrix

Combining `strategy` (`eager` | `demand`) and `mode` (`async` | `turbo`) yields four distinct execution models:

| Paradigm (`strategy` + `mode`) | Trigger Mechanism | Physical Characteristics | Recommended Use Case |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | Container creation | Full DAG topological pre-warming with non-enumerable `$ready` tracking promise | Standard backend servers, microservices with DB pool warming |
| **`eager` + `turbo`** | Container creation | Pure synchronous pre-warming with runtime property sensing | Synchronous client apps, complex monolithic utility libraries |
| **`demand` + `async`** | Property access (`container.UserPage`) | Forward subgraph slicing with strict single-point circuit-breaker safety | Large SPA route-based lazy loading, cold-start optimization |
| **`demand` + `turbo`** | Property access (`container.util`) | Pure synchronous zero-Promise latency with dynamic cycle resolution | High-performance CLI tools, synchronous batch pipelines |

---

## Core Methods

### `createDualContainer(graph, options)`

Instantiates a high-level proxy container governed by the dual-engine scheduler.

- **Type Signature**:
  ```typescript
  function createDualContainer<T = Record<string, unknown>>(
    graph: CompiledModuleGraph,
    options?: DualContainerOptions
  ): T & { $ready?: Promise<void> };
  ```
- **Options (`DualContainerOptions`)**:
  - `strategy`: `'eager'` | `'demand'` (default: `'eager'`)
  - `mode`: `'async'` | `'turbo'` (default: `'async'`)
  - `targetContainer`: Optional existing object to decorate as the container

---

### `extractSubModules(graph, rootKey)`

Extracts a minimal sub-DAG containing strictly the target node and its downstream transitive dependencies.

- **Type Signature**:
  ```typescript
  function extractSubModules(
    graph: CompiledModuleGraph,
    rootKey: string
  ): CompiledModuleGraph;
  ```
