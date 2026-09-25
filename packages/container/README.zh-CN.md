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

> ⚠️ **【历史演进实验包 / 非生产推荐包】**  
> `@path-ioc/container` 是早期为了对比评测传统 JS IoC 框架（如 InversifyJS 等）的同步 getter 懒加载机制而实现的**概念对比与基准实验包**。由于内部存在严格的按需属性串行互斥约束，**无生产级通用推荐价值，目前无活跃迭代规划**。  
> 生产业务工程统一推荐直接使用 [`@path-ioc/core`](../core) 与 [`@path-ioc/unplugin`](../unplugin) 的 `createModularContainer`。

---

## 核心设计哲学：物理分治与按需切片 (Architecture Philosophy)

### 1. 正统静态拓扑 vs 扩展按需代理

在工业级生产实践中（如 Java Spring 默认 `eager-singleton`），启动期全量 DAG 拓扑预热是保持系统稳定性、依赖完整性与最高运行性能的黄金标准。因此：

- **正统 Core (`@path-ioc/core`)**：坚持绝对严谨——静态图编译、DFS 严谨 Fail-Fast 拦截循环依赖、原生 `async/await` 拓扑并发，杜绝隐式解环遮蔽架构设计缺陷；
- **扩展 Container (`@path-ioc/container`)**：探索性扩展——通过包装高阶 Proxy 代理容器，将“加载范围 (Eager/Demand)”与“执行引擎 (Async/Turbo)”拆解为 **2 维物理正交矩阵**，对标传统 IoC 框架的按需加载模式。

---

### 2. 物理不可调和律与物理分治 (`async` vs `turbo`)

在 JavaScript/TypeScript 单线程模型中，**“异步初始化 (Async)”** 与 **“运行期动态依赖感知 (Dynamic Sensing)”** 在物理上是不可调和的：

- **物理原因**：JS 的 Proxy Dynamic Getter（`container.foo`）本质上是纯同步的，无法在纯同步代码中间“挂起线程去异步等待”。
  - 如果一个模块需要异步初始化（`async main`），就**必须在唤醒前通过 `dependencies` 构建静态图**，才能编排 DAG 拓扑顺序提前 `await`；
  - 如果允许不写 `dependencies` 靠运行期动态感知，那么在 `async` 模式下一旦访问未就绪的异步节点，就必然会导致返回 `Promise` 未决遗留或微任务死锁。

Path-IoC 通过物理分治实现优雅解法：
- **`async` 模式（支持异步，必须声明 `dependencies`）**：显式声明 `dependencies` 编排静态 DAG 拓扑图，获得 **100% 原生反应式拓扑并发**（通过 `Promise.all` 级联异步唤醒）；
- **`turbo` 模式（纯同步直通，支持免写 `dependencies`）**：**严禁任何异步 `main` 工厂**（若返回 Promise 直接抛出 `[Turbo Mode] Async module is not supported` 异常）。由于纯同步调用栈无需挂起等待，**完全支持免写 `dependencies`**，依托 Proxy Dynamic Getter 在访问属性时同步深搜并求值装配；若仅在运行期方法中相互引用，可自然避免死锁；但若在 `main` 初始化期发生同步强依赖闭环，会触发调用栈溢出或由静态 DFS Fail-Fast 报错拦截。

---

## 4 大引擎调度范式矩阵 (Evaluation Matrix)

`@path-ioc/container` 通过 `strategy` (加载范围: `eager` | `demand`) $\times$ `mode` (执行引擎: `async` | `turbo`) 划分为 4 种调度范式：

```
                    ┌─────────────────────────┬─────────────────────────┐
                    │      mode: "async"      │      mode: "turbo"      │
                    │  (反应式拓扑并发引擎)   │  (纯同步直通零Promise)  │
┌───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "eager" │  ① 全量异步拓扑预热     │  ② 纯同步预热 + 直通    │
│ (全量加载)        │  (挂载 $ready 句柄)     │  (高频同步工具库/测试)  │
├───────────────────┼─────────────────────────┼─────────────────────────┤
│ strategy: "demand"│  ③ 极简子图按需提取     │  ④ 纯同步直通零延迟     │
│ (极速按需)        │  (严格串行互斥保护)     │  (极速 CLI/同步测试)    │
└───────────────────┴─────────────────────────┴─────────────────────────┘
```

| 组合范式 (`strategy` $\times$ `mode`) | 物理触发机制 | 关键物理特性 | 适用场景说明 |
| :--- | :--- | :--- | :--- |
| **`eager` + `async`** | 容器创建时立刻触发 | 全量 DAG 拓扑并发预热，容器挂载非可枚举 `container.$ready` 追踪句柄 | 异步全量预热评测 |
| **`eager` + `turbo`** | 容器创建时立刻触发 | 启动时按拓扑顺序纯同步完成求值预热；若遇异步模块直接抛错 | 纯同步工具库测试 |
| **`demand` + `async`** | 外部按需触达触发 (`container.UserPage`) | 触达点提取子图，属性访问返回 Promise。**警告**：存在串行互斥保护，必须串行 `await`，严禁使用 `Promise.all` 并发访问多个未就绪属性 | 按需异步切片实验 |
| **`demand` + `turbo`** | 外部按需触达触发 (`container.foo`) | 无需 `await` 属性访问，自动算子图纯同步求值；遇环同样 Fail-Fast 报错 | 极速 CLI 命令行工具、纯同步测试 |

---

## 主流 IoC 框架选型对比矩阵 (Selection Matrix)

| 对比维度 | **NestJS** | **InversifyJS** | **Awilix** | **@path-ioc/core** *(生产推荐)* | **@path-ioc/container** *(实验包)* |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **底层依赖契约** | `@Injectable()` + TS 装饰器 | `@injectable()` + TS 装饰器 | 正则匹配形参 + Proxy | **物理路径契约 + 纯闭包工厂 + 静态图** | **物理路径契约 + 高阶代理** |
| **代码侵入性** | 强侵入 (框架装饰器与基类) | 强侵入 (`@inject` 装饰器) | 低侵入 (按形参匹配) | **零侵入** (纯函数导出) | **零侵入** (纯函数导出) |
| **按需/懒加载范式** | `LazyModuleLoader` | `@lazyInject` | Proxy 模式按需实例化 (同步) | 启动期静态 DAG 预热 | **正向极简子图按需切片** (`extractSubModules`) |
| **循环依赖处理** | `forwardRef()` (遇 async 易死锁) | `@lazyInject()` 延迟解析 | Dynamic Proxy Getter (同步) | **DFS Fail-Fast 严格拦截** | **DFS Fail-Fast 严格拦截** |
| **生产推荐状态** | 推荐 | 推荐 | 推荐 | **生产标准推荐** | ⚠️ **历史实验包 / 非生产推荐** |

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

*(注：`extractSubModules` 属于包内部私有算法函数，不对外导出，由 `demand` 模式 Proxy Getter 在访问属性时自动调度)*。

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

*(注：在 `eager + async` 模式下返回的对象挂载了不可枚举的 `$ready: Promise<void>`)*。

---

## 许可证 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
