# @path-ioc/core API 规范

`@path-ioc/core` 是框架的核心算法调度运行时，体积仅 8.8KB，零外部多余依赖，原生支持浏览器、Node.js 与 Cloudflare Workers 边缘计算环境。

---

## 核心方法

### `compileModuleGraph(modules)`

将收集到的模块声明列表编译为不可变的静态 DAG 依赖拓扑图。

- **类型签名**：
  ```typescript
  function compileModuleGraph(
    modules: { key: string; module: IOCModule }[]
  ): CompiledModuleGraph;
  ```
- **参数说明**：
  - `modules`: 模块描述数组。通常由 `virtual:modular-container` 自动注入，也可在纯 Node.js 或单元测试中手动构造。
- **返回值**：
  - `CompiledModuleGraph`: 包含 DFS 拓扑排序列表、环形依赖深搜校验与短名称索引表的静态依赖图结构体。
- **异常规范**：
  - 若检测到循环依赖（Cycle），抛出带完整调用环路径的异常；
  - 若检测到重复声明或短名称冲突，抛出详细诊断提示。

---

### `instantiateModuleContainer(compiledGraph, container)`

基于已编译的依赖图，按拓扑顺序唤醒各个模块的 `main` 函数并装配到目标容器中。

- **类型签名**：
  ```typescript
  function instantiateModuleContainer(
    compiledGraph: CompiledModuleGraph,
    container: Record<string, unknown>
  ): Promise<void>;
  ```
- **参数说明**：
  - `compiledGraph`: 由 `compileModuleGraph` 生成的编译图。
  - `container`: 需要注入实例的目标对象（例如 `{ requestContext: c }`）。
- **性能指标**：
  - 若全模块为同步装配，直通耗时仅 **21.2 µs**。

---

### `initialize(modules, container)`

便捷快捷方法，内部依次调用 `compileModuleGraph` 与 `instantiateModuleContainer`。

- **类型签名**：
  ```typescript
  function initialize(
    modules: { key: string; module: IOCModule }[],
    container: Record<string, unknown>
  ): Promise<void>;
  ```

---

## Mesh 模块导出规范 (Mesh Export Protocol)

> 💡 **Mesh 概念**：在 Path-IoC 中，每个业务模块被称为一个 **Mesh**（对标 Spring 中的 **Bean**）。正如 Spring 之于 Java、Bean 区别于 Class 一样，Path-IoC 作为应用级模块系统，Mesh 是对标 ES Module（ESM）的高阶控制反转单元。

在 `src/modules/**/index.ts` 中，允许导出以下 4 个标准变量：

| 导出变量名 | 类型 | 默认值 | 作用说明 |
| :--- | :--- | :--- | :--- |
| **`main`** *(必须)* | `(container: ModularContainer, moduleNames: string[]) => any \| Promise<any>` | - | 模块工厂函数。接收容器与全量模块 Key，支持 `async`。 |
| **`dependencies`** *(可选)* | `string[] \| ((moduleNames: string[]) => string[])` | `[]` | 拓扑依赖声明。支持静态数组或动态函数过滤。 |
| **`order`** *(可选)* | `number` | `99999` | 执行时序权重。数值越小越先执行（数值升序排序，默认值 `99999`），在无拓扑依赖约束时生效。 |
| **`skip`** *(可选)* | `boolean` | `false` | 跳过执行标记。用于外部预先注入的模块（如后端请求隔离时注入 `requestContext`），仅让 unplugin 生成类型提示而不执行 `main`。**注意**：即便标记了 `skip: true`，也必须导出一个 dummy `main` 函数（如 `export const main = (): MyType => ({} as any)`）以满足 core 运行时的合法性校验与类型生成。 |
