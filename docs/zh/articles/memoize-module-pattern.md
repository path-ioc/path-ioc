# 进程级单例与闭包缓存原语：memoizeModule 设计哲学与生产实践

> **“让容器专注拓扑装配，让缓存回归语言本能。”**  
> 在现代全栈与服务端架构中，如何在保持“请求级容器绝对隔离（Per-Request Container）”的前提下，优雅复用数据库连接池、Redis 客户端等昂贵的跨请求重型资源？Path-IoC 拒绝引入复杂的框架级作用域元数据，而是以纯 JavaScript 高阶函数闭包 `memoizeModule` 给出了干净而彻底的工业级答案。

---

## 一、问题的提出：单线程 Event Loop 下的“全栈两难”

在现代 TypeScript 全栈开发中，客户端与服务端的物理运行时存在根本性差异：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        客户端 vs 服务端生命周期模型                      │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 浏览器 / 单页应用 (SPA)   │ 进程常驻、单用户、全局单一容器 (Singleton)        │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 服务端 / 边缘计算 (Server) │ 进程常驻、高并发多租户、每请求专属容器 (Per-Request) │
└──────────────────────────┴─────────────────────────────────────────────┘
```

1. **客户端模式**：整个浏览器只服务于当前登录的一个用户。容器在应用启动时全量点火一次（耗时几毫秒），所有模块（用户状态、UI 视图、网络客户端）均为常驻单例，随页面关闭而消亡；
2. **服务端模式（Node.js / Express / Hono / Cloudflare Workers）**：同一个物理进程在同一毫秒内可能并行处理上千个 HTTP 请求。如果把容器做成进程级全局单例，请求 A 的身份凭据、追踪 ID（`x-request-id`）就会不可避免地污染到请求 B，引发灾难性的跨租户串数据。

因此，**服务端必须做到“请求级容器隔离”**——为每个到达的 HTTP 请求实例化一个全新的轻量容器（在 Path-IoC 中，复用编译后的 DAG 静态图，单次纯同步装配仅耗时 **21.2 微秒**）。

### 新的挑战：重型资源的跨请求复用

请求隔离解决了上下文安全，但立即引出了矛盾：

- 数据库连接池（如 `mysql2/promise` 的 `Pool`、Prisma Client、TypeORM DataSource）；
- Redis 客户端连接池；
- 预热好的复杂分词字典或本地规则 AST 模型。

这些重型资源**建立一次连接需要几十毫秒的 TCP / TLS 握手**，且受底层物理连接数限制。如果每个 HTTP 请求都重新 `createPool()`，高并发下数据库端口与本地文件句柄将在数秒内被彻底打满崩盘！

我们既要**请求级上下文绝对纯净**，又要**基础设施连接池跨请求全局单例常驻**。该如何两全其美？

---

## 二、框架侵入的陷阱：传统 IoC 是如何把简单问题变复杂的？

面对这个问题，传统重量级 IoC 框架（如 Spring、NestJS、InversifyJS）选择在框架内核中引入庞大的概念机器：

```
传统框架做法：
@Injectable({ scope: Scope.DEFAULT })    // 单例模式
@Injectable({ scope: Scope.REQUEST })    // 请求模式
@Injectable({ scope: Scope.TRANSIENT })  // 瞬态模式
```

为了维护这些“作用域元数据”，框架不得不付出高昂代价：

1. **原型链与 Proxy 查表开销**：每个依赖获取都需要经过多层作用域解析器判断；
2. **致命的“作用域蔓延（Scope Bubble）”**：在 NestJS 中，一旦底层某个叶子节点被标记为 `REQUEST` 作用域，**所有依赖它的上游模块将被强制传染为 REQUEST 作用域**，导致依赖树大面积被重新实例化，性能断崖式下跌；
3. **框架强绑定与黑盒魔法**：开发者必须深刻背诵框架内部关于 Scope 的继承规则与注入限制。

**Path-IoC 认为：作用域不属于容器的核心职责。**  
容器的核心职责只有一个——**基于物理拓扑，完成无锁依赖解析与装配**。既然 JavaScript 拥有世界上最优雅的词法作用域与高阶函数能力，跨请求的持久化缓存为什么不直接交还给**纯函数闭包**？

---

## 三、memoizeModule 演进史：从玩具实现到工业级生产原语

为了让重型模块工厂函数在跨请求时只执行一次，我们来实现高阶包装函数 `memoizeModule`。它的演进过程极具启发性。

### 阶段一：玩具级实现（隐蔽的假值击穿 Bug）

最容易写出的直觉代码如下：

```typescript
// ❌ 错误示范：玩具级实现
export const memoizeModule = (main: Function) => {
  let cached: any;
  return (...args: any[]) => {
    if (cached) return cached;
    cached = main(...args);
    return cached;
  };
};
```

> **致命缺陷**：如果模块的工厂函数合法地返回了假值（Falsy Value，如 `undefined` 纯副作用初始化、`null` 或 `false`），`if (cached)` 将永远判定为 `false`，导致每一个 HTTP 请求都重新执行一次模块初始化，缓存机制形同虚设！

---

### 阶段二：状态独立标记与透明签名

针对假值击穿，我们引入独立的布尔状态标记 `initialized`，并利用 TypeScript 精确泛型推导保持原函数签名透明：

```typescript
// ⚠️ 基础版：具备状态标记
export const memoizeModule = <
  Result,
  T extends (modularContainer: ModularContainer, moduleDeclarationNames: string[]) => Result,
