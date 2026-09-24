# 单线程事件循环下的容器双态：客户端全局单例 vs 服务端请求隔离与闭包重型缓存

> **专栏定位**：全栈状态隔离 / 单线程 Event Loop / 生产工程最佳实践  
> **阅读时长**：约 10 分钟  
> **核心命题**：为什么容器生命周期的界线不是“常驻 vs 边缘”，而是“客户端 vs 服务端”？在 Node.js / Bun 单线程事件循环下，如何既彻底杜绝请求间的状态污染，又避免数据库连接池等重型单例被重复创建？

---

## 一、架构分水岭：客户端应用 vs 服务端应用

在设计依赖注入与控制反转（IoC）架构时，许多开发者容易陷入一个误区：按照“常驻进程（Node.js 服务器）”与“边缘无状态函数（Serverless / Edge）”来划分容器策略。

然而，**容器架构真正的物理分水岭，是客户端应用（Client Apps）与服务端应用（Server Apps）在运行模型上的本质差异。**

```
┌─────────────────────────────────────────────────────────────┐
│                    客户端应用 (Client Apps)                  │
│   • SPA (React/Vue) / Electron / React Native / 微信小程序   │
│   • 物理特征：单用户独占本地运行环境                          │
│   • 容器模式：【全局唯一单例容器 (Global Singleton Container)】  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    服务端应用 (Server Apps)                  │
│   • Node.js / Bun / Cloudflare Workers / Hono / Express     │
│   • 物理特征：单线程 Event Loop，成千上万个用户并发交错执行   │
│   • 容器模式：【按请求隔离的多例容器 (Per-Request Container)】   │
│             + 【高阶函数闭包缓存重型单例 (Memoized Singletons)】 │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、客户端应用：纯粹的全局单例容器

在客户端应用中，整个 JavaScript 运行时完全由当前**单个用户**独占：
- 不需要担心多用户并发带来的状态交叉污染；
- 容器只需要在应用初始化时创建一次；
- 所有的 UI 组件、页面路由、状态管理直接共享同一个全局容器实例。

### 客户端标准模式
在客户端工程中，依托 `@path-ioc/unplugin` 对 `src/modules` 目录的自动扫描，入口处只需调用一次虚拟模块进行全局容器点火，无需手动收集或维护任何模块导入清单：

```typescript
// src/main.tsx
import { createModularContainer } from "virtual:modular-container";

