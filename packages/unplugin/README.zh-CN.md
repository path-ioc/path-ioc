<div align="center">
  <h1>@path-ioc/unplugin</h1>
  <p><b>Compiler-Runtime Co-design Plugin for Path-IoC (Virtual Container & Type Synthesis)</b></p>
  <p>跨构建工具（Vite / Rolldown / Webpack / Rspack / Rollup / Esbuild）的通用虚拟模块注入与微秒级 TypeScript 类型自动推导插件</p>

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
    <a href="./README.md">English</a> | <b>简体中文</b> | <a href="https://path-ioc.dev/zh/api/unplugin">官方文档</a>
  </p>
</div>

> 💡 **核心定位：编译器-运行时协同设计 (Compiler-Runtime Co-design)**  
> `@path-ioc/unplugin` 绝非单纯的“自动化辅助小工具”，它是与 [`@path-ioc/core`](../core/README.zh-CN.md) 密不可分的编译期双子星，共同构成 Path-IoC **编译器-运行时协同设计 (Compiler-Runtime Co-design)** 的核心基石。  
> 传统 TS IoC 方案将模块发现与元数据反射全部推迟到运行时执行，导致现代转译器类型擦除崩溃与边缘冷启动超时。`@path-ioc/unplugin` 将目录扫描、拓扑编译缓存与类型合成前置至编译期，为 [`@path-ioc/core`](../core/README.zh-CN.md) 运行时提供亚毫秒级热更新与每请求仅需 **21.2 µs** 的极致点火性能。  
> 📖 **模块编写规范、纯函数工厂与端到端进阶指南，请直接参阅：[`@path-ioc/core` 官方指南](../core/README.zh-CN.md)** 或访问官方主站 **[https://path-ioc.dev/zh/](https://path-ioc.dev/zh/)**。

---

## 实机编码与极速点火演示录屏 (Live Demo Video)

<div align="center">
  <video src="https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4" controls width="100%" playsinline>
    您的浏览器不支持 HTML5 视频播放。<a href="https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4">点击查看实机演示视频</a>
  </video>
  <p>⚡ <b><a href="https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4">点击查看实机架构漫游：实时编码、拓扑依赖编排与极速容器点火</a></b></p>
</div>

---

## 编译器-运行时协同三大支柱

### 1. 单图编译缓存闭包 (`compiledGraph`)
在插件自动生成的 `virtual:modular-container` 内部，维护了模块级闭包变量 `compiledGraph`：
- **进程冷启动仅编译一次**：应用的依赖 DAG 图在进程冷启动时仅进行一次静态拓扑分析与环路深搜（500 节点仅需 **1.72 ms**）；
- **请求级极致微秒点火**：后续所有 `createModularContainer()` 调用均直接复用该闭包静态图，实例化隔离容器仅耗时 **21.2 微秒 (µs)**；
- **消除运行时重复构建开销**：在高并发场景（如 Cloudflare Workers、Node.js 服务端），彻底杜绝重复解析依赖树的 CPU 浪费。

### 2. 零负担微秒级 AST 实时类型推导 (`0.04 ms`)
开发态与 HMR 热更新期间，插件的 AST 监听器在开发者每次保存代码瞬间触发，耗时仅 **0.04 毫秒** 即可生成 `types/ignore.modular.d.ts`：
- 无缝扩充全局 `ModularContainer` 接口，解构享受 100% 准确的 IDE 提示；
- 开发者直接书写 `const { db, logger } = container;`，无需手动声明任何类型胶水代码；
- 自动写入 `.gitignore` 自愈规则，避免临时声明污染版本控制。

### 3. 清晰的宿主点火边界 (Host Ignition Boundary)
传统框架用专有语法侵入应用入口，造成强框架绑定。而在 Path-IoC 中，宿主仅负责一行点火：
```typescript
import { createModularContainer } from "virtual:modular-container";

// 宿主一行点火 (无论 Hono、Express、Koa、Workers、Next.js API 还是 CLI)
const container = await createModularContainer();
```
业务模块在网格（Mesh）内部自闭环运转，不挑宿主，实现真正的架构解耦。

---

## 全构建器原生支持

### 1. 安装

```bash
pnpm add -D @path-ioc/unplugin
pnpm add @path-ioc/core
```

### 2. 构建工具配置速查

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

#### Rollup (`rollup.config.js`) / Esbuild
```javascript
// Rollup
import { rollupPlugin as pathIoc } from "@path-ioc/unplugin";

// Esbuild
import { esbuildPlugin as pathIoc } from "@path-ioc/unplugin";
```

> **零配置开箱即用**：各构建器插件均完全支持零参调用 `pathIoc()`。若项目目录结构特殊，可按需传入自定义配置：
> ```typescript
> pathIoc({
>   modulesPath: "src/modules",   // 自定义模块根目录（默认: "src/modules"）
>   typeFileOutput: "types",     // 自定义类型输出目录（默认: "types"）
> })
> ```

---

## 插件配置项 (`PathIocPluginOptions`)

| 配置项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 模块扫描的物理根目录路径。 |
| **`typeFileOutput`** | `string` | `'types'` | 自动生成的类型声明文件 `ignore.modular.d.ts` 存放相对目录。 |

---

## 虚拟模块 (`virtual:modular-container`)

构建插件在运行时动态提供以下命名导出：

```typescript
import {
  modules,                 // 全量模块描述数组: { key: string, module: IOCModule }[]
  createModularContainer,  // 高性能实例化入口: (targetContainer?: Record<string, any>) => Promise<ModularContainer>
} from "virtual:modular-container";
```

### Serverless / Hono 生产级请求隔离示例

```typescript
import { Hono } from "hono";
import { createModularContainer } from "virtual:modular-container";
import { memoizeModule } from "@path-ioc/core";

const app = new Hono<{ Bindings: { DB_URL: string } }>();

app.use("*", async (c, next) => {
  // 1. 微秒级容器点火：单图编译缓存（仅 21.2µs），高并发每请求安全隔离
  const container = await createModularContainer();

  // 2. 静态基础设施安全单例化 (利用单 Worker 实例内静态 env 缓存连接池)
  // ⚠️ 铁律：严禁在 memoize 闭包内引用特定请求上下文 (如 c.req.header)
  memoizeModule(container, "dbPool", () => createPostgresPool(c.env.DB_URL));

  // 3. 动态注入当前请求的多租户专属上下文
  container.$inject("requestContext", {
    requestId: c.req.header("x-request-id") || crypto.randomUUID(),
  });

  c.set("ioc", container);
  await next();
});
```

---

## 模块编写规范与进阶指南

`@path-ioc/unplugin` 专注解决编译构建态的自动化扫描、类型合成与单图缓存注入。关于如何在业务中编写 `main` 纯函数闭包、声明 Mesh 依赖、利用 IoC-DL 进行依赖查找与 AOP 切面开发，请直接参阅：  
👉 **[查看 `@path-ioc/core` 核心架构与实战指南](../core/README.zh-CN.md)** 或访问官方主站 **[https://path-ioc.dev/zh/](https://path-ioc.dev/zh/)**

---

## 许可证 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
