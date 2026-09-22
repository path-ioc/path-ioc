import { describe, test, expect } from "vitest";

// 模拟 DOM 环境进行真实的 JS 运行时逻辑断言
if (typeof document === "undefined") {
  // @ts-ignore
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;
}

import { createModularContainer } from "virtual:modular-container";

describe("full-test-app JS Runtime Assertions", () => {
  test("should execute full IoC graph with AOP, ORM, DB and DOM rendering", async () => {
    console.log("👉 [full-test-app] Executing real JS runtime test...");
    const container: any = await createModularContainer();

    // 1. 运行时数据库连接断言
    expect(container.db?.type).toBe("PostgreSQL");

    // 2. 运行时 AOP 切面与 orderService 调用断言
    const order = container.orderService?.createOrder("MacBook Pro M4", 19999);
    expect(order?.orderId).toBeDefined();
    expect(order?.amount).toBe(19999);

    // 3. 运行时 ORM 实体搜集断言
    expect(container.ormAggregator?.schemas.length).toBe(2);

    // 4. 物理 DOM 节点渲染断言
    const appDiv = document.getElementById("app");
    expect(appDiv?.innerHTML).toContain("Path-IoC Running");
  });
});