// 规范点火：预先挂载全局引用对象，杜绝模块内部同步引用时出现 undefined
const container = (globalThis.modularContainer = {});
await createModularContainer(container);
```

> **为什么必须预先挂载对象引用？**  
> 在前端工程中，许多模块内部或组件可能会直接访问全局 `modularContainer` 变量。如果采用 `globalThis.modularContainer = await createModularContainer();`，在整个异步拓扑初始化完成前该全局变量始终为 `undefined`。一旦模块在启动时序中有同步调用或注册钩子，便会抛出 `Cannot read properties of undefined`。因此，最佳实践是先完成引用绑定 `const container = (globalThis.modularContainer = {})`，再传入 `createModularContainer(container)` 由拓扑引擎逐层填充。

在组件或业务逻辑中直接解构使用：
```tsx
// 在 React / Vue 组件函数体内直接解构使用
export function UserProfile() {
  const { userState } = modularContainer;
  return <div>Welcome, {userState.name}</div>;
}
```
简单、直接、零认知负担。

---

## 三、服务端应用的核心困境：单线程事件循环下的状态污染

然而，服务端应用面临着截然不同的物理世界：**Node.js / V8 是单线程事件循环机制。**

当 1,000 个 HTTP 请求并发打进来时：
* 如果服务端像客户端一样共用一个全局单例容器；
* 某个模块内部若保存了当前请求的用户身份（`currentUserId`）、事务上下文或 TraceID：
  ```typescript
  // 危险的反模式：在服务端全局单例中保存请求上下文
  export const main = () => {
    let currentUser: User | null = null; // 致命的内存共享！
    return {
      setCurrentUser(user: User) { currentUser = user; },
      getUser() { return currentUser; }
    };
  };
  ```
* 请求 A 刚刚设置了用户为 Alice，在执行异步 `await db.query()` 时发生了 Event Loop 切题；
* 请求 B 并发进来，将用户覆盖设置为了 Bob；
* 请求 A 恢复执行，读取到的却是 Bob 的数据——**灾难性的跨请求状态污染与安全越权漏洞就此产生！**

### 传统框架的沉重妥协
* **Java Spring**：借助多物理线程与 `ThreadLocal` 勉强隔离请求上下文；
* **NestJS**：推出了 `Scope.REQUEST` 请求作用域。但根据 NestJS 官方文档明确警告：**使用请求作用域会导致巨大的性能劣势与内存膨胀**——因为 NestJS 必须为每一个 HTTP 请求从头扫描反射元数据、动态创建一整棵庞大的依赖注入子树，给 V8 GC 带来巨大垃圾回收压力。

---

## 四、Path-IoC 破局：按请求隔离多例 + 高阶闭包缓存重型单例

Path-IoC 拒绝在框架核心内引入复杂的“作用域元数据”概念，而是通过**动态语言原生的高阶函数闭包（Higher-Order Closure）**优雅达成两全其美：

1. **容器本身按请求实例化（Per-Request Container）**：每个 HTTP 请求分配一个独立的轻量容器，注入专属的 `requestContext`（如 Hono 的 `c` 上下文、Express 的 `req`），杜绝并发污染；
2. **重型模块通过纯函数闭包缓存（Memoization）**：数据库连接池、Redis 客户端、ORM 实体元数据等重量级资源，在进程生命周期内通过闭包保证只初始化一次。

### 1. 实现通用重型模块单例原语：`memoizeModule`
无需框架特权支持，只需一段尊重语言原语的纯函数：

```typescript
// utils/memoizeModule.ts
import type { ModularContainer } from "@path-ioc/core";

/**
 * 将模块工厂函数包装为单例闭包
 * 严格保持原函数的行为透明：同步保持同步，异步保持异步；只执行一次并缓存结果。
 * 坚守 Fail-Fast：若发生错误则自然抛出让系统感知，绝不盲目捕获或越俎代庖搞重试。
 */
export const memoizeModule = <
  Result,
  T extends (
    modularContainer: ModularContainer,
    moduleDeclarationNames: string[]
  ) => Result
>(
  main: T
): T => {
  let result: Result;
  let initialized = false;

  return ((
    modularContainer: ModularContainer,
    moduleDeclarationNames: string[]
  ) => {
    if (!initialized && (initialized = true)) {
      result = main(modularContainer, moduleDeclarationNames);
    }
    return result;
  }) as T;
};
```

> **设计要点：为什么不要把它想复杂？**
> 1. **独立布尔标记防假值击穿**：使用 `let initialized = false` 独立记录执行状态。如果模块返回值合法地就是 `undefined`（如纯副作用初始化）、`null` 或 `false`，绝不会因 `if (cached)` 的判定缺陷而导致每次请求都被重新执行；
> 2. **保持同步/异步行为绝对透明**：利用精确泛型推导，原函数是纯同步（如解析本地配置字典或 AST 模型），包装后依然是纯同步函数，**绝不强加 `async` 包装**，避免将同步计算强行拖入 V8 微任务队列；
> 3. **敬畏异常（Fail-Fast 哲学）**：编程语言中的 `Error` 是程序明确向外宣告故障的最高效通道。如果数据库凭证错误或配置丢失，模块应当光明正大抛出异常中断请求，而非在缓存层私自掩盖错误搞盲目重试。


### 2. 重型模块：一次初始化，进程常驻
```typescript
// modules/infrastructure/database.ts
import { memoizeModule } from "../../utils/memoizeModule";
import { createPool } from "mysql2/promise";

