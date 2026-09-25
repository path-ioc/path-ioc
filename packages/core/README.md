<div align="center">
  <h1>@path-ioc/core</h1>
  <p><b>Spring has Beans, Nest has Providers, Path-IoC has Meshes.</b></p>
  <p><b>A pure, universal TypeScript/JavaScript Dependency Lookup (IoC-DL) engine as lightweight as lodash-es</b></p>
  <p><b>The native Inversion-of-Control solution designed specifically for dynamic languages</b></p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/core"><img src="https://img.shields.io/npm/v/@path-ioc/core.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/core.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://path-ioc.dev"><img src="https://img.shields.io/badge/docs-path--ioc.dev-8A2BE2.svg" alt="Docs"></a>
    <a href="https://github.com/sponsors/path-ioc"><img src="https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA.svg" alt="Sponsor"></a>
  </p>

  <p>
    <b>English</b> | <a href="./README.zh-CN.md">简体中文</a> | <a href="https://path-ioc.dev">Official Docs</a>
  </p>
</div>

> **What is Path-IoC (IoC-DL)?**  
> Say goodbye to explicit `import` hell and the deadlocks, reflection penalties, and metadata bloat of legacy DI containers in asynchronous JavaScript. Path-IoC adopts the **Dependency Lookup (IoC-DL)** paradigm: physical file paths serve as abstract feature contracts, static topology graphs are compiled once, and modules awaken through native `async/await` DAG concurrency. Zero decorators, zero `reflect-metadata`, and zero framework intrusion.

---

## Live Demo & Instant Ignition (Live Demo Video)

<div align="center">
  <video src="https://cdn.path-ioc.dev/path-ioc/demo-en.mp4" controls width="100%" playsinline>
    Your browser does not support the video tag. <a href="https://cdn.path-ioc.dev/path-ioc/demo-en.mp4">Watch Live Demo Video</a>
  </video>
  <p>⚡ <b><a href="https://cdn.path-ioc.dev/path-ioc/demo-en.mp4">Watch Live Architecture Tour: Real-time Coding, Topological Orchestration & Instant Ignition</a></b></p>
</div>

---

## Quick Start

In production applications, `@path-ioc/core` works in tandem with the compiler plugin `@path-ioc/unplugin` (Compiler-Runtime Co-design). However, `@path-ioc/core` is **100% self-sufficient and independent**—it can run in standalone Node.js, CLI tools, unit tests, or Cloudflare Workers without any bundler or companion packages.

### 1. Install Runtime & Bundler Plugin

```bash
# Runtime Core (Zero external dependencies)
pnpm add @path-ioc/core

# Universal Bundler Plugin (Dev Dependency)
pnpm add -D @path-ioc/unplugin
```

### 2. Configure Bundler (Vite / Rolldown / Webpack / Rspack / Rollup / Esbuild)

Add `@path-ioc/unplugin` to your build configuration:

```typescript
// vite.config.ts (or rolldown.config.ts)
import { defineConfig } from "vite";
import { vitePlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [
    pathIoc({
      modulesPath: "src/modules", // Directory scanned for modules (default: 'src/modules')
      typeFileOutput: "types",    // Output directory for auto-generated TypeScript definitions
    }),
  ],
});
```

*Note: For Webpack 5 use `webpackPlugin`, Rspack use `rspackPlugin`, Rollup use `rollupPlugin`, and Esbuild use `esbuildPlugin`.*

### 3. Create Business Modules (Short-Name Mesh ID Standard Practice)

Create module directories inside `src/modules` and export a pure `main` function. Using clean **short names (Mesh IDs)** for static dependencies is the framework's standard practice; hardcoding full physical paths for static dependencies is an anti-pattern and bad practice (it causes strong path coupling and violates the Dependency Inversion Principle). Full paths are designed exclusively for dynamic feature matching and AOP aspect filtering:

