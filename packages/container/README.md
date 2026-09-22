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

> **Architectural Purpose**:  
> `@path-ioc/core` static graph compilation and native `async/await` topological preheating form the bedrock of Path-IoC.  
> `@path-ioc/container` is the companion extension proving that without TypeScript decorators or `reflect-metadata`, Path-IoC natively accommodates and surpasses traditional JS IoC frameworks in **"On-Demand Subgraph Slicing"** and **"Dynamic Dependency Resolution"**, delivering **4 physically closed-loop scheduling paradigms**.

---

## Architectural Philosophy: Physical Separation & Subgraph Slicing

### 1. Canonical Static Topology vs. Extended On-Demand Proxying

In enterprise production (similar to Java Spring's default `eager-singleton`), full DAG topological preheating at boot time remains the gold standard for system stability, dependency integrity, and runtime throughput:

- **Canonical Core (`@path-ioc/core`)**: Strictly rigorous—static graph compilation, DFS Fail-Fast cyclic dependency rejection, and native `async/await` DAG concurrency. Rejects implicit cycle-breaking that masks architectural design flaws.
- **Extended Container (`@path-ioc/container`)**: Open and versatile—wraps high-order proxy containers to decompose "Loading Scope (`eager` | `demand`)" and "Execution Engine (`async` | `turbo`)" into a **2-dimensional orthogonal matrix**, matching traditional on-demand IoC patterns.

---

### 2. The Irreconcilable Physical Law: `async` vs. `turbo`

In the JavaScript/TypeScript single-threaded execution model, **"Asynchronous Initialization"** and **"Dynamic Runtime Dependency Sensing"** are physically irreconcilable:

- **Physical Reason**: JavaScript's Proxy dynamic getter (`c.foo`) is purely synchronous; it cannot suspend execution mid-flight to await an asynchronous microtask.
  - If a module requires asynchronous setup (`async main`), its dependencies **must be statically declared beforehand** so the DAG scheduler can orchestrate topological `await` execution.
  - If dynamic sensing without declared dependencies were permitted during `async` execution, accessing an unready node would inevitably yield unhandled dangling Promises or deadlock the event loop.

Path-IoC resolves this via physical separation:
- **`async` mode**: Explicit `dependencies` -> Compiled static DAG -> **100% Native Reactive Topological Concurrency**;
- **`turbo` mode**: Zero `dependencies` declarations -> Runtime Proxy Dynamic Getters -> **Zero-config pass-through & lock-free cycle unwinding**.

---

## Selection Matrix

| Dimension | **NestJS** | **InversifyJS** | **Awilix** | **TSyringe** | **TypeDI** | **@path-ioc/container** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Core Contract** | `@Injectable()` + TS Decorators + `reflect-metadata` | `@injectable()` + TS Decorators + `reflect-metadata` | Regex `.toString()` or param inspection + Proxy | `@singleton()` + TS Decorators + `reflect-metadata` | `@Service()` + TS Decorators + `reflect-metadata` | **Physical Path Contract + Pure ES Closures + Static Graph** |
| **Code Intrusion** | High (framework decorators everywhere) | High (bound to `@inject`) | Low (matches parameters) | High (Microsoft decorators) | High (TypeDI decorators) | **Zero** (Pure ES functions; runs independently) |
| **On-Demand / Lazy Paradigm** | Module-level explicit lazy loading (`LazyModuleLoader`) | Property-level lazy injection (`@lazyInject`) | Proxy-based on-demand instantiation (sync only) | Not supported | Not supported | **Forward Subgraph Slicing** (`extractSubModules` automatically extracts forward dependency slice) |
| **Cycle Resolution** | `forwardRef()` (breaks easily on async) | `@lazyInject()` deferred lookup | Dynamic Proxy Getter (sync only) | `delay()` with explicit token | `constructMany` deferred | **Turbo Mode Dynamic Getter** (Zero tokens; automatic sync cycle unwinding) |
| **Async Concurrency** | Serial pipeline; sequential blocking | `getAsync()` without native DAG | Async factory (`container.build()`) | None | None | **Dual Engine Scheduler** (`async` native DAG concurrency / `turbo` synchronous pass-through) |

---

## 4 Scheduling Paradigms Matrix

`@path-ioc/container` combines `strategy` (`eager` | `demand`) $\times$ `mode` (`async` | `turbo`) into 4 physical paradigms:

```
                    ┌─────────────────────────┬─────────────────────────┐
                    │      mode: "async"      │      mode: "turbo"      │
                    │  (Reactive DAG Engine)  │  (Zero-Promise Sync)    │
┌───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "eager" │  ① Full Async Preheat   │  ② Sync Preheat + Dynamic│
│ (Full Load)       │  (Mounts $ready handle) │  (Fast sync utilities)  │
├───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "demand"│  ③ Subgraph On-Demand   │  ④ Direct Sync Pass-thru│
│ (Instant Slice)   │  (Large SPA / Fuse Prot)│  (Ultra-fast CLI / Test)│
└───────────────────┴─────────────────────────┴─────────────────────────┘
```

| Paradigm (`strategy` $\times$ `mode`) | Trigger Mechanism | Key Characteristics | Best Suited For |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | Container creation | Full DAG topological concurrency preheat; non-enumerable `container.$ready` handle | Standard servers / microservices, preheating pools and caches at startup |
| **`eager` + `turbo`** | Container creation | Synchronously evaluates modules in topological order; tracks dynamically added modules | Synchronous client applications, complex monolithic toolchains |
| **`demand` + `async`** | Property access (`container.UserPage`) | Traverses forward dependency tree to extract minimum slice; strict fuse protection | Large SPAs, route-level code splitting, extreme cold-start optimization |
| **`demand` + `turbo`** | Property access (`container.foo`) | Instant synchronous evaluation without `await`; supports dynamic sensing & unwinding | Ultra-fast CLI tools, synchronous pipelines, unit test isolation |

---

## Core Mechanism: Subgraph Slice Extraction

In `demand` mode, when accessing `container.UserPage` for the first time, the container does not pull the entire registry. Instead, it calls `extractSubModules(graph, 'UserPage')`:

1. **Forward Traversal**: Starting from `UserPage`, performs depth-first recursion over `resolvedDepsMap`;
2. **Deterministic Isolation**: Strictly collects `UserPage` and its downstream dependencies, pruning unrelated branches;
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

---

### `extractSubModules(graph, ...entryPoints)`

```typescript
export const extractSubModules: (
  graph: CompiledModuleGraph,
  ...entryPoints: string[]
) => { key: string; module: IOCModule }[];
```

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026-present [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
