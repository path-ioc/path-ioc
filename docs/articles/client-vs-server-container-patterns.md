# Container Dual-State in the Event Loop: Client Global Singleton vs. Server Request Isolation with Memoized Heavy Singletons

> **Perspective**: Full-Stack State Isolation / Single-Threaded Event Loop / Production Patterns  
> **Read Time**: ~10 min  
> **Core Dilemma**: Why is the true architectural boundary between container lifecycles "Client vs. Server" rather than "Resident vs. Edge"? Under the single-threaded Event Loop of Node.js and Bun, how do you completely eradicate cross-request state pollution without repeatedly recreating heavy singletons like database connection pools?

---

## 1. The Architectural Boundary: Client Apps vs. Server Apps

When architecting Inversion of Control (IoC) and dependency injection in TypeScript, developers often fall into a common categorization trap: distinguishing container lifecycles by "Resident Long-Running Node.js Servers" versus "Stateless Edge/Serverless Functions".

In reality, **the fundamental architectural boundary is dictated by the runtime execution model: Client Applications versus Server Applications.**

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
│   • SPA (React/Vue) / Electron / React Native / Mobile Apps │
│   • Physical Characteristic: Single user exclusive runtime  │
│   • Container Pattern: [Global Singleton Container]         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Server Applications                      │
│   • Node.js / Bun / Cloudflare Workers / Hono / Express     │
│   • Physical Characteristic: Single-threaded Event Loop,    │
│     thousands of concurrent requests interleaving           │
│   • Container Pattern: [Per-Request Isolated Container]     │
│             + [Higher-Order Closure Memoized Singletons]    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Client Applications: The Pure Global Singleton

In client-side applications, the entire JavaScript runtime is exclusively owned by **a single user**:
- Cross-user concurrency and state bleed do not exist;
- The container is initialized once during application bootstrap;
- All UI components, page routers, and state managers share the identical container instance.

### Standard Client Pattern
In client applications, unplugin automatically scans the `src/modules` directory. The application entry simply invokes the virtual module once during bootstrap without manually collecting or maintaining import lists:

```typescript
// src/main.tsx
import { createModularContainer } from "virtual:modular-container";

// Ignite global topological container
createModularContainer();
```

Inside components or views:
```tsx
// Directly destructure and consume inside React / Vue components
export function UserProfile() {
  const { userState } = modularContainer;
  return <div>Welcome, {userState.name}</div>;
}
```
Direct, predictable, and zero cognitive overhead.

---

## 3. The Server-Side Dilemma: Single-Threaded Event Loop & State Bleed

Server applications inhabit a radically different physical world: **Node.js and V8 operate on a single-threaded Event Loop.**

When 1,000 HTTP requests arrive concurrently:
* If the server utilizes a single global singleton container;
* And any service retains request-scoped state (e.g., `currentUserId`, tenant context, or trace IDs):
  ```typescript
  // Dangerous Anti-Pattern: Retaining request state in a global singleton
  export const main = () => {
    let currentUser: User | null = null; // Catastrophic memory sharing!
    return {
      setCurrentUser(user: User) { currentUser = user; },
      getUser() { return currentUser; }
    };
  };
  ```
* Request A sets the user to Alice and initiates an async `await db.query()`;
* The Event Loop yields execution to Request B, which overwrites the user as Bob;
* Request A resumes execution, now reading Bob's data—**a critical cross-request data corruption and security vulnerability.**

### The Heavy Compromises of Legacy Frameworks
* **Java Spring**: Relies on OS-level physical threads combined with `ThreadLocal` storage to segregate request scopes;
* **NestJS**: Introduced `Scope.REQUEST`. However, the official NestJS documentation explicitly warns that **request-scoped providers cause severe performance degradation and memory bloat**—because NestJS must dynamically recreate and re-evaluate an entire dependency tree for every incoming HTTP request.

---

## 4. The Path-IoC Architecture: Per-Request Containers + Closure Memoization

Rather than introducing bloated `@Scope(Scope.REQUEST)` metadata abstractions, Path-IoC leverages the native strength of TypeScript: **Higher-Order Function Closures**.

1. **Per-Request Container Instantiation**: Each HTTP request receives its own lightweight container seeded with a request-scoped `requestContext` (e.g., Hono's `Context` or Express's `Request`);
2. **Memoized Heavy Singletons**: Resource-heavy components—such as database connection pools, Redis clients, and ORM entity schemas—are cached across the process lifetime using a pure higher-order closure.

### 1. Implementing the Universal `memoizeModule` Primitive
Without requiring framework magic, this is achieved via pure functional JavaScript respecting language primitives:

