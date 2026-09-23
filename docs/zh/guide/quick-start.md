# 快速上手 (Quick Start)

只需 3 分钟，即可在你的项目中体验基于物理路径的无锁拓扑依赖注入。

---

## 1. 安装核心依赖

```bash
# 安装核心运行时
pnpm add @path-ioc/core

# 安装通用构建插件 (开发依赖)
pnpm add -D @path-ioc/unplugin
```

> 如果使用 npm 或 yarn，直接替换为对应命令即可。

---

## 2. 配置构建插件

根据你的工程构建工具，在对应配置文件中注入插件（开箱即用，零配置即可启动）：

### Vite (`vite.config.ts`)
```typescript
import { defineConfig } from "vite";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc.vite()],
});
```

### Rolldown (`rolldown.config.ts`)
```typescript
import { defineConfig } from "rolldown";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc.rolldown()],
});
```

### Webpack (`webpack.config.js`)
```javascript
const { webpackPlugin } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [webpackPlugin()],
};
```

### Rspack (`rspack.config.js`)
```javascript
const { rspackPlugin } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [rspackPlugin()],
};
```

::: tip 💡 零配置与可选定制参数
插件默认自动扫描 `src/modules` 物理目录，并在 `types/` 目录下生成 `ignore.modular.d.ts` 类型声明文件。若需按需定制目录，可传入可选参数：
```typescript
pathIoc.vite({
  modulesPath: "src/custom-modules", // 自定义模块目录 (默认: 'src/modules')
  typeFileOutput: "custom-types",    // 自定义类型输出目录 (默认: 'types')
})
```
:::

---

## 3. 创建你的第一个业务模块

在 `src/modules` 目录下新建任意层级的子目录，例如 `src/modules/logger/index.ts`：

```typescript
// src/modules/logger/index.ts
export const main = () => {
  return {
    info(msg: string) {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`);
    },
    error(msg: string) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`);
    },
  };
};
```

接着创建依赖该模块的服务，例如 `src/modules/order/index.ts`：

```typescript
// src/modules/order/index.ts
export const main = (container: ModularContainer) => {
  // 享受类型提示直接解构 logger！
  const { logger } = container;

  return {
    createOrder(id: string, amount: number) {
      logger.info(`Creating order ${id} for $${amount}`);
      return { id, amount, status: 'CREATED' };
    },
  };
};

// 声明拓扑依赖
export const dependencies = ["logger"];
```

接着创建应用的启动聚合模块 `src/modules/start-app/index.ts`，由它来承接首个业务逻辑或启动流程：

```typescript
// src/modules/start-app/index.ts
export const main = (container: ModularContainer) => {
  const { order, logger } = container;

  logger.info("所有服务拓扑就绪，开始执行初始业务流程...");
  order.createOrder("ORD_999", 299);
};

// 🔥 核心杀手锏：函数式依赖（聚合器模式与直觉 AOP 的基石）
// 动态等待除自身之外的所有业务模块就绪，无需手动罗列，享受拓扑引擎自动编排
export const dependencies = (allModules: string[]) =>
  allModules.filter((path) => path !== "/startApp");
```

> **提示**：`dependencies` 既支持字符串数组，也原生支持高阶过滤函数。这是 Path-IoC 的核心杀手锏：借助函数依赖，开发者无需学习复杂的 Pointcut 切入点语法，凭原生 JavaScript 数组过滤即可实现**聚合器模式**与**直觉 AOP**。在前端项目中，`start-app` 通常负责 `createRoot().render(<App />)` 挂载根节点；在服务端项目中，它通常负责 `app.listen(port)` 启动 HTTP 监听。

---

## 4. 应用入口点火启动容器

在应用入口文件（如 `src/main.ts` 或 `src/index.ts`）中，**仅需唤醒容器即可，无需且不应当在容器外部编写任何业务逻辑**：

```typescript
// src/main.ts
import { createModularContainer } from "virtual:modular-container";

// 一键唤醒拓扑容器，所有初始化与装配全权由 IoC 模块接管
createModularContainer();
```

::: tip 架构哲学：一切逻辑皆模块，入口只负责点火
在纯正的控制反转（IoC）架构中，应用的入口文件（`main.ts`）应当保持绝对的纯粹与轻量，只充当容器的“点火器（Ignition）”。

将初始业务调用、DOM 挂载或端口监听收敛在 `start-app` 等 IoC 模块中，不仅能天然利用 `dependencies` 确保所有数据库、配置与中间件 100% 拓扑就绪后再启动，更能保持整套系统全生命周期的非侵入性与极佳的可测性。
:::
