<div align="center">
  <h1>@path-ioc/container</h1>
  <p><b>High-Performance Dual-Engine Container & Subgraph Slice Scheduler for Path-IoC</b></p>
  <p>Advanced on-demand container & dual-engine (Async Topological Concurrency / Turbo Synchronous Pass-through) scheduler extension</p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/container"><img src="https://img.shields.io/npm/v/@path-ioc/container.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/container.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://path-ioc.dev"><img src="https://img.shields.io/badge/docs-path--ioc.dev-8A2BE2.svg" alt="Docs"></a>
  </p>

  <p>
    <b>English</b> | <a href="./README.zh-CN.md">简体中文</a> | <a href="https://path-ioc.dev/api/container">Official Docs</a>
  </p>
</div>

> ⚠️ **Historical Evolution Experimental Package / Not Recommended for Production**  
> `@path-ioc/container` was developed as an experimental proof-of-concept and benchmark package to evaluate synchronous getter-based lazy loading against traditional JS IoC frameworks (such as InversifyJS). Due to strict sequential mutex constraints on property resolution, **it is not recommended for standard production applications and has no active iteration roadmap**.  
> For production systems, please use [`@path-ioc/core`](../core) and [`@path-ioc/unplugin`](../unplugin) with `createModularContainer`.

---

## Architectural Philosophy: Physical Separation & Subgraph Slicing

### 1. Canonical Static Topology vs. Extended On-Demand Proxying

