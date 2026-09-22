# Aspect-Oriented Programming (AOP) in Dynamic Languages

In traditional IoC ecosystems, Aspect-Oriented Programming (AOP) often entails heavy cognitive overhead, proprietary DSLs, or privileged decorators. Path-IoC demonstrates that in a dynamic language with first-class functions, pure AOP requires zero extra APIs.

---

## The Illusion of Traditional TypeScript AOP

- **InversifyJS**: Lacks built-in AOP primitives. Developers are forced to construct low-level `applyMiddleware` functions and write complex `new Proxy()` glue code globally.
- **NestJS**: Introduces 5 fragmented abstractions (`Guards`, `Interceptors`, `Pipes`, `Filters`, `Middlewares`). Target classes must explicitly `import` interceptors and annotate themselves with `@UseInterceptors()`. This is not true Inversion of Control; it is tight, coupled **active composition** limited exclusively to HTTP controllers. Standard business services cannot be transparently intercepted.

---

## The Path-IoC Paradigm: Natural Weaving via Dependency Lookup (DL)

In Path-IoC:
- **Target Modules**: **Zero invasiveness, zero imports, zero framework decorators**. Business modules remain completely agnostic of cross-cutting aspects.
- **Aspect Modules (Aspect Mesh)**: Declare target module path patterns in their `dependencies` hook (e.g. all paths matching `/api/` or `/service/`).

### Concrete Example: Global Execution Timing Aspect

Create an aspect module at `src/modules/aspect/timing-logger/index.ts`:

```typescript
// src/modules/aspect/timing-logger/index.ts
export const main = (container: ModularContainer, moduleNames: string[]) => {
  // 1. Filter target services to intercept (e.g., all modules matching /api/)
  const targetKeys = moduleNames.filter((name) => name.startsWith("/api/"));

  // 2. Wrap matching services transparently using native Proxy
  targetKeys.forEach((key) => {
    const originalService = container[key];
    if (typeof originalService === "object" && originalService !== null) {
      container[key] = new Proxy(originalService, {
        get(target, propKey, receiver) {
          const origMethod = Reflect.get(target, propKey, receiver);
          if (typeof origMethod === "function") {
            return async (...args: any[]) => {
              const start = Date.now();
              const result = await origMethod.apply(target, args);
              console.log(`[AOP Timing] [${key}.${String(propKey)}] Elapsed: ${Date.now() - start}ms`);
              return result;
            };
          }
          return origMethod;
        },
      });
    }
  });
};

// 3. Declare topological dependencies: Ensure target modules are fully assembled before the aspect wakes up
export const dependencies = (moduleNames: string[]) => {
  return moduleNames.filter((name) => name.startsWith("/api/"));
};
```

### Why This Paradigm is Exceptionally Powerful
1. **Zero Learning Curve**: Uses standard JavaScript higher-order functions and `Proxy`. No framework-specific APIs to memorize.
2. **Universal Cross-Cutting**: Intercept anything—from HTTP handlers and database repositories to background task queues and UI lifecycle hooks.
3. **Topologically Guaranteed Order**: By expressing target patterns in `dependencies`, Kahn's DAG algorithm guarantees that target modules are initialized first, eliminating lifecycle race conditions.
