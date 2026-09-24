# @path-ioc/pack API Reference

`@path-ioc/pack` is a dedicated Vite build plugin designed to bundle a module directory into a **distributable standalone npm package / component library**.

> 💡 **Architectural Positioning & Usage Advice**: `@path-ioc/pack` automatically intercepts and configures Vite into Library Mode (`build.lib`), generating `package.json`, `index.d.ts`, and a distribution-ready npm tarball (`.tgz`) upon build completion. **It is recommended to invoke this in a dedicated packaging config (e.g., `vite.config.pack.ts`) or via custom environment variables/scripts, rather than unconditionally embedding it in a standard frontend application build.**

---

## Core Capabilities

- **Physical Entrypoint Generation**: Scans `src/modules` and writes a clean physical aggregation entry file (`.modular-plugin-entry.ts`);
- **Registry Export**: Exports standard `modules` registry arrays and TypeScript mappings for host applications to load or merge;
- **Built-in Obfuscation Protection**: Integrates `javascript-obfuscator` during the `closeBundle` lifecycle by default (can be disabled via `MODULAR_OBFUSCATE=false`);
- **Automated Packaging**: Generates package-ready metadata and executes `npm pack` in the output directory automatically.

---

## Configuration Options (`PackPluginOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | Root directory to scan for modules. |
| **`entryFile`** | `string` | `'node_modules/.path-ioc/.modular-plugin-entry.ts'` | Destination for the generated physical entrypoint. |
| **`outDir`** | `string` | `'dist-plugin'` | Output directory for the packaged library bundle and npm tarball. |
| **`sharedMappings`** | `string[]` | `[]` *(Optional)* | Array reference populated with generated type mappings. |
| **`sharedContainerMappings`** | `string[]` | `[]` *(Optional)* | Array reference populated with container type mappings. |

---

## Plugin Export & Usage Example

```typescript
import { defineConfig } from "vite";
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";

// Recommended in a dedicated pack configuration (e.g. vite.config.pack.ts):
export default defineConfig({
  plugins: [
    modularPackPlugin({
      modulesPath: "src/modules",
      outDir: "dist-plugin",
    }),
  ],
});
```
