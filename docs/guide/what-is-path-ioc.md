# What is Path-IoC?

**Path-IoC** is a lightweight Inversion of Control and Dependency Lookup (IoC-DL) engine and DAG topological scheduler based on physical directory structures.

It is engineered for modern TypeScript full-stack applications, complex modular systems, high-performance Node.js services, and serverless edge runtimes.

---

## Architectural Pain Points in Large-Scale Codebases

In large Single Page Applications (SPAs) or micro-modular enterprise monorepos, codebase components are typically bound together by thousands of explicit, relative `import` statements. As applications scale to hundreds or thousands of modules, this traditional pattern creates severe structural failure modes:

### 1. Explicit Import Coupling & Circular Deadlocks
- When module A imports module B, and module B directly or indirectly imports module A, the JavaScript engine triggers circular dependency runtime exceptions (`TypeError: undefined is not a function`).
- Refactoring or moving an infrastructure module requires tedious batch modification of relative path imports across dozens of files (e.g., `../../../../utils/format`).

### 2. The Architectural Baggage of Traditional TS IoC (NestJS / InversifyJS)
- **Heavy Reflect-Metadata & Experimental Decorators**: Traditional frameworks rely strictly on TypeScript's `experimentalDecorators` and `emitDecoratorMetadata`.
- **Type-Stripping Transpiler Incompatibility**: Modern bundlers and transpilers (Vite, ESBuild, Rollup, SWC) perform pure AST type-stripping by default, discarding runtime metadata. Running NestJS or Inversify under Vite or SWC frequently results in runtime crashes, requiring heavy, slow transpilation polyfills.
- **Constructor Synchronization Deadlocks**: Class constructors cannot be asynchronous (`async constructor`), forcing complex lifecycle workarounds (`OnModuleInit`) for asynchronous resources like database connection pools.

---

## The Dual-Layer Philosophy of Path-IoC

### 1. Business Development Layer: Short Name as Bean ID
In day-to-day module development, developers **only need to care about short names**:
- The short name directly represents the **Bean ID**, conceptually identical to Spring's `@Autowired("userService")` or `ApplicationContext.getBean("userService")`;
- Declare dependencies naturally with short names: `export const dependencies = ["db", "userService"];`;
- Destructure dependencies directly from the container: `const { db, userService } = container;`;
- Developers **never write full path strings** in daily code, keeping the mental model intuitive and zero-overhead.

### 2. Architectural Layer: Physical Path as Java Annotation & Semantic Namespace
**Why is the framework named Path-IoC? What is the true role of paths?**
In Path-IoC, **physical directory paths act as zero-cost "Java Annotations" and semantic classifications**:
- `/entities/*` paths represent `@Entity` database entities;
- `/pages/*` paths represent `@Route` / `@Controller` frontend page routes;
- `/services/*` paths represent `@Service` business services requiring transaction management or auditing.

The framework places no restrictions on directory names. **The true architectural power of paths lies in automatic aggregation and Aspect-Oriented Programming (AOP)**:

#### Power 1: Dynamic Batch Aggregation
A centralized router module (`src/modules/router/index.ts`) can automatically mount all pages across the application without maintaining a manual list of imports:
```typescript
// Functions in dependencies automatically aggregate all modules under /pages
export const dependencies = (allModules: string[]) =>
  allModules.filter((path) => path.startsWith("/pages"));

export const main = (container: ModularContainer, pagePaths: string[]) => {
  // Automatically register all routes with zero configuration
  return createRouter(pagePaths.map((path) => container[path]));
};
```

#### Power 2: AOP Pointcut Interception & Weaving
To apply transaction management, metrics, or permission checks across all services, paths act as AspectJ pointcut expressions:
```typescript
// Intercept all modules residing within the /services semantic namespace
export const dependencies = (allModules: string[]) =>
  allModules.filter((path) => path.startsWith("/services"));

export const main = (container: ModularContainer, servicePaths: string[]) => {
  for (const path of servicePaths) {
    container[path] = withTransaction(container[path]);
  }
};
```

---

### Core Architectural Benefits
1. **Pure Function Exports**: Modules export a simple `main(container)` factory function. Zero class inheritance, zero `@Injectable()` annotations, and zero framework lockdown.
2. **Synchronous Lock-Free Kahn DAG Scheduling**: Powered by Kahn's topological sorting algorithm, cyclic dependencies are detected at compilation time, and modules are instantiated in optimal cascade order.
3. **Automated TypeScript Type Generation**: The universal `@path-ioc/unplugin` scanner generates global type interfaces in milliseconds on file save, delivering 100% accurate IDE auto-completion.
4. **Two-Stage Execution Separation**: The static dependency graph compiles once during cold boot. Subsequent container instantiations take only **21.2 microseconds**, making it ideal for edge computing.
