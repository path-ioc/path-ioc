# 什么是 Path-IoC？

**Path-IoC** 是一个基于物理文件目录拓扑的轻量级控制反转与依赖查找（IoC / Dependency Lookup）引擎。

它专为现代 TypeScript 全栈应用、复杂微模块中台以及高性能 Node.js / Serverless 边缘计算场景打造。

---

## 传统大型前端工程的深层痛点

在大型单页应用（SPA）或全栈中台工程中，模块之间往往充斥着纵横交错的物理相对路径 `import`。随着业务规模扩大（数百至数千个业务模块），这种传统模式暴露出了严重的工程缺陷：

### 1. 显式 import 带来的隐式强耦合与死锁
- 当模块 A `import` 模块 B，模块 B 又通过某种链路引用模块 A 时，极易触发 JavaScript 引擎的 **循环依赖（Circular Dependency）未定义报错** (`undefined is not a function`)。
- 当你需要重构或迁移一个通用基础设施文件时，必须跨越数十个甚至上百个业务文件批量修改长相对路径（如 `../../../../utils/format`）。

### 2. 传统 TS IoC（NestJS / InversifyJS）的“元数据包袱”
- **被迫依赖 Reflect Metadata 与装饰器**：传统方案强依赖 TypeScript 的实验性特性 `experimentalDecorators` 与 `emitDecoratorMetadata`。
- **现代打包工具的“类型擦除崩溃”**：Vite、ESBuild、Rollup、SWC 等现代打包工具默认执行纯 AST 类型擦除，无法原生生成 `design:paramtypes`。在现代打包器下运行 NestJS / Inversify 极易瘫痪，不得不引入笨重的转译补丁。
- **构造函数同步死锁**：Class 构造函数在物理上无法声明为 `async`，导致异步基础设施（如 DB 连接池初始化）装配复杂且容易死锁。

---

## Path-IoC 的双层架构哲学

### 1. 业务开发层：短名称 (Short Name) 即 Bean ID
在日常业务开发中，开发者 **100% 只需关注短名称**，零多余心智负担：
- 短名称直接代表**模块 ID**，在概念上完全等价于 Spring 中的 `@Autowired("userService")` 或 `ApplicationContext.getBean("userService")`；
- 声明依赖直接写短名称：`export const dependencies = ["db", "userService"];`；
- 获取依赖直接解构：`const { db, userService } = container;`；
- 业务开发时**绝不手写任何全称路径**，声明与解构自然对齐，心智模型极简。

### 2. 架构编排层：物理路径 (Path) 即 Java 注解与语义元数据
**为什么框架命名为 Path-IoC？路径的真正定位是什么？**
在 Path-IoC 中，**文件物理目录路径天然充当了零运行时代价的“Java 注解”与分层语义空间**：
- `/entities/*` 路径在业务上等价于 `@Entity` 实体注解；
- `/pages/*` 路径在业务上等价于 `@Route` / `@Controller` 前端路由注解；
- `/services/*` 路径在业务上等价于 `@Service` 业务服务层注解。

框架本身对目录命名没有任何硬编码限制，完全由业务架构自由约定。**路径元数据的核心威力在于：自动化批量聚合与 AOP 统一切面拦截**：

#### 威力一：动态批量聚合 (Automatic Aggregation)
例如系统的总路由模块 `src/modules/router/index.ts` 需要挂载全站所有页面路由，无需人工手动维护庞大的 import 清单：
```typescript
// dependencies 传入函数，声明拓扑时序：等待所有 /pages 路径下的模块就绪
export const dependencies = (allModules: string[]) =>
  allModules.filter((path) => path.startsWith("/pages"));

export const main = (container: ModularContainer, allModuleNames: string[]) => {
  // 第二参数为全量模块名，直接过滤出页面路径列表
  const pagePaths = allModuleNames.filter((path) => path.startsWith("/pages"));
  return createRouter(pagePaths.map((path) => container[path]));
};
```

#### 威力二：AOP 声明式切面拦截 (Pointcut & Weaving)
例如需要对全站所有业务服务层统一织入事务管理、性能度量或权限校验，直接以路径前缀充当切点表达式：
```typescript
// 自动声明依赖：确保所有 /services 模块优先完成初始化
export const dependencies = (allModules: string[]) =>
  allModules.filter((path) => path.startsWith("/services"));

export const main = (container: ModularContainer, allModuleNames: string[]) => {
  const servicePaths = allModuleNames.filter((path) => path.startsWith("/services"));
  for (const path of servicePaths) {
    container[path] = withTransaction(container[path]);
  }
};
```

---

### 核心收益总结
1. **纯函数导出**：模块只需导出一个普通的 `main(container)` 工厂函数，零框架特权侵入，无需继承 BaseClass，无需修饰 `@Injectable()` 注解；
2. **纯同步 DAG 拓扑无锁调度**：基于 DFS 拓扑排序与深度分析，全自动检测环形依赖并按最优层级唤醒；
3. **全自动 TypeScript 类型推导**：通过跨构建器插件（`@path-ioc/unplugin`）在后台毫秒级生成全局强类型声明，享受精准的 IDE 智能补全；
4. **编译期与运行期彻底解耦**：静态图只在进程冷启动时编译一次，单次 HTTP 请求装配耗时仅 **21.2 微秒**。
