# @path-ioc/container API 规范

`@path-ioc/container` 是 Path-IoC 的高阶容器扩展包，提供按需子图切片（Subgraph Slicing）与双引擎（Async 拓扑并发 / Turbo 纯同步直通）调度能力。

---

## 4 大调度范式矩阵

通过 `strategy` (加载范围: `eager` | `demand`) 与 `mode` (执行引擎: `async` | `turbo`) 构成 4 种闭环调度范式：

| 范式 (`strategy` + `mode`) | 触发机制 | 核心物理特性 | 推荐适用场景 |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | 容器创建时立刻触发 | 全量 DAG 拓扑并发预热，挂载 `$ready` 句柄 | 标准服务端应用、微服务启动预热 |
| **`eager` + `turbo`** | 容器创建时立刻触发 | 纯同步预热，保持对运行期属性的动态感知 | 纯同步客户端 App、复杂工具库 |
| **`demand` + `async`** | 外部按需访问属性触发 | 正向子图切片提取，严格单点熔断防护 | 大型 SPA 路由懒加载、冷启动极致压降 |
| **`demand` + `turbo`** | 外部按需访问属性触发 | 纯同步直通零 Promise 延迟，支持动态解环 | 命令行 CLI 工具、纯同步高性能管线 |

---

## 核心方法

### `createDualContainer(graph, options)`

创建具备双引擎调度能力的高阶代理容器。

- **类型签名**：
  ```typescript
  function createDualContainer<T = Record<string, unknown>>(
    graph: CompiledModuleGraph,
    options?: DualContainerOptions
  ): T & { $ready?: Promise<void> };
  ```
- **配置项 (`DualContainerOptions`)**：
  - `strategy`: `'eager'` | `'demand'` (默认 `'eager'`)
  - `mode`: `'async'` | `'turbo'` (默认 `'async'`)
  - `targetContainer`: 自定义容器挂载目标对象

---

### `extractSubModules(graph, rootKey)`

根据触达节点顺藤摸瓜递归检索下游所有依赖，精确切片抽取最小子图。

- **类型签名**：
  ```typescript
  function extractSubModules(
    graph: CompiledModuleGraph,
    rootKey: string
  ): CompiledModuleGraph;
  ```
