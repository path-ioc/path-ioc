# @path-ioc/pack API 规范

`@path-ioc/pack` 是专用于将模块目录打包为**独立发布的 npm 插件包/组件库**的专用 Vite 构建插件。

> 💡 **架构定位与使用建议**：`@path-ioc/pack` 会在构建期自动接管改写 Vite 的 `build.lib` 配置，并在打包结束时自动生成 `package.json`、`index.d.ts` 与 npm tarball 交付物。**推荐通过独立的打包配置（例如 `vite.config.pack.ts`）或由项目自定义环境变量/构建脚本按需触发，避免无条件直接写入通用 Web 前端应用的主构建配置**。

---

## 核心特性

- **物理入口自动生成**：自动扫描 `src/modules` 下所有 Mesh 模块并生成标准的物理聚合入口文件（默认 `.modular-plugin-entry.ts`，构建完成后自动清理）；
- **全量 TypeScript 类型导出 (`dts`)**：内置集成 TypeScript 声明文件编译器，自动在 `${outDir}/src` 下输出所有模块的真实 `.d.ts` 声明文件，并与 `${outDir}/index.d.ts` 关联，确保下游安装包具备完整无损的类型推导；
- **模块注册表导出**：导出标准运行期注册表数组 `modules` 与类型映射，供宿主应用或微前端运行时直接装载；
- **内置源码混淆保护**：构建结束时（`closeBundle` 生命周期）默认集成 `javascript-obfuscator` 对产物代码进行混淆保护（可通过环境变量 `MODULAR_OBFUSCATE=false` 关闭）；
- **交付包自动打包**：自动生成交付标准的 `package.json`（自动包含 JS、类型与资源清单）并在输出目录调用 `npm pack` 产出可直接发布的 `.tgz` 压缩包。

---

## 配置选项 (`PackPluginOptions`)

| 配置项                        | 类型       | 默认值                       | 描述                                                                                        |
| :---------------------------- | :--------- | :--------------------------- | :------------------------------------------------------------------------------------------ |
| **`modulesPath`**             | `string`   | `'src/modules'`              | 模块扫描的物理根目录路径。                                                                  |
| **`entryFile`**               | `string`   | `'.modular-plugin-entry.ts'` | 临时物理入口文件路径（构建后自动清理，建议加入 `.gitignore`）。                             |
| **`outDir`**                  | `string`   | `'dist-plugin'`              | 构建产物输出与 npm 打包目录。                                                               |
| **`dts`**                     | `boolean`  | `true`                       | 是否为所有导出模块编译生成 `.d.ts` 类型声明文件。                                           |
| **`tsconfigPath`**            | `string`   | `undefined` _(可选)_         | 生成类型声明所使用的 `tsconfig` 路径。默认自动查找 `tsconfig.app.json` 或 `tsconfig.json`。 |
| **`sharedMappings`**          | `string[]` | `[]` _(可选)_                | 接收生成的类型映射字符串数组引用。                                                          |
| **`sharedContainerMappings`** | `string[]` | `[]` _(可选)_                | 接收生成的容器类型映射字符串数组引用。                                                      |

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
      // dts: true, // 默认开启完整类型编译
    }),
  ],
});
```
