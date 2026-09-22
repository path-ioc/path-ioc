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

Inject the unplugin adapter into your bundler configuration:

### Vite (`vite.config.ts`)
```typescript
import { defineConfig } from "vite";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [
    pathIoc.vite({
      modulesPath: "src/modules",   // Physical module directory (default: src/modules)
      typeFileOutput: "types",     // Directory for generated ignore.modular.d.ts
    }),
  ],
});
```

### Rolldown (`rolldown.config.ts`)
```typescript
import { defineConfig } from "rolldown";
import { rolldownPlugin as pathIoc } from "@path-ioc/unplugin";

export default defineConfig({
  plugins: [
    pathIoc({
      modulesPath: "src/modules",
      typeFileOutput: "types",
    }),
  ],
});
```

### Webpack (`webpack.config.js`)
```javascript
const { webpackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [
    pathIoc({
      modulesPath: "src/modules",
    }),
  ],
};
```

### Rspack (`rspack.config.js`)
```javascript
const { rspackPlugin: pathIoc } = require("@path-ioc/unplugin");

module.exports = {
  plugins: [pathIoc()],
};
```

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

Next, create the application startup module `src/modules/start-app/index.ts` to coordinate initial workflows:

```typescript
// src/modules/start-app/index.ts
export const main = (container: ModularContainer) => {
  const { order, logger } = container;

  logger.info("Application initialized successfully, triggering startup workflow...");
  order.createOrder("ORD_999", 299);
};

// Declare topological dependencies: ensure order and logger are ready before startup
export const dependencies = ["order", "logger"];
```

> **Tip**: In frontend SPA projects, `start-app` typically executes `createRoot().render(<App />)`; in backend projects, it typically calls `app.listen(port)`.

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