```typescript
// utils/memoizeModule.ts
import type { ModularContainer } from "@path-ioc/core";

/**
 * Wraps a module factory into a process-wide closure singleton.
 * Strictly transparent: sync stays sync, async stays async; executes once and caches.
 * Respects Fail-Fast: if an error occurs, it naturally bubbles up to notify the system.
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

> **Design Principles: Why Avoid Over-Engineering?**
> 1. **Independent Boolean Flag Prevents Falsy Value Stampedes**: Using `let initialized = false` records execution state independently. If a module legitimately returns `undefined` (e.g. pure side-effect modules), `null`, or `false`, it will never re-execute on every request due to `if (cached)` check flaws;
> 2. **Transparent Sync/Async Semantics**: Preserves the original function signature perfectly. If a module is purely synchronous (e.g. compiling complex local config dictionaries or AST models), it remains purely synchronous—**never force-wrapped in `async`**, avoiding unnecessary V8 microtask queue overhead;
> 3. **Embrace Fail-Fast Errors**: An `Error` is the runtime's most effective signal for communicating failure. If database credentials or configs are broken, the module should fail fast and crash loudly, rather than having a memoizer mask the failure with blind retries.


### 2. Heavy Modules: Process-Wide Singletons via Closure
```typescript
// modules/infrastructure/database.ts
import { memoizeModule } from "../../utils/memoizeModule";
import { createPool } from "mysql2/promise";

export const dependencies = [];

export const main = memoizeModule(async () => {
  console.log("⚡ [Process Lifecycle] Initializing DB Connection Pool (once)...");
  const pool = await createPool(process.env.DATABASE_URL!);
  return {
    query: (sql: string, params: any[]) => pool.execute(sql, params)
  };
});
```

### 3. Lightweight Business Services: Pure Request Isolation
```typescript
// modules/services/orderService.ts
import type { ModularContainer } from "@path-ioc/core";
import type { Context } from "hono";

export const dependencies = ["database"];

export const main = (container: ModularContainer) => {
  // Zero 'any', zero 'as Context' type casting—enjoy 100% IDE auto-completion!
  const { database, requestContext } = container;
  const requestId = requestContext.req.header("x-request-id");
  const currentUser = requestContext.get("user");

  return {
    async createOrder(item: string) {
      // 100% request-isolated, zero risk of cross-request pollution
      return database.query(
        "INSERT INTO orders (item, user_id, request_id) VALUES (?, ?, ?)",
        [item, currentUser.id, requestId]
      );
    }
  };
};
```

---

## 5. Web Framework Integration (Hono / Express / Koa)

Using **Hono** as a modern high-performance example, integrating per-request containers with full TypeScript typing takes just a few lines:

```typescript
// src/index.ts
import { Hono, type Context } from "hono";
import { createModularContainer } from "virtual:modular-container";

// 💡 Declaration Merging: augment ModularContainer with runtime request context types
// Merges seamlessly with plugin-generated ignore.modular.d.ts for 100% IDE auto-completion
declare global {
  interface ModularContainer {
    requestContext: Context;
  }
}

const app = new Hono();

// Wildcard Gateway: Handles request isolation and container delegation (assembly in ~20 µs)
app.all("*", async (c) => {
  const container = await createModularContainer({ requestContext: c });
  return await container.apiAggregator();
});

export default app;
```

### Performance & Safety Benchmarks
1. **Connection Pool Stability**: Database and Redis pools are initialized once upon the first request and safely shared across the single thread without connection exhaustion;
2. **Zero Request Bleed**: Every request possesses its own `orderService` and `requestContext`; authorization tokens and trace headers can never leak across concurrent requests;
3. **Microsecond Startup**: Instantiating lightweight business services in Path-IoC requires only tens of microseconds—two orders of magnitude faster than NestJS's `Scope.REQUEST`.

---

## 6. Architectural Summary

| Dimension | Traditional Full-Stack (NestJS Scope.REQUEST) | Path-IoC Production Pattern (Per-Request + Memoization) |
| :--- | :--- | :--- |
| **Request Isolation** | Reflection metadata scanning per request | Native `requestContext` + lightweight container |
| **Heavy Singletons** | Complex `@Injectable({ scope: DEFAULT })` annotations | Pure higher-order closure (`memoizeModule`) |
| **Per-Request Overhead** | Milliseconds of reflection parsing + GC pressure | **Microsecond pure function execution** |
| **Runtime Portability** | Tied to specific Node.js framework internals | **Universal across Node.js, Bun, Cloudflare Workers** |

Differentiating between client singletons and server request isolation is fundamental to building secure full-stack applications. By delegating request isolation to lightweight per-request containers and heavy resources to closure memoization, modern TypeScript engineers achieve peak safety and microsecond speed without concept bloat.
