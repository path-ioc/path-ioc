import { describe, it, expect } from "vitest";
import { compileModuleGraph, type IOCModule } from "@path-ioc/core";
import { extractSubModules } from "../src/extract";

describe("extractSubModules", () => {
  it("should extract base forward dependencies correctly", () => {
    const modules: { key: string; module: IOCModule }[] = [
      { key: "/page/A", module: { main: () => "PageA", dependencies: ["/core/Config"] } },
      { key: "/page/B", module: { main: () => "PageB", dependencies: ["/core/Config"] } },
      { key: "/core/Config", module: { main: () => "Config" } },
      { key: "/core/Unused", module: { main: () => "Unused" } },
      {
        key: "/dynamicMod",
        module: {
          dependencies: (names) => names.filter((n) => n.startsWith("/page/")),
          main: () => "DynamicMod",
        },
      },
    ];

    const fullGraph = compileModuleGraph(modules);

    // PageA -> Config
    const subModulesA = extractSubModules(fullGraph, "/page/A");
    const extractedKeysA = subModulesA.map((m) => m.key).sort();

    expect(extractedKeysA).toEqual(["/core/Config", "/page/A"]);

    // Test with shortName "B"
    const subModulesB = extractSubModules(fullGraph, "B");
    const extractedKeysB = subModulesB.map((m) => m.key).sort();

    expect(extractedKeysB).toEqual(["/core/Config", "/page/B"]);
  });
});