In enterprise production (similar to Java Spring's default `eager-singleton`), full DAG topological preheating at boot time remains the gold standard for system stability, dependency integrity, and runtime throughput:

- **Canonical Core (`@path-ioc/core`)**: Strictly rigorous—static graph compilation, DFS Fail-Fast cyclic dependency rejection, and native `async/await` DAG concurrency. Rejects implicit cycle-breaking that masks architectural design flaws;
- **Extended Container (`@path-ioc/container`)**: Exploratory—wraps high-order proxy containers to decompose "Loading Scope (`eager` | `demand`)" and "Execution Engine (`async` | `turbo`)" into a **2-dimensional orthogonal matrix**, evaluating traditional on-demand IoC patterns.

---

### 2. The Irreconcilable Physical Law: `async` vs. `turbo`

In the JavaScript single-threaded execution model, **"Asynchronous Initialization"** and **"Dynamic Runtime Dependency Sensing"** are physically irreconcilable:

- **Physical Reason**: JavaScript's Proxy dynamic getter (`container.foo`) is purely synchronous; it cannot suspend execution mid-flight to await an asynchronous microtask.
  - If a module requires asynchronous setup (`async main`), its dependencies **must be statically declared beforehand** so the DAG scheduler can orchestrate topological `await` execution;
  - If dynamic sensing without declared dependencies were permitted during `async` execution, accessing an unready node would inevitably yield unhandled dangling Promises or deadlock the event loop.

Path-IoC resolves this via physical separation:
- **`async` mode (Supports async, requires declared `dependencies`)**: Explicit `dependencies` -> Compiled static DAG -> **100% Native Reactive Topological Concurrency** (cascaded asynchronously via `Promise.all`);
- **`turbo` mode (Pure synchronous pass-through, supports omitting `dependencies`)**: **Strictly forbids asynchronous `main` factories** (throws `[Turbo Mode] Async module is not supported` if a Promise is returned). Because the synchronous call stack never suspends, **modules can completely omit `dependencies`**, relying on Proxy Dynamic Getters to synchronously traverse and hydrate dependencies on demand; calling-phase mutual references avoid deadlocks naturally, while initialization-phase circular deadlocks trigger a call stack overflow or are caught by static DFS Fail-Fast interception.

---

## 4 Scheduling Paradigms Matrix

`@path-ioc/container` combines `strategy` (`eager` | `demand`) $\times$ `mode` (`async` | `turbo`) into 4 physical paradigms:

```
                    ┌─────────────────────────┬─────────────────────────┐
                    │      mode: "async"      │      mode: "turbo"      │
                    │  (Reactive DAG Engine)  │  (Zero-Promise Sync)    │
┌───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "eager" │  ① Full Async Preheat   │  ② Sync Preheat + Direct│
│ (Full Load)       │  (Mounts $ready handle) │  (Fast sync utilities)  │
├───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "demand"│  ③ Subgraph On-Demand   │  ④ Direct Sync Pass-thru│
│ (Instant Slice)   │  (Strict Mutex Guard)   │  (Ultra-fast CLI / Test)│
└───────────────────┴─────────────────────────┴─────────────────────────┘
```

| Paradigm (`strategy` $\times$ `mode`) | Trigger Mechanism | Key Characteristics | Intended Scenario |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | Container creation | Full DAG topological concurrency preheat; non-enumerable `container.$ready` handle | Asynchronous pre-warming experiments |
| **`eager` + `turbo`** | Container creation | Synchronously evaluates modules in topological order; throws if an async module is encountered | Synchronous utility test suites |
| **`demand` + `async`** | Property access (`container.UserPage`) | Traverses forward dependency tree to extract minimum slice. **Warning**: Mutex-guarded; sequential `await` is required, and concurrent accesses (e.g. `Promise.all([container.a, container.b])`) will throw a mutex conflict error | Demand-driven async slicing tests |
| **`demand` + `turbo`** | Property access (`container.foo`) | Instant synchronous evaluation without `await`; strictly intercepts dependency cycles via DFS Fail-Fast | Synchronous batch pipelines, unit test isolation |

---

## Selection Matrix

| Dimension | **NestJS** | **InversifyJS** | **Awilix** | **@path-ioc/core** *(Standard)* | **@path-ioc/container** *(Experimental)* |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Core Contract** | `@Injectable()` + Decorators | `@injectable()` + Decorators | Regex `.toString()` + Proxy | **Physical Path Contract + Pure Closures + Static Graph** | **Physical Path Contract + High-Order Proxy** |
| **Code Intrusion** | High | High | Low | **Zero** (Pure ES functions) | **Zero** (Pure ES functions) |
| **On-Demand / Lazy** | `LazyModuleLoader` | `@lazyInject` | Proxy on-demand (sync only) | Static DAG Preheating | **Forward Subgraph Slicing** (`extractSubModules`) |
| **Cycle Resolution** | `forwardRef()` (breaks on async) | `@lazyInject()` | Dynamic Proxy Getter (sync) | **DFS Fail-Fast Cycle Interception** | **DFS Fail-Fast** (No dynamic async cycle breaking) |
| **Production Ready** | Yes | Yes | Yes | **Recommended for Production** | ⚠️ **Experimental / Not Recommended** |

---

## Core Mechanism: Subgraph Slice Extraction

In `demand` mode, when accessing `container.UserPage` for the first time, the container does not pull the entire registry. Instead, it calls `extractSubModules(graph, 'UserPage')`:

1. **Forward Traversal**: Starting from `UserPage`, performs depth-first recursion over `resolvedDepsMap`;
2. **Deterministic Isolation**: Strictly collects `UserPage` and its downstream transitive dependencies, pruning unrelated branches;
3. **Local Compilation**: Compiles the minimal extracted subset into a sub-graph and executes it immediately.

```
Access container.UserPage
       │
       ▼
 [ Entrypoint Identified ] ───► extractSubModules(graph, "UserPage")
                                      │
                                      ├── 1. Recursively extract forward dependencies (UserService, UserApi...)
                                      └── 2. Compile and instantiate local slice immediately
```

*(Note: `extractSubModules` is an internal private algorithm function, not exported publicly; it is dispatched automatically by the Proxy Getter in `demand` mode).*

---

## API Reference

### `createContainer(graph, options)`

```typescript
export interface CreateContainerOptions {
  /**
   * Loading Strategy:
   * - "eager": Full preheat (initializes all modules upon container creation)
   * - "demand": On-demand slicing (initializes modules when properties are accessed)
   */
  strategy: "eager" | "demand";

  /**
   * Execution Engine:
   * - "async": Reactive asynchronous DAG topological concurrency
   * - "turbo": Pure synchronous pass-through zero-promise engine
   */
  mode: "async" | "turbo";
}

export const createContainer: (
  graph: CompiledModuleGraph,
  options: CreateContainerOptions
) => Record<string, unknown>;
```

*(Note: In `eager + async` mode, a non-enumerable `$ready: Promise<void>` is attached to the returned object).*

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026-present [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
