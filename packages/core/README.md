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
> Say goodbye to explicit `import` hell and the deadlocks, reflection penalties, and metadata bloat of legacy DI containers in asynchronous JavaScript. Path-IoC adopts the **Dependency Lookup (IoC-DL)** paradigm: physical file paths serve as abstract contracts, static topology graphs are compiled once, and modules awaken through native `async/await` DAG concurrency. Zero decorators, zero `reflect-metadata`, and zero framework intrusion.

---

## Quick Start

In production applications, `@path-ioc/core` works in tandem with the compiler plugin `@path-ioc/unplugin` (Compiler-Runtime Co-design).

### 1. Install Runtime & Bundler Plugin

```bash
# Runtime Core
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
// If using Rolldown: import { rolldownPlugin as pathIoc } from "@path-ioc/unplugin";

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

### 3. Create Business Modules (Zero imports; Physical Paths as Contracts)

Create module directories inside `src/modules` and export a pure `main` function:

```typescript
// src/modules/infra/db/index.ts
export const main = () => {
  return {
    query: (sql: string) => `Executed: ${sql}`,
  };
};

// src/modules/biz/user/index.ts
export const dependencies = ["db"]; // Declare forward dependencies

export const main = (container: any) => {
  const { db } = container; // Dependency Lookup (DL), guaranteed resolved by DAG topological scheduler
  return {
    getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
  };
};
```

### 4. Create App Bootstrap Module (`src/modules/start-app/index.ts`)

```typescript
// Everything is a module: Bootstrap logic stays within the IoC container,
// guaranteeing AOP aspect interception and topological readiness.
export const main = (container: any) => {
  const { user } = container;
  console.log(user.getUser("1001"));
};

export const dependencies = ["user"];
```

### 5. Ignite the Container (`src/main.ts`)

In your application entrypoint (e.g. `src/main.ts`), ignite the lock-free topological engine with a single line:

```typescript
// src/main.ts
import { createModularContainer } from "virtual:modular-container";

// Pure ignite: zero business logic contamination
createModularContainer();
```

The plugin automatically generates `ignore.modular.d.ts` in the background, providing 100% static type safety and intelligent IDE autocompletion!

---

### 6. Standalone / Pure Node.js & Testing Mode

When writing isolated unit tests, CLI scripts, or running without a bundler, you can directly invoke the pure function runtime of `@path-ioc/core`:

```typescript
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

// 1. Explicitly define modules (declaring dependencies via keys / short-keys)
const modules = [
  { key: "/infra/db", module: { main: () => "PostgreSQL Connection" } },
  {
    key: "/biz/userService",
    module: {
      dependencies: ["db"],
      main: (c) => ({ db: c.db, getUser: (id: string) => `User ${id}` }),
    },
  },
];

// 2. Synchronous topology graph compilation (sub-millisecond)
const compiledGraph = compileModuleGraph(modules);

// 3. Instantiate and populate container
const container: Record<string, unknown> = {};
await instantiateModuleContainer(compiledGraph, container);

