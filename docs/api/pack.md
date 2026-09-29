# @path-ioc/pack API Reference

`@path-ioc/pack` is a dedicated Vite build plugin designed to bundle a module directory into a **distributable standalone npm package / component library**.

> 💡 **Architectural Positioning & Usage Advice**: `@path-ioc/pack` automatically intercepts and configures Vite into Library Mode (`build.lib`), generating `package.json`, `index.d.ts`, and a distribution-ready npm tarball (`.tgz`) upon build completion. **It is recommended to invoke this in a dedicated packaging config (e.g., `vite.config.pack.ts`) or via custom environment variables/scripts, rather than unconditionally embedding it in a standard frontend application build.**

---

## Core Capabilities
 
- **Physical Entrypoint Generation**: Scans `src/modules` and writes a clean physical aggregation entry file (default `.modular-plugin-entry.ts`, automatically cleaned up after build);
- **Full TypeScript Declaration Bundling (`dts`)**: Integrated declaration compiler that emits real `.d.ts` files for all exported modules under `${outDir}/src` alongside `${outDir}/index.d.ts`, guaranteeing lossless type inference in downstream packages;
- **Registry Export**: Exports standard `modules` registry arrays and TypeScript mappings for host applications to load or merge;
- **Built-in Obfuscation Protection**: Integrates `javascript-obfuscator` during the `closeBundle` lifecycle by default (can be disabled via `MODULAR_OBFUSCATE=false`);
- **Automated Packaging**: Generates package-ready metadata (`package.json`, complete file manifests) and executes `npm pack` in the output directory automatically.

---

## Configuration Options (`PackPluginOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | Root directory to scan for modules. |
| **`entryFile`** | `string` | `'.modular-plugin-entry.ts'` | Destination for the temporary physical entrypoint (cleaned up after build; add to `.gitignore`). |
| **`outDir`** | `string` | `'dist-plugin'` | Output directory for the packaged library bundle and npm tarball. |
| **`dts`** | `boolean` | `true` | Whether to compile `.d.ts` declaration files for all exported modules. |
| **`tsconfigPath`** | `string` | `undefined` *(Optional)* | Custom tsconfig path for declaration emit. Defaults to `tsconfig.app.json` or `tsconfig.json`. |
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
      // dts: true, // Enabled by default for complete type emission
    }),
  ],
});
```
