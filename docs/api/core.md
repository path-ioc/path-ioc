# @path-ioc/core API Reference

`@path-ioc/core` provides the foundational topological scheduling engine and dependency lookup runtime. With an 8.8KB bundle footprint and zero external dependencies, it natively supports browsers, Node.js, and Cloudflare Workers.

---

## Core Methods

### `compileModuleGraph(modules)`

Compiles a declared module list into an immutable, validated Directed Acyclic Graph (DAG).

- **Type Signature**:
  ```typescript
  function compileModuleGraph(
    modules: { key: string; module: IOCModule }[]
  ): CompiledModuleGraph;
  ```
- **Parameters**:
  - `modules`: Array of module descriptor objects. Typically provided automatically by `virtual:modular-container`, or constructed manually in unit tests and scripts.
- **Returns**:
  - `CompiledModuleGraph`: A frozen structure containing the Kahn topological sort array, cycle detection metadata, and short-alias lookup maps.
- **Errors**:
  - Throws a descriptive `Error` indicating the full circular reference path if a dependency cycle is detected.
  - Throws if conflicting module keys or invalid module definitions are encountered.

---

### `instantiateModuleContainer(compiledGraph, container)`

Instantiates modules in topological order by invoking their `main` factories and populating the target container.

- **Type Signature**:
  ```typescript
  function instantiateModuleContainer(
    compiledGraph: CompiledModuleGraph,
    container: Record<string, unknown>
  ): Promise<void>;
  ```
- **Parameters**:
  - `compiledGraph`: Pre-compiled graph produced by `compileModuleGraph`.
  - `container`: Target mutable container object (e.g. `{ varContext: c }`).
- **Performance**:
  - Pure synchronous factory graphs resolve directly in **21.2 microseconds**.

---

### `initialize(modules, container)`

A convenience utility that executes `compileModuleGraph` followed immediately by `instantiateModuleContainer`.

- **Type Signature**:
  ```typescript
  function initialize(
    modules: { key: string; module: IOCModule }[],
    container: Record<string, unknown>
  ): Promise<void>;
  ```

---

## Mesh Export Protocol

Every module located at `src/modules/**/index.ts` may export up to four standard identifiers:

| Identifier | Type Signature | Default | Description |
| :--- | :--- | :--- | :--- |
| **`main`** *(Required)* | `(container: ModularContainer, moduleNames: string[]) => any \| Promise<any>` | - | Factory function invoked according to topological sort order. Supports `async`. |
| **`dependencies`** *(Optional)* | `string[] \| ((moduleNames: string[]) => string[])` | `[]` | Explicit topological dependencies. Supports string arrays or dynamic filter functions. |
| **`order`** *(Optional)* | `number` | `99999` | Priority weight when no explicit topological dependencies constrain ordering. |
| **`skip`** *(Optional)* | `boolean` | `false` | When `true`, skips runtime initialization (useful for type-only placeholder modules). |
