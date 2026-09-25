# @path-ioc/container API 规范

> ⚠️ **定位与实验性声明**：`@path-ioc/container` 是作者早期为了对比分析传统 JS IoC 框架（如 InversifyJS、Awilix 等）的动态 getter 懒加载机制而实现的**概念对比与机制评测包**。其内部带有严格的单点访问与执行限制，**无生产级通用推荐价值，目前不计划继续迭代**。在生产工程中，请直接使用正统的 `@path-ioc/core` 与 `@path-ioc/unplugin`。

`@path-ioc/container` 提供了按需子图切片（Subgraph Slicing）与四种策略/模式（Async / Turbo）调度实验。

---

## 物理不可调和律与设计哲学 (`async` vs `turbo`)

在 JavaScript/TypeScript 单线程模型中，**“异步初始化 (Async)”** 与 **“运行期动态依赖感知 (Dynamic Sensing)”** 在物理机制上是不可调和的：

- **物理原因**：JS 的 Proxy Dynamic Getter（`c.foo`）是纯同步操作，无法在执行中暂停去等待异步微任务。
  - **`async` 模式**：必须在唤醒前显式声明 `dependencies` 构建静态 DAG 图，才能编排拓扑顺序提前 `await`，获得 **100% 原生反应式拓扑并发**（通过 `Promise.all` 级联唤醒）；
  - **`turbo` 模式**：**严禁任何异步 `main` 工厂**（若返回 Promise 直接抛出 `[Turbo Mode] Async module is not supported` 异常）。由于纯同步调用栈无需挂起等待，**完全支持免写 `dependencies`**，依托 Proxy Dynamic Getter 在访问属性时同步深搜并求值装配；若仅在运行期方法中相互引用，可自然避免死锁；但若在 `main` 初始化期发生同步强依赖闭环，会触发调用栈溢出或由静态 DFS Fail-Fast 报错拦截。

---

## 4 大调度范式矩阵

通过 `strategy` (加载范围: `eager` | `demand`) 与 `mode` (执行引擎: `async` | `turbo`) 构成 4 种调度范式：

| 范式 (`strategy` + `mode`) | 触发机制 | 核心物理特性 | 适用场景说明 |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | 容器创建时立刻触发 | 全量 DAG 拓扑并发预热，挂载不可枚举的 `$ready: Promise<void>` 句柄 | 全量异步预热评测 |
| **`eager` + `turbo`** | 容器创建时立刻触发 | 启动时全量拓扑纯同步求值；严禁异步 `main` 工厂（遇 Promise 抛错）；支持免写 `dependencies` | 纯同步工具库测试 |
| **`demand` + `async`** | 外部按需访问属性触发 | 正向子图切片提取，属性访问返回 Promise。**注意**：存在串行互斥保护，必须串行 `await`，严禁 `Promise.all` 并发访问多个未就绪属性 | 按需异步切片实验 |
| **`demand` + `turbo`** | 外部按需访问属性触发 | 属性访问纯同步子图求值直通，零 Promise 延迟；**完全支持免写 `dependencies`**；严禁异步 `main` 工厂；遇环同样 Fail-Fast 报错 | 纯同步命令行/管线测试 |

---

## 核心方法

### `createContainer(graph, options)`

创建指定策略与模式的高阶代理容器。

- **类型签名**：
  ```typescript
  function createContainer(
    graph: CompiledModuleGraph,
    options: CreateContainerOptions
  ): Record<string, unknown>;
  ```
- **配置项 (`CreateContainerOptions`)**：
  - `strategy`: `'eager'` | `'demand'`（必填）
  - `mode`: `'async'` | `'turbo'`（必填）
  - *(注：`eager + async` 模式下返回的对象挂载了不可枚举的 `$ready: Promise<void>`)*

- **使用示例**：
  ```typescript
  import { compileModuleGraph } from "@path-ioc/core";
  import { createContainer } from "@path-ioc/container";

  const graph = compileModuleGraph(rawModules);

  // 纯同步按需直通容器（支持免写 dependencies）
  const container = createContainer(graph, {
    strategy: "demand",
    mode: "turbo",
  });

  // 首次访问触发同步深搜装配
  const service = container.myService;
  ```

---

## 内部核心机制：正向子图切片提取 (`extractSubModules`)

在 `demand` 按需模式下，当调用方首次访问未初始化的属性（如 `container.UserPage`）时，容器并不会全量拉起所有模块，而是由内部算法函数 `extractSubModules` 执行顺藤摸瓜提取：

1. **顺藤摸瓜**：从触达点出发，基于静态图中的 `resolvedDepsMap` 深度优先递归检索所有正向依赖；
2. **提纯子图**：严格仅收集目标节点及其下游依赖模块，排除无关模块；
3. **即刻编译装配**：将提取出的极简原始模块子集传递给 `compileModuleGraph(subModules)` 编译后就地装配。

*(注：`extractSubModules` 属于 `@path-ioc/container` 内部算法实现，不对外作为公共 API 导出，由 `demand` 模式 Proxy Getter 自动调度。)*
