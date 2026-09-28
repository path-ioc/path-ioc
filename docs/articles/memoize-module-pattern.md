# Process-Level Singletons via Closure Caching: The memoizeModule Pattern in Production

> **"Let the container focus on topological assembly; let caching return to language intuition."**  
> In modern full-stack and backend architectures, how can systems maintain strictly isolated per-request containers while gracefully reusing heavy, expensive infrastructure resources (like database connection pools and Redis clients) across concurrent requests? Path-IoC rejects bloated framework-level scope metadata, providing a clean, production-hardened answer via pure JavaScript higher-order closure caching: `memoizeModule`.

---

## 1. The Full-Stack Dilemma: Single-Threaded Event Loop Realities

In modern TypeScript development, client-side and server-side physical runtimes exhibit fundamentally different lifecycle requirements:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Client vs Server Lifecycle Models                    │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Browser / SPA            │ Persistent, single-user, global singleton   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Server / Edge Workers    │ Persistent process, multi-tenant, per-req   │
└──────────────────────────┴─────────────────────────────────────────────┘
```

1. **Client Mode**: The browser tab serves a single user. The container ignites once during startup (taking mere milliseconds). All modules (stores, UI states, HTTP clients) operate as persistent singletons and terminate when the tab closes;
2. **Server Mode (Node.js / Express / Hono / Cloudflare Workers)**: A single physical process handles thousands of concurrent HTTP requests per second. If the container were a process-wide singleton, Request A's auth headers or tracing IDs (`x-request-id`) would inevitably leak into Request B, causing catastrophic multi-tenant security vulnerabilities.

Therefore, **server runtimes demand strictly isolated per-request containers**—instantiating a lightweight container for each incoming HTTP request (in Path-IoC, compiling the DAG once and reusing it yields per-request hydration in just **21.2 microseconds**).

### The New Challenge: Cross-Request Resource Reuse
Request isolation guarantees security, but immediately triggers a resource paradox:
- Database connection pools (`mysql2/promise` Pool, Prisma Client, TypeORM DataSource);
- Redis connection clients;
- Pre-computed AST models or heavy in-memory rule engines.

Establishing these connections incurs dozens of milliseconds of TCP/TLS handshakes and consumes finite connection limits. If every request performed `createPool()`, file descriptors and database ports would exhaust within seconds under high concurrency!

We need both **strict per-request context isolation** and **persistent, cross-request singleton infrastructure**. How do we achieve both?

---

## 2. The Scope Metadata Trap: How Traditional IoC Over-Engineers

Facing this dilemma, legacy heavyweight IoC frameworks (Spring, NestJS, InversifyJS) introduced complex conceptual machinery:

```typescript
// Traditional Framework Scope Annotations
@Injectable({ scope: Scope.DEFAULT })    // Singleton
@Injectable({ scope: Scope.REQUEST })    // Per-request
@Injectable({ scope: Scope.TRANSIENT })  // Transient
```

Maintaining this scope machinery carries severe penalties:
1. **Prototype Chain & Proxy Lookup Overhead**: Every dependency resolution traverses complex scope checkers;
2. **Catastrophic "Scope Bubbling"**: In NestJS, once a leaf dependency is marked `REQUEST` scope, **every upstream dependent is forcibly bubbled into REQUEST scope**, forcing massive subgraphs to recreate on every request and crashing performance;
3. **Blackbox Framework Lock-in**: Developers must master framework-specific scope inheritance edge cases.

**Path-IoC holds that scope management does not belong in the container core.**  
The container's sole responsibility is **lock-free topological dependency resolution and assembly**. Since JavaScript possesses the world's most elegant lexical scoping and higher-order functions, cross-request caching belongs naturally to **pure function closures**.

---

## 3. The Evolution of memoizeModule: From Toy to Production Primitive

To ensure a heavy module factory executes only once across requests, we wrap it in a higher-order closure function: `memoizeModule`.

### Phase 1: The Naive Implementation (Falsy Value Stampede)
A beginner might write:
```typescript
// ❌ Naive Implementation: Broken for falsy return values
export const memoizeModule = (main: Function) => {
  let cached: any;
  return (...args: any[]) => {
    if (cached) return cached;
    cached = main(...args);
    return cached;
  };
};
```
> **Critical Flaw**: If the factory legitimately returns a falsy value (`undefined` for pure side-effect modules, `null`, or `false`), `if (cached)` fails on every request, causing the factory to re-execute repeatedly!

---

### Phase 2: Independent State Flag & Transparent Signatures
We decouple state tracking with an explicit `initialized` boolean and preserve TypeScript typing:
```typescript
// ⚠️ Basic Implementation: State-aware
export const memoizeModule = <
  Result,
  T extends (modularContainer: ModularContainer, moduleDeclarationNames: string[]) => Result
