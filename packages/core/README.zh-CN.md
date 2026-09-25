<div align="center">
  <h1>@path-ioc/core</h1>
  <p><b>Spring 有 Bean，Nest 有 Provider，Path-IoC 有 Mesh。</b></p>
  <p><b>像 lodash-es 一样纯粹通用的 TypeScript/JavaScript 路径依赖查找引擎 (IoC-DL)</b></p>
  <p><b>JavaScript/TypeScript 动态语言模块控制反转的原生正解</b></p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/core"><img src="https://img.shields.io/npm/v/@path-ioc/core.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/core.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://path-ioc.dev/zh/"><img src="https://img.shields.io/badge/文档-path--ioc.dev-8A2BE2.svg" alt="Documentation"></a>
    <a href="https://github.com/sponsors/path-ioc"><img src="https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA.svg" alt="Sponsor"></a>
  </p>

  <p>
    <a href="./README.md">English</a> | <b>简体中文</b> | <a href="https://path-ioc.dev/zh/">官方文档</a>
  </p>
</div>

> **什么是 Path-IoC (IoC-DL)？**  
> 告别原始 `import` 相对路径泥潭与传统重型黑盒 DI 在 JS 异步生态里的死锁与元数据包袱。Path-IoC 采用 **Dependency Lookup (依赖查找)** 范式——物理路径即抽象特征契约，静态图启动期预编译，原生 `async/await` 拓扑并发。零装饰器、零元数据反射、零框架侵入，业务面向 `container` 极简解构。

---

## 实机编码与极速点火演示录屏 (Live Demo Video)

<div align="center">
  <video src="https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4" controls width="100%" playsinline>
    您的浏览器不支持 HTML5 视频播放。<a href="https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4">点击查看实机演示视频</a>
  </video>
  <p>⚡ <b><a href="https://cdn.path-ioc.dev/path-ioc/demo-zh.mp4">点击查看实机架构漫游：实时编码、拓扑依赖编排与极速容器点火</a></b></p>
</div>

---

## 快速上手 (Quick Start)

在真实的现代前端与全栈工程中，`@path-ioc/core` 与编译期插件 `@path-ioc/unplugin` 深度协同（Compiler-Runtime Co-design）。与此同时，`@path-ioc/core` **100% 自治且完全独立**——它拥有极轻量的纯函数运行时（仅 8.8KB，零外部依赖），无需打包工具即可在纯 Node.js、CLI 脚本、单测或 Cloudflare Workers 中直接运行。

### 1. 安装核心与构建插件

```bash
# 运行时核心 (零外部依赖)
pnpm add @path-ioc/core

# 通用构建插件 (开发依赖)
pnpm add -D @path-ioc/unplugin
```

### 2. 配置构建工具 (支持 Vite / Rolldown / Webpack / Rspack / Rollup / Esbuild)

在构建配置文件中引入 `@path-ioc/unplugin`：

```typescript
// vite.config.ts (或 rolldown.config.ts)
import { defineConfig } from "vite";
import { vitePlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [
    pathIoc({
      modulesPath: "src/modules", // 模块扫描根目录 (默认: 'src/modules')
      typeFileOutput: "types",    // 自动生成的全局类型输出目录
    }),
  ],
});
```

*注：Webpack 5 请使用 `webpackPlugin`，Rspack 使用 `rspackPlugin`，Rollup 使用 `rollupPlugin`，Esbuild 使用 `esbuildPlugin`。*

### 3. 创建业务模块 (短名称 Mesh ID 正常实践)

在 `src/modules` 下自由创建模块目录并导出 `main` 纯函数。静态依赖使用**短名称（Mesh ID）**是框架的正常实践；在静态依赖中硬编码物理全称属于反模式与错误实践（会导致强路径耦合并违反依赖倒置），物理全称专用于动态特征匹配与切面筛选：

```typescript
// src/modules/infra/db/index.ts
export const main = () => {
  return {
    query: (sql: string) => `Executed: ${sql}`,
  };
};

// src/modules/biz/user/index.ts
// ✅ 正常实践：短名称作为 Mesh ID
export const dependencies = ["db"]; 

export const main = ({ db }: ModularContainer) => {
  // 直接解构，无缝调用，全局类型 100% 自动同步推导
  return {
    getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
  };
};
```

