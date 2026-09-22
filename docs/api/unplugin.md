# @path-ioc/unplugin API Reference

`@path-ioc/unplugin` is a universal build-time plugin. During build and Hot Module Replacement (HMR), it automatically scans module directories, generates `ignore.modular.d.ts` type declarations, and injects the global module registry via the virtual module `virtual:modular-container`.

---

## Installation

```bash
pnpm add -D @path-ioc/unplugin
```

---

## Bundler Adapters

Import via universal default export or named bundler factory functions:

```typescript
// Universal entry
import pathIoc from "@path-ioc/unplugin";

// Or specific named bundler adapters
import {
  vitePlugin,
  rolldownPlugin,
  webpackPlugin,
  rspackPlugin,
  rollupPlugin,
  esbuildPlugin,
} from "@path-ioc/unplugin";
```

---

## Configuration Options (`PathIocPluginOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | Root directory to scan for modules containing `index.ts` or `index.tsx`. |
| **`typeFileOutput`** | `string` | `'types'` | Destination directory for auto-generated `ignore.modular.d.ts`. Add to `.gitignore`. |

---

## Virtual Module (`virtual:modular-container`)

The plugin injects the virtual module `virtual:modular-container` into your application at build time:

```typescript
import {
  modules,                 // Complete module descriptor array: { key: string, module: IOCModule }[]
  createModularContainer,  // Convenience bootstrapper: (targetContainer?) => Promise<ModularContainer>
} from "virtual:modular-container";
```

- **Vite / Rolldown / Rollup**: Memory-streamed virtual module injection with zero physical disk I/O.
- **Webpack 5 / Rspack**: Automatically creates a bridge file at `node_modules/.virtual-modular-container.js` to ensure 100% compatibility with Webpack module resolution.
