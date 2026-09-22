<div align="center">
  <h1>@path-ioc/pack</h1>
  <p><b>Mesh Registry Distribution Bundler for Path-IoC</b></p>
  <p>Physical bundling and publishing plugin designed for microfrontends, component distribution, and Mesh registry architectures</p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/pack"><img src="https://img.shields.io/npm/v/@path-ioc/pack.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/pack.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/powered%20by-Vite-646CFF?logo=vite&logoColor=white" alt="Vite"></a>
  </p>

  <p>
    <b>English</b> | <a href="./README.zh-CN.md">简体中文</a> | <a href="https://path-ioc.dev/api/pack">Official Docs</a>
  </p>
</div>

---

## Features

- **Physical Entrypoint Generation**:
  During Vite builds, automatically scans `src/modules` for physical directories containing `index.ts/tsx` and synthesizes clean on-disk entrypoints (default `.modular-plugin-entry.ts`).
- **Full Mesh Registry & Type Exports**:
  Generates unified module import aliases and exports the canonical runtime module registry array `modules`:
  ```typescript
  export const modules = [
    { key: "/math/add", module: _Modular_Mod_0 },
    { key: "/math/isEven", module: _Modular_Mod_1 },
  ];
  ```
- **Static Type Mapping Extraction (`sharedMappings`)**:
  Fills `sharedMappings` and `sharedContainerMappings` to provide accurate type descriptions for cross-package SDKs or microfrontend mesh topologies.
- **Physical Isolation & Bundler Obfuscation Compatibility**:
  Generated physical entrypoint files integrate seamlessly into standard npm packaging pipelines, fully compatible with downstream AST transformers and code protection tools.

---

## Installation

```bash
pnpm add -D @path-ioc/pack
# or
npm install -D @path-ioc/pack
```

---

## Quick Start

### Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from "vite";
import { modularPackPlugin } from "@path-ioc/pack";

const sharedMappings: string[] = [];
const sharedContainerMappings: string[] = [];

export default defineConfig({
  plugins: [
    modularPackPlugin({
      modulesPath: "src/modules",
      // Optional: Custom on-disk entrypoint path (default: node_modules/.path-ioc/.modular-plugin-entry.ts)
      entryFile: "node_modules/.path-ioc/.modular-plugin-entry.ts",
      sharedMappings,
      sharedContainerMappings,
    }),
  ],
});
```

---

## Configuration Options (`PackPluginOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | Root directory scanned for modular IoC entrypoints. |
| **`entryFile`** | `string` | `'node_modules/.path-ioc/.modular-plugin-entry.ts'` | Target physical path for the generated entrypoint file. |
| **`sharedMappings`** | `string[]` | `[]` *(optional)* | Reference to an array that receives generated type mapping strings. |
| **`sharedContainerMappings`** | `string[]` | `[]` *(optional)* | Reference to an array that receives generated container type mapping strings. |

---

## Exported API

```typescript
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";
```

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026-present [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
