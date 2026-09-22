import { describe, test, expect } from "vitest";

// 模拟 DOM 环境进行真实的 JS 运行时逻辑断言
if (typeof document === "undefined") {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;
}

import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";
import { modules as localModules } from "virtual:modular-container";
import { modules as remoteFullAppModules } from "full-test-app/node_modules/.path-ioc/.modular-plugin-entry";

describe("modules-merge-test-app Cross-App Merge Runtime Assertions", () => {
  test("should merge remote and local modules into a unified DAG graph and execute correctly", async () => {
    console.log("👉 [modules-merge-test-app] Executing real JS runtime merge test...");
    const compiledGraph = compileModuleGraph([...remoteFullAppModules, ...localModules]);
    const container: any = {};
    await instantiateModuleContainer(compiledGraph, container);

    // 1. 跨包远程模块访问断言
    expect(container.db?.type).toBe("PostgreSQL");

    const remoteOrder = container.orderService?.createOrder("iPhone 16 Pro", 9999);
    expect(remoteOrder?.orderId).toBeDefined();

    // 2. 本地扩展模块访问与跨包依赖调用断言
    const localPayment = container.payment?.processPayment(remoteOrder.orderId, 9999);
    expect(localPayment?.status).toBe("PAID");

    // 3. 物理 DOM 节点渲染断言
    const appDiv = document.getElementById("app");
    expect(appDiv?.innerHTML).toContain("Cross-App Topology Merged");
  });
});
