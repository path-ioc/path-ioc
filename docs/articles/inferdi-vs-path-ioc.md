---
title: "Deep Dive: Path-IoC vs. InferDI — Does 'No Build Step' Equal 'Lightweight'? From Wiring Complexity and Type Penalties to Autonomous Topological Meshes"
description: "A rigorous architectural and type-theoretic analysis comparing Path-IoC and InferDI: from boilerplate complexity, unit test isolation, progressive migration, and per-request throughput, to type-state accumulators, DAG graph algorithms, and the three dependency lookup patterns."
head:
  - - meta
    - name: keywords
      content: inferdi vs path-ioc, typescript ioc, typescript di, lightweight ioc, vitest ioc, hono di, composition root, dependency lookup
---

# Deep Dive: Path-IoC vs. InferDI — Does "No Build Step" Equal "Lightweight"? From Wiring Complexity and Type Penalties to Autonomous Topological Meshes

> **"In software engineering, the most expensive complexity is never a one-time compilation plugin declared in your build configuration, but the glue wiring code and context-switching overhead that expands linearly with system scale."**

In modern frontend and full-stack engineering, build pipelines have decisively shifted toward pure AST type stripping and ultra-fast native toolchains (Vite, ESBuild, SWC, Rolldown). This shift fundamentally undermined traditional TypeScript IoC frameworks (such as NestJS and InversifyJS): deeply reliant on `reflect-metadata` and experimental class decorators, their metadata is erased during modern bundling, leading to runtime undefined crashes.

In response, the "modern pure type inference" camp—exemplified by **InferDI**—emerged. Pitching "zero dependencies, decorator-free, and compile-time dependency graph verification via pure TypeScript types," it has attracted considerable community interest.

However, evaluated through the lens of rigorous software architecture and complexity theory: **Does "no build step" truly equate to "lightweight"?**

This article conducts an exhaustive, bidirectional investigation **from empirical practice to underlying theory**:

1. **Empirical Engineering Dimensions**: We quantify change-set sizes for new modules ($O(N)$ vs. $O(1)$), unit and integration testing isolation costs, progressive adoption patterns for legacy codebases, and the throughput boundaries of per-request containers under high concurrency;
2. **Theoretical & Type System Dimensions**: We dissect InferDI's "type-state accumulator" to expose how topological graph sorting is offloaded onto the developer's working memory, formally define the **"Three Canonical Dependency Lookup (IoC-DL) Patterns"**, and prove the fundamental limits of push-based Dependency Injection (Push DI) in dynamic aggregation and cross-cutting aspect governance.

---

## Part I: Empirical Engineering Dimensions & Physical Overhead

In software engineering, evaluating paradigms in the abstract without measuring concrete code changes and maintenance friction invariably leads to distorted conclusions. The merit of a dependency governance system is first and foremost revealed in physical metrics across the development lifecycle.

```
┌────────────────────────────────────────────────────────────────────────┐
│               Empirical Comparison of Engineering Overhead             │
├──────────────────────────────────┬─────────────────────────────────────┤
│       InferDI (Central Wiring)   │        Path-IoC (Autonomous Mesh)   │
├──────────────────────────────────┼─────────────────────────────────────┤
│ Change-set: $O(N)$ Composition   │ Change-set: $O(1)$ Autonomous       │
│ Root updates                     │ file drops                          │
│ Graph sorting: Manual human      │ Graph sorting: Deterministic micro- │
│ topological ordering             │ second DFS DAG engine               │
│ Unit testing: Class constructor  │ Unit testing: Pure function closure │
│ parameter passing                │ literal mocking                     │
│ Legacy adoption: Manual object   │ Legacy adoption: Route merge &      │
│ wrappers                         │ wildcard gateway intercepts         │
│ Concurrency cost: Runtime        │ Concurrency cost: 21.2µs single-    │
│ recursive traversal              │ compile cached instantiation        │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

### 1. Modularity & Boilerplate Complexity: Scaling the Change-Set

The most reliable metric of developer experience (DX) is **the number of files modified and context switches required when adding or refactoring a business capability**.

Consider a standard domain service: `OrderService` depending on `Db` and `UserService`.

#### InferDI's Overhead: The $O(N)$ Debt of the Centralized Composition Root

In InferDI, writing the domain class is merely the first step. Adhering to Mark Seemann's classical Composition Root pattern, all wiring must be explicitly consolidated in a central bootstrap file:

```typescript
// 1. Author the domain unit: src/services/order.ts
export class OrderService {
  constructor(
    private db: Db,
    private user: UserService,
  ) {}
  async create(item: string) {
    /* ... */
  }
}

