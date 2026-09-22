import { describe, it, expect } from "vitest";
import { createContainer } from "../src/index";
import { compileModuleGraph, type IOCModule } from "@path-ioc/core";

describe("createContainer", () => {
  it("should support turbo mode (sync getter with demand strategy)", () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/a",
        module: { main: () => "A" },
      },
      {
        key: "/b",
        module: {
          main: (deps: any) => `B depends on ${deps["a"] || deps["/a"]}`,
          dependencies: ["/a"],
        },
      },
    ];

    const graph = compileModuleGraph(modules);
    const container = createContainer(graph, { mode: "turbo", strategy: "demand" });
    const c = container as any;

    expect(c["/a"]).toBe("A");
    expect(c["/b"]).toBe("B depends on A");
  });

  it("should support eager strategy in turbo mode (preload all sync modules)", () => {
    let initializedA = false;
    let initializedB = false;

    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/a",
        module: { main: () => { initializedA = true; return "A"; } },
      },
      {
        key: "/b",
        module: {
          dependencies: ["/a"],
          main: () => { initializedB = true; return "B"; },
        },
      },
    ];

    const graph = compileModuleGraph(modules);
    // eager 策略下，在容器创建时即完成全量预热
    const container = createContainer(graph, { mode: "turbo", strategy: "eager" });
    
    expect(initializedA).toBe(true);
    expect(initializedB).toBe(true);
    const c = container as any;
    expect(c["/a"]).toBe("A");
    expect(c["/b"]).toBe("B");
  });

  it("should support async mode with eager strategy (100% equivalent to Core)", async () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/asyncMod",
        module: {
          main: async () => {
            return new Promise((resolve) => setTimeout(() => resolve("AsyncData"), 10));
          },
        },
      },
    ];

    const graph = compileModuleGraph(modules);
    const container = createContainer(graph, { mode: "async", strategy: "eager" });
    expect(container.$ready).toBeInstanceOf(Promise);
    expect(Object.keys(container)).not.toContain("$ready");
    await (container as any).$ready;
    const c = container as any;
    expect(c["/asyncMod"]).toBe("AsyncData");
  });

  it("should throw error when invalid container options are provided", () => {
    const graph = compileModuleGraph([]);
    expect(() =>
      createContainer(graph, { mode: "invalid" as any, strategy: "eager" })
    ).toThrow(/Invalid container options/);
  });

  it("should support demand strategy with function dependencies in turbo mode", () => {
    const modules: { key: string; module: IOCModule }[] = [
      {
        key: "/page/C",
        module: { main: () => "PageC" },
      },
      {
        key: "/allpages",
        module: {
          // 动态函数 dependencies 回归纯粹本意，完全允许有返回值
          dependencies: (names) => names.filter((n) => n.startsWith("/page/")),
          main: (c, names) => {
            const pageKeys = names.filter((n) => n.startsWith("/page/"));
            return pageKeys.map((key) => c[key]);
          },
        },
      },
    ];

    const graph = compileModuleGraph(modules);
    const container = createContainer(graph, { mode: "turbo", strategy: "demand" });
    const c = container as any;

    // 访问 allpages，动态触达 /page/C 并返回结果数组
    expect(c["/allpages"]).toEqual(["PageC"]);
  });
});