console.log(container.userService.getUser("1001"));
```

---

## Core Architecture & Philosophy

Path-IoC pays deep homage to **Java Spring's classic Inversion-of-Control (IoC) principles**, while advancing its decoupled vision natively for JavaScript/TypeScript's single-threaded, asynchronous, and functional execution model:

### 1. The Dynamic Language Paradigm: Native DAG Topological Concurrency
- **Mirroring Physical Models (Multi-threaded Serial vs. Single-threaded Concurrent)**:  
  In Java, despite OS-level multi-threading, Spring must strictly fall back to a **serial pipeline** during container initialization to avoid race conditions, memory visibility bugs (JMM), and thread deadlocks during bean creation.
- **Embracing JavaScript's Strengths**:  
  JavaScript's single-threaded Event Loop **naturally eliminates shared-memory data races and lock deadlocks**. Path-IoC leverages this advantage by building a **reactive Directed Acyclic Graph (DAG)** with native `async/await`, activating all independent nodes in the same topological tier in **parallel/concurrent batches**. This bypasses single-thread queuing bottlenecks while fully exploiting non-blocking I/O throughput.

### 2. Path as Contract (Dependency Inversion Principle)
- **Strings are Interfaces**: Whether Java's `interface UserData`, `Class.forName("com.xxx.UserService")`, or Path-IoC's physical path coordinates, both decouple clients by **depending upon abstractions rather than concrete implementations** (true DIP).
- **Physical Features as Service Discovery**: File paths provide natural coordinates for service discovery. For instance, filtering by `name.includes("/entity/orm/")` allows dynamic, zero-configuration discovery of all ORM entity modules.

### 3. Aspect-Oriented Programming (AOP) via Pure Closures
- **Zero Framework Primitives**: Path-IoC avoids heavy specialized abstractions (`Guards`, `Interceptors`, `Pipes`, `Filters`, or JVM byte-code manipulation). In dynamic languages, higher-order functions and proxy wrappers represent the purest form of AOP.
- **Natural Aspect Meshes**: An aspect module simply declares dependencies matching the path patterns of target modules. The topological engine guarantees target instances are created first; the aspect then wraps target methods via higher-order proxies without intrusive annotations.

### 4. Circular Dependency & Fail-Fast Engineering
- **Theory of Dependency Sensing**: Dynamic dependency resolution and circular dependency unwinding are two perspectives of the same underlying mechanism. While dynamic resolution can break cycles, it frequently conceals architecture rot and breaks native `async` DAG preheating.
- **Core's Standpoint**: `@path-ioc/core` remains strictly rigorous—DFS static cycle analysis enforces **Fail-Fast** error reporting with full cycle chain traces. (For legacy synchronous cycles, the companion `@path-ioc/container` provides a Turbo mode with dynamic getter proxies).

### 5. Two-Stage Execution & Edge Serverless Readiness
By completely eliminating `reflect-metadata`, Path-IoC cleanly separates **Static Graph Compilation (`compileModuleGraph`)** from **Dynamic Container Instantiation (`instantiateModuleContainer`)**. In Cloudflare Workers or serverless Node.js endpoints, the module graph is compiled once on worker cold-start and permanently cached; subsequent requests instantiate lightweight containers directly, reducing framework CPU overhead by over 80%.

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

| Comparison Dimension | **TS Decorator Stack**<br>(NestJS / Inversify / TSyringe) | **Regex Proxy Stack**<br>(Awilix) | **JVM Reflection Stack**<br>(Java Spring) | **@path-ioc/core** *(with container)* |
| :--- | :--- | :--- | :--- | :--- |
| **Core Contract** | `reflect-metadata` + TS Decorators | Function `.toString()` parsing + Proxy | Reflection + Bytecode + Caching (Enterprise benchmark) | **Physical Path Contract + Pure Closures + DAG Compilation** |
| **Bundler Compatibility** | Poor (breaks on pure AST type-erasure bundlers) | Good | Native JVM support | **Universal** (Pure ES Modules & closures; zero reflection) |
| **Initialization & Concurrency** | Serial pipeline; async providers block sequentially | Synchronous only | Strict single-thread serial assembly (JMM thread safety) | **Native DAG Topological Concurrency** (Lock-free cascading activation) |
| **AOP Mechanism** | Complex & restricted to HTTP controller layers | None built-in | Declarative bytecode proxy (AspectJ) | **Complete Native AOP** (Zero extra concepts; pure DL & higher-order wrappers) |
| **Cycle Handling** | Deadlock hazard (`forwardRef` + async hangs) | Limited (Sync only) | Three-level cache unwinding | **Fail-Fast Cycle Interception** (Turbo mode available for legacy sync graphs) |
| **Edge / Serverless Performance** | High CPU overhead due to dynamic metadata reflection | Proxy traversal overhead | Heavy memory footprint | **Ultra-lightweight** (Two-stage separation, 80%+ lower CPU cost) |
| **Code Intrusion** | High (pervasive framework decorators) | Moderate (binds parameter names) | Low (supports JSR-330 standard) | **Zero** (Pure ES functions; runs completely independently) |

---

## Formal API Reference

### 1. `compileModuleGraph`

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

- **Complexity**: Time $O(V + E)$, Space $O(V + E)$ (Kahn's Topological Algorithm);
- **Fail-Fast Error Handling**: Throws descriptive errors with full cycle paths upon detecting cyclic dependencies, or on short-key collisions.

### 2. `instantiateModuleContainer`

```typescript
export function instantiateModuleContainer(
  compiledGraph: CompiledModuleGraph,
  container: Record<string, unknown>
): Promise<void>;
```

- **Execution Semantics**:
  - Iterates through `compiledGraph.sortedKeys` in validated topological order;
  - Mounts return values to both `container[fullKey]` and `container[shortKey]`;
  - Awaits asynchronous `main` promises before triggering dependent child nodes.

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026-present [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