// 2. Context switch: Navigate to the centralized wiring file src/container.ts
import { Db } from "./services/db";
import { UserService } from "./services/user";
import { OrderService } from "./services/order"; // <-- Manual import statement

export const container = new Container()
  .registerClass("db", Db, [])
  .registerClass("user", UserService, ["db"])
  // <-- CRITICAL CONSTRAINT: The developer must mentally resolve the topological order;
  // dependencies MUST be registered before consumers in the chain.
  .registerClass("order", OrderService, ["db", "user"]);
```

- **Complexity Scaling**: The wiring overhead scales at **$O(N)$**. Every single module introduced into the codebase requires an additional `import` statement and another `.registerClass()` call in `container.ts`.
- **Cognitive Load**: InferDI's generic type accumulator mandates that the declaration order in code strictly mirrors topological dependency order. If inverted, the TypeScript compiler immediately throws a type mismatch error, forcing developers to act as human topological sorting engines.

#### Path-IoC's Overhead: Path-as-Contract Zero-Boilerplate Autonomy ($O(1)$)

Path-IoC adheres to modern Convention over Configuration principles. Once the `@path-ioc/unplugin` compiler plugin is declared once in your build tool (`vite.config.ts`):

```typescript
// Authored in isolation in src/modules/order-service/index.ts:
export const dependencies = ["db", "user"];

export const main = ({ db, user }: ModularContainer) => {
  return {
    async create(item: string) {
      const currentUser = await user.getCurrent();
      return db.insert({ item, userId: currentUser.id });
    },
  };
};
```

- **Complexity Scaling**: The wiring overhead remains strictly **$O(1)$**. Developers never maintain a central registry or write cross-module import paths; saving the file to disk completes registration.
- **Cognitive Load**: Modules declare their required Mesh IDs; their order of appearance is completely decoupled. The compiler-runtime co-design incrementally synchronizes the global `ModularContainer` interface via sub-millisecond AST watchers.

---

### 2. Testability & Verification Cost

Testing ergonomics serve as the ultimate litmus test for architectural decoupling. If business units cannot be executed outside of a heavyweight container, test coverage inevitably degrades.

#### Scenario A: Unit Isolation Testing

- **InferDI**: Because services are plain classes, tests can instantiate them directly via their constructors without launching a container:
  `new OrderService(mockDb, mockUser)`.
- **Path-IoC**: Because modules are first-class pure function closure factories, unit tests **require neither the container runtime nor the compiler plugin**. Mock dependencies are passed directly as plain object literals:

```typescript
// test/order-service.test.ts (Runs completely standalone, zero framework dependencies)
import { main } from "../src/modules/order-service";

test("creates order successfully", async () => {
  const mockDb = { insert: vi.fn().mockResolvedValue({ id: "order_1" }) };
  const mockUser = { getCurrent: () => ({ id: "u_999" }) };

  // Directly invoke the factory closure with mock literals
  const orderService = main({ db: mockDb, user: mockUser } as any);
  const result = await orderService.create("MacBook");

  expect(result.id).toBe("order_1");
  expect(mockDb.insert).toHaveBeenCalled();
});
```

#### Scenario B: Subsystem & End-to-End Integration Testing

When verifying the cascading instantiation of dozens of services, asynchronous preheating, and AOP proxy interception:

- **InferDI**: Tests must duplicate the entire registration pipeline or import a shared global container with side-effects, making test isolation fragile;
- **Path-IoC**: Modern full-stack suites predominantly adopt **Vitest** or **Vite-node**. Because `@path-ioc/unplugin` natively shares Vite's plugin pipeline, `virtual:modular-container` works out of the box in test files:

```typescript
import { createModularContainer } from "virtual:modular-container";

