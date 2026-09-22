---
layout: home

hero:
  name: "Path-IoC"
  text: "Spring 有 Bean，Nest 有 Provider，Path-IoC 有 Mesh"
  tagline: "向经典 Spring 致敬的 TypeScript 原生控制反转架构。告别繁琐装饰器与元数据包袱，以纯函数闭包与物理路径契约，实现微秒级极速冷启动的现代拓扑依赖查找引擎。"
  image:
    src: https://cdn.path-ioc.dev/path-ioc/logo.svg
    alt: Path-IoC 品牌标识
  actions:
    - theme: brand
      text: 快速上手
      link: /zh/guide/what-is-path-ioc
    - theme: alt
      text: 架构宣言与哲学
      link: /zh/guide/architecture-manifesto
    - theme: alt
      text: 实测压测 (21µs)
      link: /zh/benchmarks/
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/path-ioc/path-ioc

features:
  - title: 物理路径即抽象契约
    details: 彻底消除数千行纵横交错的相对路径 import 声明。以物理目录结构自动映射逻辑契约，从数学拓扑层面杜绝隐式循环依赖与死锁。
  - title: 21.2 µs 纯同步无锁 DAG
    details: 基于 Kahn 算法与权重拓扑调度。50 节点装配耗时仅 21.2 微秒，500 节点图编译仅 1.72 毫秒，HTTP 请求期零图计算开销。
  - title: 零配置全自动类型推导
    details: 依托 AST 实时监听与虚拟模块技术，代码保存即生成全局强类型推导，享受 100% 准确的 IDE 智能补全，无需手动定义接口映射。
  - title: 动态语言纯正 AOP 切面
    details: 零学习成本，无需繁琐装饰器与实验性元数据注解。依托 JavaScript 函数一等公民与高阶代理，实现纯正无侵入的面向切面编程。
  - title: 跨主流构建工具通用支持
    details: 基于 unplugin 架构，统一代码库无缝适配 Vite、Webpack 5、Rspack、Rollup 与 Node.js 生产环境。
  - title: 边缘计算与 Serverless 就绪
    details: 启动期单例静态图编译与请求级轻量容器多例填充。零反射零元数据包袱，轻松满足 10ms~50ms 苛刻 CPU 限额，吞吐提升 80%。
---

<div class="comparison-container">
<div class="comparison-header">
<div class="slogan-pill">Spring 有 Bean · Nest 有 Provider · Path-IoC 有 Mesh</div>
<h2>控制反转的三代演进：异步初始化与装配依赖实测</h2>
<p><b>真实工业场景</b>：模块 A (<code>remoteConfig</code>) 启动时需基于秘钥异步发起网络请求拉取配置数据包，对外暴露<b>纯同步函数</b> <code>isEnabled(feature)</code>；模块 B (<code>orderService</code>) 在自身初始化装配期，必须<b>同步调用模块 A 的函数</b>决定是否启用特性（模块 B 强物理依赖模块 A 的初始化先决条件）。</p>
</div>

<div class="comparison-grid">

<div class="comparison-card comparison-card-spring">
<div class="card-topbar">
<span class="card-filename">spring/AppConfig.java</span>
<span class="badge-spring">Spring · 经典 @Bean 工厂范式</span>
</div>

```java
// Spring: 依托 JVM 物理多线程模型，在启动阶段阻塞主线程等待异步数据包拉取就绪
@Configuration
public class AppConfig {

  @Bean
  public RemoteConfig remoteConfig() {
    RemoteConfig config = new RemoteConfig();
    config.initFromRemote(secretKey); // 启动阶段阻塞线程等待远程配置完成
    return config;
  }

  @Bean
  public OrderService orderService(RemoteConfig remoteConfig) {
    // 模块 B 在初始化装配期同步调用模块 A 的函数
    boolean enableDiscount = remoteConfig.isEnabled("vip_discount");
    return new OrderService(enableDiscount);
  }
}
```

</div>

<div class="comparison-card comparison-card-bad">
<div class="card-topbar">
<span class="card-filename">nestjs/app.module.ts</span>
<span class="badge-negative">NestJS · 装饰器崩溃与 useFactory 退化</span>
</div>

