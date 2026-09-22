# 动态语言真 AOP 切面机制

在主流 IoC 框架中，面向切面编程（AOP）往往伴随着高昂的学习成本或特权工具。Path-IoC 证明了：在动态语言中，真正的 AOP 甚至不需要任何额外 API。

---

## 传统 AOP 的假象与困局

- **InversifyJS**：不提供内置 AOP。开发者必须编写低级的 `applyMiddleware` 并在全局处理繁琐的 `new Proxy()` 胶水代码；
- **NestJS**：发明了 `Guards`、`Interceptors`、`Pipes`、`Filters` 等 5 个互相割裂的概念。被拦截的目标类必须显式 `import` 拦截器并手动添加注解修饰 `@UseInterceptors()`。这本质上并非“控制反转”，而是变相的强耦合**“主动组合”**，且仅在 HTTP Controller 层生效，底层普通 Service 无法切入。

---

## Path-IoC 的切面范式：基于依赖查找 (DL) 的自然织入

在 Path-IoC 中：
- **被切入的目标模块**：**0 侵入、0 行 import、0 个框架装饰器**，保持最纯粹的业务逻辑；
- **切面模块 (Aspect Mesh)**：只需在 `dependencies` 中声明它所关注的目标模块路径特征（例如以 `/service/` 开头）。

### 示例：全局执行耗时日志切面

创建切面模块 `src/modules/aspect/timing-logger/index.ts`：

```typescript
// src/modules/aspect/timing-logger/index.ts
export const main = (container: ModularContainer, moduleNames: string[]) => {
  // 1. 筛选需要被拦截的目标模块 (例如所有以 /api/ 开头的接口)
  const targetKeys = moduleNames.filter((name) => name.startsWith("/api/"));

  // 2. 遍历并利用 Proxy 或高阶函数进行透明代理包装
  targetKeys.forEach((key) => {
    const originalService = container[key];
    if (typeof originalService === "object" && originalService !== null) {
      container[key] = new Proxy(originalService, {
        get(target, propKey, receiver) {
          const origMethod = Reflect.get(target, propKey, receiver);
          if (typeof origMethod === "function") {
            return async (...args: any[]) => {
              const start = Date.now();
              const result = await origMethod.apply(target, args);
              console.log(`[AOP Timing] [${key}.${String(propKey)}] 耗时: ${Date.now() - start}ms`);
              return result;
            };
          }
          return origMethod;
        },
      });
    }
  });
};

// 3. 声明依赖：确保目标模块优先完成初始化，切面模块最后被拓扑引擎唤醒
export const dependencies = (moduleNames: string[]) => {
  return moduleNames.filter((name) => name.startsWith("/api/"));
};
```

### 为什么这极其强大？
1. **零学习成本**：不需要学习任何框架私有语法，只要你会 JavaScript 高阶函数或 `Proxy`，就能写出精细到方法级的切面；
2. **全局或细粒度任意横切**：既能切 HTTP Controller，也能切底层数据库仓储层、消息队列生产者、甚至前端 UI 页面生命周期；
3. **拓扑保证时序**：通过声明依赖关系，拓扑调度引擎自动确保切面按预期的拓扑顺序生效，绝无执行时序竞态问题。
