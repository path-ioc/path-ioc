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
  </p>

  <p>
    <a href="./README.md">English</a> | <b>简体中文</b> | <a href="https://path-ioc.dev/zh/">官方文档</a>
  </p>
</div>

> **什么是 Path-IoC (IoC-DL)？**  
> 告别原始 `import` 泥潭与传统重型黑盒 DI 在 JS 异步生态里的死锁与元数据包袱。Path-IoC 采用 **Dependency Lookup (依赖查找)** 范式——物理路径即抽象契约，静态图启动期预编译，原生 `async/await` 拓扑并发。零反射、零概念包袱，组件面向 `container` 极简解构。

---

## 快速上手 (Quick Start)

在真实的现代前端与全栈工程中，`@path-ioc/core` 与编译期插件 `@path-ioc/unplugin` 深度协同（Compiler-Runtime Co-design）。

### 1. 安装核心与构建插件

```bash
# 运行时核心
pnpm add @path-ioc/core

# 通用构建插件 (开发依赖)
pnpm add -D @path-ioc/unplugin
```

### 2. 配置构建工具 (支持 Vite / Rolldown / Webpack / Rspack / Rollup / Esbuild)

在你的构建配置文件中引入 `@path-ioc/unplugin`：

```typescript
// vite.config.ts (或 rolldown.config.ts)
import { defineConfig } from "vite";
import { vitePlugin as pathIoc } from "@path-ioc/unplugin";
// 若使用 Rolldown: import { rolldownPlugin as pathIoc } from "@path-ioc/unplugin";

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

### 3. 创建业务模块 (无需 import，物理路径即契约)

在 `src/modules` 下自由创建模块目录并导出 `main` 纯函数：

```typescript
// src/modules/infra/db/index.ts
export const main = () => {
  return {
    query: (sql: string) => `Executed: ${sql}`,
  };
};

// src/modules/biz/user/index.ts
export const dependencies = ["db"]; // 声明正向依赖

export const main = (container: any) => {
  const { db } = container; // 依赖查找 (DL)，由拓扑引擎保障前置就绪
  return {
    getUser: (id: string) => db.query(`SELECT * FROM users WHERE id = ${id}`),
  };
};
```

### 4. 编写应用启动模块 (`src/modules/start-app/index.ts`)

```typescript
// 一切业务皆模块：初始调用收敛在 IoC 模块内，天然保障 AOP 切面与依赖拓扑就绪
export const main = (container: any) => {
  const { user } = container;
  console.log(user.getUser("1001"));
};

export const dependencies = ["user"];
```

### 5. 应用入口点火唤醒 (`src/main.ts`)

在应用入口（如 `src/main.ts`），一行代码唤醒全量无锁拓扑流：

```typescript
// src/main.ts
import { createModularContainer } from "virtual:modular-container";

// 入口保持绝对纯粹：仅充当容器点火器，零业务逻辑污染
createModularContainer();
```

插件会自动为全量模块生成 `ignore.modular.d.ts`，享受 100% 静态类型安全与 IDE 自动补全！

---

### 6. 原生 Core 独立运行模式 (无打包器 / 纯单测模式)

若在纯 Node.js 脚本、无打包工具或编写隔离单元测试时，亦可直接使用 `@path-ioc/core` 原生纯函数接口：

```typescript
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

// 1. 显式定义模块列表 (短名称声明依赖与依赖查找)
const modules = [
  { key: "/infra/db", module: { main: () => "PostgreSQL Connection" } },
  {
    key: "/biz/userService",
    module: {
      dependencies: ["db"],
      main: (c) => ({ db: c.db, getUser: (id: string) => `User ${id}` }),
    },
  },
];

// 2. 纯同步编译拓扑图 (单次纳秒级)
const compiledGraph = compileModuleGraph(modules);

