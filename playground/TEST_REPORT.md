# Path-IoC 全量功能与多构建工具覆盖测试报告

本报告详细说明如何**一键复现并跑完 Path-IoC 框架的所有功能测试、真实 JS 逻辑断言测试与构建工具兼容性测试**，并提供了每个步骤的**执行命令与预期控制台输出**。

---

## 🚀 快速开始：一键跑完所有测试 (One-Command Test Runner)

在项目根目录下，直接执行以下单条命令，即可全自动按序运行单测、真实 JS 逻辑断言测试、Node 边缘捕获测试、Vite/Webpack/Rspack 三大构建工具打包以及微前端 Topology Merge 测试：

```bash
pnpm run test:all
```

---

## 🏛️ 测试工程架构概览

`playground/` 目录划分为 3 个物理隔离、职责名副其实的测试工程：

```
playground/
├── full-test-app/           # 1. 主线闭环、真实 JS 逻辑断言与多构建工具打包 (Vite, Webpack, Rspack) + Pack 物理发版
├── modules-merge-test-app/  # 2. 跨工程 / 微前端拓扑图 Merge (合并) 真实逻辑断言
└── container-test-app/      # 3. 降维模式对比 & 边缘 Fail-Fast 异常捕获套件 (纯 Node.js)
```

---

## 📊 15 大全量功能测点与代码物理映射表

