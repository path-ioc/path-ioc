# Edge Computing & Serverless Best Practices

In serverless edge runtimes such as Cloudflare Workers and Vercel Edge Functions, execution CPU time is strictly governed by physical runtime quotas (for instance, Cloudflare Workers free plan enforces a **10ms ~ 50ms CPU execution limit**).

Traditional IoC frameworks frequently exhaust edge CPU quotas due to dynamic class reflection, metadata table traversal, and recursive dependency tree resolution on every HTTP request.

---

## The Core Architecture: "Static Graph Singleton + Request-Scoped Multiton Containers"

Path-IoC resolves this bottleneck through a strict two-stage separation:

```mermaid
sequenceDiagram
    participant Worker as Worker Cold Start
    participant Request as HTTP Request Arrival
    participant Engine as @path-ioc/core

    Worker->>Engine: 1. compileModuleGraph(modules)
    Note over Engine: Executes Kahn DAG sorting and validation once (~1.7ms)<br>Generates an immutable CompiledGraph cache
    
    Request->>Engine: 2. instantiateModuleContainer(compiledGraph, reqContainer)
    Note over Engine: Instantiates the per-request container in 21.2 µs<br>Injects request context into c.requestContext
    Engine-->>Request: Returns isolated container (Zero repeated graph computation)
```

---

## Production Implementation with Hono & Cloudflare Workers

### 1. Request Context Isolation via Middleware

```typescript
import { Hono, Context } from "hono";
import { createModularContainer } from "virtual:modular-container";

type AppEnv = {
  Variables: {
    modularContainer: ModularContainer;
  };
};

const app = new Hono<AppEnv>();

// Mount isolated container per HTTP request inside middleware
app.use("*", async (c, next) => {
  const reqContainer = {
    requestContext: c, // Inject request context (headers, auth, environment bindings)
  } as any;

  // Reuses pre-compiled DAG graph under the hood. Instantiation takes only 21.2 µs!
  await createModularContainer(reqContainer);

  c.set("modularContainer", reqContainer);
  await next();
});

// Wildcard API Gateway: Like Spring MVC DispatcherServlet, delegates all routing to the container
// Business endpoints live under src/modules/api/** where physical paths serve as contracts
app.all("*", async (c) => {
  const { apiAggregator } = c.get("modularContainer");
  return await apiAggregator();
});

export default app;
```

---

## Heavy Resource Memoization: Process-Level Singletons (`memoizeModule`)

In request-isolated architectures, heavy resources like database connection pools or Redis clients should not be reconstructed per request. A lightweight closure memoizer ensures cross-request singleton persistence:

```typescript
// Helper utility: Process-level singleton closure
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
  // Connection pool initialized once on first cold request, reused by all subsequent requests
  const pool = createDbPool(requestContext.env.DATABASE_URL);
  return pool;
});
```