### 4. 编写应用启动模块 (`src/modules/start-app/index.ts`)

```typescript
// 一切业务皆模块：初始调用收敛在 IoC 模块内，天然保障 AOP 切面与依赖拓扑就绪
export const dependencies = ["user"];

export const main = ({ user }: ModularContainer) => {
  console.log(user.getUser("1001"));
};
```

### 5. 宿主应用入口点火唤醒 (`src/main.ts`)

在应用入口（如 `src/main.ts`），一行代码唤醒全量拓扑流：

```typescript
// src/main.ts
import { createModularContainer } from "virtual:modular-container";

// 宿主点火边界：入口保持绝对纯粹，仅充当容器点火器，零业务逻辑污染
createModularContainer();
```

插件会自动为全量模块生成 `ignore.modular.d.ts`，享受 100% 静态类型安全与 IDE 自动补全！

---

### 6. 原生 Core 独立运行与单测模式 (Unit Test & Standalone)

若在编写隔离单元测试（如 Vitest / Jest）或无打包工具的纯 Node.js 脚本时，可直接使用 `@path-ioc/core` 原生纯函数接口：

#### 场景 A：单元测试场景 (Vitest / Jest)
在单测套件中，测试用例作为外部观察者验证依赖图的装配与求值结果：

```typescript
import { expect, it } from "vitest";
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

it("should compile and instantiate in topological order", async () => {
  const modules = [
    { key: "/infra/db", module: { main: () => ({ query: (sql: string) => `DB: ${sql}` }) } },
    {
      key: "/biz/userService",
      module: {
        dependencies: ["db"],
        main: ({ db }: any) => ({
          getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
        }),
      },
    },
  ];

  const compiledGraph = compileModuleGraph(modules);
  const container: Record<string, unknown> = {};
  await instantiateModuleContainer(compiledGraph, container);

  // 单测断言：外部探针验证装配结果
  expect((container.userService as any).getUser("1001")).toBe("DB: SELECT * FROM users WHERE id = 1001");
});
```

#### 场景 B：独立脚本点火 (遵循点火跃迁与业务自闭环)
即便在没有构建工具的极简脚本中，也必须恪守“点火跃迁”准则——**业务逻辑严格封装在启动模块内，外部仅负责图编译与一行点火唤醒**：

```typescript
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

const modules = [
  { key: "/infra/db", module: { main: () => ({ query: (sql: string) => `DB: ${sql}` }) } },
  {
    key: "/biz/userService",
    module: {
      dependencies: ["db"],
      main: ({ db }: any) => ({
        getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
      }),
    },
  },
  {
    // 一切业务闭环在 Mesh 内部，天然保障 AOP 拦截与生命周期完整
    key: "/app/start",
    module: {
      dependencies: ["userService"],
      main: ({ userService }: any) => {
        console.log(userService.getUser("1001"));
      },
    },
  },
];

// 宿主点火边界：只做编译与容器唤醒，零业务逻辑污染
const compiledGraph = compileModuleGraph(modules);
await instantiateModuleContainer(compiledGraph, {});
```

---

## 核心设计哲学：向 Spring 致敬与动态语言范式应答 (Architecture Philosophy)

Path-IoC 的底层设计建立在对 **Java Spring 经典控制反转 (IoC) 哲学** 的深切致敬上，并针对 JavaScript/TypeScript 的单线程异步模型进行了原生升级：

### 1. 对标原生 ESM：纯粹的应用级自组织模块系统
- **原生 ESM 的根本局限**：原生 JavaScript `import` 语句本质是文件级的硬链接。当业务演进到数百个模块时，纵横交错的相对路径（`../../../../utils`）会导致严重的重构阻力与死锁隐患；
- **Path-IoC 的生态位定位**：**对标原生 ESM，作为业务层“应用级自组织模块系统”**。宿主（Hono、Express、Koa、Next.js API、Workers、CLI）只做一行代码点火（`createModularContainer()`），业务模块在网格内自闭环运转，不挑宿主，零框架锁死；
- **完全脱离传统后端框架的侵入式范畴**：不少开发者习惯将 IoC 与重量级后端框架（如 NestJS）混为一谈，这是典型的范畴谬误。后端全家桶往往用繁琐的类装饰器、控制器与专有管道强行侵入业务代码并绑架应用生命周期；而 Path-IoC 绝非后端框架，而是**极简、轻量、无侵入的自闭环网格（Mesh）**，只专注解决应用层模块解耦与拓扑调度，在浏览器前端、边缘计算、轻量服务端与 CLI 中皆可原生自洽运转。

