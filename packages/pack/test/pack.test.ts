import { describe, it, expect } from "vitest";
import { modularPackPlugin } from "../src/index";

describe("pack plugin", () => {
  it("should generate a plugin config", () => {
    const plugin = modularPackPlugin({
      sharedMappings: [],
      sharedContainerMappings: []
    });
    
    expect(plugin.name).toBe("vite-plugin-modular-pack");
    expect(plugin.enforce).toBe("pre");
    expect(typeof plugin.config).toBe("function");
  });
});
