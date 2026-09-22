# @path-ioc/pack API 规范

`@path-ioc/pack` 是专为微前端、组件库分发与 Mesh 网格化依赖设计的物理打包与发布构建插件。

---

## 核心特性

- **物理入口自动生成**：自动扫描 `src/modules` 下所有 Mesh 并生成标准物理入口文件（默认 `.modular-plugin-entry.ts`）；
- **跨应用依赖共享**：导出标准运行期注册表数组 `modules` 与类型映射，无缝支持跨 monorepo 动态拓扑合并；
- **防篡改与混淆兼容**：物理入口文件可直接用于 npm 打包流程，完美兼容各类 AST 代码混淆工具。

---

## 配置选项 (`PackPluginOptions`)

| 配置项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 模块扫描的相对根目录路径。 |
| **`entryFile`** | `string` | `'node_modules/.path-ioc/.modular-plugin-entry.ts'` | 物理生成的入口文件路径。 |
| **`sharedMappings`** | `string[]` | `[]` *(可选)* | 接收生成的类型映射字符串数组引用。 |
| **`sharedContainerMappings`** | `string[]` | `[]` *(可选)* | 接收生成的容器类型映射字符串数组引用。 |

---

## 插件导出

```typescript
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";
```
