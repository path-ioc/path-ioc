# @path-ioc/unplugin API 规范

`@path-ioc/unplugin` 是构建期专用插件，支持在构建或开发热更新（HMR）期间自动扫描模块目录、生成 `ignore.modular.d.ts` 类型声明文件，并通过虚拟模块 `virtual:modular-container` 注入全量模块注册表。

---

## 安装

```bash
pnpm add -D @path-ioc/unplugin
```

---

## 插件导出与适配器

支持通过通用入口或特定构建器专用入口导入：

```typescript
// 通用工厂入口
import pathIoc from "@path-ioc/unplugin";

// 或命名构建器专用导出
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

## 配置选项 (`PathIocPluginOptions`)

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 业务模块存放的物理根路径。插件会自动扫描该目录下所有的 `index.ts` / `index.tsx` 文件。 |
| **`typeFileOutput`** | `string` | `'types'` | 自动生成的类型声明文件 `ignore.modular.d.ts` 存放目录。建议配置在 `.gitignore` 中。 |

---

## 虚拟模块 (`virtual:modular-container`)

构建插件在运行时动态提供以下命名导出：

```typescript
import {
  modules,                 // 全量模块描述数组: { key: string, module: IOCModule }[]
  createModularContainer,  // 高性能实例化入口: (targetContainer?: Record<string, any>) => Promise<ModularContainer>
} from "virtual:modular-container";
```

- **单图编译缓存**：`createModularContainer` 内部闭包缓存了 `compiledGraph`。静态依赖图只在进程冷启动时编译一次，后续高并发场景下成千上万个请求调用 `createModularContainer(reqContainer)` 时直接复用静态图，仅需约 21.2µs 即可完成请求级上下文隔离填充；
- **Vite / Rolldown / Rollup 环境**：通过虚拟模块机制向内存动态提供模块注册表代码，无需在磁盘生成临时入口构建文件；
- **Webpack 5 / Rspack 环境**：自动在 `node_modules/.virtual-modular-container.js` 生成临时桥接文件，完美兼容 Webpack 模块图解析。
