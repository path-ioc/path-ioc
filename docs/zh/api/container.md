# @path-ioc/container API 规范

> ⚠️ **定位与实验性声明**：`@path-ioc/container` 是作者早期为了对比分析传统 JS IoC 框架（如 InversifyJS 等）的同步 getter 懒加载机制而实现的**概念对比与基准评测包**。其内部带有严格的单点访问与执行限制，**无生产级通用推荐价值，目前不计划继续迭代**。在生产工程中，请直接使用 `@path-ioc/core` 与 `@path-ioc/unplugin`。

`@path-ioc/container` 提供了按需子图切片（Subgraph Slicing）与四种策略/模式（Async / Turbo）调度实验。

---

## 4 大调度范式矩阵

通过 `strategy` (加载范围: `eager` | `demand`) 与 `mode` (执行引擎: `async` | `turbo`) 构成 4 种调度范式：

| 范式 (`strategy` + `mode`) | 触发机制 | 核心物理特性 | 适用场景说明 |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | 容器创建时立刻触发 | 全量 DAG 拓扑并发预热，挂载 `$ready` 句柄 | 全量异步预热场景 |
| **`eager` + `turbo`** | 容器创建时立刻触发 | 启动时全量拓扑纯同步求值，若遇异步模块直接抛错 | 纯同步工具库 |
| **`demand` + `async`** | 外部按需访问属性触发 | 正向子图切片提取，属性访问返回 Promise。**注意**：存在互斥保护，必须串行 `await`，禁止 `Promise.all` 并发访问多个未就绪属性 | 按需异步切片实验 |
| **`demand` + `turbo`** | 外部按需访问属性触发 | 触达时纯同步提取子图求值，零 Promise 延迟；遇环同样 Fail-Fast 报错 | 纯同步命令行/管线测试 |

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

---

### `extractSubModules(graph, ...entryPoints)`

根据给定的一个或多个触达节点，顺藤摸瓜检索并切片提取出所有依赖的最小原始模块列表。

- **类型签名**：
  ```typescript
  function extractSubModules(
    graph: CompiledModuleGraph,
    ...entryPoints: string[]
  ): { key: string; module: IOCModule }[];
  ```
- **参数说明**：
  - `graph`: 全量编译后的静态依赖图
  - `entryPoints`: 目标入口模块（支持短名称或物理全称）
- **返回值**：
  - 抽取出的提纯 raw modules 描述数组。若需用于装配，需再次调用 `compileModuleGraph(subModules)`。
