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

根据你的工程构建工具，在对应配置文件中注入插件：

### Vite (`vite.config.ts`)
```typescript
import { defineConfig } from "vite";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [
    pathIoc.vite({
      modulesPath: "src/modules",   // 模块所在物理目录 (默认 src/modules)
      typeFileOutput: "types",     // 自动生成的 ignore.modular.d.ts 输出目录
    }),
  ],
});
```

### Rolldown (`rolldown.config.ts`)
```typescript
import { defineConfig } from "rolldown";
import { rolldownPlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [
    pathIoc({
      modulesPath: "src/modules",
      typeFileOutput: "types",
    }),
  ],
});
```

### Webpack (`webpack.config.js`)
```javascript
const { webpackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [
    pathIoc({
      modulesPath: "src/modules",
    }),
  ],
};
```

### Rspack (`rspack.config.js`)
```javascript
const { rspackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [pathIoc()],
};
```

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

接着创建应用的启动模块 `src/modules/start-app/index.ts`，由它来承接首个业务逻辑或启动流程：

```typescript
// src/modules/start-app/index.ts
export const main = (container: ModularContainer) => {
  const { order, logger } = container;

  logger.info("应用初始化成功，开始执行初始业务流程...");
  order.createOrder("ORD_999", 299);
};

// 声明拓扑依赖：确保 order 与 logger 就绪后再执行启动逻辑
export const dependencies = ["order", "logger"];
```

> **提示**：在实际前端项目中，`start-app` 通常负责 `createRoot().render(<App />)` 挂载根节点；在服务端项目中，它通常负责 `app.listen(port)` 启动 HTTP 监听。

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