### 2. 动态语言范式应答：单线程 Event Loop 下的原生 DAG 拓扑并发
并非 Path-IoC 创造了神迹，而是 Path-IoC 彻底顺应了 JavaScript 单线程非阻塞 Event Loop 的物理特性。在传统认知中，容器启动时的拓扑并发调度常被视作“不可思议的神迹”，其根源在于对比传统 IoC 体系下四大不可调和的深层矛盾：

- **对比 Java Spring 的串行初始化性能**：Java 虽拥有物理多线程，但为了规避并发创建 Bean 带来的共享内存竞争、内存可见性与三级缓存裸指针逃逸风险（受 JMM 内存模型限制），Spring 容器初始化阶段底层只能退守于**严谨的单线程严格串行装配（Serial Pipeline，耗时累加 $\sum t_i$）**；
- **对比传统 JS IoC 框架的异步初始化与懒加载矛盾**：在 JavaScript 单线程模型中，Proxy 同步 Getter 无法暂停去等待异步微任务，处于 pending 态的 Promise 也无法充当三级缓存的裸指针；传统 JS IoC（如 NestJS）无法解决拓扑并发调度，在核心源码中直接通过 `for...of await` 逐个硬编码串行排队；
- **DI 的调用期与初始化依赖混淆**：传统构造器注入将未来运行期的方法调用，强行升格为启动时刻的物理先决条件，人为摧毁了纯净 DAG 并制造了大量伪循环依赖；
- **缺少有效 DL（依赖查找）手段导致的 AOP 缺陷**：缺乏无侵入的依赖查找机制，传统框架的 AOP 只能退化为目标类显式 import 并手写类装饰器（如 `@UseInterceptors`）的“主动组合”，彻底违背了 AOP 非侵入横切的初心。

**Path-IoC 的破局之道**：将“初始化依赖（DAG 拓扑）”与“调用期依赖（DL 查找）”彻底正交解耦，成环概率在数学上归零。依托 JavaScript 单线程天然消除共享内存竞态的物理优势，同层无依赖节点通过 `Promise.all` 记忆化并发流级联点火（启动耗时从 $\sum t_i$ 降维为瓶颈节点的 $\max t_i$），并基于纯函数闭包与依赖查找实现真正无侵入的面向切面编程。

### 3. 物理路径即特征（Feature）与短名称 Mesh ID
- **短名称就是 Mesh ID**：日常业务开发中，开发者只认短名称（`dependencies = ["logger", "db"]`，消费时 `const { logger, db } = container;`），极简直观，享受 IDE 自动补全；
- **全路径是“特征标签”（类比元数据注解）**：全路径中的前缀（如 `/infra/`、`/biz/`）是用于动态特征匹配与切面筛选的特征标签；
- **设计准则**：在静态依赖中硬编码物理全称属于反模式与错误实践（会引入强路径耦合并严重违反依赖倒置原则）；物理全称专用于动态特征匹配与 AOP 切面筛选，常规业务依赖必须始终使用短名称 Mesh ID。

### 4. AOP 切面机制：零学习成本的原生切面 (DL-based Aspect)
- **不内置多余特权概念**：Path-IoC 不内置任何繁杂概念（如 `Guards`、`Interceptors`、`Pipes`、`Filters`）。在 JavaScript 动态语言下，高阶函数与解构代理本身就是最纯粹的 AOP；
- **完全 AOP 能力 & 零学习成本**：切面模块在自身 `dependencies` 中声明目标模块路径模式函数。拓扑引擎保证目标模块优先实例化，切面随后唤醒并对目标对象施加代理包装，实现 100% 非侵入切面织入。

