---
title: "深度对比 InferDI：免构建插件是否等同于“轻量”？从装配复杂度、类型代偿到应用级拓扑网格"
description: "基于软件工程架构学与类型系统理论，深度剖析 Path-IoC 与 InferDI 的本质差异：从装配复杂度、单元测试隔离性、老工程渐进式接管与请求级吞吐，到类型累加器代偿、DAG 图算法与三大依赖查找模式。"
head:
  - - meta
    - name: keywords
      content: inferdi vs path-ioc, typescript ioc, typescript di, lightweight ioc, vitest ioc, hono di, composition root, dependency lookup
---

# 深度对比 InferDI：免构建插件是否等同于“轻量”？从装配复杂度、类型代偿到应用级拓扑网格

> **“在软件工程中，最昂贵的复杂度从来不是构建工具链中一次性声明的编译插件，而是随着系统规模线性膨胀、必须由人工持续维护的胶水代码与上下文切换负担。”**

在现代前端与全栈工程中，构建流水线正在向纯 AST 类型擦除（Type Stripping）与原生极速编译工具（Vite、ESBuild、SWC、Rolldown）全面演进。这一变革直接动摇了传统 TypeScript IoC 框架（如 NestJS、InversifyJS）的立足基石——由于深度依赖 `reflect-metadata` 与实验性类装饰器（Experimental Decorators），它们在现代打包工具下极易出现元数据缺失与运行时未定义崩溃。

在此背景下，以 **InferDI** 为代表的“现代纯类型推导派”应运而生：其宣称“零外部依赖、无需装饰器、依托纯 TypeScript 类型推导检验依赖图”，在社区中获得了相当的关注。

然而，从严谨的软件架构学与系统复杂度理论出发：**“免构建插件（No Build Step）”是否真的等同于“轻量”？**

本文将秉持严密的学术与工程思辨态度，**由浅入深**地进行双向透视：
1. **工程实践维度**：量化分析新增业务模块的变更集规模（$O(N)$ vs $O(1)$）、单元测试与集成测试的隔离成本、存量老项目的渐进式接管模型，以及请求级容器在生产高并发下的吞吐边界；
2. **理论机制维度**：深入类型系统底层，剖析 InferDI 的“类型状态累加器”如何将图论拓扑计算的负担转嫁给开发者；正式确立**“依赖查找（IoC-DL）三大经典模式”**，证明推式注入（Push DI）在动态聚合与切面治理场景下的理论局限。

---

## 篇章一：工程实践维度的物理开销分析

在软件工程实践中，脱离代码变更集与维护摩擦力去空谈框架特性往往会陷入认识误区。一个依赖治理系统的优劣，首先体现在工程生命周期内的各项物理量度上。

```
┌────────────────────────────────────────────────────────────────────────┐
│                        实战工程维度的物理开销对照                       │
├──────────────────────────────────┬─────────────────────────────────────┤
│       InferDI (集中式接线板)      │        Path-IoC (自组织网格)         │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 模块变更集：$O(N)$ 集中修改组合根 │ 模块变更集：$O(1)$ 局部文件自治     │
│ 拓扑排班：开发者人脑手动保证顺序 │ 拓扑排班：DFS 图算法微秒级确定性计算│
│ 单元测试：Class 构造注入         │ 单元测试：纯函数闭包字面量注入      │
│ 老项目接入：手动包裹新对象       │ 老项目接入：路由 Merge 与通配网关接管│
│ 高并发单次开销：递归实例化       │ 高并发单次开销：21.2µs 纳秒级静态复用│
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

### 1. 模块扩展的文件变更集与装配开销（Modularity & Boilerplate Complexity）

评估开发体验最严谨的物理指标，是**新增或重构一个业务单元时，引发的全工程文件修改行数与上下文切换次数**。

假设系统需要增加一个标准领域服务：`OrderService` 依赖 `Db` 与 `UserService`。

#### InferDI 的工程开销：集中式组合根（Composition Root）带来的 $O(N)$ 线性负债
在 InferDI 体系中，编写完业务类仅完成了第一步。按照 Mark Seemann 提出的经典组合根模式（Composition Root），开发者必须将装配逻辑显式集中在单一入口处：

```typescript
// 1. 编写领域业务单元：src/services/order.ts
export class OrderService {
  constructor(private db: Db, private user: UserService) {}
  async create(item: string) { /* ... */ }
}