test("full mesh topological integration", async () => {
  // Concurrently ignites the entire DAG in microseconds
  const container = await createModularContainer();
  const res = await container.orderService.create("iPhone");
  expect(res).toBeDefined();
});
```

Running `npx vitest` provides fully isolated container instances per test without mock wiring boilerplate.

---

### 3. Progressive Adoption & The Strangler Fig Pattern

A common real-world hesitation is: "Must we rewrite our entire codebase to adopt an application-level module system?"

The answer is emphatically no. Path-IoC natively implements Martin Fowler's **Strangler Fig Pattern**, allowing surgical, zero-risk progressive adoption:

#### Frontend Route Evolution: Two Merge Postures

Legacy pages and components continue using existing relative `import` statements, while all newly developed routes reside inside the Path-IoC mesh:

- **Posture A (Host-Decoupled Merge)**:
  Merged at the host router entry point. The mesh remains entirely agnostic of legacy code:

  ```typescript
  // src/router/index.ts (Host entry)
  import { legacyRoutes } from "./legacy-routes";
  import { createModularContainer } from "virtual:modular-container";

  const container = await createModularContainer();
  export const routes = [
    ...legacyRoutes, // 1. Untouched legacy routes
    ...container.autoPageRoutes, // 2. Incremental routes auto-generated by the mesh
  ];
  ```

- **Posture B (Mesh-Enclosed Merge)**:
  Legacy route configurations are injected directly into the mesh router module, maintaining a pure single-line ignition entry point:
  ```typescript
  // src/modules/app-router/index.ts (Internal Mesh Aggregator)
  import { legacyRoutes } from "@/legacy/routes";

  export const dependencies = (all: string[]) => all.filter((p) => p.startsWith("/pages/"));
  export const main = (container: ModularContainer) => {
    // Computes topological routes internally and merges with legacy trees
    return buildFinalRoutes(legacyRoutes, container);
  };
  ```

#### Practical Applications of the Aggregator Pattern (Beyond Routing)

Routing is merely the most visible manifestation of the **Aggregator Pattern**. Across medium-to-large codebases, this pattern eliminates vast quantities of brittle glue code:

1. **Dynamic Form Component (FieldInput) Aggregation**:
   In dynamic form and low-code engines, traditional architectures maintain a massive registry: `import { Text, Number, DatePicker, Select... }`. In Path-IoC, simply adding a component under `src/modules/fields/` automatically exposes it to the form renderer by contract—**zero manual imports**;
2. **Schema & Validation Logic Aggregation**:
   Form validators automatically discover all `/validators/` closures, weaving field rules dynamically at runtime;
3. **Backend ORM Entity & Schema Aggregation**:
   When initializing Drizzle, Prisma, or TypeORM, traditional setups require maintaining an array of hundreds of entity classes: `entities: [User, Order, Payment, ...]`. Forgetting one produces runtime foreign-key breakages. In Path-IoC, the database initialization module filters `all.filter(p => p.startsWith('/models/'))` to auto-discover every entity, achieving autonomous domain model governance.

#### Backend Catch-All Gateway Intercepts

Legacy Express, Koa, or Hono handlers remain completely untouched, while new business paths are delegated to the mesh gateway:

```typescript
// src/server.ts
import { Hono } from "hono";
import { legacyUserHandler, legacyOrderHandler } from "./legacy-handlers";
import { createModularContainer } from "virtual:modular-container";

const app = new Hono();

// 1. Legacy endpoints remain untouched
app.get("/api/v1/user", legacyUserHandler);
app.post("/api/v1/order", legacyOrderHandler);

