# Migration from lianhanlin-modular

This guide describes how to upgrade projects using the legacy `lianhanlin-modular` prototype to the official `@path-ioc/*` ecosystem.

---

## 1. Architecture Evolution & Package Decoupling

`lianhanlin-modular` was the initial monolithic prototype. To achieve microsecond throughput, minimize bundle size, and decouple bundler compiler dependencies, the architecture was refactored into dedicated `@path-ioc/*` scoped packages:

| Legacy Feature | Modern Scoped Package | Description |
| :--- | :--- | :--- |
| Dependency lookup & topological runtime | **`@path-ioc/core`** | **Runtime Required**. Microsecond lock-free engine |
| Vite / Webpack / Rollup compiler plugins | **`@path-ioc/unplugin`** | **Dev Dependency**. Universal bundler adapter |
| Synchronous getter lazy loading POC | **`@path-ioc/container`** | **Experimental**. Not recommended for production, used for benchmark comparison |
| Mesh module standalone npm packaging | **`@path-ioc/pack`** | **Optional**. Packages module directories into distributable npm packages |

---

## 2. Dependency Changes

Run the following in your project root:

```bash
# 1. Remove legacy monolithic package
pnpm remove lianhanlin-modular

# 2. Install core runtime and compiler adapter
pnpm add @path-ioc/core
pnpm add -D @path-ioc/unplugin
```

*(If you are using npm or yarn, simply substitute with your package manager).*

---

## 3. Bundler Configuration Updates

### Vite (`vite.config.ts`)

Replace the legacy plugin with `@path-ioc/unplugin`:

```diff
  import { defineConfig } from "vite";
- import modularType from "lianhanlin-modular/plugin-vite";
+ import pathIoc from "@path-ioc/unplugin";

  export default defineConfig({
    plugins: [
-     modularType({ typeFileOutput: "types" }),
+     pathIoc.vite({
+       modulesPath: "src/modules", // Module directory, default: "src/modules"
+       typeFileOutput: "types",    // Output directory, default: "types"
+     }),
    ],
  });
```

### Webpack (`webpack.config.js`)

```diff
- const { ModularWebpackPlugin } = require("lianhanlin-modular/webpack");
+ const { webpackPlugin: pathIoc } = require("@path-ioc/unplugin");

  module.exports = {
    plugins: [
-     new ModularWebpackPlugin(),
+     pathIoc({
+       modulesPath: "src/modules",
+       typeFileOutput: "types",
+     }),
    ],
  };
```

---

## 4. Container Bootstrap Adaptation

Import the `initialize` bootstrap function from `@path-ioc/core`:

```diff
  import { container } from "./container";
  import { modules } from "virtual:modular-container";
- import { initialize } from "lianhanlin-modular";
+ import { initialize } from "@path-ioc/core";

  initialize(modules, container);
```

---

## 5. Dynamic Dependency Filtering: Standard Array APIs

Legacy helper utilities like `getModuleNameByPrefix` or `getModuleDeclarations` are deprecated. Because `moduleDeclarationNames` is a standard `string[]` array, use native JavaScript array methods directly:

```diff
- import { getModuleNameByPrefix } from "lianhanlin-modular";

  export const dependencies = (moduleNames: string[]) => {
    return [
-     ...getModuleNameByPrefix(moduleNames, "/plugins/"),
+     ...moduleNames.filter((name) => name.startsWith("/plugins/")),
      "configService",
    ];
  };
```

---

## 6. Physical Registry Bundling Migration (@path-ioc/pack)

If your project utilizes **Mesh Registry Bundling (`Modular Pack`)**—generating a physical entry file by scanning all Mesh modules (common in micro-frontend sub-app distribution, cross-monorepo component libraries, static pre-compilation, or AST obfuscation workflows)—this capability is now provided by the dedicated official plugin **`@path-ioc/pack`**.

### 1. Install Pack Plugin
```bash
pnpm add -D @path-ioc/pack
```

### 2. Configure `modularPackPlugin` (Dedicated Config Recommended)

> [!WARNING]
> Because `@path-ioc/pack` overrides the build pipeline (enforces `build.lib`, sets `outDir` to `dist-plugin`, and triggers `npm pack` on `closeBundle`), **do not attach it unconditionally to your standard application `vite.config.ts`**. Projects should control activation based on their build pipeline needs.

**Recommended Pattern: Create a dedicated `vite.config.pack.ts`**:
```typescript
// vite.config.pack.ts
import { defineConfig } from "vite";
import { modularPackPlugin } from "@path-ioc/pack";

export default defineConfig({
  plugins: [
    modularPackPlugin({
      modulesPath: "src/modules", // Module scan directory, default: "src/modules"
      // entryFile: "node_modules/.path-ioc/.modular-plugin-entry.ts", // Optional custom entry path
    }),
  ],
});
```

Configure a dedicated script in `package.json`:
```json
{
  "scripts": {
    "build": "vite build",
    "build:pack": "vite build --config vite.config.pack.ts"
  }
}
```
*(Alternatively, conditionally load it in `vite.config.ts` using custom environment variables, e.g., `process.env.BUILD_TARGET === 'pack'`)*

### 3. Generated Physical Entry Specifications
- Default output location: `node_modules/.path-ioc/.modular-plugin-entry.ts`;
- Automatically collates all discovered modules and exports a runtime registry array:
  ```typescript
  export const modules = [
    { key: "/auth/userService", module: module_0 },
    // ...
  ];
  ```
- This physical file can be directly supplied as a build `input` in distribution scripts, micro-frontend sub-bundle entries, or Rollup pipelines.

---

## 7. Business Code Conventions (100% Preserved)

Existing business logic and patterns remain completely backward compatible:

1. **`main` Export**: Modules continue exporting `export const main = () => ...;`;
2. **Zero Cross-Module Imports**: Strict avoidance of relative imports preserves AOP interception contracts;
3. **In-Body Destructuring**:
   ```tsx
   export const UserService = () => {
     const { apiClient, cacheService } = modularContainer;
     // ...
   };
   ```

---

## 8. Migration Checklist

- [ ] Remove `lianhanlin-modular` and install `@path-ioc/core` & `@path-ioc/unplugin`;
- [ ] Update bundler configuration to import from `@path-ioc/unplugin`;
- [ ] Update container bootstrap `initialize` import to `@path-ioc/core`;
- [ ] Replace any legacy helper functions with native `.filter(...)` / `.startsWith(...)`;
- [ ] (If using registry bundling) Install `@path-ioc/pack` and configure `modularPackPlugin`;
- [ ] Start dev server and verify `ignore.modular.d.ts` generates cleanly.