>(main: T): T => {
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
> **Design Principles**:
> 1. **Boolean Flag Prevents Stampedes**: `let initialized = false` tracks completion independently, solving the falsy value issue;
> 2. **Transparent Sync/Async**: Never force-wraps synchronous functions in `Promise`, keeping local AST/dictionary initialization out of the V8 microtask queue.

---

### Phase 3: Industrial Production Implementation (Self-Healing & Anti-Poisoning)

The basic version harbors a fatal production vulnerability when handling **asynchronous failures (Promise Rejection)**:

```
Cold Start Poisoning Breakdown:
1. Container boots; Request 1 triggers async main to connect to the database;
2. main returns a pending Promise; assigned to result; initialized becomes true;
3. A transient network hiccup causes the Promise to reject; Request 1 receives a 500 error;
4. Network recovers; Requests 2 through 10,000 arrive;
5. CATASTROPHE: initialized is still true! All subsequent requests immediately receive the already-rejected Promise!
6. Outcome: The entire server process remains brain-dead until manually rebooted!
```

**A true production-grade implementation must feature automatic cache eviction on Promise rejection:**

```typescript
// utils/memoizeModule.ts
// Note: ModularContainer is ambiently declared globally by Path-IoC unplugin

/**
 * Wraps a module factory into a process-level singleton closure.
 * Guarantees sync/async transparency, cold-start self-healing, and falsy-value safety.
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
    if (!initialized) {
      const val = main(modularContainer, moduleDeclarationNames);

      // 🛡️ Anti-Poisoning Protection: Evict cache on rejection to permit self-healing retries
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

## 4. Production Patterns Across Environments

### Pattern A: Node.js Long-Running Processes (Environment-Driven)
In standard Node.js/Docker runtimes, database credentials reside in `process.env`. The module is entirely autonomous:

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

### Pattern B: Cloudflare Workers & Serverless Edge (First-Request Seeded)
In Cloudflare Workers, environment bindings arrive via `c.env` on each request. However, infrastructure configs within the same Worker isolate remain immutable. Initializing the pool once during the first request and caching it across subsequent requests is the idiomatic edge pattern:

```typescript
// src/modules/infra/db-pool/index.ts
import { memoizeModule } from "../../../utils/memoizeModule";
import { createClient, RedisClientType } from "redis";

export const dependencies = [];

export const main = memoizeModule(async (container: ModularContainer): Promise<RedisClientType> => {
  const { requestContext } = container;
  
  // Extract immutable configuration from first request; persist client in isolate closure
  const client = createClient({
    url: requestContext.env.REDIS_URL,
  });
  
  await client.connect();
  console.log("[Edge Infrastructure] Redis connected successfully in Worker isolate.");
  return client;
});
```

---

## 5. Architectural Guardrails: Safety Boundaries

> [!CAUTION]
> **Strict Boundary: Never capture request-specific mutable state inside `memoizeModule` closures!**

The `result` inside `memoizeModule` is **process-wide singleton state**. Once populated by the first request, it survives across subsequent requests.

```typescript
// ❌ CATASTROPHIC BUG: Capturing user identity/headers in singleton closure!
export const main = memoizeModule((container: ModularContainer) => {
  const { requestContext } = container;
  // 💥 DISASTER: All subsequent requests receive the first user's token! Cross-tenant security breach!
  const userToken = requestContext.req.header("Authorization");
  return new UserClient(userToken);
});

// ✅ CORRECT: Singleton closures only hold immutable infrastructure; dynamic state stays in request services
export const main = memoizeModule(() => {
  return new SystemApiClient(process.env.API_SECRET);
});
```

### Production Checklist:
1. **Reserve `memoizeModule` for Heavy Infrastructure**: Connection pools, shared HTTP clients, static AST models;
2. **Keep Business Services Purely Request-Scoped**: Services (`orderService`, `userService`) remain per-request (~21.2µs), ensuring zero cross-tenant bleeding;
3. **Division of Responsibility**: `memoizeModule` prevents Promise cache poisoning; native drivers (MySQL2/ioredis) handle transport-level heartbeats and auto-reconnection.