```typescript
// src/modules/infra/db/index.ts
export const main = () => {
  return {
    query: (sql: string) => `Executed: ${sql}`,
  };
};

// src/modules/biz/user/index.ts
// ✅ Standard Practice: Clean short names as Mesh IDs
export const dependencies = ["db"]; 

export const main = ({ db }: ModularContainer) => {
  // Direct destructuring with 100% type inference, guaranteed resolved by topological scheduler
  return {
    getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
  };
};
```

### 4. Create App Bootstrap Module (`src/modules/start-app/index.ts`)

```typescript
// All business logic stays inside IoC modules to guarantee AOP aspects and topological readiness
export const dependencies = ["user"];

export const main = ({ user }: ModularContainer) => {
  console.log(user.getUser("1001"));
};
```

### 5. Ignite the Container (`src/main.ts`)

In your application entrypoint (e.g. `src/main.ts`), ignite the lock-free topological engine with a single line:

```typescript
// src/main.ts
import { createModularContainer } from "virtual:modular-container";

// Host ignition boundary: pure ignition with 0 business pollution
createModularContainer();
```

The plugin automatically generates `ignore.modular.d.ts` in the background, providing 100% static type safety and intelligent IDE autocompletion!

---

### 6. Standalone / Pure Node.js & Testing Mode

When writing isolated unit tests (e.g. with Vitest / Jest) or running in headless CLI scripts without a bundler, you can directly invoke the pure function runtime of `@path-ioc/core`:

#### Scenario A: Unit Testing (Vitest / Jest)
In test suites, the test case acts as an external inspector asserting container assembly and evaluated outputs:

```typescript
import { expect, it } from "vitest";
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

it("should compile and instantiate in topological order", async () => {
  const modules = [
    { key: "/infra/db", module: { main: () => ({ query: (sql: string) => `DB: ${sql}` }) } },
    {
      key: "/biz/userService",
      module: {
        dependencies: ["db"],
        main: ({ db }: any) => ({
          getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
        }),
      },
    },
  ];

  const compiledGraph = compileModuleGraph(modules);
  const container: Record<string, unknown> = {};
  await instantiateModuleContainer(compiledGraph, container);

  // Unit test assertion: external probe validates assembly correctness
  expect((container.userService as any).getUser("1001")).toBe("DB: SELECT * FROM users WHERE id = 1001");
});
```

#### Scenario B: Headless Script Ignition (Business Logic Enclosed in Mesh)
Even in minimal scripts without build tools, the "Ignition Transition" rule holds: **all business logic remains encapsulated inside modules, while the outer script only compiles and ignites**:

```typescript
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

const modules = [
  { key: "/infra/db", module: { main: () => ({ query: (sql: string) => `DB: ${sql}` }) } },
  {
    key: "/biz/userService",
    module: {
      dependencies: ["db"],
      main: ({ db }: any) => ({
        getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
      }),
    },
  },
  {
    // Business logic stays inside the Mesh, guaranteeing topological readiness and AOP safety
    key: "/app/start",
    module: {
      dependencies: ["userService"],
      main: ({ userService }: any) => {
        console.log(userService.getUser("1001"));
      },
    },
  },
];

// Host ignition boundary: compiles and ignites with zero outer business logic contamination
const compiledGraph = compileModuleGraph(modules);
await instantiateModuleContainer(compiledGraph, {});
```

---

## Core Architecture & Philosophy

Path-IoC pays deep homage to **Java Spring's classic Inversion-of-Control (IoC) principles**, while advancing its decoupled vision natively for JavaScript/TypeScript's single-threaded, asynchronous, and functional execution model:

