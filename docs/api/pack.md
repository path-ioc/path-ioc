# @path-ioc/pack API Reference

`@path-ioc/pack` is a specialized build-time bundler plugin designed for micro-frontends, shared mesh registries, and physical package distribution.

---

## Core Capabilities

- **Physical Entrypoint Generation**: Scans `src/modules` and writes a clean physical entry file (`.modular-plugin-entry.ts`) for standard npm bundling.
- **Cross-Application Mesh Distribution**: Exports standard `modules` registry arrays and TypeScript mappings for dynamic topological merging across separate monorepos.
- **Obfuscation Compatibility**: Produced entrypoints can be fed directly into code obfuscation tools (e.g., `javascript-obfuscator`) without breaking container resolution.

---

## Configuration Options (`PackPluginOptions`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | Root directory to scan for modules. |
| **`entryFile`** | `string` | `'node_modules/.path-ioc/.modular-plugin-entry.ts'` | Destination for the generated physical entrypoint. |
| **`sharedMappings`** | `string[]` | `[]` *(Optional)* | Array reference populated with generated type mappings. |
| **`sharedContainerMappings`** | `string[]` | `[]` *(Optional)* | Array reference populated with container type mappings. |

---

## Plugin Export

```typescript
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";
```