// 2. 上下文切换：打断心流，定位到中心装配文件 src/container.ts
import { Db } from "./services/db";
import { UserService } from "./services/user";
import { OrderService } from "./services/order"; // <-- 手动导入模块定义

export const container = new Container()
  .registerClass("db", Db, [])
  .registerClass("user", UserService, ["db"])
  // <-- 关键限制：开发者必须在思维中预先完成拓扑排序，强制保证依赖项在前、消费者在后
  .registerClass("order", OrderService, ["db", "user"]);
```

* **复杂度特征**：装配维护代码量为 **$O(N)$**。工程中每引入一个业务模块，`container.ts` 都必须新增对应的 `import` 语句与 `.registerClass()` 链式调用。
* **思维负担**：InferDI 的泛型累加机制要求书写顺序必须与拓扑依赖顺序严格一致。一旦顺序颠倒，TypeScript 编译器便会产生类型不匹配错误，导致开发者被迫承担人肉拓扑排班的认知开销。

#### Path-IoC 的工程开销：物理路径即契约的零样板自组织（$O(1)$ 装配复杂度）
Path-IoC 遵循约定优于配置（Convention over Configuration）的现代架构准则。在工程构建配置（如 `vite.config.ts`）中一次性引入 `@path-ioc/unplugin` 插件后：

```typescript
// 直接在独立文件 src/modules/order-service/index.ts 中完成定义：
export const dependencies = ["db", "user"];

export const main = ({ db, user }: ModularContainer) => {
  return {
    async create(item: string) {
      const currentUser = await user.getCurrent();
      return db.insert({ item, userId: currentUser.id });
    }
  };
};
```

* **复杂度特征**：装配维护代码量为 **$O(1)$**。开发者无需维护中心化注册表，无需编写跨模块引用，物理文件落盘即自动注册。
* **思维负担**：模块仅声明自身所需的 Mesh ID（契约标识），顺序完全解耦。后台编译器协同机制在文件变更时，以毫秒级 AST 增量分析自动同步全局强类型契约 `ModularContainer`。

---

### 2. 测试隔离性与执行代价（Testability & Verification Cost）

测试体系的摩擦力，是检验架构解耦程度的试金石。如果业务单元无法脱离重型容器独立执行验证，测试成本将迅速退化。

#### 场景 A：单元测试（Unit Isolation Testing）
* **InferDI**：由于业务单元采用普通的 POJO/Class 构造器，测试时可脱离容器上下文，直接利用构造函数注入 Mock 实例：
  `new OrderService(mockDb, mockUser)`。
* **Path-IoC**：业务单元本质上是一等纯函数工厂闭包，单元测试**同样完全无需拉起容器或编译器插件**。通过纯数据字面量传入 Mock 依赖，无任何类继承与原型链查找负担：

```typescript
// test/order-service.test.ts (独立运行，零框架上下文依赖)
import { main } from "../src/modules/order-service";

test("创建订单成功", async () => {
  const mockDb = { insert: vi.fn().mockResolvedValue({ id: "order_1" }) };
  const mockUser = { getCurrent: () => ({ id: "u_999" }) };

  // 直接执行工厂函数，以字面量注入 Mock 依赖
  const orderService = main({ db: mockDb, user: mockUser } as any);
  const result = await orderService.create("MacBook");

  expect(result.id).toBe("order_1");
  expect(mockDb.insert).toHaveBeenCalled();
});
```

#### 场景 B：集成与端到端测试（Subsystem & Integration Testing）
当需要验证几十个服务级联装配、异步初始化时序与 AOP 代理拦截的综合状态时：
* **InferDI**：必须在测试脚本中重新模拟执行一份庞大的 `container.ts` 注册逻辑，或者直接导入具有全局副作用的共享容器实例，测试上下文隔离较为脆弱；
* **Path-IoC**：现代全栈工程主流采用 **Vitest** 或 **Vite-node** 作为测试驱动器。由于 `@path-ioc/unplugin` 原生兼容 Vite 管道，测试套件继承相同的编译插件，使得 `virtual:modular-container` 在单测中原生可用：

```typescript
import { createModularContainer } from "virtual:modular-container";

