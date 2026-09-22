# Architectural Anti-Pattern: Why Hardcoding Full Paths in Business Dependencies is Wrong

> **"Code that runs is not necessarily code that is architecturally sound."**  
> While the Path-IoC container physically registers modules by their fully qualified path keys (such as `"/biz/order/orderService"`), this is by no means an escape hatch for resolving naming collisions in business logic. Hardcoding full-path strings in point-to-point business dependencies is an **architectural anti-pattern** that shatters location independence and sabotages refactorability.

---

## The Common Dilemma and Misconceptions

When first exploring Path-IoC, engineers occasionally ask:

> *"Since modules are indexed internally by their fully qualified physical paths (e.g. `/common/dbConnection` or `/user/service`), if two deep directories both define a module named `service`, can't I just write `dependencies = ["/user/service"]` to disambiguate them?"*  
> *"Doesn't the documentation imply that full names are only needed when short names collide?"*

**This is a critical architectural misconception.**

In Path-IoC's core design doctrine:
* **The Business Layer**: Point-to-point business collaboration **strictly prohibits hardcoding full physical paths**. It must always use camelCase Short Names.
* **The Orchestration Layer**: Fully qualified paths are reserved exclusively for **functional pattern matching** (such as dynamic route aggregation and non-invasive AOP aspect meshes).

Hardcoding full-path string literals in a business module's `dependencies` array might physically pass the compiler and run, but architecturally, it introduces **latent tech debt that turns routine refactoring into an outage waiting to happen**.

```typescript
// ❌ Architectural Anti-Pattern: Hardcoded full physical paths
export const dependencies = ["/infra/database/dbConnection", "/modules/user/userService"];
export const main = (container: ModularContainer) => {
  // Syntactic degradation: forced to use string subscript lookups
  const db = container["/infra/database/dbConnection"];
  const user = container["/modules/user/userService"];
  // ...
};

// ✅ The Architectural Standard: Pure short names with natural symmetry
export const dependencies = ["dbConnection", "userService"];
export const main = ({ dbConnection, userService }: ModularContainer) => {
  // Business logic is 100% decoupled from the physical folder structure
  // ...
};
```

---

## In-Depth Analysis: The Three Deadly Sins of Hardcoding Full Paths

Why do we adamantly categorize hardcoding full paths in business dependencies as an anti-pattern? What fundamental architectural invariants does it violate?

```
┌────────────────────────────────────────────────────────┐
│     Three Deadly Sins of Hardcoding Full-Path Strings   │
├──────────────────────────┬─────────────────────────────┤
│ 1. Violates Location     │ Degrades from "abstract    │
│    Transparency (DIP)    │ contract" to "hard disk     │
│                          │ folder coordinates"         │
├──────────────────────────┼─────────────────────────────┤
│ 2. Conceals Domain       │ Uses path band-aids to mask │
│    Defects               │ vague and ambiguous naming  │
├──────────────────────────┼─────────────────────────────┤
│ 3. Destroys Syntactic    │ Breaks ES6 destructuring and│
│    Symmetry              │ cripples IDE autocomplete   │
└──────────────────────────┴─────────────────────────────┘
```

### Sin 1: Shattering "Location Transparency" and Causing Refactoring Avalanches

One of the foundational tenets of Inversion of Control (IoC) and Dependency Lookup (DL) is **Location Transparency**:
> **A consumer module cares solely about "what contract/service I depend upon", never "in which drawer of the filesystem that service is stored."**

One of the most notorious pain points in legacy frontend architectures is relative path import hell:
```typescript
import { UserService } from "../../../../domain/user/services/userService";
```
Whenever a folder is moved, split, or flattened during domain refactoring, every single relative `import` across dozens of downstream files breaks instantly.

If we hardcode physical paths inside Path-IoC's `dependencies`:
```typescript
export const dependencies = ["/domain/user/services/userService"];
```
**This is conceptually identical to relative import hell!** You have simply shifted the path string from an `import` statement into an array literal. The moment an architect reorganizes directory structures, refactoring tools fail to update dynamic string references, resulting in runtime lookup failures.

By using short names (`userService`), regardless of how modules are categorized, relocated, or nested across subdirectories, **zero downstream lines of code need to be modified** as long as the domain concept remains unchanged.

---

### Sin 2: Masking Flawed Domain Modeling with Path Band-Aids

