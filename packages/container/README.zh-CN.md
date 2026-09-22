<div align="center">
  <h1>@path-ioc/container</h1>
  <p><b>High-Performance Dual-Engine Container & Subgraph Slice Scheduler for Path-IoC</b></p>
  <p>Path-IoC 高阶按需容器与双引擎（Async 拓扑并发 / Turbo 纯同步直通）调度扩展</p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/container"><img src="https://img.shields.io/npm/v/@path-ioc/container.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/container.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://path-ioc.dev/zh/"><img src="https://img.shields.io/badge/文档-path--ioc.dev-8A2BE2.svg" alt="Documentation"></a>
  </p>

  <p>
    <a href="./README.md">English</a> | <b>简体中文</b> | <a href="https://path-ioc.dev/zh/api/container">官方文档</a>
  </p>
</div>

> **架构定位说明**：  
> `@path-ioc/core` 静态图编译与原生 `async/await` 拓扑并发预热是 Path-IoC 架构的核心基石。  
> `@path-ioc/container` 是 Path-IoC 架构治理开放与包容的对标扩展包。它证明了 Path-IoC 无需引入 TS 装饰器与 `reflect-metadata` 元数据包袱，即可原生兼容并超越传统 JS IoC 框架的 **“按需加载 (Sub-graph Slicing)”** 与 **“动态依赖感知 (Dynamic Resolution)”** 模式，提供物理完备的 **4 种全闭环调度范式**。

---

## 核心设计哲学：物理分治与按需切片 (Architecture Philosophy)

### 1. 正统静态拓扑 vs 扩展按需代理

在工业级生产实践中（如 Java Spring 默认 `eager-singleton`），启动期全量 DAG 拓扑预热是保持系统稳定性、依赖完整性与最高运行性能的黄金标准。因此：

- **正统 Core (`@path-ioc/core`)**：坚持绝对严谨——静态图编译、DFS 严谨 Fail-Fast 拦截循环依赖、原生 `async/await` 拓扑并发，杜绝隐式解环遮蔽架构漏洞。
- **扩展 Container (`@path-ioc/container`)**：展现开放包容——通过包装高阶 Proxy 代理容器，将“加载范围 (Eager/Demand)”与“执行引擎 (Async/Turbo)”拆解为 **2 维物理正交矩阵**，以能力降级的方式完美对标传统 IoC 框架的按需与依赖感知模式。

---

### 2. 物理不可调和律与物理分治 (`async` vs `turbo`)

在 JavaScript/TypeScript 单线程模型中，**“异步初始化 (Async)”** 与 **“运行期动态依赖感知 (Dynamic Sensing)”** 在物理上是不可调和的：

- **物理原因**：JS 的 Proxy Dynamic Getter（`c.foo`）本质上是纯同步的，无法在纯同步代码中间“挂起线程去异步等待”。
  - 如果一个模块需要异步初始化（`async main`），就**必须在唤醒前通过 `dependencies` 构建静态图**，才能编排 DAG 拓扑顺序提前 `await`；
  - 如果允许不写 `dependencies` 靠运行期动态感知，那么在 `async` 模式下一旦访问未就绪的异步节点，就必然会导致返回 `Promise` 未决遗留或微任务死锁。

Path-IoC 通过物理分治实现优雅解法：
- **`async` 模式**：显式声明 `dependencies` -> 编译静态 DAG 图 -> 获得 **100% 原生反应式拓扑并发**；
- **`turbo` 模式**：免写 `dependencies` -> 运行期 Proxy Dynamic Getter 动态感知 -> 获得 **零配置直通与纯同步无锁解环**。

---

## 主流 IoC 框架选型对比矩阵 (Selection Matrix)

| 对比维度 | **NestJS** | **InversifyJS** | **Awilix** | **TSyringe** | **TypeDI** | **@path-ioc/container** *(Path-IoC 扩展)* |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **底层依赖契约** | `@Injectable()` + TS 装饰器 + `reflect-metadata` | `@injectable()` + TS 装饰器 + `reflect-metadata` | 正则解析 `.toString()` 或形参匹配 + Proxy | `@singleton()` + TS 装饰器 + `reflect-metadata` | `@Service()` + TS 装饰器 + `reflect-metadata` | **物理路径契约 + 纯 ES 模块闭包 + 静态图** |
| **代码侵入性** | 强侵入 (强绑定 Nest 框架装饰器与概念) | 强侵入 (强绑定 `@inject` 装饰器) | 低侵入 (按形参匹配，无需装饰器) | 强侵入 (强绑定 Microsoft 装饰器) | 强侵入 (强绑定 TypeDI 装饰器) | **零侵入** (纯 ES 模块导出函数，脱离框架完全独立可跑) |
| **按需/懒加载范式** | 模块级显式懒加载 (`LazyModuleLoader`) | 属性级懒注入 (`@lazyInject`) | Proxy 模式按需实例化 (纯同步属性访问) | 不支持按需 (创建容器即解析全量 Class) | 不支持按需 (实例化即解析全量 Class) | **正向极简子图按需切片** (`extractSubModules` 触达点自动正向提取子图) |
| **循环依赖处理** | `forwardRef()` (遇 async 易死锁) | `@lazyInject()` 延迟解析 | Dynamic Proxy Getter (仅支持纯同步) | `delay()` (需显式 Token 包装) | `constructMany` 延迟解析 | **Turbo 模式 Dynamic Getter 无锁解环** (零 Token 包装，纯同步自动解环) |
| **异步初始化与调度** | 串行主导 (构造函数纯同步，依赖 `onModuleInit` 钩子) | 支持 `getAsync()` (无 native DAG 调度) | 支持异步工厂 (`container.build()`) | 无 native 异步调度 | 无 native 异步调度 | **拓扑并发 / 纯同步直通双引擎** (`async` 原生 DAG 并发 / `turbo` 纯同步直通) |