### 5. 单线程事件循环下的物理铁律：DFS Fail-Fast 拦截
- **单线程 Proxy 的物理不可逾越性**：JavaScript 的 Proxy Getter（`container.xxx`）是**纯同步操作**，微任务无法在此暂停挂起去 await 异步操作。因此在单线程下“一边动态访问 Proxy Getter，一边还能动态解异步循环依赖”在物理机制上绝不成立；
- **Core 引擎的工程立场**：`@path-ioc/core` 保持严谨正义——使用 **DFS 拓扑分析严格 Fail-Fast 拦截环形依赖**，并打印完整环路调用链路，拒绝用隐式机制遮蔽架构腐败。

### 6. 零运行期反射与两阶段图编译 (Two-Stage Separation)
彻底摆脱 `reflect-metadata` 重型反射包袱。架构上将 **静态图编译 (`compileModuleGraph`)** 与 **动态容器填充 (`instantiateModuleContainer`)** 彻底分离。在 Cloudflare Workers 或 Node.js 高频请求场景中，服务冷启动时仅编译一次拓扑图（500 节点仅需 1.72ms），单次请求到来时直通填充容器（仅 21.2µs），大流量下实测降低 80% 以上的框架层 CPU 开销。

---

## 硬核基准性能 (Hardware-Verified Benchmarks)

基于 Apple Silicon 芯片、Node.js v24 原生实测（运行 `pnpm bench`）：

| 压测指标 (Benchmark Item) | 复杂度规模 | 平均耗时 (Avg Time) | 性能表现说明 |
| :--- | :--- | :--- | :--- |
| **`instantiateModuleContainer`** | **50 节点** 容器实例化 | **`21.2 µs`** | 微秒级直通，Serverless HTTP 请求期 0 延迟 |
| **`compileModuleGraph`** | **50 节点** 静态图编译 | **`90.8 µs`** | 亚毫秒级完成全拓扑环路校验 |
| **`instantiateModuleContainer`** | **500 节点** 容器实例化 | **`227 µs`** | 超大型项目依然近乎零开销 |
| **`compileModuleGraph`** | **500 节点** 复杂交叉依赖 | **`1.72 ms`** | 进程冷启动仅需 1 次，随后全量缓存复用 |
| **`compileModuleGraph`** | **2,000 节点** 超大规模拓扑 | **`15.5 ms`** | 工业级深层拓扑解析极限 |

---

## 主流 IoC 框架选型对比矩阵 (Selection Matrix)

| 对比维度 | **TS 装饰器派**<br>(NestJS / Inversify / TSyringe) | **正则 Proxy 派**<br>(Awilix) | **JVM 反射派**<br>(Java Spring) | **@path-ioc/core** |
| :--- | :--- | :--- | :--- | :--- |
| **底层依据** | `reflect-metadata` + TS Decorator | 函数 `.toString()` 正则 + Proxy | Java 反射 + 字节码 + 缓存 (静态语言工业标杆) | **物理路径契约 + 纯闭包工厂 + DAG 图编译** |
| **编译/环境兼容性** | 差 (强依赖元数据，纯类型擦除转译即崩溃) | 良好 | JVM 物理机原生支持 | **极致** (纯 ES Module 函数闭包，零反射元数据) |
| **初始化装配机制** | 串行主导 / Class 构造纯同步，async Provider 阻塞 | 不支持异步初始化 | 严格单线程串行装配 (出于 JMM 线程安全考量) | **原生 DAG 拓扑并发流** (DFS 后序遍历压栈 + Promise.all 记忆化) |
| **AOP 切面机制** | 概念繁杂 & 强绑定且仅限 Controller | 无内置 AOP 能力 | 划时代声明式代理 (AspectJ) | **完全 AOP 能力 & 零学习成本** (基于 DL 依赖查找与 JS 高阶代理) |
| **循环依赖与解环机制** | 死锁重灾区 (`forwardRef` 遇 async 死锁) | 受限 (仅限纯同步) | 辩证支持 (三级缓存解环，易诱发隐蔽 Bug) | **DFS Fail-Fast 严格拦截** (拒绝遮蔽设计漏洞，打印完整环路链路) |
| **高并发 / 运行期性能** | 高频元数据反射损耗 | Proxy 属性访问开销 | 工业级高可靠 (受限 JVM 物理模型) | **极高** (静态图编译与填充分离，仅 21.2µs 直通，降 80% CPU 损耗) |
| **架构解耦与侵入性** | 强侵入 (代码处处与框架类和注解绑定) | 中度 (绑定参数名) | 低侵入 (支持 JSR-330 标准注解) | **零侵入** (模块仅为纯函数，脱离框架完全可跑) |

