# Quick Start

Get started with Path-IoC in under three minutes and experience lock-free, topological dependency injection based on physical file paths.

---

## 1. Install Dependencies

```bash
# Install core runtime engine
pnpm add @path-ioc/core

# Install universal build plugin as dev dependency
pnpm add -D @path-ioc/unplugin
```

> If you are using npm or yarn, simply replace the package manager command accordingly.

---

## 2. Configure Bundler Plugin

Inject the unplugin adapter into your bundler configuration (works out of the box with zero configuration):

### Vite (`vite.config.ts`)
```typescript
import { defineConfig } from "vite";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc.vite()],
});
```

### Rolldown (`rolldown.config.ts`)
```typescript
import { defineConfig } from "rolldown";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [pathIoc.rolldown()],
});
```

### Webpack (`webpack.config.js`)
```javascript
const { webpackPlugin } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [webpackPlugin()],
};
```

### Rspack (`rspack.config.js`)
```javascript
const { rspackPlugin } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [rspackPlugin()],
};
```

::: tip 💡 Zero Configuration & Optional Parameters
By default, the plugin scans the physical directory `src/modules` and outputs TypeScript declarations to `types/ignore.modular.d.ts`. To customize paths:
```typescript
pathIoc.vite({
  modulesPath: "src/custom-modules", // Custom modules folder (default: 'src/modules')
  typeFileOutput: "custom-types",    // Custom declaration directory (default: 'types')
})
```
:::

---

## 3. Create Your First Modules

Create subdirectories inside `src/modules`, such as `src/modules/logger/index.ts`:

```typescript
// src/modules/logger/index.ts
export const main = () => {
  return {
    info(msg: string) {
      console.log(`[INFO] ${new Date().toISOString()} - ${msg}`);
    },
    error(msg: string) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`);
    },
  };
};
```

Next, create an interdependent service at `src/modules/order/index.ts`:

```typescript
// src/modules/order/index.ts
export const main = (container: ModularContainer) => {
  // Destructure logger directly with complete IDE auto-completion!
  const { logger } = container;

  return {
    createOrder(id: string, amount: number) {
      logger.info(`Creating order ${id} for $${amount}`);
      return { id, amount, status: 'CREATED' };
    },
  };
};

// Declare topological dependencies
export const dependencies = ["logger"];
```

Next, create the application startup aggregator module `src/modules/start-app/index.ts` to coordinate initial workflows:

```typescript
// src/modules/start-app/index.ts
export const main = (container: ModularContainer) => {
  const { order, logger } = container;

  logger.info("All services topologically ready, triggering startup workflow...");
  order.createOrder("ORD_999", 299);
};

// 🔥 Killer Feature: Dynamic Functional Dependencies (Aggregator Pattern & Intuitive AOP)
// Automatically wait for all other business modules without hardcoding individual names
export const dependencies = (allModules: string[]) =>
  allModules.filter((path) => path !== "/startApp");
```

> **Tip**: `dependencies` natively accepts either string arrays or higher-order filter functions. This is Path-IoC's signature strength: with functional dependencies, developers can implement the **Aggregator Pattern** and **Intuitive AOP** using standard JavaScript array methods without learning convoluted pointcut syntax. In frontend projects, `start-app` typically executes `createRoot().render(<App />)`; in backend projects, it calls `app.listen(port)`.

---

## 4. Ignite Container at Application Entry

In your root application entry (such as `src/main.ts` or `src/index.ts`), **simply ignite the container—never leak business logic outside IoC modules**:

```typescript
// src/main.ts
import { createModularContainer } from "virtual:modular-container";

// Wake up the topological container; all initialization is governed by IoC modules
createModularContainer();
```

::: tip Architectural Philosophy: All Logic Belongs in Modules; Entry Only Ignites
In pure Inversion of Control (IoC), the application entry point (`main.ts`) should remain completely pristine and lightweight, acting solely as an "ignition switch".

Encapsulating initial business invocations, DOM mounting, or port binding within dedicated IoC modules like `start-app` ensures that all databases, configurations, and prerequisites are 100% topologically ready via `dependencies`, maintaining total non-invasiveness and testability.
:::
