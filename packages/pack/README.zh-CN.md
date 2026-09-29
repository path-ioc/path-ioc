<div align="center">
  <h1>@path-ioc/pack</h1>
  <p><b>Mesh Registry Distribution Bundler for Path-IoC</b></p>
  <p>专为微前端、组件库分发与 Mesh 网格化依赖设计的物理打包与发布构建插件</p>

  <p>
    <a href="https://www.npmjs.com/package/@path-ioc/pack"><img src="https://img.shields.io/npm/v/@path-ioc/pack.svg" alt="NPM version"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/npm/l/@path-ioc/pack.svg" alt="License"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white" alt="TypeScript"></a>
    <a href="https://vite.dev"><img src="https://img.shields.io/badge/powered%20by-Vite-646CFF?logo=vite&logoColor=white" alt="Vite"></a>
  </p>

  <p>
    <a href="./README.md">English</a> | <b>简体中文</b> | <a href="https://path-ioc.dev/zh/api/pack">官方文档</a>
  </p>
</div>

> 💡 **架构定位与使用边界警告**  
> `@path-ioc/pack` 是专用于将 Mesh 模块目录打包为**独立发布的 npm 插件包/组件库**的专用 Vite 构建插件。  
> **警告**：该插件会在构建期自动接管改写 Vite 的 Library 模式（`build.lib`）。**严禁无条件直接写入通用 Web 前端应用（如 SPA/SSR）的主构建配置中。** 推荐通过独立的打包配置（例如 `vite.config.pack.ts`）或专属构建脚本按需触发。

---

## 核心特性 (Features)

- **物理入口自动生成 (Physical Entrypoint Generation)**：
  在 Vite 构建流程中，自动深度扫描 `src/modules` 下所有包含 `index.ts/tsx` 的物理子目录，并在磁盘上自动生成/更新入口文件（默认 `.modular-plugin-entry.ts`，构建完成后自动安全移除）；
- **全量 TypeScript 类型导出 (`dts`)**：
  内置集成 TypeScript 声明编译器，自动在 `${outDir}/src` 下输出所有导出模块的真实物理 `.d.ts` 声明文件，并与 `${outDir}/index.d.ts` 无缝关联，保证下游消费者安装使用时具备完整、零丢失的类型推导；
- **Mesh 注册表与类型全导出**：
  自动生成统一的模块导入别名与导出，并导出标准运行期注册表数组 `modules`：
  ```typescript
  export const modules = [
    { key: "/math/add", module: _Modular_Mod_0 },
    { key: "/math/isEven", module: _Modular_Mod_1 },
  ];
  ```
- **静态类型映射提取 (`sharedMappings`)**：
  自动填充 `sharedMappings` 与 `sharedContainerMappings` 集合，为构建跨包 SDK 或微前端网格映射提供准确的类型描述；
- **内置源码深度混淆保护**：
  构建结束时（`closeBundle` 生命周期）默认集成 `javascript-obfuscator` 对产物代码进行深度混淆保护，可通过环境变量 `MODULAR_OBFUSCATE=false` 关闭；
- **交付包全自动打包**：
  自动生成交付标准的 `package.json`（包含完整的 `files` 列表与声明配置），并自动在 `outDir` 目录调用 `npm pack` 产出可分发的 `.tgz` 压缩包。

---

## 安装 (Installation)

```bash
pnpm add -D @path-ioc/pack
# 或
npm install -D @path-ioc/pack
```

---

## 快速上手 (Quick Start)

### 专属 Vite 打包配置 (`vite.config.pack.ts`)

```typescript
import { defineConfig } from "vite";
import { modularPackPlugin } from "@path-ioc/pack";

const sharedMappings: string[] = [];
const sharedContainerMappings: string[] = [];

export default defineConfig({
  plugins: [
    modularPackPlugin({
      modulesPath: "src/modules",
      outDir: "dist-plugin",
      // dts: true, // 默认开启完整类型编译
      sharedMappings,
      sharedContainerMappings,
    }),
  ],
});
```

执行打包命令：
```bash
vite build --config vite.config.pack.ts
```

---

## 配置选项 (PackPluginOptions)

| 配置项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 模块扫描的物理根目录路径。 |
| **`entryFile`** | `string` | `'.modular-plugin-entry.ts'` | 临时物理入口文件路径（构建后自动清理，建议加入 `.gitignore`）。 |
| **`outDir`** | `string` | `'dist-plugin'` | 构建产物输出与 npm 打包目录。 |
| **`dts`** | `boolean` | `true` | 是否为所有导出模块编译生成 `.d.ts` 类型声明文件。 |
| **`tsconfigPath`** | `string` | `undefined` *(可选)* | 生成类型声明所使用的 `tsconfig` 路径。默认自动查找 `tsconfig.app.json` 或 `tsconfig.json`。 |
| **`sharedMappings`** | `string[]` | `[]` *(可选)* | 接收生成的类型映射字符串数组引用。 |
| **`sharedContainerMappings`** | `string[]` | `[]` *(可选)* | 接收生成的容器类型映射字符串数组引用。 |

---

## 环境变量 (Environment Variables)

- **`MODULAR_OBFUSCATE`**：设置为 `false`（例如 `MODULAR_OBFUSCATE=false vite build --config vite.config.pack.ts`）可关闭默认的 `javascript-obfuscator` 混淆步骤，便于本地调试或开源包发布。

---

## 导出的 API

```typescript
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";
```

---

## 开源协议 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