---

## 4 大引擎调度范式矩阵 (Evaluation Matrix)

`@path-ioc/container` 通过 `strategy` (加载范围: `eager` | `demand`) $\times$ `mode` (执行引擎: `async` | `turbo`) 划分为 4 种物理完备的调度范式：

```
                    ┌─────────────────────────┬─────────────────────────┐
                    │      mode: "async"      │      mode: "turbo"      │
                    │  (反应式拓扑并发引擎)   │  (纯同步直通零Promise)  │
┌───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "eager" │  ① 全量异步拓扑预热     │  ② 纯同步预热 + 动态感知│
│ (全量加载)        │  (挂载 $ready 句柄)     │  (高频同步工具库/APP)   │
├───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "demand"│  ③ 极简子图按需提取     │  ④ 纯同步直通零延迟     │
│ (极速按需)        │  (大型 SPA/单点熔断防护)│  (极速 CLI/同步工作流)  │
└───────────────────┴─────────────────────────┴─────────────────────────┘
```

| 组合范式 (`strategy` $\times$ `mode`) | 物理触发机制 | 关键物理特性 | 最佳适用场景 |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | 容器创建时立刻触发 | 全量 DAG 拓扑并发预热，容器挂载非可枚举 `container.$ready` 追踪句柄 | 标准 Server / 后台微服务，启动时即全量预热连接池与缓存 |
| **`eager` + `turbo`** | 容器创建时立刻触发 | 启动时按拓扑顺序纯同步完成求值预热，保持对运行期动态新增/替换模块的感知 | 纯同步客户端 App、复杂全量初始化的工具库 |
| **`demand` + `async`** | 外部按需触达触发 (`container.UserPage`) | 触达点顺藤摸瓜提取子图，严格单点熔断防护，彻底杜绝幽灵 Bug | 大型 SPA 单页应用路由按需懒加载、冷启动极致优化 |
| **`demand` + `turbo`** | 外部按需触达触发 (`container.foo`) | 无需 `await` 属性访问，自动算子图纯同步求值，支持依赖感知与无锁解环 | 极速 CLI 命令行工具、纯同步高性能管线、单测隔离 |

---

## 核心机制：正向极简子图按需切片提取 (Subgraph Slice Extraction)

在 `demand` 按需模式下，当调用方首次访问 `container.UserPage` 时，容器不会拉起全量模块，而是调用 `extractSubModules(graph, 'UserPage')`：

1. **顺藤摸瓜**：从触达点 `UserPage` 出发，基于静态图中的 `resolvedDepsMap` 深度优先递归检索其所有正向依赖；
2. **纯粹确定**：严格仅收集 `UserPage` 及其下游直属与间接依赖模块，排除无关模块，保证 100% 确定性；
3. **极简编译**：将抽取的极简模块子集重新编译为局部子图，即刻完成装配。

```
访问 container.UserPage
       │
       ▼
 [ 触达点识别 ] ───► extractSubModules(graph, "UserPage")
                           │
                           ├── 1. 递归提取 UserPage 正向依赖 (UserService, UserApi...)
                           └── 2. 编译极简局部子图并即刻装配
```

---

## API 参考 (API Reference)

### `createContainer(graph, options)`

创建高阶代理容器。

```typescript
export interface CreateContainerOptions {
  /**
   * 加载策略：
   * - "eager": 全量预热 (容器创建时立刻初始化全量模块)
   * - "demand": 极速按需 (基于 container.prop 属性访问按需切片拉起)
   */
  strategy: "eager" | "demand";

  /**
   * 执行引擎：
   * - "async": 反应式异步拓扑并发引擎
   * - "turbo": 纯同步直通零 Promise 引擎
   */
  mode: "async" | "turbo";
}

export const createContainer: (
  graph: CompiledModuleGraph,
  options: CreateContainerOptions
) => Record<string, unknown>;
```

---

### `extractSubModules(graph, ...entryPoints)`

底层正向子图切片提取器工具函数。

```typescript
export const extractSubModules: (
  graph: CompiledModuleGraph,
  ...entryPoints: string[]
) => { key: string; module: IOCModule }[];
```

---

## 许可证 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
