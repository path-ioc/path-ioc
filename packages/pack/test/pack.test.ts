import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { build } from "vite";
import { modularPackPlugin } from "../src/index";

describe("modularPackPlugin unit tests", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pack-test-"));
    // Create mock src/modules structure
    await fs.mkdir(path.join(tmpDir, "src/modules/math/add"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "src/modules/math/add/index.ts"),
      `export const main = () => ({ add: (a: number, b: number) => a + b });\n`
    );
    await fs.mkdir(path.join(tmpDir, "src/modules/util/greet"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "src/modules/util/greet/index.ts"),
      `export const main = () => "hello";\n`
    );
    // Create package.json
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-pack-pkg",
        version: "1.0.0",
        dependencies: {
          "lodash-es": "^4.17.21",
        },
      })
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it("should generate a plugin config with all hooks", () => {
    const plugin = modularPackPlugin();
    expect(plugin.name).toBe("vite-plugin-modular-pack");
    expect(plugin.enforce).toBe("pre");
    expect(typeof plugin.config).toBe("function");
    expect(typeof plugin.closeBundle).toBe("function");
  });

  it("should configure build.lib and external dependencies aligned with lianhanlin-modular", async () => {
    const entryFile = ".test-modular-entry.ts";
    const outDir = "dist-test-plugin";

    const plugin = modularPackPlugin({
      modulesPath: "src/modules",
      entryFile,
      outDir,
    });

    const mockViteConfig: any = {
      root: tmpDir,
      build: {},
    };

    // Run config hook
    await (plugin.config as Function)(mockViteConfig, { command: "build", mode: "production" });

    // 1. Verify build.lib configuration
    expect(mockViteConfig.build.lib).toBeDefined();
    expect(mockViteConfig.build.lib.entry).toBe(path.resolve(tmpDir, entryFile));
    expect(mockViteConfig.build.lib.formats).toEqual(["es"]);
    expect(mockViteConfig.build.lib.fileName()).toBe("index.js");
    expect(mockViteConfig.build.outDir).toBe(outDir);
    expect(mockViteConfig.build.emptyOutDir).toBe(true);

    // 2. Verify external resolution
    const externalFn = mockViteConfig.build.rollupOptions.external;
    expect(typeof externalFn).toBe("function");
    expect(externalFn("lodash-es")).toBe(true);
    expect(externalFn("lodash-es/camelCase")).toBe(true);
    expect(externalFn("./local-file")).toBe(false);

    // 3. Verify entry file generation on disk
    const entryContent = await fs.readFile(path.resolve(tmpDir, entryFile), "utf-8");
    expect(entryContent).toContain("export const modules = [");
    expect(entryContent).toContain("/math/add");
    expect(entryContent).toContain("/util/greet");

    // 4. Verify closeBundle generates index.d.ts and package.json
    await fs.mkdir(path.resolve(tmpDir, outDir), { recursive: true });
    await (plugin.closeBundle as Function)();

    const dtsContent = await fs.readFile(path.resolve(tmpDir, outDir, "index.d.ts"), "utf-8");
    expect(dtsContent).toContain("interface ModuleMap");
    expect(dtsContent).toContain("interface ModularContainer");
    expect(dtsContent).toContain("/math/add");

    const pkgContent = JSON.parse(await fs.readFile(path.resolve(tmpDir, outDir, "package.json"), "utf-8"));
    expect(pkgContent.name).toBe("test-pack-pkg");
    expect(pkgContent.main).toBe("./index.js");
    expect(pkgContent.types).toBe("./index.d.ts");
  });

  it("should execute actual Vite build and output compiled registry index.js", async () => {
    const outDir = path.resolve(tmpDir, "dist-plugin");
    const plugin = modularPackPlugin({
      modulesPath: "src/modules",
      outDir: "dist-plugin",
    });

    await build({
      root: tmpDir,
      logLevel: "silent",
      plugins: [plugin],
    });

    // Check that index.js was bundled into outDir
    const indexJsPath = path.join(outDir, "index.js");
    const jsExists = await fs.access(indexJsPath).then(() => true).catch(() => false);
    expect(jsExists).toBe(true);

    const jsContent = await fs.readFile(indexJsPath, "utf-8");
    expect(jsContent).toContain("modules");

    // Check index.d.ts
    const dtsPath = path.join(outDir, "index.d.ts");
    const dtsExists = await fs.access(dtsPath).then(() => true).catch(() => false);
    expect(dtsExists).toBe(true);
  });
});