### 1. Counterpart to Native ESM: Application-Level Self-Organizing Mesh
- **Native ESM's Inevitable Bottleneck**: Explicit relative `import` statements (`../../../../utils`) become rigid compile-time hardlinks. In large codebases, they create refactoring paralysis and circular dependency deadlocks;
- **Path-IoC as an Autonomous Mesh**: Counterparts native ESM at the business layer. Host applications (Hono, Express, Koa, Cloudflare Workers, CLI) execute one-line ignition (`createModularContainer()`), while all business lifecycles, dynamic module matching, and cross-cutting concerns circulate autonomously within the mesh;
- **Completely Free from Monolithic Framework Dogma**: Developers often conflate IoC with heavyweight backend frameworks (such as NestJS). That is a fundamental category error. Monolithic backend frameworks invade business code with class decorators, controllers, and proprietary pipes. Path-IoC is never a backend framework, but a **minimal, lightweight, non-invasive self-contained mesh** dedicated solely to module composition and topological resolution across browser SPAs, edge workers, and servers alike.

### 2. The Dynamic Language Paradigm: Native DAG Topological Concurrency
Path-IoC performed no miracle; it simply obeyed the physical realities of JavaScript's single-threaded non-blocking Event Loop. In conventional industry perceptions, topological concurrent scheduling during container boot is often hailed as a "miracle." This perception stems from contrasting it against the four irreconcilable contradictions in legacy IoC architectures:

- **Contrasting Java Spring's Serial Initialization Bottleneck**: Despite OS-level multi-threading, Java Spring must restrict container initialization to a **strictly single-threaded serial pipeline (accumulative latency $\sum t_i$)** to prevent shared-memory race conditions, memory visibility hazards, and three-level-cache raw-pointer escape risks governed by the Java Memory Model (JMM);
- **Contrasting Legacy JS IoC's Async Initialization vs. Lazy Loading Contradiction**: In JavaScript's single-threaded model, synchronous Proxy Getters cannot pause to await asynchronous microtasks, nor can a pending Promise serve as a raw pointer in a three-level cache. Unable to solve topological async scheduling, legacy JS IoC frameworks (such as NestJS) surrender by hardcoding sequential `for...of await` loops in their core source code;
- **Conflation of Invocation-Time and Initialization-Time Dependencies in DI**: Traditional constructor injection elevates future runtime method invocations into physical boot-time prerequisites, artificially corrupting clean DAGs and generating spurious circular dependencies;
- **AOP Deficiencies Caused by the Absence of Effective Dependency Lookup (DL)**: Lacking non-invasive dependency lookup mechanisms, legacy frameworks degrade AOP into intrusive class decorators (e.g. `@UseInterceptors`) requiring explicit `import` statements, entirely violating the non-invasive cross-cutting essence of AOP.

