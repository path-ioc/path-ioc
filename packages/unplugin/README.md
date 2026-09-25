<div align="center">
  <h1>@path-ioc/unplugin</h1>
  <p><b>Compiler-Runtime Co-design Plugin for Path-IoC (Virtual Container & Type Synthesis)</b></p>
  <p>Cross-bundler virtual module injector & microsecond TypeScript type generator for Vite, Rolldown, Webpack 5, Rspack, Rollup, and Esbuild</p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/unplugin"><img src="https://img.shields.io/npm/v/@path-ioc/unplugin.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/unplugin.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/powered%20by-Vite-646CFF?logo=vite&logoColor=white" alt="Vite"></a>
    <a href="https://rolldown.rs"><img src="https://img.shields.io/badge/Rolldown-ready-FF6B6B?logo=rust&logoColor=white" alt="Rolldown"></a>
    <a href="https://rspack.dev"><img src="https://img.shields.io/badge/Rspack-compatible-EE6338?logo=rspack&logoColor=white" alt="Rspack"></a>
    <a href="https://webpack.js.org"><img src="https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack&logoColor=black" alt="Webpack"></a>
  </p>

  <p>
    <b>English</b> | <a href="./README.zh-CN.md">简体中文</a> | <a href="https://path-ioc.dev/api/unplugin">Official Docs</a>
  </p>
</div>