// 3. 动态填充容器
const container: Record<string, unknown> = {};
await instantiateModuleContainer(compiledGraph, container);
```

---

## 核心设计哲学：向 Spring 致敬与动态语言范式应答 (Architecture Philosophy)

Path-IoC 的底层设计建立在对 **Java Spring 经典控制反转 (IoC) 哲学** 的深切致敬上。它让 Spring 的伟大解耦思想在 JavaScript/TypeScript 的单线程 `async`、动态语言特性与纯函数语境下得到了原生的继承与演进：

### 1. 动态语言范式应答：单线程 Event Loop 下的原生 DAG 拓扑并发

并非 Path-IoC 创造了神迹，而是 Path-IoC 彻底顺应了 JavaScript 单线程非阻塞 Event Loop 的物理特性：

- **物理特性的镜像差异（多线程串行 vs 单线程并行/并发）**：Java 虽然拥有物理多线程，但为了规避并发创建 Bean 带来的共享内存竞争、内存可见性与死锁隐患（JMM 模型限制），Spring 容器初始化阶段在框架底层只能退守于**严谨的单线程严格串行装配（Serial Pipeline）**；
- **利用 JS 天然优势**：JavaScript 的单线程 Event Loop **天然消除了共享内存竞态条件与锁死锁**。Path-IoC 利用这一天然物理优势建立 **原生 `async/await` 反应式拓扑有向无环图 (DAG)**，在初始化阶段实现同层无依赖节点的**全量并行/并发级联点火（Parallel / Concurrent Activation）**——既消除了单线程串行排队的吞吐瓶颈，又发挥了事件驱动非阻塞 I/O 的极高吞吐优势。

### 2. 字符串即接口表征：物理特征即为抽象契约 (Path as Contract)

- **字符串也是接口的一种表达形式**：无论是 Java 传统的 `interface UserData`、`Class.forName("com.xxx.UserService")` 包路径，还是 Path-IoC 中的全限定路径与短名称，本质上都是在**依赖抽象而非依赖具体**，这正是依赖倒置原则 (DIP) 的终极真相。
- **物理路径特征契约**：路径不仅是坐标，更是服务发现的天然接口。例如在服务端开发中，只需通过路径特征过滤函数 `name.includes("/entity/orm/")`，即可零配置全自动感知并收集所有 ORM 实体（如 `orm-entities` 模块），达到浑然天成的解耦与热插拔。

### 3. AOP 切面机制：零学习成本的原生切面 (DL-based Aspect)

- **不内置多余特权概念**：Path-IoC 不内置任何繁重的特权概念工具（如 `Guards`、`Interceptors`、`Pipes`、`Filters` 或复杂的 JDK 动态代理）。Path-IoC 认为在 JavaScript 动态语言下，高阶函数与解构代理本身就是最纯粹的 AOP。
- **完全 AOP 能力 & 零学习成本**：凭借底层的依赖查找 (DL) 能力与动态语言直觉，切面模块（Aspect Mesh）只需在自身的 `dependencies` 函数中声明它要切入的目标模块路径模式（物理上正向依赖目标模块）。拓扑引擎保证目标模块优先完成实例化，切面模块随后唤醒并对 `container` 上的目标对象施加高阶代理包装，无需学习任何框架特有概念，即可具备完全的非侵入式 AOP 切面能力。

### 4. 循环依赖与“依赖感知”理论哲学 (Circular Dependency & Dependency Sensing)

- **纯理论提炼**：**“依赖感知”与“循环依赖解环”本质上是同一物理能力的不同理解角度**。
  - **“依赖感知”是核心能力**；
  - **正面作用一**：运行时循环依赖解环；
  - **正面作用二**：按需子图懒加载 (Lazy Loading)；
  - **伴生副作用**：遮蔽系统设计缺陷、导致架构隐式腐烂、以及无法原生支持 `async` 异步初始化。
- **Core 引擎的工程立场**：`@path-ioc/core` 保持严谨正义——用 DFS 静态深搜 Fail-Fast 抛错，拒绝用隐式解环遮蔽系统架构漏洞。
- **Container 的 Turbo 机制对比**：若因历史包袱需解环，在纯同步全模块场景下，扩展层 `@path-ioc/container` 的 Turbo 模式通过 Proxy Dynamic Getter 实现按需“依赖感知”，在运行期无痛完成无锁解环。

### 5. 全局类型补齐：开发期 DX 与静态类型的殊途同归

Java 在编译期拥有原生的 class 类型，而 JS/TS 字符串路径在静态阶段缺乏推导。Path-IoC 通过构建插件（`@path-ioc/unplugin`）在开发期（DX 阶段）自动扫描物理目录并实时生成 `ModularContainer` 全局类型接口（`ignore.modular.d.ts`），**完美补齐了动态语言在静态类型推导上的短板**，达到了与 Java 静态编译完全一致的类型安全与智能补全体验。

### 6. 零运行期反射与两阶段图编译 (Two-Stage Separation)

彻底摆脱 `reflect-metadata` 重型反射包袱。架构上将 **静态图编译 (`compileModuleGraph`)** 与 **动态容器填充 (`instantiateModuleContainer`)** 彻底分离。在 Node.js / Workers 高频 HTTP 请求场景中，服务启动时仅编译一次拓扑图，单次请求到来时直通填充容器，彻底免去每次请求重复解析依赖树与反射的开销，大流量下实测可降低 80% 以上的框架层 CPU 开销。

---

## 主流 IoC 框架选型对比矩阵 (Selection Matrix)

| 对比维度 | **TS 装饰器派**<br>(NestJS / Inversify / TSyringe) | **正则 Proxy 派**<br>(Awilix) | **JVM 反射派**<br>(Java Spring) | **@path-ioc/core** *(及 container 扩展)* |
| :--- | :--- | :--- | :--- | :--- |
| **底层依据** | `reflect-metadata` + TS Decorator | 函数 `.toString()` 正则 + Proxy | Java 反射 + 字节码 + 缓存 (静态语言工业标杆) | **物理路径契约 + 纯闭包工厂 + DAG 图编译** |
| **编译/环境兼容性** | 差 (强依赖元数据，纯类型擦除转译即崩溃) | 良好 | JVM 物理机原生支持 | **极致** (纯 ES Module 函数闭包，零元数据) |
| **初始化装配机制** | 串行主导 / Class 构造纯同步，async Provider 阻塞 | 不支持异步初始化 | 严格单线程串行装配 (出于 JMM 线程安全考量) | **原生 DAG 拓扑并行/并发点火** (利用单线程天然安全，无锁级联调度) |
| **AOP 切面机制** | 概念繁杂 & 强绑定且仅限 Controller | 无内置 AOP 能力 | 划时代声明式代理 (AspectJ) | **完全 AOP 能力 & 零学习成本** (基于 DL 依赖查找与 JS 高阶代理) |
| **循环依赖与解环机制** | 死锁重灾区 (`forwardRef` 遇 async 死锁) | 受限 (仅限纯同步) | 辩证支持 (三级缓存解环，易诱发隐蔽 Bug) | **底层 DFS Fail-Fast 拦截** (拒绝遮蔽漏洞)<br>扩展层 Turbo 模式 (Dynamic Getter 解环) |
| **高并发 / 运行期性能** | 高频元数据反射损耗 | Proxy 属性访问开销 | 工业级高可靠 (受限 JVM 物理模型) | **极高** (静态图编译与填充分离，提升 80% CPU 性能) |
| **架构解耦与侵入性** | 强侵入 (代码处处与框架类和注解绑定) | 中度 (绑定参数名) | 低侵入 (支持 JSR-330 标准注解) | **零侵入** (模块仅为纯函数，脱离框架完全可跑) |

---

## 形式化 API 规范 (Formal API Specification)

### 1. `compileModuleGraph`

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

- **算法复杂度**：时间复杂度 $O(V + E)$，空间复杂度 $O(V + E)$（基于 Kahn 拓扑排序算法）；
- **异常捕获**：若检测到环路依赖，立即抛出附带完整环路链路路径的错误；若检测到短名称命名冲突，抛出明确的提示。

### 2. `instantiateModuleContainer`

```typescript
export function instantiateModuleContainer(
  compiledGraph: CompiledModuleGraph,
  container: Record<string, unknown>
): Promise<void>;
```

- **行为规范**：
  - 按 `compiledGraph.sortedKeys` 顺序依次唤醒模块 `main` 函数；
  - 自动将模块执行返回值挂载到 `container[fullKey]` 与 `container[shortKey]`；
  - 若模块的 `main` 为异步 Promise，引擎自动 `await` 并级联唤醒后续依赖它的子节点。

---

## 许可证 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
