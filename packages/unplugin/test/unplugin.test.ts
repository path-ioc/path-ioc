import { describe, it, expect } from "vitest";
import { rollupPlugin, rolldownPlugin } from "../src/index";

describe("unplugin", () => {
  it("should export rolldownPlugin function and have proper plugin name", () => {
    expect(typeof rolldownPlugin).toBe("function");
    const plugin = rolldownPlugin() as any;
    expect(plugin.name).toBe("unplugin-path-ioc");
  });

  it("should generate proper plugin name", () => {
    const plugin = rollupPlugin() as any;
    expect(plugin.name).toBe("unplugin-path-ioc");
  });

  it("should generate correct load output with createModularContainer", () => {
    const plugin = rollupPlugin() as any;
    const output = plugin.load("\0virtual:modular-container");
    expect(output).toContain("export async function createModularContainer");
    expect(output).toContain("compileModuleGraph");
  });

  it("should handle resolveId for virtual module", () => {
    const plugin = rollupPlugin() as any;
    expect(plugin.resolveId("virtual:modular-container")).toBe("\0virtual:modular-container");
    expect(plugin.resolveId("something-else")).toBeUndefined();
  });

  it("should omit ambiguous short names in generated type definitions", async () => {
    const { generateModuleMapContent } = await import("../src/generator");
    const folders = [
      "src/modules/user/service",
      "src/modules/admin/service",
    ];

    const content = generateModuleMapContent(folders, "/root", "types", "src/modules");

    // Full names MUST be included in type definitions
    expect(content).toContain('"/user/service":');
    expect(content).toContain('"/admin/service":');

    // Ambiguous short name "service" MUST NOT be included
    expect(content).not.toContain('"service":');
  });

  it("should collapse rapid concurrent calls and run trailing call with latest arguments using createTrailingRunner", async () => {
    const { createTrailingRunner } = await import("../src/utils");
    const executionLog: string[] = [];

    const mockAsyncFn = async (tag: string) => {
      executionLog.push(`start:${tag}`);
      await new Promise((resolve) => setTimeout(resolve, 30));
      executionLog.push(`end:${tag}`);
      return `result:${tag}`;
    };

    const runner = createTrailingRunner(mockAsyncFn);

    // 发起第 1 次调用
    const p1 = runner("Call_1");

    // 在第 1 次运行期间，快速发起第 2、3、4 次调用
    const p2 = runner("Call_2");
    const p3 = runner("Call_3");
    const p4 = runner("Call_4");

    const results = await Promise.all([p1, p2, p3, p4]);

    // 所有并发/排队的调用方均能拿到最终最新一轮的最新结果
    expect(results[0]).toBe("result:Call_4");
    expect(results[1]).toBe("result:Call_4");
    expect(results[2]).toBe("result:Call_4");
    expect(results[3]).toBe("result:Call_4");

    // 验证实际执行序列：仅执行了 Call_1 和 Call_4，中间态 2 和 3 完全没有浪费执行！
    expect(executionLog).toEqual([
      "start:Call_1",
      "end:Call_1",
      "start:Call_4",
      "end:Call_4",
    ]);

    // 等待全部清空后，发起第 5 次调用，应作为全新空闲调用正常执行
    const p5 = await runner("Call_5");
    expect(p5).toBe("result:Call_5");
    expect(executionLog).toEqual([
      "start:Call_1",
      "end:Call_1",
      "start:Call_4",
      "end:Call_4",
      "start:Call_5",
      "end:Call_5",
    ]);
  });
});