**Path-IoC's Breakthrough**: Decouple "initialization dependencies (DAG topology)" orthogonally from "invocation-time dependencies (DL lookup)", reducing cyclic dependency probabilities mathematically to zero. By leveraging JavaScript's single-threaded immunity to shared-memory data races, peer modules without inter-dependencies ignite concurrently via `Promise.all` memoized reactive streams (reducing boot latency from $\sum t_i$ to the bottleneck node's $\max t_i$), enabling genuinely non-invasive Aspect-Oriented Programming through pure functional closures and pattern-matched dependency lookup.

### 3. Physical Path as Feature (Label) vs. Short-Name as Mesh ID
- **Short Name is the Mesh ID**: In everyday business development, developers consume short names (`dependencies = ["logger", "db"]`, `const { logger, db } = container;`), enjoying zero ceremony and 100% IDE type inference;
- **Physical Path is a Feature Tag**: Physical directory prefixes (e.g. `/infra/`, `/biz/`, `/aspect/`) are **feature labels** (analogous to metadata tags);
- **Design Tenet**: Hardcoding full physical paths for static dependencies is an anti-pattern and bad practice (it introduces strong path coupling and violates the Dependency Inversion Principle). Full paths are designed exclusively for dynamic feature matching and AOP aspect filtering, while everyday business code must always embrace clean short-name Mesh IDs.

### 4. Aspect-Oriented Programming (AOP) via Pure Closures
- **Zero Framework Primitives**: Path-IoC avoids heavy specialized abstractions (`Guards`, `Interceptors`, `Pipes`, `Filters`). In dynamic languages, higher-order functions and proxy wrappers represent the purest form of AOP;
- **Natural Aspect Meshes**: An aspect module declares a dependency filter function matching target module path prefixes (`allModuleNames.filter(p => p.startsWith("/biz/"))`). The topological scheduler guarantees target instances are instantiated first; the aspect module then wraps target methods via higher-order proxies without intrusive annotations.

### 5. Physical Law of Cycles & DFS Fail-Fast
- **The Physical Impossibility of Dynamic Async Cycle Unwinding**: JavaScript Proxy Getters (`container.xxx`) are purely synchronous operations; microtasks cannot suspend synchronous execution to await asynchronous operations. Dynamic cycle-breaking under async execution is physically impossible in single-threaded JS;
- **Strict Fail-Fast by Design**: `@path-ioc/core` remains mathematically rigorous—DFS static cycle analysis enforces **Fail-Fast** error reporting with full cycle chain traces upon boot, forcing clean, orthogonal architecture.

### 6. Two-Stage Execution & Edge Serverless Readiness
By completely eliminating `reflect-metadata`, Path-IoC cleanly separates **Static Graph Compilation (`compileModuleGraph`)** from **Dynamic Container Instantiation (`instantiateModuleContainer`)**. In Cloudflare Workers or serverless Node.js endpoints, the module graph is compiled once on worker cold-start (1.72ms for 500 nodes) and permanently cached; subsequent requests instantiate lightweight containers directly in **21.2 µs**, reducing framework CPU overhead by over 80%.

---

## Hardware-Verified Benchmarks

Tested on Apple Silicon under Node.js v24 (`pnpm bench`):

| Target Function | Complexity | Mean Duration | Evaluation |
| :--- | :--- | :--- | :--- |
| **`instantiateModuleContainer`** | **50 Nodes** | **`21.2 µs`** | Microsecond direct resolution; zero request-time latency |
| **`compileModuleGraph`** | **50 Nodes** | **`90.8 µs`** | Sub-millisecond cycle validation |
| **`instantiateModuleContainer`** | **500 Nodes** | **`227 µs`** | Ultra-large module graphs resolve with negligible cost |
| **`compileModuleGraph`** | **500 Nodes** | **`1.72 ms`** | Executed once on process cold boot, cached permanently |
| **`compileModuleGraph`** | **2,000 Nodes** | **`15.5 ms`** | Industrial-grade deep topology limit |

---

## Selection Matrix

| Comparison Dimension | **TS Decorator Stack**<br>(NestJS / Inversify / TSyringe) | **Regex Proxy Stack**<br>(Awilix) | **JVM Reflection Stack**<br>(Java Spring) | **@path-ioc/core** |
| :--- | :--- | :--- | :--- | :--- |
| **Core Contract** | `reflect-metadata` + TS Decorators | Function `.toString()` parsing + Proxy | Reflection + Bytecode + Caching (Enterprise benchmark) | **Physical Path Contract + Pure Closures + DAG Compilation** |
| **Bundler Compatibility** | Poor (breaks on pure AST type-erasure bundlers) | Good | Native JVM support | **Universal** (Pure ES Modules & closures; zero reflection) |
| **Initialization & Concurrency** | Serial pipeline; async providers block sequentially | Synchronous only | Strict single-thread serial assembly (JMM thread safety) | **Native DAG Topological Concurrency** (DFS post-order + Promise.all reactive stream) |
| **AOP Mechanism** | Complex & restricted to HTTP controller layers | None built-in | Declarative bytecode proxy (AspectJ) | **Complete Native AOP** (Zero extra concepts; pure DL & higher-order wrappers) |
| **Cycle Handling** | Deadlock hazard (`forwardRef` + async hangs) | Limited (Sync only) | Three-level cache unwinding | **DFS Fail-Fast Cycle Interception** (Strict compile-time detection with full trace) |
| **Edge / Serverless Performance** | High CPU overhead due to dynamic metadata reflection | Proxy traversal overhead | Heavy memory footprint | **Ultra-lightweight** (Two-stage separation, 80%+ lower CPU cost) |
| **Code Intrusion** | High (pervasive framework decorators) | Moderate (binds parameter names) | Low (supports JSR-330 standard) | **Zero** (Pure ES functions; runs completely independently) |

---

## Formal API Reference

### 1. `compileModuleGraph(modules)`

```typescript
export interface IOCModule {
  main: (container: any, moduleNames: string[]) => any | Promise<any>;
  dependencies?: string[] | ((moduleNames: string[]) => string[]);
  order?: number;
  skip?: boolean;
}

export interface CompiledModuleGraph {
  sortedKeys: string[];
  resolvedDepsMap: Record<string, string[]>;
  shortKeyToFullKeyMap: Record<string, string>;
  fullKeyToShortKeyMap: Record<string, string>;
  moduleMap: Record<string, IOCModule>;
}

export function compileModuleGraph(
  modules: { key: string; module: IOCModule }[]
): CompiledModuleGraph;
```

- **Algorithm & Complexity**: Time $O(V + E)$, Space $O(V + E)$ based on **DFS post-order traversal stack topological sorting**;
- **Fail-Fast Error Handling**: Throws descriptive errors with full cycle paths upon detecting cyclic dependencies, or on short-key collisions.

---

### 2. `instantiateModuleContainer(compiledGraph, container)`

```typescript
export function instantiateModuleContainer(
  compiledGraph: CompiledModuleGraph,
  container: Record<string, unknown>
): Promise<void>;
```

- **Execution Semantics**:
  - Iterates through `compiledGraph.sortedKeys` in validated topological order;
  - Mounts return values to both `container[fullKey]` and `container[shortKey]`;
  - Awaits asynchronous `main` promises before triggering dependent child nodes using memoized Promise streams.

---

### 3. `initialize(modules, container)`

```typescript
export function initialize(
  modules: { key: string; module: IOCModule }[],
  container: Record<string, unknown>
): Promise<void>;
```

Convenience utility combining `compileModuleGraph` and `instantiateModuleContainer`.

---

## Mesh Module Export Protocol

Every module located at `src/modules/**/index.ts` may export up to four standard identifiers:

| Identifier | Type Signature | Default | Description |
| :--- | :--- | :--- | :--- |
| **`main`** *(Required)* | `(container: ModularContainer, allModuleNames: string[]) => any \| Promise<any>` | - | Factory function invoked according to topological sort order. The second argument `allModuleNames` provides the full list of all declared physical module keys across the entire system; when performing dynamic module matching or AOP wrapping, you must explicitly filter it (e.g. `allModuleNames.filter(p => p.startsWith("/biz/"))`). |
| **`dependencies`** *(Optional)* | `string[] \| ((allModuleNames: string[]) => string[])` | `[]` | Explicit topological prerequisites. Use clean short names for static dependencies (e.g. `["logger", "db"]`). Supports dynamic filter functions for topological ordering. |
| **`order`** *(Optional)* | `number` | `99999` | Priority weight when no explicit topological dependencies constrain ordering. **Strictly ascending numerical order**: smaller numbers execute earlier (e.g., `order: 1` executes before `order: 10`, default `99999`). |
| **`skip`** *(Optional)* | `boolean` | `false` | Skips runtime execution of `main`. Used for externally injected modules (e.g. injecting `requestContext` in backend request isolation). **Note**: Even with `skip: true`, a dummy `main` function (e.g., `export const main = (): MyType => ({} as any)`) must still be exported to satisfy runtime graph validation and type generation. |

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026-present [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