```typescript
// 痛点：TS Class 构造器无法 await！若用 onModuleInit 会因时序竞态读取到未初始化空值；
// 苦心经营的 @Injectable() 类体系在此刻土崩瓦解，被迫退化为冗长脆弱的 useFactory 字典：
@Module({
  providers: [
    {
      provide: 'REMOTE_CONFIG',
      useFactory: async () => {
        const config = await fetchRemoteConfig(process.env.SECRET_KEY);
        return { isEnabled: (feature: string) => config[feature] ?? false };
      }
    },
    {
      provide: 'ORDER_SERVICE',
      useFactory: (config: RemoteConfig) => {
        // 模块 B 必须手写工厂胶水代码，并手动在 inject 数组中维持脆弱的字符串映射
        const enableDiscount = config.isEnabled('vip_discount');
        return new OrderService(enableDiscount);
      },
      inject: ['REMOTE_CONFIG']
    }
  ]
})
export class AppModule {}
```

</div>

<div class="comparison-card comparison-card-good">
<div class="card-topbar">
<span class="card-filename">src/modules/ (remoteConfig & orderService)</span>
<span class="badge-positive">Path-IoC · 原生拓扑编排与零竞态装配</span>
</div>

```typescript
// 模块 A (src/modules/remoteConfig/index.ts)：原生 async 函数初始化，返回纯同步闭包方法
export const main = async () => {
  const config = await fetchRemoteConfig(process.env.SECRET_KEY);
  return {
    isEnabled(feature: string) { return config[feature] ?? false; } // 内部数据已就绪，纯同步！
  };
};

// 模块 B (src/modules/orderService/index.ts)：声明依赖短名称，装配期直接同步消费
export const dependencies = ["remoteConfig"];

export const main = (container: ModularContainer) => {
  const { remoteConfig } = container;
  // 拓扑引擎自动保证：唤醒 orderService 时，remoteConfig 的 async 初始化必定已 100% 解决！
  const enableDiscount = remoteConfig.isEnabled("vip_discount");

  return {
    createOrder(item: string) {
      return { item, price: enableDiscount ? 80 : 100 };
    }
  };
};
```

</div>

</div>
</div>

<div class="benchmark-dashboard">
  <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 1rem;">
    <div>
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--vp-c-brand-1); text-transform: uppercase; letter-spacing: 0.05em;">硬核压测数据</span>
      <h3 style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 800;">生产级硬件实测基准 (Apple M5 / Node 24)</h3>
    </div>
    <a href="/zh/benchmarks/" style="font-size: 0.9rem; font-weight: 600; color: var(--vp-c-brand-1);">查看完整测试方法论 &rarr;</a>
  </div>

  <div class="benchmark-stats-grid">
    <div class="benchmark-stat-card">
      <div class="stat-label">50 节点容器实例化</div>
      <div class="stat-value green">21.2 µs</div>
      <div class="stat-desc">微秒级无锁直通装配。Serverless / Workers 单次请求期零等待延迟。</div>
    </div>
    <div class="benchmark-stat-card">
      <div class="stat-label">500 节点静态图编译</div>
      <div class="stat-value purple">1.72 ms</div>
      <div class="stat-desc">进程冷启动单次全拓扑 Kahn 校验，随后全局静态缓存复用。</div>
    </div>
    <div class="benchmark-stat-card">
      <div class="stat-label">核心引擎代码体积</div>
      <div class="stat-value blue">8.8 KB</div>
      <div class="stat-desc">纯粹的 ES 模块闭包。零外部重型依赖，零元数据查表开销。</div>
    </div>
  </div>
</div>

<div class="pro-commercial-banner">
  <div>
    <span class="pro-banner-badge">生产级商业 SaaS 脚手架</span>
    <h3 class="pro-banner-title">打造全球出海盈利业务：Path-IoC Pro 脚手架</h3>
    <p class="pro-banner-desc">深度集成 Cloudflare Workers 全球边缘计算 + Hono + React 19 + Path-IoC + Tailwind CSS + Stripe 国际支付履约 + D1 数据库。数小时内上线你的全球化高毛利 SaaS 业务。</p>
  </div>
  <div>
    <a href="/zh/templates/pro-boilerplate" class="pro-banner-action">
      探索商业脚手架 &rarr;
    </a>
  </div>
</div>