test("全网格拓扑集成测试", async () => {
  // 微秒级完成全拓扑有向无环图的并发点火装配
  const container = await createModularContainer();
  const res = await container.orderService.create("iPhone");
  expect(res).toBeDefined();
});
```
运行 `npx vitest`，集成测试天然获得隔离的独立容器实例，无需编写任何额外的测试装配桩代码。

---

### 3. 存量工程的渐进式演进与聚合器模式（Progressive Adoption & The Strangler Pattern）

架构评估中最常见的现实阻力是：“是否必须推倒现有系统重构，才能享受新架构红利？”

答案是否定的。Path-IoC 完美契合 Martin Fowler 提出的**绞杀者模式（Strangler Fig Pattern）**，支持以极低风险渐进式嵌入老系统：

#### 前端路由演进：两种聚合姿态
老页面与存量组件继续沿用原有的相对路径 `import` 维持现状，新增页面则全面交由 Path-IoC 网格托管：

* **姿态 A（宿主解耦 Merge）**：
  在宿主路由声明中合并。Mesh 网格完全不感知老系统的物理结构，保持纯粹的逻辑正交：
  ```typescript
  // src/router/index.ts (宿主入口)
  import { legacyRoutes } from "./legacy-routes";
  import { createModularContainer } from "virtual:modular-container";

  const container = await createModularContainer();
  export const routes = [
    ...legacyRoutes,              // 1. 存量老路由维持现状
    ...container.autoPageRoutes,  // 2. 容器内部聚合器生成的增量路由树
  ];
  ```

* **姿态 B（Mesh 闭环 Merge）**：
  将存量老路由配置作为入参注入 Mesh 的路由聚合模块中，宿主入口实现“一行点火”的极致纯粹：
  ```typescript
  // src/modules/app-router/index.ts (Mesh 内部聚合器)
  import { legacyRoutes } from "@/legacy/routes";

  export const dependencies = (all: string[]) => all.filter(p => p.startsWith("/pages/"));
  export const main = (container: ModularContainer) => {
    // 内部完成路由拓扑计算并合并输出，宿主入口完全免去组装代码
    return buildFinalRoutes(legacyRoutes, container);
  };
  ```

#### 聚合器模式（Aggregator Pattern）的多维实战范式
路由只是聚合器模式最显性的应用之一。在实际中大型工程中，该模式能够系统性消除传统架构中海量的手动枚举配置：
1. **动态表单控件（FieldInput）聚合**：
   在动态表单或低代码渲染引擎中，传统模式必须手动维护一个巨大的组件字典 `import { Text, Number, DatePicker, Select... }`。在 Path-IoC 中，只要在 `src/modules/fields/` 创建组件，表单生成器通过契约动态发现全量控件，新增控件**完全无需修改任何注册文件**；
2. **校验规则网格（Validation Logic）聚合**：
   业务表单校验器自动扫描捕获所有 `/validators/` 规则闭包，运行时按字段契约自动织入与并行求值；
3. **后端 ORM 实体（Schema / Entity）自动装配**：
   在 Drizzle、Prisma 或 TypeORM 初始化时，传统模式必须手动维护实体清单 `entities: [User, Order, Payment, ...]`，遗漏一项即可引发运行时元数据断裂。在 Path-IoC 中，数据库初始化模块依据 `all.filter(p => p.startsWith('/models/'))` 自动发现全量实体，实现了领域模型层面的完全自治。

#### 后端通配网关接管模式
已有的老 Express / Koa / Hono API 维持原样处理，新业务线通过通配路由挂载到容器网关：

```typescript
// src/server.ts
import { Hono } from "hono";
import { legacyUserHandler, legacyOrderHandler } from "./legacy-handlers";
import { createModularContainer } from "virtual:modular-container";

const app = new Hono();

// 1. 存量老 API 维持原样运行，隔离存量风险
app.get("/api/v1/user", legacyUserHandler);
app.post("/api/v1/order", legacyOrderHandler);

// 2. 新业务路径全部交由 Path-IoC 动态网格接管
app.all("/api/v2/*", async (c) => {
  const container = await createModularContainer({ requestContext: c });
  return container.apiAggregator(); // 内部自动契约映射 /api/v2/xxx 物理模块
});