When two modules trigger a short-name collision (e.g. `/user/service` and `/admin/service` both resolve to the short alias `service`), why did the collision occur in the first place?

**The root cause: `service` is not an acceptable domain model name.**

In Domain-Driven Design (DDD) and object-oriented engineering, there is no distinct domain concept named merely "Service." Calling a module `service` is an abdication of domain naming precision.

```
                      Two Approaches to Short-Name Collisions
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
 ❌ Anti-Pattern: Path Band-Aid                    ✅ The Solution: Semantic Precision
 Keep ambiguous "service" name; patch via path     Rename folders to userService / adminService
 dependencies: ["/admin/service"]                  dependencies: ["adminService"]
                                                                  │
 Consequence:                                                     Consequence:
 - Rotting codebase, unreadable invocations                       - Self-documenting domain model
 - Destructuring disabled                                         - Pristine topological DAG
 - Fragile against directory moves                                - Full IDE type inference preserved
```

If the framework permitted engineers to bypass collisions simply by writing `["/admin/service"]`, teams would inevitably litter projects with generic folders named `service`, `utils`, and `manager`, relying on increasingly tortuous paths to keep the system glued together.

**Path-IoC enforces Fail-Fast compilation errors upon encountering ambiguous short names specifically to halt this architectural decay:**

```bash
[Dependency Error] Module '/biz/dashboard' has an ambiguous dependency on 'service'. 
This short name is used by '/user/service' and '/admin/service'. 
Please disambiguate by renaming the module (e.g. 'userService', 'adminService') 
or refactoring domain boundaries. Avoid hardcoding full paths in business dependencies 
as it is an architectural anti-pattern.
```

The proper remedies are clear and clean:
1. **Semantic Refactoring**: Rename the modules to represent their true domain role (e.g., `src/modules/adminService` and `src/modules/userService`).
2. **Bounded Context & Facade Aggregation**: If subdomains are truly isolated, expose a clean facade module with an unambiguous short name.

---

### Sin 3: Breaking Syntactic Symmetry and Developer Ergonomics

In Path-IoC best practices, dependency declaration and container consumption are **perfectly symmetrical**:

```typescript
// 1. Declare short-name dependencies (topological scheduling criteria)
export const dependencies = ["orderService", "paymentGateway"];

// 2. Pure closure factory destructures directly from parameter (type inferred)
export const main = ({ orderService, paymentGateway }: ModularContainer) => {
  return {
    checkout(orderId: string) {
      const order = orderService.findById(orderId);
      return paymentGateway.pay(order.amount);
    }
  };
};
```
This pattern aligns seamlessly with idiomatic JavaScript and TypeScript syntax:
- Every string in the declaration array corresponds 1:1 to a property on `ModularContainer`.
- IDEs provide instant autocomplete without manual casts or dictionary indexing.

Compare that to full paths:
```typescript
export const dependencies = ["/trade/order/orderService", "/pay/gateway/paymentGateway"];

export const main = (container: ModularContainer) => {
  // Syntactic disaster: string indexing destroys destructuring elegance
  const orderService = container["/trade/order/orderService"];
  const paymentGateway = container["/pay/gateway/paymentGateway"];
};
```
Developers are forced into clumsy property lookups and lose the simplicity of `const { orderService } = container`.

---

## The True Calling of Full Paths: Functional Pattern Matching & AOP Meshes

If business modules must never hardcode full paths, why does Path-IoC retain physical paths in its core architecture? Why is the framework named **Path-IoC**?

**Because in Path-IoC, paths serve as "zero-cost annotations" and "cross-cutting metadata"—not as point-to-point business identifiers.**

```
┌────────────────────────────────────────────────────────┐
│           Path-IoC Two-Tier Architecture Scope         │
├──────────────────────────┬─────────────────────────────┤
│ Business Layer           │ Consumes Short Names        │
│ (Microscopic)            │ Focus: Point-to-point       │
│                          │ collaboration & transparency│
├──────────────────────────┼─────────────────────────────┤
│ Orchestration Layer      │ Consumes Path Patterns      │
│ (Macroscopic)            │ Focus: Batch aggregation    │
│                          │ & non-invasive AOP aspects  │
└──────────────────────────┴─────────────────────────────┘
```

Full paths are intended **strictly for functional filter hooks** in infrastructure modules, never as static string literals in business code.

