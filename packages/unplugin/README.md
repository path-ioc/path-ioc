<div align="center">
  <h1>@path-ioc/unplugin</h1>
  <p><b>Universal Dev Plugin for Path-IoC (Virtual Container & Type Generator)</b></p>
  <p>跨构建工具（Vite / Rolldown / Webpack / Rspack / Rollup / Esbuild）的通用虚拟模块注入与 TypeScript 类型自动推导插件</p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/unplugin"><img src="https://img.shields.io/npm/v/@path-ioc/unplugin.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/unplugin.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/powered%20by-Vite-646CFF?logo=vite&logoColor=white" alt="Vite"></a>
    <a href="https://rolldown.rs"><img src="https://img.shields.io/badge/Rolldown-ready-FF6B6B?logo=rust&logoColor=white" alt="Rolldown"></a>
    <a href="https://rspack.dev"><img src="https://img.shields.io/badge/Rspack-compatible-EE6338?logo=rspack&logoColor=white" alt="Rspack"></a>
    <a href="https://webpack.js.org"><img src="https://img.shields.io/badge/Webpack-5-8DD6F9?logo=webpack&logoColor=black" alt="Webpack"></a>
  </p>
</div>

> 💡 **核心定位**：`@path-ioc/unplugin` 是 [`@path-ioc/core`](../core) 的编译期伴生驱动引擎。在真实生产工程中，两者密不可分：`unplugin` 负责在构建期自动扫描物理目录并实时生成 `.d.ts` 类型推导，`core` 负责在运行时进行极速无锁 DAG 拓扑装配。  
> **完整的架构设计哲学、模块编写规范、依赖查找与端到端完整指南，请直接查阅：**  
> 📖 **[`@path-ioc/core` 官方指南](../core/README.md)** 或访问官方主站 **[https://path-ioc.dev](https://path-ioc.dev)**。

---

## 核心职能 (Key Responsibilities)

- **全构建器原生支持 (Universal Bundler Support)**：
  基于 `unplugin` 规范，一套逻辑原生适配 **Vite**、**Rolldown (Rust)**、**Webpack 5**、**Rspack**、**Rollup** 与 **Esbuild**。
- **`virtual:modular-container` 虚拟模块流式注入**：
  构建期自动扫描 `src/modules/**/index.{ts,tsx}`，动态生成全量模块注册表。在 Vite/Rolldown/Rollup 环境下纯内存流式注入，在 Webpack/Rspack 下自动创建临时代理桥接。
- **TypeScript 零配置类型合成**：
  开发时与 HMR 热更新时毫秒级生成 `ignore.modular.d.ts`，自动扩充全局 `ModularContainer` 接口，解构享 100% 准确 IDE 提示。
- **Git 规避自愈 (`.gitignore` 自动维护)**：
  自动向项目 `.gitignore` 补充 `ignore.*` 规则，防止生成的临时声明污染版本控制。

---

## 安装 (Installation)

```bash
pnpm add -D @path-ioc/unplugin
pnpm add @path-ioc/core
```

---

## 构建工具集成速查 (Bundler Quick Reference)

### 1. Vite (`vite.config.ts`)
```typescript
import { defineConfig } from "vite";
import { vitePlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc({ modulesPath: "src/modules", typeFileOutput: "types" })],
});
```

### 2. Rolldown (`rolldown.config.ts`)
```typescript
import { defineConfig } from "rolldown";
import { rolldownPlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc({ modulesPath: "src/modules", typeFileOutput: "types" })],
});
```

### 3. Rspack (`rspack.config.js`)
```javascript
const { rspackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [pathIoc()],
};
```

### 4. Webpack 5 (`webpack.config.js`)
```javascript
const { webpackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [pathIoc({ modulesPath: "src/modules" })],
};
```

### 5. Rollup (`rollup.config.js`) / Esbuild
```javascript
// Rollup
import { rollupPlugin as pathIoc } from "@path-ioc/unplugin";
// Esbuild
import { esbuildPlugin as pathIoc } from "@path-ioc/unplugin";
```

---

## 插件配置项 (Plugin Options)

| 配置项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 模块扫描的物理根目录路径。 |
| **`typeFileOutput`** | `string` | `'types'` | 自动生成的类型声明文件 `ignore.modular.d.ts` 存放相对目录。 |

---

## 真实应用与模块编写

关于如何编写 `main` 纯函数模块、声明依赖、在应用入口一行唤醒容器，请参阅：  
👉 **[查看 @path-ioc/core 完整实战指南](../core/README.md)**


---

## 许可证 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
