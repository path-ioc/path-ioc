import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Path-IoC",
  description: "Pure Topological IoC Engine & Universal Modular DevTools for Modern TypeScript",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#FC6401" }],
    ["meta", { property: "og:title", content: "Path-IoC - Pure Topological IoC for Modern TypeScript" }],
    ["meta", { property: "og:description", content: "Zero decorators, zero reflection, microsecond-level dependency resolution based on physical file paths for Vite, Webpack, and Cloudflare Workers." }],
    ["meta", { property: "og:url", content: "https://path-ioc.dev" }],
    ["meta", { property: "og:image", content: "https://path-ioc.dev/og-image.png" }],
  ],

  locales: {
    root: {
      label: "English",
      lang: "en",
      title: "Path-IoC",
      description: "Pure Topological IoC Engine & Universal Modular DevTools for Modern TypeScript",
      themeConfig: {
        siteTitle: "Path-IoC",
        logo: "/logo.svg",
        nav: [
          { text: "Guide", link: "/guide/what-is-path-ioc" },
          { text: "Architecture", link: "/guide/architecture-manifesto" },
          { text: "Articles", link: "/articles/" },
          { text: "Benchmarks", link: "/benchmarks/" },
          { text: "API", link: "/api/core" },
          { text: "Pro Boilerplate", link: "/templates/pro-boilerplate" },
          { text: "Sponsor", link: "/sponsor" },
          {
            text: "v0.1.1",
            items: [
              { text: "Changelog", link: "https://github.com/path-ioc/path-ioc/releases" },
              { text: "Contributing", link: "https://github.com/path-ioc/path-ioc/blob/main/CONTRIBUTING.md" },
              { text: "GitHub Sponsors", link: "https://github.com/sponsors/path-ioc" },
              { text: "Ko-fi Support", link: "https://ko-fi.com/pathioc" },
            ],
          },
        ],
        sidebar: {
          "/guide/": [
            {
              text: "Introduction",
              items: [
                { text: "What is Path-IoC?", link: "/guide/what-is-path-ioc" },
                { text: "Quick Start", link: "/guide/quick-start" },
              ],
            },
            {
              text: "Architecture & Philosophy",
              items: [
                { text: "Genesis Story (Author's Note)", link: "/guide/genesis-story" },
                { text: "Architecture Manifesto (Spring & Event Loop)", link: "/guide/architecture-manifesto" },
                { text: "Framework Comparison (Nest / Inversify)", link: "/guide/comparison" },
                { text: "Aspect-Oriented Programming (AOP)", link: "/guide/aop-aspect" },
                { text: "Cloudflare Workers & Edge Runtimes", link: "/guide/edge-and-serverless" },
              ],
            },
          ],
          "/articles/": [
            {
              text: "Articles & Deep Dives",
              items: [
                { text: "Overview & Index", link: "/articles/" },
                { text: "Why DI Cannot Concur: Graph Cycles & Async Trap", link: "/articles/why-di-cannot-concurrent" },
                { text: "Client vs Server: Singleton & Request Isolation", link: "/articles/client-vs-server-container-patterns" },
                { text: "Async Preheat vs. Lazy Connection: Preventing Async Pollution", link: "/articles/async-preheat-vs-lazy-connection" },
                { text: "Rethinking Veteran JS IoC Concepts & Path-IoC Stance", link: "/articles/rethinking-legacy-ioc-concepts" },
                { text: "Anti-Pattern: Hardcoding Full Paths in Business Dependencies", link: "/articles/anti-pattern-full-path" },
              ],
            },
          ],
          "/api/": [
            {
              text: "API Reference",
              items: [
                { text: "@path-ioc/core", link: "/api/core" },
                { text: "@path-ioc/unplugin", link: "/api/unplugin" },
                { text: "@path-ioc/container", link: "/api/container" },
                { text: "@path-ioc/pack", link: "/api/pack" },
              ],
            },
          ],
          "/benchmarks/": [
            {
              text: "Performance",
              items: [{ text: "Benchmark Results", link: "/benchmarks/" }],
            },
          ],
          "/templates/": [
            {
              text: "Commercial Solutions",
              items: [{ text: "Path-IoC Pro Boilerplate", link: "/templates/pro-boilerplate" }],
            },
          ],
        },
      },
    },

    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      title: "Path-IoC",
      description: "基于物理文件路径的无锁拓扑依赖注入引擎与通用模块化工具",
      themeConfig: {
        siteTitle: "Path-IoC",
        logo: "/logo.svg",
        nav: [
          { text: "指南", link: "/zh/guide/what-is-path-ioc" },
          { text: "架构哲学", link: "/zh/guide/architecture-manifesto" },
          { text: "专栏文章", link: "/zh/articles/" },
          { text: "基准压测", link: "/zh/benchmarks/" },
          { text: "API 规范", link: "/zh/api/core" },
          { text: "商业脚手架", link: "/zh/templates/pro-boilerplate" },
          { text: "赞助支持", link: "/zh/sponsor" },
          {
            text: "v0.1.1",
            items: [
              { text: "更新日志", link: "https://github.com/path-ioc/path-ioc/releases" },
              { text: "贡献指南", link: "https://github.com/path-ioc/path-ioc/blob/main/CONTRIBUTING.md" },
              { text: "GitHub 赞助", link: "https://github.com/sponsors/path-ioc" },
              { text: "爱发电赞助", link: "https://afdian.com/a/path-ioc" },
              { text: "Ko-fi 赞助", link: "https://ko-fi.com/pathioc" },
            ],
          },
        ],
        sidebar: {
          "/zh/guide/": [
            {
              text: "入门导引",
              items: [
                { text: "什么是 Path-IoC？", link: "/zh/guide/what-is-path-ioc" },
                { text: "快速上手", link: "/zh/guide/quick-start" },
              ],
            },
            {
              text: "架构设计与核心哲学",
              items: [
                { text: "创世手记：从 Java 惯性到 TS 原生顿悟", link: "/zh/guide/genesis-story" },
                { text: "架构宣言：向 Spring 致敬与动态语言正解", link: "/zh/guide/architecture-manifesto" },
                { text: "选型深度对比 (NestJS / Inversify)", link: "/zh/guide/comparison" },
                { text: "面向切面编程 (真 AOP)", link: "/zh/guide/aop-aspect" },
                { text: "Cloudflare Workers 边缘计算实战", link: "/zh/guide/edge-and-serverless" },
              ],
            },
          ],
          "/zh/articles/": [
            {
              text: "深度思辨与专栏文章",
              items: [
                { text: "专栏概览与目录", link: "/zh/articles/" },
                { text: "图论视角：为什么 DI 无法实现拓扑并发？", link: "/zh/articles/why-di-cannot-concurrent" },
                { text: "客户端全局单例 vs 服务端多例与闭包缓存", link: "/zh/articles/client-vs-server-container-patterns" },
                { text: "初始化权衡：懒连接 vs 拓扑预热，终结异步染色", link: "/zh/articles/async-preheat-vs-lazy-connection" },
                { text: "老牌 JS IoC 概念繁复与 Path-IoC 的极简架构立场", link: "/zh/articles/rethinking-legacy-ioc-concepts" },
                { text: "架构反模式：为什么在业务依赖中硬编码全路径是错的？", link: "/zh/articles/anti-pattern-full-path" },
              ],
            },
          ],
          "/zh/api/": [
            {
              text: "API 规范",
              items: [
                { text: "@path-ioc/core", link: "/zh/api/core" },
                { text: "@path-ioc/unplugin", link: "/zh/api/unplugin" },
                { text: "@path-ioc/container", link: "/zh/api/container" },
                { text: "@path-ioc/pack", link: "/zh/api/pack" },
              ],
            },
          ],
          "/zh/benchmarks/": [
            {
              text: "性能测试",
              items: [{ text: "基准性能指标", link: "/zh/benchmarks/" }],
            },
          ],
          "/zh/templates/": [
            {
              text: "商业化方案",
              items: [{ text: "Path-IoC Pro 商业脚手架", link: "/zh/templates/pro-boilerplate" }],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/path-ioc/path-ioc" }],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present Path-IoC Organization & Lian HanLin",
    },
    search: {
      provider: "local",
    },
  },
});
