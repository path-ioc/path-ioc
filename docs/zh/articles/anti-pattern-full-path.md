# 架构反模式：为什么在业务依赖中硬编码全称路径是错的？

> **“能跑的代码，不等于健康的架构。”**  
> 在 Path-IoC 中，模块容器虽然物理上支持全称路径（如 `["/biz/order/orderService"]`），但这绝不是留给业务模块解决“命名冲突”的后门。在点对点业务依赖中硬编码全称路径，是一种典型破坏位置无关性、腐蚀架构演进的**反模式（Anti-Pattern）**。

---

## 问题的提出与常见误区

在初接触 Path-IoC 时，部分开发者常常提出类似疑问：

> *“既然模块在容器内部的全限定标识是带物理路径的（例如 `/common/dbConnection` 或 `/user/service`），那如果两个深层目录出现了同名模块 `service`，我直接在 `dependencies` 里写 `["/user/service"]` 不就能精准区分了吗？”*  
> *“文档不是说只有短名称冲突时才需要全称吗？”*

**这是对 Path-IoC 依赖设计哲学的严重误解。**

在 Path-IoC 的核心设计规范中：
* **业务开发层（Business Layer）**：点对点业务依赖 **100% 严禁手写任何全称物理路径**，必须使用驼峰短名称（Short Name）；
* **架构编排层（Orchestration Layer）**：全称物理路径的唯一正统用途是**函数式特征模式匹配**（如批量路由聚合、AOP 切面网格），用于非侵入式横切基础设施。

如果在业务模块的 `dependencies` 中直接枚举全称字符串，代码虽然在技术上可以被容器编译并运行，但在架构治理上，它已经沦为了**随时会引爆重构灾难的“烂代码”**。

```typescript
// ❌ 典型的业务架构反模式：硬编码全称物理路径
export const dependencies = ["/infra/database/dbConnection", "/modules/user/userService"];
export const main = (container: ModularContainer) => {
  // 语法破坏：必须使用丑陋的字符串下标解构
  const db = container["/infra/database/dbConnection"];
  const user = container["/modules/user/userService"];
  // ...
};

// ✅ 架构正道：纯粹使用短名称，声明与解构自然对称
export const dependencies = ["dbConnection", "userService"];
export const main = ({ dbConnection, userService }: ModularContainer) => {
  // 业务逻辑与物理文件组织 100% 解耦
  // ...
};
```

---

## 深度剖析：业务硬编码全称路径的三大原罪

为什么我们如此坚决地将“业务写全称”定义为反模式？它究竟破坏了什么？

```
┌────────────────────────────────────────────────────────┐
│               业务硬编码全称路径的三大破坏                 │
├──────────────────────────┬─────────────────────────────┤
│ 1. 破坏位置透明性 (DIP)   │ 模块从“依赖抽象”退化为“依赖物理磁盘路径”   │
│ 2. 掩盖领域建模缺陷       │ 靠全路径苟合，掩盖模块命名与职责不清的顽疾 │
│ 3. 撕裂语法与心智对称性   │ 破坏 ES6 原生解构，IDE 类型推导严重受阻   │
└──────────────────────────┴─────────────────────────────┘
```

### 原罪一：破坏“位置透明性”，重构直接引发雪崩

控制反转（IoC）与依赖查找（DL）的核心承诺之一是**位置无关性与位置透明性（Location Transparency）**：
> **调用方只关心“我需要什么服务契约”，而绝不关心“该服务存放在文件系统的哪一层抽屉里”。**

传统前端最令人深恶痛绝的痛点之一，就是相对路径地狱：
```typescript
import { UserService } from "../../../../domain/user/services/userService";
```
当项目目录进行领域重构、分包或者目录扁平化时，哪怕只是把一个文件夹往上提了一级，所有下游几十个调用方文件的 `import` 路径全部失效。

如果我们在 Path-IoC 的 `dependencies` 中硬编码物理全称：
```typescript
export const dependencies = ["/domain/user/services/userService"];
```
**这在本质上与相对路径地狱毫无二致！** 你仅仅是将 `import` 后的字符串搬运到了 `dependencies` 数组中。一旦架构师调整目录结构，重构工具无法预知字符串内的深层依赖，导致系统在运行时发生静默崩溃。

使用短名称 `userService`，无论物理目录如何重构、归类、拆分子目录，只要业务语义未变，**所有下游业务模块的代码 0 行修改**。

---

### 原罪二：以“路径苟合”掩盖领域建模缺陷