| 序号 | 核心功能测点 | 源码物理位置 | 对应测试工程 / 验证命令 | 预期结果 |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **DAG 拓扑排序与依赖解析** | [`packages/core/src/graph.ts#L224-L235`](../packages/core/src/graph.ts#L224-L235) | `pnpm test` | **PASS** |
| **2** | **循环依赖 Fail-Fast 捕获** | [`packages/core/src/graph.ts#L200-L222`](../packages/core/src/graph.ts#L200-L222) | `pnpm --filter container-test-app run test` | **PASS** (捕捉 `[Circular Dependency]`) |
| **3** | **非法模块 / 缺失 `main` 校验** | [`packages/core/src/graph.ts#L116-L123`](../packages/core/src/graph.ts#L116-L123) | `pnpm --filter container-test-app run test` | **PASS** (捕捉 `['/badModule'] 'main' is not a function`) |
| **4** | **`skip` 忽略与 `order` 权重** | [`packages/core/src/graph.ts#L109-L115`](../packages/core/src/graph.ts#L109-L115) | `pnpm test` | **PASS** |
| **5** | **Demand Proxy 按需懒加载** | [`packages/container/src/index.ts#L98-L153`](../packages/container/src/index.ts#L98-L153) | `pnpm --filter container-test-app run test` | **PASS** (Getter 触达触发异步装配) |
| **6** | **Turbo 纯同步与异步强拦截** | [`packages/container/src/index.ts#L64-L67`](../packages/container/src/index.ts#L64-L67) | `pnpm --filter container-test-app run test` | **PASS** (捕捉 `[Turbo Mode] Async module...`) |
| **7** | **Vite 构建工具支持与真实逻辑断言** | [`packages/unplugin/src/index.ts#L236-L255`](../packages/unplugin/src/index.ts#L236-L255) | `pnpm --filter full-test-app run test` | **PASS** (100% JS 真实逻辑与 DOM 渲染断言) |
| **8** | **Webpack 5 构建工具支持 (`require.context`)** | [`packages/unplugin/src/index.ts#L155-L198`](../packages/unplugin/src/index.ts#L155-L198) | `pnpm --filter full-test-app run build:webpack` | **PASS** (compiled in ~250ms) |
| **9** | **Rspack 构建工具支持 (`require.context`)** | [`packages/unplugin/src/index.ts#L215-L233`](../packages/unplugin/src/index.ts#L215-L233) | `pnpm --filter full-test-app run build:rspack` | **PASS** (compiled in ~60ms) |
| **10**| **`@path-ioc/pack` 物理注册表导出** | [`packages/pack/src/index.ts`](../packages/pack/src/index.ts) | `pnpm --filter full-test-app run build:vite` | **PASS** (物理文件成功导出) |
| **11**| **跨工程 / 微前端拓扑 Merge 真实逻辑断言** | [`packages/core/src/graph.ts#L150-L244`](../packages/core/src/graph.ts#L150-L244) | `pnpm --filter modules-merge-test-app run test` | **PASS** (跨包 DB/Order/Payment 调用与 DOM 断言) |
| **12**| **AOP 零配置切面与 ORM 动态搜集** | `playground/full-test-app/src/modules/` | `pnpm --filter full-test-app run test` | **PASS** (成功拦截 createOrder 与收集 2 个 Schema) |
| **13**| **短名称歧义冲突 (Ambiguous Short Names) 抛错** | [`packages/core/src/graph.ts#L174-L180`](../packages/core/src/graph.ts#L174-L180) | `pnpm test` | **PASS** (精准抛出 `has an ambiguous dependency`) |
| **14**| **歧义模块属性安全过滤 (仅挂载全路径)** | [`packages/core/src/graph.ts#L323,L364`](../packages/core/src/graph.ts#L323) | `pnpm test` | **PASS** (歧义短名称不会误覆盖属性) |
| **15**| **编译图复用与多请求上下文隔离** | [`packages/core/src/graph.ts#L287`](../packages/core/src/graph.ts#L287) | `pnpm test` | **PASS** (多请求依赖图 zero-recompile) |

---

## 🛠️ 分步测试指南与预期输出

如果你希望单独测试某个特定模块、真实逻辑断言或构建工具，可以参照以下命令与预期控制台输出：

### 1. 核心单元测试套件 (`pnpm test`)

```bash
pnpm test
```
**预期输出**：
```text
 ✓  unit  packages/core/test/graph.test.ts (6 tests)
 ✓  unit  packages/pack/test/pack.test.ts (1 test)
 ✓  unit  packages/container/test/extract.test.ts (1 test)
 ✓  unit  packages/container/test/container.test.ts (5 tests)
 ✓  unit  packages/unplugin/test/unplugin.test.ts (3 tests)

 Test Files  5 passed (5)
      Tests  16 passed (16)
```

---

### 2. 真实 JS 运行时逻辑断言测试 (`full-test-app`)

```bash
pnpm --filter full-test-app run test
```
**预期控制台输出（真实执行 AOP 拦截、DB 连接、ORM 实体搜集与 DOM 渲染断言）**：
```text
👉 [full-test-app] Executing real JS runtime test...
[ORM] Synced Schemas for 2 entities: [ 'orders', 'users' ]
2. [Infra] Redis Status: READY.
1. [Infra] DB Type: PostgreSQL initialized.
==================================================
🚀 [full-test-app] Core & Unplugin Boot Complete!
Order Result: { orderId: 'ORD_1786647712168', item: 'MacBook Pro M4', amount: 19999, dbStatus: 'CONNECTED' }
==================================================

 ✓ src/test-runtime.test.ts (1 test) 60ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

---

### 3. 跨工程 / 微前端拓扑 Merge 真实逻辑断言测试 (`modules-merge-test-app`)

```bash
pnpm --filter modules-merge-test-app run test
```
**预期控制台输出（真实执行跨包远程 DB、远程 orderService 与本地 payment 逻辑及 DOM 断言）**：
```text
👉 [modules-merge-test-app] Executing real JS runtime merge test...
[ORM] Synced Schemas for 2 entities: [ 'orders', 'users' ]
2. [Infra] Redis Status: READY.
1. [Infra] DB Type: PostgreSQL initialized.
==================================================
🚀 [full-test-app] Core & Unplugin Boot Complete!
==================================================
[Cross-App Payment] Processing payment for ORD_123, amount: $9999 via PostgreSQL
==================================================
🚀 [modules-merge-test-app] Cross-App Topology Merged Successfully!
Remote DB: PostgreSQL
Remote OrderService Result: { orderId: 'ORD_...', item: 'iPhone 16 Pro', amount: 9999 }
Local Payment Result: { paymentId: 'PAY_...', status: 'PAID' }
==================================================

 ✓ src/test-runtime.test.ts (1 test) 57ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

---

### 4. 降维模式与边缘 Fail-Fast 异常捕获测试 (`container-test-app`)

```bash
pnpm --filter container-test-app run test
```
**预期控制台输出**：
```text
==================================================
🚀 [playground/container-test-app] Extension Modes & Edge Case Fail-Fast Test
==================================================

[Test 1] Container Demand Proxy Mode:
👉 Triggering lazy-load for 'order'...
✅ Demand Container Order Result: { orderId: 'ORD_CONTAINER_888', db: { name: 'PostgreSQL' }, user: { name: 'UserService' } }

[Test 2] Container Turbo Mode Fail-Fast Error Catch:
✅ Expected Turbo Fail-Fast Error Caught: [Turbo Mode] Async module '/infra/db' is not supported in turbo mode. Use async mode instead.

[Test 3] Edge Case Fail-Fast: Circular Dependency Catch:
✅ Expected Cycle Error Caught: [Circular Dependency] A cycle was detected: /modA -> /modB -> /modA

[Test 4] Edge Case Fail-Fast: Missing 'main' Function Catch:
✅ Expected Invalid Module Error Caught: [/badModule] 'main' is not a function.

==================================================
🎉 All Container & Edge Case Tests Passed!
==================================================
```

---

### 5. 多构建工具独立打包编译测试 (`full-test-app`)

```bash
# Vite 打包
pnpm --filter full-test-app run build:vite

# Webpack 5 打包与 Node 运行验证
pnpm --filter full-test-app run build:webpack

# Rspack 独立打包
pnpm --filter full-test-app run build:rspack
```
