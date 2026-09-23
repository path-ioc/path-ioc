# 边缘计算与 Serverless 最佳实践

在 Cloudflare Workers、Vercel Edge Functions 等 Serverless 边缘环境中，CPU 执行时间通常受到极其严苛的物理限制（例如 Cloudflare Workers 免费计划仅有 **10ms ~ 50ms CPU Time** 限制）。

传统的 IoC 框架由于每次请求都需要反编译类、查元数据表与动态解析依赖树，极易耗尽边缘 CPU 时间导致超时报错。

---

## 核心架构：“静态图单例 + 请求级容器多例”

Path-IoC 针对 Serverless 边缘架构确立了两阶段彻底解耦机制：

```mermaid
sequenceDiagram
    participant Worker as Worker 进程冷启动 (Cold Start)
    participant Request as HTTP 请求到来 (Request Arrival)
    participant Engine as @path-ioc/core

    Worker->>Engine: 1. compileModuleGraph(modules)
    Note over Engine: 执行 1 次 Kahn 拓扑排序与校验 (约 1.7ms)<br>生成静态 CompiledGraph 全局缓存
    
    Request->>Engine: 2. instantiateModuleContainer(compiledGraph, reqContainer)
    Note over Engine: 直通装配当前请求容器 (耗时仅 21.2 µs)<br>挂载 c.requestContext 请求上下文
    Engine-->>Request: 返回隔离后的请求容器 (零重复拓扑损耗)
```

---

## 在 Hono / Cloudflare Workers 中的实战代码

### 1. 中间件隔离当前请求上下文

```typescript
import { Hono, Context } from "hono";
import { createModularContainer } from "virtual:modular-container";

type AppEnv = {
  Variables: {
    modularContainer: ModularContainer;
  };
};

const app = new Hono<AppEnv>();

// 在 HTTP 中间件中挂载请求级隔离容器
app.use("*", async (c, next) => {
  const reqContainer = {
    requestContext: c, // 注入当前请求的 Context (包含 Headers, Auth, Env 等)
  } as any;

  // 内部自动复用启动期预编译的 DAG 静态图，填充仅耗时 21.2 微秒！
  await createModularContainer(reqContainer);

  c.set("modularContainer", reqContainer);
  await next();
});

// 通配 API 网关分发 (类似 SpringMVC DispatcherServlet，入口处绝不手写具体业务路由！)
// 业务接口一律由 src/modules/api/** 物理路径模块承载，并由 apiAggregator 模块进行统一调度与 AOP 切面拦截
app.all("*", async (c) => {
  const { apiAggregator } = c.get("modularContainer");
  return await apiAggregator();
});

export default app;
```

---

## 重型资源复用：进程级单例高阶函数 (`memoizeModule`)

在多请求隔离模式下，数据库连接池（Connection Pool）或 Redis 客户端无需每次请求都重复创建。可以使用高阶函数闭包实现跨请求的全局单例复用：

```typescript
// 辅助函数：进程级单例闭包
export const memoizeModule = <T extends (...args: any[]) => any>(fn: T): T => {
  let cache: any;
  let initialized = false;
  return ((...args: any[]) => {
    if (!initialized) {
      cache = fn(...args);
      initialized = true;
    }
    return cache;
  }) as T;
};

// src/modules/infra/db-pool/index.ts
export const main = memoizeModule((container: ModularContainer) => {
  const { requestContext } = container;
  // 仅在首次请求时创建连接池，后续所有 HTTP 请求直接共享同一连接实例！
  const pool = createDbPool(requestContext.env.DATABASE_URL);
  return pool;
});
```
