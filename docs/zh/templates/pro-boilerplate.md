# Path-IoC Pro 商业脚手架

面向独立开发者、技术创业团队与出海 SaaS 的全栈生产级微模块启动脚手架。

---

## 商业价值主张

在独立开发或出海开发一款现代 SaaS 产品时，团队通常需要花费 **4 到 8 周** 的无聊重复时间去解决通用基础设施：
- Cloudflare Workers 边缘计算环境中的 Hono 路由与跨域编排；
- 模块解耦与服务分层，防止业务演进中陷入混乱泥潭；
- Stripe 国际信用卡支付、按月订阅计费、Webhook 自动履约与账单对账；
- 安全的 Google / GitHub OAuth 登录与 JWT Refresh Token 会话维护；
- 边缘数据库（Cloudflare D1 / PostgreSQL）的数据迁移与 ORM 映射。

**Path-IoC Pro Boilerplate** 将全部基础设施开箱即用集成，依托 Path-IoC 革命性的路径拓扑架构，让团队在 **数小时内** 直接开始交付核心商业功能。

---

## 全栈技术规格矩阵

| 架构层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **全球边缘计算** | Cloudflare Workers | 依托全球 300+ Anycast 边缘节点，10ms 冷启动直达 |
| **服务端框架** | Hono.js + Path-IoC | 21.2 µs 级请求容器隔离，零重复图编译损耗 |
| **现代前端** | React 19 + Vite + Tailwind CSS | 现代化响应式设计，极速 HMR 开发体验 |
| **国际支付履约** | Stripe Billing & Webhook | 预置信用卡结账流、订阅周期管理与防漏单 Webhook |
| **边缘数据持久化** | Cloudflare D1 / PostgreSQL | 包含事务支持与自动 Schema 迁移工具 |
| **身份认证体系** | OAuth 2.0 + JWT | 支持 Google / GitHub 快捷登录与密码哈希 |
| **事务邮件通讯** | Resend API | 预制高转化欢迎邮件、账单通知与重置密码模板 |

---

## 开箱即用模块体系

```text
src/modules/
├── auth/               # 完整用户认证、OAuth、Session 守护
├── billing/            # Stripe 结账、订阅监听与用量计费
├── db/                 # D1 / PostgreSQL 连接池与事务 ORM
├── middleware/         # 速率限制、防刷限流与结构化日志
└── ui/
    ├── landing/        # 高转化商业营销落地页与定价表
    └── dashboard/      # 现代化响应式用户控制台面板
```

---

## 版本对比与方案定价

| 权益项 | 开源核心版 (Core) | Pro 商业脚手架 (Boilerplate) | 企业级重构咨询 (Advisory) |
| :--- | :--- | :--- | :--- |
| **定位** | 基础开源拓扑引擎 | 出海 SaaS 全栈商业底座 | 大型项目解耦与架构重塑 |
| **费用** | **免费 (MIT)** | **$149 早鸟 / $249 标准** | **¥20,000 ~ ¥80,000 / 单** |
| **开源核心包** | 包含全量子包 | 包含全量子包 | 包含全量子包与定制组件 |
| **Stripe 国际支付** | 需自行开发 | 开箱即用完整流程 | 深度定制企业财务结算 |
| **用户认证与授权** | 需自行搭建 | 开箱即用 OAuth + JWT | 支持 SAML / SSO 企业单点登录 |
| **Cloudflare D1 边缘底座** | 需自行配置 | 预置自动化迁移工程 | 专属跨可用区容灾方案 |
| **源码交付方式** | NPM 公共包 | GitHub 私有仓库永久授权 | 专属私有代码库交付 |
| **技术支持服务** | GitHub Issues 社区互助 | 邮件与专属私密讨论通道 | 创始人 1v1 驻场/远程架构审计 |

---

## 预约通道与早鸟权益

Path-IoC Pro 脚手架即将在 Lemon Squeezy / Gumroad 官方上架发售。

- **早鸟专属优惠**：前 50 名登记用户享受 **$149 终身买断早鸟特惠**（后续恢复标准售价 $249）；
- **如何获取**：欢迎在 [GitHub Discussions](https://github.com/path-ioc/path-ioc/discussions) 登记或关注官方 Release，发布即享专属优惠券代码推送。