> 💡 **Architectural Positioning: Compiler-Runtime Co-design**  
> `@path-ioc/unplugin` is not a mere convenience helper; it is the compiler-side twin intimately coupled with [`@path-ioc/core`](../core/README.md), forming the bedrock of Path-IoC's **Compiler-Runtime Co-design** philosophy.  
> In modern TypeScript development, relying on runtime reflection (`reflect-metadata`) causes bundling failures, cold-start latency, and lack of true static type awareness. `@path-ioc/unplugin` shifts module scanning, DAG topological caching, and type synthesis to the build phase, enabling sub-millisecond hot-reloading and **21.2 µs** per-request container ignition for the [`@path-ioc/core`](../core/README.md) runtime.  
> 📖 **For module authoring specifications, pure function factories, and end-to-end guides, see: [`@path-ioc/core` Official Guide](../core/README.md)** or visit the official documentation at **[https://path-ioc.dev/](https://path-ioc.dev/)**.

---

## Live Demo & Instant Ignition (Live Demo Video)

<div align="center">
  <video src="https://cdn.path-ioc.dev/path-ioc/demo-en.mp4" controls width="100%" playsinline>
    Your browser does not support the video tag. <a href="https://cdn.path-ioc.dev/path-ioc/demo-en.mp4">Watch Live Demo Video</a>
  </video>
  <p>⚡ <b><a href="https://cdn.path-ioc.dev/path-ioc/demo-en.mp4">Watch Live Architecture Tour: Real-time Coding, Topological Orchestration & Instant Ignition</a></b></p>
</div>

---

## Key Pillars of Compiler-Runtime Co-design

### 1. Single-Graph Compile Cache Closure (`compiledGraph`)
Inside the generated `virtual:modular-container`, `@path-ioc/unplugin` maintains a module-level closure that holds the pre-compiled `compiledGraph`:
- **One-Time Cold Boot**: The entire application's dependency DAG is parsed, validated, and sorted once at process startup (500 nodes compile in just **1.72 ms**);
- **Ultra-Fast Request Ignition**: Every invocation of `createModularContainer()` reuses the cached immutable graph, hydrating an isolated container in just **21.2 microseconds (µs)**;
- **Zero Runtime DAG Recomputation**: In high-concurrency environments (Cloudflare Workers, Hono, Node.js), incoming HTTP requests suffer zero latency penalty from graph reconstruction.

### 2. Microsecond AST Real-Time Type Synthesis (`0.04 ms`)
During development and Hot Module Replacement (HMR), the plugin's background AST scanner detects file changes and generates `types/ignore.modular.d.ts` in **0.04 milliseconds**:
- Augments the global `ModularContainer` interface with zero manual boilerplate;
- Developers write `const { db, logger } = container;` and instantly enjoy 100% accurate IDE auto-completion and type checking;
- Safely manages ephemeral declaration files with automatic `.gitignore` self-healing.

### 3. Clear Host Ignition Boundary
Traditional frameworks force business code to adapt to proprietary application classes and controller decorators. With `@path-ioc/unplugin`, the host only ignites the container:
```typescript
import { createModularContainer } from "virtual:modular-container";

// One-line host ignition (Hono, Express, Koa, Workers, Next.js API, CLI)
const container = await createModularContainer();
```
Business modules circulate 100% autonomously within the mesh, completely decoupled from the host environment.

---

## Universal Bundler Integration

### 1. Installation

```bash
pnpm add -D @path-ioc/unplugin
pnpm add @path-ioc/core
```

### 2. Bundler Configuration Quick Reference

#### Vite (`vite.config.ts`)
```typescript
import { defineConfig } from "vite";
import { vitePlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc()],
});
```

#### Rolldown (`rolldown.config.ts`)
```typescript
import { defineConfig } from "rolldown";
import { rolldownPlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc()],
});
```

#### Rspack (`rspack.config.js`)
```javascript
const { rspackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [pathIoc()],
};
```

#### Webpack 5 (`webpack.config.js`)
```javascript
const { webpackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [pathIoc()],
};
```

#### Rollup (`rollup.config.js`) & Esbuild
```javascript
// Rollup
import { rollupPlugin as pathIoc } from "@path-ioc/unplugin";

// Esbuild
import { esbuildPlugin as pathIoc } from "@path-ioc/unplugin";
```

> **Zero-Configuration by Default**: All bundler plugins fully support zero-argument `pathIoc()` invocation. If your project uses custom directories, override them as needed:
> ```typescript
> pathIoc({
>   modulesPath: "src/modules",   // Custom module root directory (default: "src/modules")
>   typeFileOutput: "types",     // Custom type declaration output directory (default: "types")
> })
> ```

---

## Plugin Options (`PathIocPluginOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | Root directory scanned for modular IoC entrypoints (`index.ts/tsx`). |
| **`typeFileOutput`** | `string` | `'types'` | Target directory where `ignore.modular.d.ts` is generated. |

---

## Virtual Module (`virtual:modular-container`)

The plugin injects `virtual:modular-container` into your application at build time:

```typescript
import {
  modules,                 // Complete module descriptor array: { key: string, module: IOCModule }[]
  createModularContainer,  // High-performance container bootstrapper: (targetContainer?: Record<string, any>) => Promise<ModularContainer>
} from "virtual:modular-container";
```

### Serverless / Hono Production Example (Request Isolation)

```typescript
import { Hono } from "hono";
import { createModularContainer } from "virtual:modular-container";
import { memoizeModule } from "@path-ioc/core";

const app = new Hono<{ Bindings: { DB_URL: string } }>();

app.use("*", async (c, next) => {
  // 1. Instant container ignition: single-graph cache (only 21.2µs)
  const container = await createModularContainer();

  // 2. Safe infrastructure singleton memoization
  memoizeModule(container, "dbPool", () => createPostgresPool(c.env.DB_URL));

  // 3. Dynamic injection of per-request multi-tenant context
  container.$inject("requestContext", {
    requestId: c.req.header("x-request-id") || crypto.randomUUID(),
  });

  c.set("ioc", container);
  await next();
});
```

---

## Module Authoring & Core Runtime Guide

`@path-ioc/unplugin` focuses on compile-time automated scanning, type synthesis, and single-graph cache injection. For authoring `main` pure-function closures, declaring Mesh dependencies, and leveraging IoC-DL and AOP aspects, please refer directly to:  
👉 **[Read the `@path-ioc/core` Architectural & Practical Guide](../core/README.md)** or visit the official documentation at **[https://path-ioc.dev/](https://path-ioc.dev/)**.

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026-present [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
