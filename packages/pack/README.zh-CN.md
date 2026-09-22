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

---

## 核心特性 (Features)

- **物理入口自动生成 (Physical Entrypoint Generation)**：
  在 Vite 构建流程中，自动深度扫描 `src/modules` 下所有包含 `index.ts/tsx` 的物理子目录，并在磁盘上自动生成/更新干净的入口文件（默认 `.modular-plugin-entry.ts`）。
- **Mesh 注册表与类型全导出**：
  自动生成统一的模块导入别名与导出，并导出标准运行期注册表数组 `modules`：
  ```typescript
  export const modules = [
    { key: "/math/add", module: _Modular_Mod_0 },
    { key: "/math/isEven", module: _Modular_Mod_1 },
  ];
  ```
- **静态类型映射提取 (`sharedMappings`)**：
  自动填充 `sharedMappings` 与 `sharedContainerMappings` 集合，为构建跨包 SDK 或微前端网格映射提供准确的类型描述。
- **物理隔离与代码混淆兼容**：
  物理生成的入口文件可直接用于 npm 打包流程，完美兼容各类 AST 物理打散与防篡改混淆工具。

---

## 安装 (Installation)

```bash
pnpm add -D @path-ioc/pack
# 或
npm install -D @path-ioc/pack
```

---

## 快速上手 (Quick Start)

### Vite 配置 (`vite.config.ts`)

```typescript
import { defineConfig } from "vite";
import { modularPackPlugin } from "@path-ioc/pack";

const sharedMappings: string[] = [];
const sharedContainerMappings: string[] = [];

export default defineConfig({
  plugins: [
    modularPackPlugin({
      modulesPath: "src/modules",
      // 可选：自定义生成的入口文件路径（默认存放在 node_modules/.path-ioc/.modular-plugin-entry.ts）
      entryFile: "node_modules/.path-ioc/.modular-plugin-entry.ts",
      sharedMappings,
      sharedContainerMappings,
    }),
  ],
});
```

---

## 配置选项 (PackPluginOptions)

| 配置项 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| **`modulesPath`** | `string` | `'src/modules'` | 模块扫描的物理根目录路径。 |
| **`entryFile`** | `string` | `'node_modules/.path-ioc/.modular-plugin-entry.ts'` | 物理生成的入口文件路径。 |
| **`sharedMappings`** | `string[]` | `[]` *(可选)* | 接收生成的类型映射字符串数组引用。 |
| **`sharedContainerMappings`** | `string[]` | `[]` *(可选)* | 接收生成的容器类型映射字符串数组引用。 |

---

## 导出的 API

```typescript
import { modularPackPlugin, type PackPluginOptions } from "@path-ioc/pack";
```

---

## 开源协议 (License)

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc) & Lian HanLin.