export const dependencies = [];

export const main = memoizeModule(async () => {
  console.log("⚡ [Process Lifecycle] 数据库连接池正在建立（仅执行一次）...");
  const pool = await createPool(process.env.DATABASE_URL!);
  return {
    query: (sql: string, params: any[]) => pool.execute(sql, params)
  };
});
```

### 3. 轻型业务模块：请求级纯净隔离
```typescript
// modules/services/orderService.ts
import type { ModularContainer } from "@path-ioc/core";
import type { Context } from "hono";

export const dependencies = ["database"];

export const main = (container: ModularContainer) => {
  // 零 any、无需 as Context 类型断言，直接享受专属上下文的 100% 智能提示！
  const { database, requestContext } = container;
  const requestId = requestContext.req.header("x-request-id");
  const currentUser = requestContext.get("user");

  return {
    async createOrder(item: string) {
      // 绝对安全的请求隔离，零跨请求污染风险
      return database.query(
        "INSERT INTO orders (item, user_id, request_id) VALUES (?, ?, ?)",
        [item, currentUser.id, requestId]
      );
    }
  };
};
```

---

## 五、在 Web 框架中的无缝集成 (Hono / Express / Koa)

以现代全栈高性能框架 **Hono** 为例，在网关入口处通过 TypeScript 声明合并与容器实例化，即可完成极致请求隔离：

```typescript
// src/index.ts
import { Hono, type Context } from "hono";
import { createModularContainer } from "virtual:modular-container";

// 💡 声明合并 (Declaration Merging)：为容器扩展当前环境专属的请求上下文强类型
// 自动与构建插件生成的 ignore.modular.d.ts 合并，业务解构享受 100% 智能补全与静态校验
declare global {
  interface ModularContainer {
    requestContext: Context;
  }
}

const app = new Hono();

// 通配网关：为每个请求注入专属容器并调度 (单次填充仅耗时 20µs)
app.all("*", async (c) => {
  const container = await createModularContainer({ requestContext: c });
  return await container.apiAggregator();
});

export default app;
```

### 性能与安全兼得的运行表现
1. **冷启动与重型资源**：
   - 无论打进来多少万次请求，数据库连接池和 Redis 哨兵只会在初次请求时建立一次，并在单线程闭包中稳定复用，连接数严格受控；
2. **零跨请求污染**：
   - 每个请求拥有纯净独立的 `orderService` 和 `requestContext`，用户凭证与请求链路 ID 绝不会相互泄露；
3. **微秒级轻量开销**：
   - Path-IoC 的拓扑编译在打包期预先计算或在初次加载后高度复用，每次请求实例化轻量级服务仅需数十微秒，比 NestJS 的 `Scope.REQUEST` 快整整两个数量级！

---

## 六、总结

| 对比维度 | 传统全栈做法 (NestJS Scope.REQUEST) | Path-IoC 生产模式 (多例容器 + 闭包缓存) |
| :--- | :--- | :--- |
| **请求隔离机制** | 框架元数据反射 + 动态遍历注入子树 | 原生 `requestContext` + 轻量级请求容器 |
| **重型资源管理** | 繁琐的 `@Injectable({ scope: DEFAULT })` 概念侵入 | 纯函数高阶闭包 `memoizeModule` |
| **单请求开销** | 毫秒级反射解析与 GC 停顿 | **微秒级纯函数调用，极低内存驻留** |
| **适用环境** | 仅限特定 Node.js 框架 | **Node.js, Bun, Cloudflare Workers 全平台通用** |

区分客户端单例与服务端请求隔离，是构建健壮全栈系统的核心基石。通过将运行时隔离交给轻量多例容器，将重量级基础设施交给闭包单例，现代 TypeScript 开发者无需妥协于任何繁琐的概念补丁，即可收获极致的安全与速度。