当两个模块发生短名称冲突（例如 `/user/service` 和 `/admin/service` 都生成了短名称 `service`）时，为什么会重名？

**真相是：`service` 根本就不是一个合格的领域模型名称！**

在领域驱动设计（DDD）与面向对象工程中，没有任何一个清晰的业务对象叫“服务（Service）”。这本身就是命名偷懒导致的领域语义丢失。

```
                       短名称冲突的两种应对方案
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
 ❌ 反模式：路径苟合 (Path Kludge)             ✅ 正道：语义清晰化 (Semantic Clarity)
 维持烂命名 service，靠物理路径区分              重构模块命名为 userService / adminService
 dependencies: ["/admin/service"]             dependencies: ["adminService"]
                                                      │
 结果：                                               结果：
 - 代码腐化，调用方难以阅读                           - 领域概念自解释
 - 无法使用标准解构                                   - 拓扑依赖清晰无歧义
 - 目录稍作迁移立即崩溃                               - 享受完整的 IDE 类型提示
```

如果框架允许开发者通过写全称 `["/admin/service"]` 来规避编译报错，开发者就会倾向于在每个子目录下都草率地创建一个 `service`、`utils`、`manager`，并靠越来越冗长的全路径来勉强维持系统运行。

**Path-IoC 选择在遇到歧义短名称依赖时 Fail-Fast 抛出异常，正是为了逼退这种架构腐化：**

```bash
[Dependency Error] Module '/biz/dashboard' has an ambiguous dependency on 'service'. 
This short name is used by '/user/service' and '/admin/service'. 
Please disambiguate by renaming the module (e.g. 'userService', 'adminService') 
or refactoring domain boundaries. Avoid hardcoding full paths in business dependencies 
as it is an architectural anti-pattern.
```

解决冲突的真正优雅方案只有两种：
1. **语义重构**：将目录重命名为清晰的领域名词（如 `src/modules/adminService` 与 `src/modules/userService`）；
2. **限界上下文隔离 / Facade 门面聚合**：若属于独立子域，通过门面聚合模块向外暴露统一短名称。

---

### 原罪三：撕裂语法与心智对称性，破坏开发者体验

在 Path-IoC 最佳实践中，依赖声明与容器消费是**绝对对称**的：

```typescript
// 1. 声明短名称依赖（拓扑图调度依据）
export const dependencies = ["orderService", "paymentGateway"];

// 2. 闭包工厂直接从形参解构（TypeScript 自动推导类型）
export const main = ({ orderService, paymentGateway }: ModularContainer) => {
  return {
    checkout(orderId: string) {
      const order = orderService.findById(orderId);
      return paymentGateway.pay(order.amount);
    }
  };
};
```
这种书写方式符合最自然的 JavaScript/TypeScript 语法直觉：
- 声明数组中的字符串，直接映射到 `ModularContainer` 上的属性名；
- IDE 提供纯净的自动补全，不需要任何额外的断言或映射。

而一旦写成全称：
```typescript
export const dependencies = ["/trade/order/orderService", "/pay/gateway/paymentGateway"];

export const main = (container: ModularContainer) => {
  // 语法灾难：必须通过字符串索引访问，丢失解构优雅性
  const orderService = container["/trade/order/orderService"];
  const paymentGateway = container["/pay/gateway/paymentGateway"];
};
```
开发者不得不写出冗长丑陋的字典查找，且彻底丧失了 `const { orderService } = container` 的极简解构能力。

---

## 全称物理路径的真正使命：函数式特征搜索与 AOP 网格

既然业务模块严禁手写全称路径，那么 Path-IoC 为什么要保留全称路径机制？为什么框架要叫做 **Path-IoC**？

**因为路径在 Path-IoC 中的核心定位，是“零成本注解”与“横切元数据”，而非点对点业务标识！**

```
┌────────────────────────────────────────────────────────┐
│                   Path-IoC 双层架构分工                 │
├──────────────────────────┬─────────────────────────────┤
│ 业务开发层 (Business)    │ 依赖短名称 (Bean ID)         │
│                          │ 关注点：点对点协作、位置透明 │
├──────────────────────────┼─────────────────────────────┤
│ 架构编排层 (Orchestrator)│ 消费物理路径模式 (Path Pattern)│
│                          │ 关注点：动态批量聚合、AOP 切面│
└──────────────────────────┴─────────────────────────────┘
```

全称路径**永远只应当以“动态特征过滤函数”的形式被架构层消费**，绝不应以静态字面量形式出现在业务代码中。

### 场景一：动态批量聚合 (Automatic Aggregation)

