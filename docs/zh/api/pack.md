# @path-ioc/pack API 规范

`@path-ioc/pack` 是专用于将模块目录打包为**独立发布的 npm 插件包/组件库**的专用 Vite 构建插件。

> 💡 **架构定位与使用建议**：`@path-ioc/pack` 会在构建期自动接管改写 Vite 的 `build.lib` 配置，并在打包结束时自动生成 `package.json`、`index.d.ts` 与 npm tarball 交付物。**推荐通过独立的打包配置（例如 `vite.config.pack.ts`）或由项目自定义环境变量/构建脚本按需触发，避免无条件直接写入通用 Web 前端应用的主构建配置**。

---

## 核心特性

- **物理入口自动生成**：自动扫描 `src/modules` 下所有 Mesh 模块并生成标准的物理聚合入口文件（默认 `.modular-plugin-entry.ts`）；
- **模块注册表导出**：导出标准运行期注册表数组 `modules` 与类型映射，供宿主应用或微前端运行时直接装载；
- **内置源码混淆保护**：构建结束时默认集成 `javascript-obfuscator` 对产物代码进行混淆保护（可通过环境变量 `MODULAR_OBFUSCATE=false` 关闭）；
- **交付包自动打包**：自动生成交付标准的 `package.json` 与类型声明，并自动调用 `npm pack` 产出可分发的 tarball 压缩包。

---

## 配置选项 (`PackPluginOptions`)

| 配置项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 模块扫描的相对根目录路径。 |
| **`entryFile`** | `string` | `'node_modules/.path-ioc/.modular-plugin-entry.ts'` | 物理生成的入口文件路径。 |
| **`outDir`** | `string` | `'dist-plugin'` | 构建产物输出与 npm 打包目录。 |
| **`sharedMappings`** | `string[]` | `[]` *(可选)* | 接收生成的类型映射字符串数组引用。 |
| **`sharedContainerMappings`** | `string[]` | `[]` *(可选)* | 接收生成的容器类型映射字符串数组引用。 |

---

## 插件导出与使用示例

```typescript
import { defineConfig } from "vite";
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";

// 推荐在专属的打包配置 (如 vite.config.pack.ts) 中引入：
export default defineConfig({
  plugins: [
    modularPackPlugin({
      modulesPath: "src/modules",
      outDir: "dist-plugin",
    }),
  ],
});
```