### Scenario 1: Dynamic Batch Aggregation

In enterprise systems, routers need to discover all pages, rule engines need to assemble all evaluation policies, and ORMs need to collect all entity schemas.

Traditionally, developers maintain a bloated central file (e.g. `allPages.ts`), manually importing every newly created view.

In Path-IoC, directory conventions act as implicit category tags:
```typescript
// src/modules/router/index.ts
// Orchestration: dynamic batch discovery via functional dependency filtering
export const dependencies = (allPaths: string[]) =>
  allPaths.filter((path) => path.startsWith("/pages/"));

export const main = (container: ModularContainer, pagePaths: string[]) => {
  // Zero maintenance: any new module under /pages is automatically wired
  const routes = pagePaths.map((path) => container[path]);
  return createRouter(routes);
};
```
Here, the `router` module does not need prior knowledge of specific short names; it discovers them dynamically through architectural conventions.

---

### Scenario 2: Non-Invasive AOP Aspect Meshes

This represents Path-IoC's killer capability over decorator-heavy frameworks.

Suppose every service module under `/services/*` requires telemetry tracing, execution metrics, or transaction wrappers. In legacy frameworks, developers must decorate every method across dozens of classes with `@Transactional` or `@Log`.

In Path-IoC, you write a single, decoupled Aspect Mesh module:

```typescript
// src/modules/aspects/telemetryAspect/index.ts
// Aspect depends on target service modules: topological engine guarantees they boot first
export const dependencies = (allPaths: string[]) =>
  allPaths.filter((path) => path.startsWith("/services/"));

export const main = (container: ModularContainer, targetPaths: string[]) => {
  for (const path of targetPaths) {
    const targetService = container[path] as Record<string, Function>;
    
    // Non-invasively wrap target methods with higher-order proxies
    for (const [methodName, originalMethod] of Object.entries(targetService)) {
      if (typeof originalMethod === "function") {
        targetService[methodName] = async (...args: any[]) => {
          const start = performance.now();
          try {
            return await originalMethod.apply(targetService, args);
          } finally {
            console.log(`[Telemetry] ${path}#${methodName} took ${(performance.now() - start).toFixed(2)}ms`);
          }
        };
      }
    }
  }
};
```

Business services remain 100% pure and completely unaware that they are being intercepted. Meanwhile, the aspect module achieves comprehensive mesh weaving simply by matching `path.startsWith("/services/")`.

**Here, full paths represent a macroscopic architectural contract, rather than a microscopic point-to-point dependency.**

---

## Architectural Decision Matrix

To assist engineering teams during Code Reviews, adhere to the following standard:

| Dimension | Short Name (`"userService"`) | Functional Path Match (`p => p.startsWith(...)`) | ❌ Static Hardcoded Full Path (`["/user/service"]`) |
| :--- | :--- | :--- | :--- |
| **Design Purpose** | **Business Point-to-Point (Bean ID)** | **Macroscopic Orchestration / AOP Mesh** | **Architectural Anti-Pattern** |
| **Target Scope** | 99% of day-to-day business modules | Page routing, entity harvesting, aspect meshes | No valid use case |
| **Location Transparency** | **100% Transparent** (folder moves do not break code) | **Convention-Bound** (relies on architectural directory standards) | **Tightly Coupled** (refactoring causes silent breaks) |
| **Collision Handling** | Forces semantic renaming and DDD clarity | Naturally handles bulk patterns | Masks domain ambiguity |
| **Syntactic Ergonomics** | Native destructuring, instant autocomplete | Structured array iteration | Clumsy dictionary subscript lookups |
| **Team Governance** | **Enforced by default** | **Recommended for infrastructure** | **Vetoed in CI & Code Review** |

---

## Conclusion: Short Names are Passports; Paths are Metadata Tags

* **Short Names are a module's "Passport (Bean ID)"**: They denote the concrete domain identity of a service. Business consumers reference only this identity; no matter where the passport holder resides in the filesystem, business relationships stay rock solid.
* **Physical Paths are a module's "Metadata Tags"**: Like Java annotations or microservice labels, they enable aspect meshes and aggregators to detect and weave cross-cutting concerns at scale.

**Never hardcode full paths in business dependencies to sidestep naming collisions. Preserving self-describing domain semantics is the only path to a maintainable, loosely-coupled architecture.**