---

## 形式化 API 规范 (Formal API Specification)

### 1. `compileModuleGraph(modules)`

```typescript
export interface IOCModule {
  main: (container: any, moduleNames: string[]) => any | Promise<any>;
  dependencies?: string[] | ((moduleNames: string[]) => string[]);
  order?: number;
  skip?: boolean;
}

export interface CompiledModuleGraph {
  sortedKeys: string[];
  resolvedDepsMap: Record<string, string[]>;
  shortKeyToFullKeyMap: Record<string, string>;
  fullKeyToShortKeyMap: Record<string, string>;
  moduleMap: Record<string, IOCModule>;
}

export function compileModuleGraph(
  modules: { key: string; module: IOCModule }[]
): CompiledModuleGraph;
```

- **算法复杂度**：时间复杂度 $O(V + E)$，空间复杂度 $O(V + E)$（基于 **DFS 后序遍历压栈拓扑排序**）；
- **异常捕获**：若检测到环路依赖，立即抛出附带完整环路链路路径的错误；若检测到短名称命名冲突，抛出明确诊断提示。

---

### 2. `instantiateModuleContainer(compiledGraph, container)`

```typescript
export function instantiateModuleContainer(
  compiledGraph: CompiledModuleGraph,
  container: Record<string, unknown>
): Promise<void>;
```

- **行为规范**：
  - 按 `compiledGraph.sortedKeys` 拓扑顺序依次唤醒模块 `main` 函数；
  - 自动将模块执行返回值挂载到 `container[fullKey]` 与 `container[shortKey]`；
  - 若模块的 `main` 为异步 Promise，引擎自动通过 Promise 记忆化反应式并发流协调后续依赖子节点。

---

### 3. `initialize(modules, container)`

```typescript
export function initialize(
  modules: { key: string; module: IOCModule }[],
  container: Record<string, unknown>
): Promise<void>;
```

便捷快捷方法，内部依次调用 `compileModuleGraph` 与 `instantiateModuleContainer`。

---

## Mesh 模块导出规范 (Mesh Export Protocol)

在 `src/modules/**/index.ts` 中，允许导出以下 4 个标准变量：

| 导出变量名 | 类型 | 默认值 | 作用说明 |
| :--- | :--- | :--- | :--- |
| **`main`** *(必须)* | `(container: ModularContainer, allModuleNames: string[]) => any \| Promise<any>` | - | 模块工厂函数。第二个入参 `allModuleNames` 传递的是全系统全量物理模块 Key 列表；在进行动态模块匹配或 AOP 切面织入时，**必须在函数内显式根据特征过滤**（如 `allModuleNames.filter(p => p.startsWith("/biz/"))`）。 |
| **`dependencies`** *(可选)* | `string[] \| ((allModuleNames: string[]) => string[])` | `[]` | 拓扑依赖声明。静态依赖必须使用极简短名称（如 `["logger", "db"]`）；支持传入函数进行动态拓扑排序前置编排。 |
| **`order`** *(可选)* | `number` | `99999` | 执行时序权重。**严格遵循升序规则**：数值越小越先执行（如 `order: 1` 优先于 `order: 10`，默认值 `99999`），在无拓扑依赖约束时生效。 |
| **`skip`** *(可选)* | `boolean` | `false` | 跳过执行标记。用于外部预先注入的模块（如后端请求隔离时注入 `requestContext`）。**注意契约**：即便标记了 `skip: true`，也**必须导出一个 dummy `main` 函数**（如 `export const main = (): MyType => ({} as any)`），以通过核心依赖图校验与 unplugin 静态类型生成。 |

---

## 许可证 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
