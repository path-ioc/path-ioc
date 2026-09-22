import { describe, it, expect } from "vitest";
import { compileModuleGraph, instantiateModuleContainer } from "../src/graph";
import type { IOCModule } from "../src/graph";

describe("compileModuleGraph", () => {
  it("should compile a basic DAG and sort topologically", () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/c",
        module: { main: () => "C", dependencies: ["/a"] },
      },
      {
        key: "/a",
        module: { main: () => "A" },
      },
      {
        key: "/b",
        module: { main: () => "B", dependencies: ["/a"] },
      },
    ];

    const graph = compileModuleGraph(modules);
    
    // A should be initialized first, then B or C
    const names = graph.sortedDeclarations.map((d) => d.fullName);
    expect(names.indexOf("/a")).toBeLessThan(names.indexOf("/b"));
    expect(names.indexOf("/a")).toBeLessThan(names.indexOf("/c"));
  });

  it("should throw on circular dependency", () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/a",
        module: { main: () => "A", dependencies: ["/b"] },
      },
      {
        key: "/b",
        module: { main: () => "B", dependencies: ["/a"] },
      },
    ];

    expect(() => compileModuleGraph(modules)).toThrow(/A cycle was detected/);
  });

  it("should handle skip properly", () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/a",
        module: { main: () => "A", skip: true },
      },
      {
        key: "/b",
        module: { main: () => "B", dependencies: ["/a"] },
      },
    ];

    const graph = compileModuleGraph(modules);
    expect(graph.sortedDeclarations.find(d => d.fullName === "/a")?.skip).toBe(true);
  });

  it("should throw on ambiguous short name dependency", () => {
    const modules: { key: string; module: IOCModule }[] = [
      { key: "/user/service", module: { main: () => "UserService" } },
      { key: "/admin/service", module: { main: () => "AdminService" } },
      { key: "/app", module: { main: () => "App", dependencies: ["service"] } },
    ];

    expect(() => compileModuleGraph(modules)).toThrow(
      /has an ambiguous dependency on 'service'/
    );
  });

  it("should omit mounting ambiguous short names on container during instantiation", async () => {
    const modules: { key: string; module: IOCModule }[] = [
      { key: "/user/service", module: { main: () => "UserService" } },
      { key: "/admin/service", module: { main: () => "AdminService" } },
    ];

    const graph = compileModuleGraph(modules);
    const container: Record<string, unknown> = {};
    await instantiateModuleContainer(graph, container);

    expect(container["/user/service"]).toBe("UserService");
    expect(container["/admin/service"]).toBe("AdminService");
    // Short name 'service' is ambiguous, so container['service'] should not be set
    expect(container["service"]).toBeUndefined();
  });

  it("should support compiledGraph reuse across multiple instantiateModuleContainer invocations without state leakage", async () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/counter",
        module: {
          main: (container) => {
            const initial = (container.varContext as { count: number })?.count ?? 0;
            return initial + 1;
          },
        },
      },
    ];

    const graph = compileModuleGraph(modules);

    // First request container
    const container1: Record<string, unknown> = { varContext: { count: 10 } };
    await instantiateModuleContainer(graph, container1);
    expect(container1["/counter"]).toBe(11);

    // Second request container (reuses the same compiledGraph)
    const container2: Record<string, unknown> = { varContext: { count: 100 } };
    await instantiateModuleContainer(graph, container2);
    expect(container2["/counter"]).toBe(101);
  });

  it("should preserve early AOP overrides on container short names when base module initializes later", async () => {
    const modules: { key: string; module: IOCModule }[] = [
      // Base LoginPage
      {
        key: "/component/frame/LoginPage",
        module: { main: () => "BaseLoginPage" },
      },
      // FlowSense plugin LoginPage
      {
        key: "/z-flowsense/component/FlowSenseLoginPage",
        module: { main: () => "FlowSenseLoginPage" },
      },
      // z-flowsense AOP root module with order = -Infinity
      {
        key: "/z-flowsense",
        module: {
          order: -Infinity,
          dependencies: ["FlowSenseLoginPage"],
          main: (container) => {
            container.LoginPage = container["/z-flowsense/component/FlowSenseLoginPage"];
          },
        },
      },
    ];

    const graph = compileModuleGraph(modules);
    const container: Record<string, unknown> = {};
    await instantiateModuleContainer(graph, container);

    // Full names are preserved
    expect(container["/component/frame/LoginPage"]).toBe("BaseLoginPage");
    expect(container["/z-flowsense/component/FlowSenseLoginPage"]).toBe("FlowSenseLoginPage");
    // Overridden short name must be FlowSenseLoginPage, NOT overwritten by BaseLoginPage!
    expect(container["LoginPage"]).toBe("FlowSenseLoginPage");
  });
});

