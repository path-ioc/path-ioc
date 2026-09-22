# 从 lianhanlin-modular 迁移

本文档介绍如何将基于旧版 `lianhanlin-modular` 的项目升级到官方 `@path-ioc/*` 模块化套件。

---

## 1. 架构演进与包拆分

`lianhanlin-modular` 为早期单体原型包。为了提供微秒级吞吐量、降低包体积并解耦构建工具依赖，官方将其重构拆分为独立的 `@path-ioc/*` 作用域套件：

| 旧版能力 | 对应的新版官方包 | 说明 |
| :--- | :--- | :--- |
| 核心依赖查找与 Kahn DAG 拓扑运行时 | **`@path-ioc/core`** | **运行时必需**。微秒级无锁依赖引擎 |
| Vite / Webpack / Rollup 编译器插件 | **`@path-ioc/unplugin`** | **开发依赖**。跨打包工具统一插件 |
| 懒加载代理与高级容器扩展 | **`@path-ioc/container`** | **按需安装**。高级容器扩展功能 |
| 依赖图清单装配与打包分析 | **`@path-ioc/pack`** | **按需安装**。构建拓扑分析与装配工具 |

---

## 2. 依赖变更

在你的项目根目录执行：

```bash
# 1. 移除旧单体包
pnpm remove lianhanlin-modular

# 2. 安装核心运行时与构建插件
pnpm add @path-ioc/core
pnpm add -D @path-ioc/unplugin
```

*(若使用 npm 或 yarn，替换为对应的 `uninstall` / `install` 命令即可)*

---

## 3. 构建配置更新

### Vite (`vite.config.ts`)

将原插件替换为 `@path-ioc/unplugin`：

```diff
  import { defineConfig } from "vite";
- import modularType from "lianhanlin-modular/plugin-vite";
+ import pathIoc from "@path-ioc/unplugin";

  export default defineConfig({
    plugins: [
-     modularType({ typeFileOutput: "types" }),
+     pathIoc.vite({
+       modulesPath: "src/modules", // 模块所在目录，默认为 "src/modules"
+       typeFileOutput: "types",    // 类型输出目录，默认为 "types"
+     }),
    ],
  });
```

### Webpack (`webpack.config.js`)

```diff
- const { ModularWebpackPlugin } = require("lianhanlin-modular/webpack");
+ const { webpackPlugin: pathIoc } = require("@path-ioc/unplugin");

  module.exports = {
    plugins: [
-     new ModularWebpackPlugin(),
+     pathIoc({
+       modulesPath: "src/modules",
+       typeFileOutput: "types",
+     }),
    ],
  };
```

---

## 4. 容器启动适配

应用启动入口处的 `initialize` 函数统一改为从 `@path-ioc/core` 导入：

```diff
  import { container } from "./container";
  import { modules } from "virtual:modular-container";
- import { initialize } from "lianhanlin-modular";
+ import { initialize } from "@path-ioc/core";

  initialize(modules, container);
```

---

## 5. 动态依赖过滤：使用标准 Array API

旧版本中提供了一些内部辅助工具函数（如 `getModuleNameByPrefix`、`getModuleDeclarations`）。在新版本中，`moduleDeclarationNames` 本身即为标准的 `string[]` 数组，**直接使用原生 JavaScript 数组方法**即可完成过滤，无需导入额外依赖：

```diff
- import { getModuleNameByPrefix } from "lianhanlin-modular";

  export const dependencies = (moduleNames: string[]) => {
    return [
-     ...getModuleNameByPrefix(moduleNames, "/plugins/"),
+     ...moduleNames.filter((name) => name.startsWith("/plugins/")),
      "configService",
    ];
  };
```

---

## 6. 注册表物理打包迁移 (@path-ioc/pack)

如果你的项目启用了**注册表物理打包（Modular Pack）**——即需要将所有 Mesh 模块扫描并生成物理入口文件（常用于微前端子模块发版、跨 Monorepo 组件库分发、静态预编译或配合代码混淆工具打包的场景），该能力在新版中已正式升级为独立的官方构建插件 **`@path-ioc/pack`**。

### 1. 安装独立打包插件
```bash
pnpm add -D @path-ioc/pack
```

### 2. 在构建配置中挂载 `modularPackPlugin`

```diff
  import { defineConfig } from "vite";
  import pathIoc from "@path-ioc/unplugin";
+ import { modularPackPlugin } from "@path-ioc/pack";

  export default defineConfig({
    plugins: [
      pathIoc.vite({
        modulesPath: "src/modules",
        typeFileOutput: "types",
      }),
+     // 启用注册表物理入口打包
+     modularPackPlugin({
+       modulesPath: "src/modules", // 模块扫描目录，默认为 "src/modules"
+       // entryFile: "node_modules/.path-ioc/.modular-plugin-entry.ts", // 可选自定义物理入口生成路径
+     }),
    ],
  });
```

### 3. 生成的物理入口文件规范
- 默认物理生成路径为：`node_modules/.path-ioc/.modular-plugin-entry.ts`；
- 该文件会自动汇集扫描到的所有模块并导出标准的物理注册表数组：
  ```typescript
  export const modules = [
    { key: "/auth/userService", module: module_0 },
    // ...
  ];
  ```
- 在发版脚本、微前端多入口配置或 Rollup 打包中，可直接将该物理文件作为 input 入口进行二次编译分发。

---

## 7. 业务代码规范（完全保持一致）

现有业务模块的代码规范与心智模型**完全保持兼容**，无需对业务逻辑进行改动：

1. **`main` 导出**：继续保持 `export const main = () => ...;` 统一入口规范；
2. **禁止直接 import 跨模块**：保持严禁模块间直接相对路径引用，保障 AOP 拦截能力；
3. **`modularContainer` 解构**：继续在组件或函数体内解构外部依赖：
   ```tsx
   export const UserService = () => {
     const { apiClient, cacheService } = modularContainer;
     // ...
   };
   ```

---

## 8. 升级检查清单

- [ ] `package.json` 中移除 `lianhanlin-modular`，引入 `@path-ioc/core` 与 `@path-ioc/unplugin`；
- [ ] 构建配置中的插件导入更换为 `@path-ioc/unplugin`；
- [ ] 容器启动处的 `initialize` 改由 `@path-ioc/core` 导入；
- [ ] 依赖过滤处替换为原生 `.filter(...)` / `.startsWith(...)`；
- [ ] （若有注册表物理打包）已引入 `@path-ioc/pack` 并配置 `modularPackPlugin`；
- [ ] 启动开发服务器，确认 `ignore.modular.d.ts` 正常自动生成。

