---
layout: home

hero:
  name: "Path-IoC"
  text: "Spring has Beans, Nest has Providers, Path-IoC has Mesh"
  tagline: "Honoring Spring's foundational philosophy in native TypeScript. Zero decorators, zero reflection metadata, microsecond cold starts, and lock-free DAG topology."
  image:
    src: https://cdn.path-ioc.dev/path-ioc/logo.svg
    alt: Path-IoC Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/what-is-path-ioc
    - theme: alt
      text: Architecture Manifesto
      link: /guide/architecture-manifesto
    - theme: alt
      text: Benchmarks (21µs)
      link: /benchmarks/
    - theme: alt
      text: View on GitHub
      link: https://github.com/path-ioc/path-ioc

features:
  - title: Application-Level Module System
    details: Counterparts native ESM to replace fragile relative imports in business layers. One-line host ignition boots an autonomous Mesh universe where lifecycles and business logic circulate 100% internally.
  - title: Physical Path as Contract
    details: Eliminate thousands of fragile relative import lines. File paths map directly to logical contracts with mathematical certainty, preventing circular dependency deadlocks.
  - title: 21.2 µs Lock-Free DAG
    details: Pure synchronous topological scheduling. 50 nodes assembled in 21.2 microseconds, 500 nodes compiled in 1.72 milliseconds. Zero overhead during HTTP request lifecycles.
  - title: Zero-Config Type Generation
    details: AST scanning paired with virtual modules generates complete TypeScript interfaces on file save. Enjoy 100% accurate IDE auto-completion with zero manual typing.
  - title: Native Functional AOP
    details: No decorators, no experimental metadata. Leverage JavaScript's first-class functions and higher-order proxies for non-invasive, aspect-oriented cross-cutting concerns.
  - title: Serverless & Edge Ready
    details: Static graph compilation combined with request-isolated containers. Zero metadata reflection easily satisfies strict 10ms-50ms CPU limits with 80% higher throughput.
---

<div class="comparison-container">
<div class="comparison-header">
<div class="slogan-pill">Spring has Beans · Nest has Providers · Path-IoC has Mesh</div>
<h2>Three Generations of IoC: Async Initialization & Assembly Prerequisite</h2>
<p><b>Real-World Architecture</b>: Module A (<code>remoteConfig</code>) performs an async HTTP handshake on startup to fetch encrypted configuration, exposing a <b>pure synchronous function</b> <code>isEnabled(feature)</code>. Module B (<code>orderService</code>) must <b>synchronously invoke Module A's function</b> during its own instantiation to enable or disable features (Module B has an unnegotiable initialization prerequisite on Module A).</p>
</div>

<div class="comparison-grid">

<div class="comparison-card comparison-card-spring">
<div class="card-topbar">
<span class="card-filename">spring/AppConfig.java</span>
<span class="badge-spring">Spring · Classic @Bean Factory Pattern</span>
</div>

```java
// Spring: Relies on OS threads to block the startup thread until remote config is fetched
@Configuration
public class AppConfig {

  @Bean
  public RemoteConfig remoteConfig() {
    RemoteConfig config = new RemoteConfig();
    config.initFromRemote(secretKey); // Blocks the current thread until config is ready
    return config;
  }

  @Bean
  public OrderService orderService(RemoteConfig remoteConfig) {
    // Module B synchronously invokes Module A during container wiring
    boolean enableDiscount = remoteConfig.isEnabled("vip_discount");
    return new OrderService(enableDiscount);
  }
}
```

</div>

<div class="comparison-card comparison-card-bad">
<div class="card-topbar">
<span class="card-filename">nestjs/app.module.ts</span>
<span class="badge-negative">NestJS · Decorator Collapse & useFactory Regression</span>
</div>

```typescript
// Pain Point: Class constructors cannot await! Using onModuleInit causes race condition silent bugs.
// The OOP @Injectable() class syntax collapses and is forced to regress into verbose useFactory dictionaries:
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
        // Module B must write glue code and manually manage string tokens in the fragile inject array
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
<span class="badge-positive">Path-IoC · Native Async DAG & Zero-Race Assembly</span>
</div>

```typescript
// Module A (src/modules/remoteConfig/index.ts): Native async function initialization, returns sync methods
export const main = async () => {
  const config = await fetchRemoteConfig(process.env.SECRET_KEY);
  return {
    isEnabled(feature: string) { return config[feature] ?? false; } // Data ready in closure, pure sync!
  };
};

// Module B (src/modules/orderService/index.ts): Declare short-name dependency, consume synchronously
export const dependencies = ["remoteConfig"];

export const main = (container: ModularContainer) => {
  const { remoteConfig } = container;
  // Topological engine guarantees: remoteConfig's async task is 100% resolved before waking up orderService!
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
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--vp-c-brand-1); text-transform: uppercase; letter-spacing: 0.05em;">Performance Benchmark</span>
      <h3 style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 800;">Hardware-Verified Benchmarks (Apple M5 / Node 24)</h3>
    </div>
    <a href="/benchmarks/" style="font-size: 0.9rem; font-weight: 600; color: var(--vp-c-brand-1);">View Detailed Methodology &rarr;</a>
  </div>

  <div class="benchmark-stats-grid">
    <div class="benchmark-stat-card">
      <div class="stat-label">50-Node Instantiation</div>
      <div class="stat-value green">21.2 µs</div>
      <div class="stat-desc">Microsecond-level direct container resolution. Zero request-time latency in serverless runtimes.</div>
    </div>
    <div class="benchmark-stat-card">
      <div class="stat-label">500-Node Graph Compilation</div>
      <div class="stat-value purple">1.72 ms</div>
      <div class="stat-desc">Single cold-boot topological cycle validation, then 100% cached across high-frequency requests.</div>
    </div>
    <div class="benchmark-stat-card">
      <div class="stat-label">Core Engine Footprint</div>
      <div class="stat-value blue">8.8 KB</div>
      <div class="stat-desc">Pure ES module closures. Zero external dependencies and zero reflect-metadata overhead.</div>
    </div>
  </div>
</div>

<div class="pro-commercial-banner">
  <div>
    <span class="pro-banner-badge">Production SaaS Boilerplate</span>
    <h3 class="pro-banner-title">Build Global Edge Products with Path-IoC Pro</h3>
    <p class="pro-banner-desc">Full-stack commercial starter kit integrating Cloudflare Workers, Hono, React 19, Path-IoC, Tailwind CSS, Stripe Global Payments, and D1 Database. Launch your SaaS in days instead of months.</p>
  </div>
  <div>
    <a href="/templates/pro-boilerplate" class="pro-banner-action">
      Explore Pro Boilerplate &rarr;
    </a>
  </div>
</div>