// 2. All new endpoints are handled by the dynamic mesh
app.all("/api/v2/*", async (c) => {
  const container = await createModularContainer({ requestContext: c });
  return container.apiAggregator(); // Auto-maps to /api/v2/xxx modules
});

export default app;
```

This pattern allows teams to modernize their architectural foundation without service downtime or all-at-once migrations.

---

### 4. Per-Request Container Isolation & High-Concurrency Throughput

In long-running, stateful server runtimes, container instantiation latency of tens of milliseconds is often dismissed as negligible. However, in modern full-stack edge runtimes (Cloudflare Workers, Serverless), microsecond instantiation is **the critical threshold for high-concurrency isolation**:

- **Per-Request Container Isolation**:
  In the `app.all("/api/*")` pattern above, to prevent state contamination across concurrent requests on Node's single-threaded Event Loop (e.g., auth tokens, trace IDs), **a pristine, isolated container instance must be spawned per HTTP request**;
- **Throughput Boundary Calculations**:
  - If container initialization takes **3 to 5 milliseconds** (typical for DI containers relying on runtime reflection, prototype chain synthesis, or deep recursive binding), at 5,000 QPS, container creation alone consumes 100% of single-threaded CPU capacity, causing severe queueing delays and P99 latency spikes;
  - Path-IoC leverages a **single static graph compilation cache** executed at boot time. Subsequent dynamic instantiations merely invoke flat closures and topological population, averaging just **`21.2 microseconds (µs)`** (0.02 ms). Even under thousands of QPS, per-request container isolation incurs near-zero CPU overhead.

---

## Part II: Type System Theory & Architectural Paradigms

Having measured empirical DX metrics, we now examine the underlying mechanics: **Why is InferDI structurally bound to a centralized composition root? Why does Path-IoC natively enable advanced dependency lookup patterns?**

---

### 5. Type System Penalties: How Type-State Accumulators Offload Graph Sorting to Human Cognition

InferDI's core appeal is "zero build plugins, relying purely on TypeScript type inference." However, in programming language type theory, **computational complexity is conserved**: what is not computed by an external AST compiler must be paid for by developer cognitive overhead and restrictive syntax.

#### InferDI's Type-State Accumulator Model

InferDI employs a fluent builder type-state accumulator:

```typescript
class Container<TContext = {}> {
  registerClass<K extends string, TDeps extends (keyof TContext)[], TInstance>(
    key: K,
    impl: new (...deps: Resolve<TContext, TDeps>) => TInstance,
    deps: TDeps
  ): Container<TContext & Record<K, TInstance>> { ... }
}
```

Every invocation of `.registerClass()` computes an intersection type `TContext & Record<K, TInstance>`.

#### Structural Limitations & Engineering Consequences:

1. **Syntax-Enforced Topological Ordering**:
   Because the generic context accumulates strictly linearly, a dependency **must physically precede** its consumer in the code sequence. If `orderService` is registered before `db`, `db` is not yet present in `TContext`, and TypeScript produces an immediate compilation error. **InferDI has no topological sorting algorithm; it forces the developer to manually perform a post-order traversal of the graph in their head!**
2. **Inability to Register Across Separate ES Modules**:
   TypeScript's local type inference cannot escape single-expression chains. If a developer attempts to call `.registerClass()` on a shared container across `user.ts` and `order.ts`, the TypeScript compiler **cannot statically unify or merge local generic accumulations across separate module boundaries**. InferDI's official recommendation to consolidate all registrations in a single composition root file is a direct mathematical consequence of this limitation.

#### Path-IoC's Compiler-Runtime Co-Design

Path-IoC avoids forcing TypeScript's fragile type checker into deep recursive graph traversal (which easily triggers `Type instantiation is excessively deep`), splitting the responsibility cleanly:

- **Compile-Time (`@path-ioc/unplugin`)**: A high-performance AST scanner maps physical directory paths and `dependencies` declarations, generating the ambient `ModularContainer` interface directly;
- **Runtime (`@path-ioc/core`)**: Modules may be declared in completely arbitrary order. `@path-ioc/core` executes an industrial-grade **Depth-First Search (DFS) post-order topological sort**, computing optimal activation sequences in microseconds and intercepting dependency cycles (Fail-Fast).

---

### 6. Paradigm Divergence: Push DI vs. Pull IoC-DL and the Three Canonical Patterns

The industry frequently conflates all Inversion of Control under the umbrella term "Dependency Injection (DI)". Yet, Martin Fowler's seminal work established a sharp theoretical distinction between **Dependency Injection (Push DI)** and **Dependency Lookup (Pull IoC-DL)**:

- **Push Dependency Injection (InferDI's Foundation)**:
  Components passively receive concrete instances passed to them. A component must explicitly enumerate every single dependency token. **It is inherently restricted to point-to-point deterministic dependencies and cannot express dynamic pattern matching.**
- **Pull Dependency Lookup (Path-IoC's Foundation)**:
  Components dynamically query the container for a collection of dependencies matching contract criteria, resolved by the topological engine.

In real-world distributed architectures, Dependency Lookup resolves into a **2D orthogonal matrix** defined by **Host Side-Effects** and **Return Values**:

| Pattern                   | Host Side-Effects |  Return Value  | Architectural Responsibility & Use Cases                                                                                                                                                                                       |
| :------------------------ | :---------------: | :------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. AOP Pattern**        |     **None**      |    **None**    | **Cross-Cutting Aspect Governance**: Scans target modules and weaves telemetry, authentication, or circuit breakers via Proxies. Self-contained within the mesh, zero host side-effects, no return value.                      |
| **2. Aggregator Pattern** |     **None**      | **Has Return** | **Contract Consolidation**: Dynamically collects modules matching path/name contracts (`/api/*`, Form fields, ORM schemas) and returns a unified dispatcher or metadata map. Zero host side-effects, pure return value.        |
| **3. Starter Pattern**    |  **Has Effects**  |    **None**    | **Autonomous Bootstrap Trigger**: Terminal leaf node of the DAG that binds to external host runtimes (opening HTTP ports, message consumer loops, scheduling cron jobs). Produces explicit host side-effects, no return value. |

#### Code Comparison: Path-IoC's Native Expression of the Three Patterns

```typescript
// 1. AOP Pattern (No side-effects, no return): Cross-cutting telemetry weaving
export const dependencies = (all: string[]) => all.filter((p) => p.includes("/services/"));
export const main = (container: ModularContainer) => {
  for (const [key, service] of Object.entries(container)) {
    container[key] = wrapWithTelemetry(service);
  }
};

// 2. Aggregator Pattern (No side-effects, has return): API gateway dispatcher
export const dependencies = (all: string[]) => all.filter((p) => p.startsWith("/api/"));
export const main = (container: ModularContainer) => {
  return async () => {
    const { requestContext } = container;
    const targetModule = container[requestContext.req.path];
    return await targetModule();
  };
};

// 3. Starter Pattern (Has side-effects, no return): Self-contained bootstrapper
export const dependencies = ["apiAggregator", "mqConsumer"];
export const main = ({ mqConsumer }: ModularContainer) => {
  mqConsumer.startListening(); // Produces real-world external side-effects
};
```

#### Why InferDI Cannot Structurally Support These Patterns

Attempting to implement dynamic Aggregators or AOP weaving in InferDI triggers three fundamental failures:

1. **Type Inference Collapse**:
   InferDI depends on static literal tuples (`['db', 'user'] as const`). Passing `allTokens.filter(...)` produces a generic **`string[]`** lacking tuple length semantics. InferDI's type chain collapses immediately, forcing developers to cast with `as any`;
2. **Violation of the Open-Closed Principle (OCP)**:
   To preserve type safety in InferDI, an aggregator must explicitly declare every single child service in its constructor:
   `constructor(private userApi: UserApi, private orderApi: OrderApi, private payApi: PayApi ...)`
   Every new API module requires breaking open and modifying the aggregator's signature, destroying OCP;
3. **Degradation into the Service Locator Anti-Pattern**:
   Injecting the raw `container` instance into a component to call `container.resolve(token)` dynamically bypasses InferDI's static lifetime guards (such as preventing singletons from capturing scoped services), trading compile-time guarantees for unpredictable runtime failures.

---

### 7. Architectural Worldviews: The External Service Locator vs. The Autonomous Mesh

Analyzing application bootstrap code reveals the irreconcilable philosophies of the two systems:

#### InferDI: Host-Driven Service Locator

```typescript
// Business logic lives outside the container:
const container = new Container().register(...);

// The host entry point pulls parts from the container:
const userService = container.resolve("userService");
userService.doSomething();
```

- **Worldview**: The container is an external **parts catalog**. Business orchestration is intertwined with host runner scripts; inversion of control is incomplete.

#### Path-IoC: Autonomous Mesh Paradigm

```typescript
// 1. Business logic and startup orchestration live entirely inside mesh modules (src/modules/start-app/index.ts):
export const dependencies = ["orderService"];
export const main = ({ orderService }: ModularContainer) => {
  orderService.create("MacBook");
};

// 2. Host Entry Point (src/main.ts):
import { createModularContainer } from "virtual:modular-container";

// The host is merely a matchstick: it ignites the mesh and exits!
createModularContainer();
```

#### Why "External Business Invocation" is an Architectural Anti-Pattern

1. **Shatters AOP Governance Closures**: Invoking business units outside the container completely bypasses execution tracking, authorization filters, and resilience policies woven within the mesh;
2. **Hard Vendor Lock-In**: Business logic couples to concrete host environments (Hono, Express, CLI runtimes). In Path-IoC, modules depend solely on the abstract `ModularContainer` contract; migrating from Node.js to Cloudflare Workers requires modifying only the single ignition line;
3. **Breaks Vite HMR Boundaries**: Retaining container instances in top-level external scopes causes stale closure references and memory leaks during React hot reloads.

---

### 8. The Inflation of Scope Concepts: Hierarchical Trees and Captive Dependencies vs. Closure Primitives

In server-side high-concurrency environments, scope isolation is a strict requirement—because native ES module singletons (`export const a = new A()`) cannot isolate multi-tenant contexts under single-threaded Event Loops, resulting in severe state leakage and race conditions.

However, in addressing scope isolation, the two frameworks represent a profound conflict between **Concept Inflation** and **Occam's Razor**:

#### InferDI's Inflationary Route: Hierarchical Container Trees & Captive Dependencies

Adhering to classical OOP hierarchical scopes, InferDI triggers an avalanche of conceptual overhead:

1. **Surging Conceptual Tax**: To support request scopes, developers must learn and maintain `declareScopeInputs` slots, manual `.createScope()` invocations, and three lifecycle modes (`'singleton'`, `'scoped'`, `'transient'`);
2. **The #1 Ghost Defect: Captive Dependencies**:
   If a singleton service accidentally injects a request-scoped dependency, the singleton will permanently hold that request's context, causing insidious **cross-tenant data leakage and memory leaks**. InferDI is forced to construct complex Lifetime Guards at compile and run times to intercept this, burdening developers with constant troubleshooting;
3. **Pervasive Decision Fatigue**: For every service across a codebase, developers must pause and debate: "Should this be scoped or singleton?"

#### Path-IoC's Orthogonal Minimalism: Default Total Isolation + Closure Memoization (`memoizeModule`)

While adding hierarchical scope tags to Path-IoC would be trivial to implement, it resolutely **rejects concept inflation**, returning to the raw arithmetic of production systems:

- **1% Stateful Infrastructure vs. 99% Stateless Business**: In a real full-stack codebase of 200 modules, the resources that genuinely require process-level persistence can be counted on one hand (typically 3 to 5: database connection pools, Redis clients, message queue producers). The remaining 195 modules represent purely stateless domain logic;
- **Refusing to Penalize 99% of Code for a 1% Edge Case**:
  - **Default Philosophy**: Everything is pristine per-request isolation! Leveraging **`21.2µs`** microsecond instantiation, every HTTP request simply ignites a brand-new `ModularContainer`, eliminating multi-tenant cross-talk at the root;
  - **On-Demand Closure Caching**: Those 3 to 5 low-level connection pools require zero scope tags; they are explicitly wrapped with the pure higher-order closure primitive `memoizeModule`.
- **Architectural Dividend**: Business modules feature **zero scope annotations, zero parent-child containers, and zero captive dependency traps**. Using pure JavaScript functional closures, scope isolation is solved completely while eliminating conceptual inflation.

---

## Part III: Architectural Decision Matrix & Conclusion

| Decision Dimension        | InferDI                                           | Path-IoC                                                       |
| :------------------------ | :------------------------------------------------ | :------------------------------------------------------------- |
| **Core Paradigm**         | Push-based Dependency Injection (Push DI)         | Pull-based Path-Contract Dependency Lookup (IoC-DL Mesh)       |
| **Boilerplate Scaling**   | **$O(N)$** (Linear expansion of Composition Root) | **$O(1)$** (Zero daily wiring code after initial plugin setup) |
| **Graph Scheduling**      | Forced human-ordered linear code chains           | Runtime DFS post-order DAG microsecond assembly                |
| **Dynamic Lookup & AOP**  | Unsupported (causes TypeScript type collapse)     | Natively supports AOP, Aggregator, and Starter patterns        |
| **Legacy Code Migration** | Manual object wrappers in central container       | Route Merge and wildcard gateway intercepts                    |
| **Testing Isolation**     | Class constructor argument passing                | Pure closure literal injection + Native Vitest support         |
| **High-Concurrency Cost** | Runtime recursive instantiation                   | Single-compile cache, **21.2µs** per-request isolation         |

---

### 💡 Final Verdict: Generational Shift — Industrial Automation vs. Artisanal Wiring

Architectural discussions often lean on diplomatic compromises: _"choose lightweight tools for small projects, and heavyweight frameworks for large systems."_ However, grounded in the arithmetic of code volume and physical complexity, this false dichotomy falls apart:

- **In a single-file application**: Developers do not need any IoC/DI framework; native `const a = new A()` remains the cleanest, most readable approach;
- **The moment a system spans multiple files ($N \ge 2$)**: The physical maintenance and cognitive burden of InferDI's centralized wiring plate **strictly exceeds that of Path-IoC!**

Consider the concrete engineering overhead:
Under InferDI, even for two interacting modules, developers must create a centralized `container.ts`, author two manual `import` statements, mentally resolve the dependency sequence to ensure prerequisites are registered first, write chained registrations, and invoke `.resolve()` at the call site. For every subsequent service, this manual sequence must be linearly repeated.

In Path-IoC, the single declaration of `pathIoc.vite()` in the build config is a one-time fixed cost. From the 2nd module onward, daily wiring code volume **equals strictly zero**—no centralized registry, no manual imports, no ordering constraints; saving a file to disk registers the contract.

**The fundamental divide is not between "lightweight tools" and "heavyweight frameworks", but an evolutionary leap from artisanal manual wiring to industrial-grade autonomous assembly:**

- **InferDI** represents classical Constructor DI attempting to survive in modern TypeScript without decorators, retreating into an **artisanal manual wiring board**. It secures compile-time type safety at the expense of forcing developers to manually maintain centralized files and mental dependency ordering;
- **Path-IoC** fundamentally breaks with manual wiring. Embracing the physical trajectory of modern fast build pipelines, its compiler-runtime co-design and path-as-contract philosophy make dependency assembly **completely invisible** during daily feature development.

When building modern TypeScript applications, eliminating relative import coupling and letting directory structures define contracts will always remain faster, cleaner, and more architecturally resilient than manually stringing wires across a centralized board.