在大型项目中，路由器需要聚合所有页面，规则引擎需要聚合所有规则，ORM 框架需要聚合所有数据实体。

传统方案中，必须有人手写一个巨大的中央注册文件（如 `allPages.ts`），每新增一个页面都要手动 `import`。

在 Path-IoC 中，路径就是语义标签：
```typescript
// src/modules/router/index.ts
// 架构层：通过函数式依赖，按路径前缀批量动态发现
export const dependencies = (allPaths: string[]) =>
  allPaths.filter((path) => path.startsWith("/pages/"));

export const main = (container: ModularContainer, pagePaths: string[]) => {
  // 零手动维护：新增页面只要落在 /pages 目录下，自动完成装配
  const routes = pagePaths.map((path) => container[path]);
  return createRouter(routes);
};
```
在此处，`router` 模块根本不需要提前知道具体的短名称是什么，它通过路径特征完成了“去中心化服务发现”。

---

### 场景二：非侵入式 AOP 切面网格 (Aspect Mesh)

这是 Path-IoC 超越传统 Class 装饰器的杀手级能力。

例如，全站所有业务服务层（`/services/*`）在执行时需要统一进行耗时统计、分布式链路追踪（Tracing）或数据库事务包装。传统方案需要开发者在几十个类的每个方法上重复添加 `@Transactional`、`@Log` 装饰器。

在 Path-IoC 中，只需编写一个独立的切面模块：

```typescript
// src/modules/aspects/telemetryAspect/index.ts
// 切面模块依赖所有服务模块：拓扑引擎确保目标模块先完成实例化
export const dependencies = (allPaths: string[]) =>
  allPaths.filter((path) => path.startsWith("/services/"));

export const main = (container: ModularContainer, targetPaths: string[]) => {
  for (const path of targetPaths) {
    const targetService = container[path] as Record<string, Function>;
    
    // 对目标服务进行纯函数式高阶代理增强
    for (const [methodName, originalMethod] of Object.entries(targetService)) {
      if (typeof originalMethod === "function") {
        targetService[methodName] = async (...args: any[]) => {
          const start = performance.now();
          try {
            return await originalMethod.apply(targetService, args);
          } finally {
            console.log(`[Telemetry] ${path}#${methodName} took ${(performance.now() - start).toFixed(2)}ms`);
          }
        };
      }
    }
  }
};
```

业务服务模块本身保持 100% 的纯粹性，完全不知道自己被切面拦截了；而切面模块仅仅通过路径特征 `path.startsWith("/services/")` 就完成了全网格织入。

**在这里，全称路径体现的是一种系统级的“宏观编排契约”，而不是微观业务的点对点调用。**

---

## 架构决策与选型对比表

为帮助开发团队在日常代码审查（Code Review）中统一标准，请参考下表执行：

| 维度 | 短名称依赖 (`"userService"`) | 函数式路径匹配 (`p => p.startsWith(...)`) | ❌ 静态硬编码全路径 (`["/user/service"]`) |
| :--- | :--- | :--- | :--- |
| **设计定位** | **业务点对点依赖 (Bean ID)** | **架构宏观编排 / AOP 网格** | **架构反模式 (严禁在生产中出现)** |
| **适用场景** | 99% 的日常业务模块协作 | 页面自动路由、ORM 实体扫描、全局切面 | 无任何合理场景 |
| **位置透明性** | **完全透明** (目录重构不影响代码) | **模式绑定** (按规范约定组织目录) | **强耦合物理文件层级** (重构极易失效) |
| **冲突处理** | 强制重命名，厘清领域语义 | 天然支持批量模式 | 苟且掩盖命名冲突 |
| **语法优雅性** | 原生对象解构，类型推导自然 | 循环遍历装配 | 字符串下标访问，丑陋且易错 |
| **团队约束** | **推荐强制使用** | **推荐在架构/基础设施中使用** | **CI / Code Review 一票否决** |

---

## 总结：短名称是身份证，物理路径是语义标签

* **短名称（Short Name）是模块的“身份证（Bean ID）”**：它直接代表业务领域中的实体概念。业务调用只认身份证，天王老子把身份证的主人搬到哪座城市（哪个物理目录），业务关系永远稳如泰山。
* **物理路径（Full Path）是模块的“分类标签（Metadata Tag）”**：它像 Java 中的注解或微服务中的标签（Tags），供切面网格和聚合器做批量分类感知。

**永远不要为了解决重名问题而在业务依赖里写全称路径。保持领域命名的自解释与清晰，是通往高内聚、低耦合架构的不二法门。**