export default app;
```
该范式使存量系统可以在零业务中断的前提下，安全启动现代化模块治理演进。

---

### 4. 微秒级性能在生产高并发下的真实意义（Per-Request Isolation & Throughput）

在长期运行、状态常驻的传统单体后端中，容器初始化的几十毫秒差异常被误认为对业务无感知。然而，在现代全栈架构与边缘计算（Cloudflare Workers、Serverless）中，微秒级装配是**支撑高并发隔离模型的关键生命线**：

* **请求级上下文隔离（Per-Request Container Isolation）**：
  在上述的 `app.all("/api/*")` 生产模式中，为从根本上避免单线程事件循环（Event Loop）中的上下文串扰（如用户认证凭据、追踪上下文），**每一个并发 HTTP 请求到达时，系统必须为之生成一个独立、洁净的临时容器实例**；
* **吞吐量临界测算**：
  * 若容器初始化耗时为 **3 ~ 5 毫秒**（传统基于复杂反射、原型链重组或深层递归绑定的 DI 容器），在 5,000 QPS 的并发压力下，单单“创建容器”这一纯 CPU 密集型开销，便会直接耗尽单线程 Event Loop 的全部算力，引发灾难性的排队阻塞与 P99 延迟恶化；
  * Path-IoC 依赖进程启动时的**单次静态图编译缓存**，在后续每个请求的动态装配中，仅仅执行扁平的闭包调用与拓扑填充，平均耗时仅为 **`21.2 微秒（µs）`**（即 0.02 毫秒）。这意味着即使面对数千 QPS，“每请求纯隔离容器”对宿主 CPU 资源的占用比例亦趋近于零。

---

## 篇章二：类型系统理论与架构世界观剖析

在度量了工程实操维度的差异之后，我们必须进一步下潜至底层机制：**为什么 InferDI 必然受制于集中式组合根？为什么 Path-IoC 能够原生支持三大高级依赖查找模式？**

---

### 5. 类型系统代偿分析：链式累加器如何将拓扑排序转嫁给人脑？

InferDI 最核心的卖点在于“零构建插件，完全依托纯 TypeScript 类型推导完成检查”。然而，在类型系统理论中，**计算的复杂度守恒**——不在编译期通过外部 AST 工具承担计算，就必然要通过某种语法形式让开发者承担代偿。

#### InferDI 的泛型状态机模型（Type-State Accumulator）
InferDI 利用了流式接口的类型累加机制：

```typescript
class Container<TContext = {}> {
  registerClass<K extends string, TDeps extends (keyof TContext)[], TInstance>(
    key: K,
    impl: new (...deps: Resolve<TContext, TDeps>) => TInstance,
    deps: TDeps
  ): Container<TContext & Record<K, TInstance>> { ... }
}
```
每一行 `.registerClass()` 实际上是在原有的泛型上下文 `TContext` 之上，产生一个新的交叉类型 `TContext & Record<K, TInstance>`。

#### 理论局限性与工程代价：
1. **拓扑顺序的强力语法绑架**：
   因为泛型上下文是严格单向、线性累加的，被依赖的项在物理代码行数上**必须**出现在消费项之前。若先写 `orderService`，后写 `db`，由于 `db` 尚未存在于当前表达式的 `TContext` 泛型字典中，TypeScript 编译器将立刻抛出类型错误。**InferDI 并没有真正的图论拓扑排序引擎；它强行迫使开发者在编写代码时，在脑中完成整张图的后序遍历！**
2. **模块隔离的物理断裂（无法跨 ESM 模块注册）**：
   TypeScript 的局部类型推导作用域仅限于单一表达式链路。若开发者试图在 `user.ts` 与 `order.ts` 中分别对一个全局容器执行 `.registerClass()`，TypeScript 的编译器在语言规范层面上**根本无法跨 ESM 模块自发合并这些局部累加的泛型状态**。因此，InferDI 官方文档只能将全部装配逻辑收敛在单一组合根文件中，这在数学逻辑上是无法破局的必然结果。

#### Path-IoC 的编译器-运行时协同设计（Compiler-Runtime Co-design）
Path-IoC 拒绝在脆弱且容易触发 `Type instantiation is excessively deep` 递归限制的 TS 局部推导体系中硬跑全图运算，而是采用分工解耦模型：
* **编译期（`@path-ioc/unplugin`）**：在构建或开发态后台，通过高效的 AST 解析器扫描模块的物理路径与 `dependencies` 契约，直接生成全局合法的声明文件 `ModularContainer`；
* **运行期（`@path-ioc/core`）**：模块声明完全允许乱序放置。`@path-ioc/core` 基于成熟的 **DFS（深度优先遍历）后序压栈拓扑排序算法**，在纳秒至微秒级区间内自动求出最优拓扑执行序列，并在发现环路时执行 Fail-Fast 严格拦截。

---

### 6. 范式分野：推式注入 (Push DI) vs 拉式查找 (Pull DL) 的三大模式矩阵

长期以来，工业界习惯将所有控制反转统一冠以“依赖注入（DI）”之名。然而，Martin Fowler 早在架构奠基之作中便明确区分了**依赖注入（Dependency Injection）**与**依赖查找（Dependency Lookup, IoC-DL）**：

* **推式注入（Push DI / InferDI 的核心假设）**：
  组件被动接受外部注入的已知实例。组件必须精确声明每一个依赖项的具体 Token。**它天然仅适用于点对点的确定性拓扑，无法表达“动态模式匹配与集合捕获”。**
* **拉式查找（Pull IoC-DL / Path-IoC 的核心能力）**：
  组件主动向环境声明所需模块的集合契约特征，由拓扑引擎动态解析子图并完成装配。

在复杂的工业级系统设计中，依赖查找在数学上可严谨归纳为由**“宿主副作用”**与**“返回值”**构成的**二维正交三大经典模式**：

| 模式 | 宿主副作用 | 返回值 | 架构职责与典型场景 |
| :--- | :---: | :---: | :--- |
| **1. AOP 模式** | **无** | **无** | **切面治理网格**：动态扫描目标模块集合，以高阶函数或 Proxy 织入鉴权、耗时追踪与异常屏蔽。纯粹在网格内部完成闭环，对宿主无外部副作用，无返回值。 |
| **2. 聚合器模式** | **无** | **有** | **契约功能汇总**：动态捕获符合物理或命名契约的模块集合（如 `/api/*`、表单控件、ORM 实体），汇总输出一个统摄调度的路由分发器或元数据字典。对宿主无副作用，输出纯返回值。 |
| **3. 启动器模式** | **有** | **无** | **自治点火触发**：作为 DAG 有向无环图的终点叶子节点，连接外部宿主世界（如绑定 HTTP 端口、连接消息队列、启动 Cron 定时任务）。向外部宿主产生明确副作用，无返回值。 |

#### Path-IoC 对三大模式的声明式承载：
```typescript
// 1. AOP 模式（无副作用，无返回值）：切面网格织入
export const dependencies = (all: string[]) => all.filter(p => p.includes("/services/"));
export const main = (container: ModularContainer) => {
  for (const [key, service] of Object.entries(container)) {
    container[key] = wrapWithTelemetry(service);
  }
};

// 2. 聚合器模式（无副作用，有返回值）：接口路由网关
export const dependencies = (all: string[]) => all.filter(p => p.startsWith("/api/"));
export const main = (container: ModularContainer) => {
  return async () => {
    const { requestContext } = container;
    const targetModule = container[requestContext.req.path];
    return await targetModule();
  };
};

// 3. 启动器模式（有副作用，无返回值）：自闭环点火
export const dependencies = ["apiAggregator", "mqConsumer"];
export const main = ({ mqConsumer }: ModularContainer) => {
  mqConsumer.startListening(); // 产生宿主外部真实副作用
};
```

#### 为什么 InferDI 在架构层面无法承载上述模式？
若开发者试图在 InferDI 这类推式注入容器中实现“聚合器模式”或“AOP 模式”，将遭遇系统性阻碍：
1. **类型推导系统的反噬**：
   InferDI 依靠静态字面量元组（如 `['db', 'user'] as const`）推导构造参数。一旦试图使用 `allTokens.filter(...)` 进行动态模式匹配，推导结果必然退化为不具备元组长度信息的泛型 **`string[]`**，导致类型推导链当场崩溃，开发者只能使用 `as any` 彻底放弃类型安全；
2. **违背开闭原则（Open-Closed Principle, OCP）的伪聚合**：
   为强保 InferDI 的类型检查，聚合器类必须在构造函数中显式枚举所有子类入参：
   `constructor(private userApi: UserApi, private orderApi: OrderApi, private payApi: PayApi ...)`。
   这意味着每新增一个 API 模块，开发者都必须被迫开膛破肚修改聚合器的核心签名，开闭原则荡然无存；
3. **退化为服务定位器（Service Locator）的运行时隐患**：
   若将 `container` 实例直接作为黑盒依赖注入组件内部，在运行时动态调用 `container.resolve(token)`，将直接绕开 InferDI 核心的编译期生命周期守卫（Lifetime Guards，如单例捕获 Scoped 的静态拦截），彻底失去推式注入的理论优势。

---

### 7. 架构世界观的分野：外部“零件贩卖机” vs 内部“自组织网格”

剖析启动入口的交互形式，可以洞察两者的终极架构世界观：

#### InferDI：宿主驱动的零件贩卖机（Host-Driven Service Locator）
```typescript
// 业务逻辑暴露在框架外部：
const container = new Container().register(...);

// 外部宿主向容器主动“索取”零件：
const userService = container.resolve("userService");
userService.doSomething(); 
```
* **本质**：容器是一个被动的外部**零件库**。业务编排主干与宿主环境深度交织，控制反转并未在应用全局彻底发生。

#### Path-IoC：网格自治型架构（Mesh-Autonomy Paradigm）
```typescript
// 1. 业务逻辑与系统启动逻辑全部收敛在模块网格内 (src/modules/start-app/index.ts)：
export const dependencies = ["orderService"];
export const main = ({ orderService }: ModularContainer) => {
  orderService.create("MacBook");
};

// 2. 宿主入口 (src/main.ts)：
import { createModularContainer } from "virtual:modular-container";

// 宿主仅充当点火边界，点火后立即退场！
createModularContainer();
```

#### 为什么“业务暴露在外部”在大型应用中被视为严重反模式？
1. **打破 AOP 切面拦截闭环**：外部直接调用脱离了网格治理，全局耗时监控、鉴权管道与重试切面将被完全绕开；
2. **产生致命的宿主锁定（Vendor Lock-in）**：业务逻辑与具体的宿主管道（Hono、Express、CLI 进程）物理纠缠。而在 Path-IoC 中，模块只对抽象契约 `ModularContainer` 负责，更换宿主运行环境只需变更一行点火代码，业务模块完全具备零成本跨端迁移性；
3. **破坏现代前端 HMR（热模块替换）边界**：在前端 React 视图树中，外部持有容器全局实例极易引发热更新闭包引用失效与内存泄漏；而在网格内部，模块的更新与卸载受拓扑调度严格约束。

---

### 8. 作用域的概念通胀：父子容器与捕获依赖陷阱 vs 闭包原语

在服务端高并发场景中，作用域隔离（Scope Isolation）是刚需——因为原生 ESM 模块单例（`export const a = new A()`）在单线程 Event Loop 下无法隔离多租户上下文，会导致严重的状态穿透与并发竞态。

然而，如何实现作用域隔离，两套框架体现了**“概念通胀（Concept Inflation）”**与**“奥卡姆剃刀”**的深刻对立：

#### InferDI 的概念膨胀路线：父子容器树与捕获依赖（Captive Dependency）
InferDI 沿袭了传统面向对象的“树形作用域容器”设计，由此引发了概念的雪崩式膨胀：
1. **概念税激增**：为了支持请求级作用域，开发者必须学习并维护 `declareScopeInputs` 插槽、`.createScope()` 手动派生、以及 `'singleton'`、`'scoped'`、`'transient'` 三种生命周期标记；
2. **头号幽灵缺陷：捕获依赖（Captive Dependency）**：
   若一个单例服务意外注入了一个请求级服务，该单例将永久捕获并持有该请求的上下文，导致隐蔽的**跨租户数据泄露与内存泄漏**。InferDI 必须在类型和运行时强行追加复杂的生命周期守卫（Lifetime Guards）进行拦截，开发者被迫不断排查“为什么 A 不能注入 B”；
3. **全员决策疲劳**：工程中的每一个 Service，开发者都要在脑中开小差抉择“该标 singleton 还是 scoped”。

#### Path-IoC 的极简正交路线：默认全隔离 + 闭包缓存原语（`memoizeModule`）
在技术上，Path-IoC 实现父子容器和作用域标记轻而易举，但它坚定地**拒绝了概念通胀**，回归现实工程的最朴素账目：
* **1% 的持久连接 vs 99% 的无状态业务**：在一个包含 200 个模块的真实全栈工程中，真正需要进程级持久常驻的重型资源两只手就数得过来（通常仅 3 ~ 5 个：数据库连接池、Redis 客户端、消息队列连接）。剩下的 195 个业务模块全是纯粹无状态的领域逻辑；
* **拒绝让 99% 的代码为 1% 的特例买单**：
  * **默认哲学**：一切皆请求级纯隔离！依托 **`21.2µs`** 纳秒级装配性能，每次 HTTP 请求直接点火一个全新洁净的 `ModularContainer`，从根源上彻底消灭多租户状态串扰；
  * **单例按需闭包化**：那 3~5 个底层连接池，无需任何作用域标记，直接使用普通高阶纯函数闭包原语 `memoizeModule` 显式包裹。
* **架构红利**：业务模块**零作用域标记、零父子容器概念、零捕获依赖陷阱**。用最纯粹的 JavaScript 函数式闭包，在消灭概念通胀的同时彻底解决了作用域隔离问题。

---

## 三、选型决策与核心结论

| 决策维度 | InferDI | Path-IoC |
| :--- | :--- | :--- |
| **理论范式** | 推式依赖注入 (Push DI) | 拉式物理路径契约依赖查找 (IoC-DL Mesh) |
| **装配代码复杂度** | **$O(N)$**（中心化组合根，随模块数线性膨胀） | **$O(1)$**（一次性构建声明，日常装配代码恒等于 0） |
| **拓扑调度机制** | 强制要求开发者编写顺序服从拓扑 | 运行期 DFS 后序图算法微秒级确定性装配 |
| **动态聚合与 AOP** | 无法支持动态模式匹配（导致类型坍塌） | 天然原生支持 AOP、聚合器与启动器三大模式 |
| **存量工程演进** | 手动修改组合根进行局部拼装 | 路由 Merge 与通配网关接管，新老逻辑完全正交 |
| **测试隔离度** | 依赖 Class 构造器传参 | 纯函数闭包字面量传参 + Vitest 原生支持 |
| **高并发隔离开销** | 依赖运行时递归深度解析 | 单次图编译缓存，每请求实例化仅需 **21.2µs** |

---

### 💡 终局之辨：这不是“大与小”的妥协，而是“自动化与手工作坊”的代际差

很多技术选型讨论习惯以“小型项目选轻量工具，大型项目选重型系统”这种缺乏度量标准的话术来维持表面的中庸平衡。然而，只要回归到代码量与物理复杂度的最底层事实，这一妥协假说便无法成立：

* **如果一个项目只有一个文件**：开发者根本不需要任何 IoC/DI 框架，语言原生的 `const a = new A()` 即是最简洁、最具可读性的解法；
* **然而，一旦系统出现跨文件协作（模块数 $N \ge 2$），维护 InferDI 中心化接线板的物理工作量与认知负荷，便已全面超越了 Path-IoC！**

看最真实的工程开销：
在 InferDI 体系下，即使面对仅有两个相互依赖的模块，开发者也必须新建一个中心化 `container.ts`，手写 2 次 `import`，手动在脑海中完成拓扑排班以确保被依赖项在前，手写流式链式调用，并在业务执行处手动 `resolve`。此后每增加一个服务，这一整套手动接线流程便必须线性追加一次。

而在 Path-IoC 中，工程构建配置中的 `pathIoc.vite()` 是一次性的固定成本。从第 2 个模块开始，日常业务开发的装配代码量**恒等于 0**——没有中心化接线板，没有手动模块导入，没有人工先后顺序排班，物理文件创建保存即可完成契约注册。

**两者的本质分水岭，从来不是“轻量工具”与“重型框架”之争，而是“手工作坊”与“工业化自组织”的代际差异：**

* **InferDI** 本质上是传统面向对象构造函数注入（Constructor DI）在失去了装饰器与反射元数据之后，退而求其次向 TypeScript 妥协演化出的**“纯手工接线板”**。它将类型安全建立在开发者手动维护中心化文件、手动保证代码书写顺序的隐形代价之上；
* **Path-IoC** 则从根本上终结了“人工接线”的旧思维。它顺应现代极速构建工具链的物理演进，通过编译器-运行时协同与物理路径契约，使装配复杂度在开发者的日常工程操作中**彻底隐形**。

只要构建的是现代 TypeScript 应用，消灭跨模块相对路径耦合、让物理文件目录自成契约，永远比在中心化接线板中人工穿针引线更高效、更纯粹、更具工业确定性。