>(
  main: T,
): T => {
  let result: Result;
  let initialized = false;

  return ((modularContainer: ModularContainer, moduleDeclarationNames: string[]) => {
    if (!initialized) {
      result = main(modularContainer, moduleDeclarationNames);
      initialized = true;
    }
    return result;
  }) as T;
};
```

> **设计考量**：
>
> 1. **独立布尔标记防击穿**：使用 `let initialized = false` 独立记录执行状态，彻底解决假值重复执行问题；
> 2. **绝不强加 `async` 包装**：若原函数是同步计算（如解析本地配置字典），包装后依然是纯同步函数，绝不强行包裹 `Promise`，避免将同步计算打入 V8 微任务队列。

---

### 阶段三：工业级生产实现（解决 Promise 缓存毒化与冷启动自愈）

上述基础版在面对**异步异常（Asynchronous Rejection）**时，潜伏着严重的生产事故隐患：

```
冷启动事故推演：
1. 容器启动，首个请求到达，触发 async main 建立数据库连接；
2. main 返回一个 Pending 的 Promise，赋值给 result，initialized 被置为 true；
3. 数据库网络发生瞬时闪断，该 Promise 最终 Reject 报错，首个请求返回 500；
4. 网络恢复后，第 2、3...10000 个请求陆续到达；
5. 致命灾难：此时 initialized 依然是 true！所有后续请求全部直接拿到那个已经被 Reject 的毒化 Promise！
6. 结论：整台服务器永久报废，除非重启进程！
```

**真正达到工业级标准的生产实现，必须具备“异步异常自动清除（Cache Eviction on Rejection）”能力：**

```typescript
// utils/memoizeModule.ts
// 注：ModularContainer 为 Path-IoC unplugin 全局声明合并接口，无需手动导入

/**
 * 将模块工厂函数包装为进程级单例闭包（支持同步/异步透明、异常自愈与防击穿）
 */
export const memoizeModule = <
  Result,
  T extends (modularContainer: ModularContainer, moduleDeclarationNames: string[]) => Result,
>(
  main: T,
): T => {
  let result: Result;
  let initialized = false;

  return ((modularContainer: ModularContainer, moduleDeclarationNames: string[]) => {
    if (!initialized) {
      const val = main(modularContainer, moduleDeclarationNames);

      // 🛡️ 异常清除保护：若为异步 Promise，若发生异常必须清除标记，允许后续请求重试自愈
      if (val && typeof (val as unknown as Promise<unknown>).then === "function") {
        (val as unknown as Promise<unknown>).catch(() => {
          initialized = false;
          result = undefined as unknown as Result;
        });
      }

      result = val;
      initialized = true;
    }
    return result;
  }) as T;
};
```

---

## 四、双物理场景生产实战

### 场景 A：传统 Node.js 常驻环境（基于 process.env）

在标准 Node.js / Docker 容器中，数据库连接配置直接通过全局 `process.env` 读取，数据库模块完全独立自治，无需依赖特定请求上下文：

```typescript
// src/modules/infra/database/index.ts
import { memoizeModule } from "../../../utils/memoizeModule";
import { createPool, Pool } from "mysql2/promise";

export const dependencies = [];

export const main = memoizeModule(async (): Promise<Pool> => {
  console.log("[Infrastructure] Initializing persistent MySQL connection pool...");
  return createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
});
```

---

### 场景 B：Cloudflare Workers / 边缘计算环境（基于首请求 c.env）

在 Cloudflare Workers 等 Serverless 运行时中，不存在传统 Node.js 的全局 `process.env`，所有环境变量与外部 Bindings 均挂载在每次请求的上下文 `c.env` 上。

但同一个 Worker 实例内的基础设施配置跨请求是绝对不可变的。因此，利用 `memoizeModule` 在首个请求到达时提取 `env` 初始化连接池，是完全顺应边缘物理运行时的标准范式：

```typescript
// src/modules/infra/db-pool/index.ts
import { memoizeModule } from "../../../utils/memoizeModule";
import { createClient, RedisClientType } from "redis";

export const dependencies = [];

export const main = memoizeModule(async (container: ModularContainer): Promise<RedisClientType> => {
  const { requestContext } = container;

  // 仅在当前 Worker 实例的首个请求到达时提取环境变量并建立持久连接
  const client = createClient({
    url: requestContext.env.REDIS_URL,
  });

  await client.connect();
  console.log("[Edge Infrastructure] Redis connected successfully in Worker instance.");
  return client;
});
```

---

## 五、架构铁律：安全边界与反模式警示

> [!CAUTION]
> **绝对禁区：严禁在 `memoizeModule` 闭包内引用特定请求的动态数据！**

`memoizeModule` 内部的 `result` 变量是**进程级共享的单例闭包**。一旦被首次请求初始化，该闭包将跨越成千上万个后续 HTTP 请求持续存活。

```typescript
// ❌ 严重安全事故：在单例闭包中捕获了首个请求的用户身份与请求头！
export const main = memoizeModule((container: ModularContainer) => {
  const { requestContext } = container;
  // 💥 灾难：所有后续请求取出的都是第一个用户的 Token！跨租户权限直接被穿透！
  const userToken = requestContext.req.header("Authorization");
  return new UserClient(userToken);
});

// ✅ 架构正道：单例闭包仅持有不可变基础设施；动态请求数据在业务 Service 中随取随用
export const main = memoizeModule(() => {
  return new SystemApiClient(process.env.API_SECRET);
});
```

### 生产自查准则：

1. **重型基础设施才用 `memoizeModule`**：连接池、HttpClient 实例、静态元数据树等跨请求无状态资源才应包装；
2. **轻量业务逻辑保持纯净隔离**：业务 Service（如 `orderService`、`userService`）直接保持默认的每请求纯净实例化（耗时仅 21µs），天然享受零上下文泄漏的极致安全；
3. **连接自愈分工**：`memoizeModule` 负责解决 Promise 毒化清理；底层驱动（如 MySQL2 / ioredis）负责运行期的连接重试与心跳保活，各司其职，体系井然。
