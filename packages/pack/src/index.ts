import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { camelCase } from "lodash-es";
import JavaScriptObfuscator from "javascript-obfuscator";
import type { Plugin, PluginOption } from "vite";
import dts, { type PluginOptions as DtsPluginOptions } from "vite-plugin-dts";

const execAsync = promisify(exec);

const getDtsPlugin = (): ((options?: DtsPluginOptions) => Plugin | Plugin[]) => {
  return typeof dts === "function" ? dts : (dts as any).default;
};

/**
 * 从可能包含 Glob 表达式的模块路径中提取出静态物理基准目录
 * @example
 * extractBaseDir("src/modules/{common,component}") => "src/modules"
 * extractBaseDir("src/modules") => "src/modules"
 */
export function extractBaseDir(pattern: string): string {
  const match = pattern.match(/^([^{*?[]+)/);
  const rawPrefix = match ? match[1] : pattern;
  return rawPrefix.replace(/\/+$/, "");
}

export type ModularPackPluginItem = Pick<Plugin, "name" | "enforce"> & {
  apply?: "build" | "serve";
  config?: (config: any, env: any) => any;
  closeBundle?: () => Promise<void> | void;
};
export type ModularPackPlugin = ModularPackPluginItem | ModularPackPluginItem[];

export interface PackPluginOptions {
  /**
   * Root directory or glob brace pattern to scan for modules containing index.ts or index.tsx.
   * e.g. "src/modules" or "src/modules/{common,component,page}"
   * @default "src/modules"
   */
  modulesPath?: string;

  /**
   * Destination path for the physical entry file.
   * @default ".modular-plugin-entry.ts"
   */
  entryFile?: string;

  /**
   * Output directory for the packaged library bundle.
   * @default "dist-plugin"
   */
  outDir?: string;

  /**
   * Shared type mappings array reference (optional).
   */
  sharedMappings?: string[];

  /**
   * Shared container type mappings array reference (optional).
   */
  sharedContainerMappings?: string[];

  /**
   * Custom tsconfig path for declaration generation.
   * Defaults to tsconfig.app.json (if exists) or tsconfig.json.
   */
  tsconfigPath?: string;

  /**
   * Whether to generate TypeScript declaration files.
   * @default true
   */
  dts?: boolean;
}

export function modularPackPlugin({
  modulesPath = "src/modules",
  entryFile = ".modular-plugin-entry.ts",
  outDir = "dist-plugin",
  sharedMappings = [],
  sharedContainerMappings = [],
  tsconfigPath,
  dts: enableDts = true,
}: PackPluginOptions = {}): ModularPackPlugin {
  let projectRoot: string;
  let entryFilePath: string;
  let outputFullPath: string;
  let savedEntryLines: string[] = [];
  let isDelivered = false;

  const finalizeDelivery = async () => {
    if (isDelivered) return;
    isDelivered = true;

    try {
      await fs.access(outputFullPath);
    } catch {
      return;
    }

    try {
      // 1. 生成并修正交付标准的 index.d.ts
      const dtsPath = path.resolve(outputFullPath, "index.d.ts");
      const generatedEntryName = path.basename(entryFilePath).replace(/\.tsx?$/, ".d.ts");
      const generatedEntryPath = path.resolve(outputFullPath, generatedEntryName);

      try {
        if (fsSync.existsSync(generatedEntryPath) && generatedEntryPath !== dtsPath) {
          await fs.rename(generatedEntryPath, dtsPath);
        }

        let baseDtsContent = "";
        if (fsSync.existsSync(dtsPath)) {
          baseDtsContent = await fs.readFile(dtsPath, "utf-8");
        } else {
          baseDtsContent = savedEntryLines.filter((l) => !l.startsWith("//")).join("\n");
        }

        const globalBlock = [
          `declare global {`,
          `  interface ModuleMap {`,
          ...sharedMappings,
          `  }`,
          ``,
          `  interface ModularContainer {`,
          ...sharedContainerMappings,
          `  }`,
          `}`,
          ``,
          `export {};`,
          ``,
        ].join("\n");

        let dtsContent = baseDtsContent.trimEnd() + "\n\n" + globalBlock;
        if (!dtsContent.includes("@path-ioc/unplugin/virtual")) {
          dtsContent = `/// <reference types="@path-ioc/unplugin/virtual" />\n` + dtsContent;
        }

        await fs.writeFile(dtsPath, dtsContent, "utf-8");
        console.log(`\x1b[32m[ModularPack] Generated declarations: ${path.relative(projectRoot || process.cwd(), dtsPath)}\x1b[0m`);
      } catch (err) {
        console.warn("[ModularPack] Failed to generate index.d.ts:", err);
      }

      // 2. 源码混淆保护
      if (process.env.MODULAR_OBFUSCATE !== "false") {
        try {
          const jsFiles = await searchJsFiles(outputFullPath);
          for (const file of jsFiles) {
            let content = await fs.readFile(file, "utf-8");
            content = content.replace(/process\.env\.NODE_ENV/g, "GLOBAL_VITE_PROCESS_ENV_NODE_ENV");
            content = content.replace(/import\.meta\.env\.MODE/g, "GLOBAL_VITE_IMPORT_META_ENV_MODE");

            const obfuscationResult = JavaScriptObfuscator.obfuscate(content, {
              compact: true,
              controlFlowFlattening: false,
              deadCodeInjection: false,
              identifierNamesGenerator: "hexadecimal",
              renameGlobals: false,
              selfDefending: false,
              stringArray: true,
              stringArrayEncoding: ["base64"],
              transformObjectKeys: true,
              unicodeEscapeSequence: false,
              reservedStrings: ["\\.\\./assets/.*\\.js$", "\\./assets/.*\\.js$"],
            });

            let obfuscatedCode = obfuscationResult.getObfuscatedCode();
            obfuscatedCode = obfuscatedCode.replace(/GLOBAL_VITE_PROCESS_ENV_NODE_ENV/g, "process.env.NODE_ENV");
            obfuscatedCode = obfuscatedCode.replace(/GLOBAL_VITE_IMPORT_META_ENV_MODE/g, "import.meta.env.MODE");

            await fs.writeFile(file, obfuscatedCode, "utf-8");
          }
          if (jsFiles.length > 0) {
            console.log(`\x1b[32m[ModularPack] Obfuscated output JS files successfully!\x1b[0m`);
          }
        } catch (err) {
          console.error("[ModularPack] Error during JS obfuscation:", err);
        }
      }

      // 3. 生成交付专用 package.json
      let pkg: Record<string, any> = {};
      try {
        const pkgPath = path.resolve(projectRoot || process.cwd(), "package.json");
        pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
      } catch {}

      const mergedPeerDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.peerDependencies || {}),
      };

      const deliveryPkg = {
        name: pkg.name || "modular-plugin",
        version: pkg.version || "0.0.1",
        type: "module",
        main: "./index.js",
        module: "./index.js",
        types: "./index.d.ts",
        files: ["index.js", "index.d.ts", "assets", "src"],
        peerDependencies: mergedPeerDeps,
      };

      try {
        await fs.writeFile(
          path.resolve(outputFullPath, "package.json"),
          JSON.stringify(deliveryPkg, null, 2),
          "utf-8"
        );
      } catch (err) {
        console.warn("[ModularPack] Failed to generate delivery package.json:", err);
      }

      // 4. 执行 npm pack 打包交付物
      try {
        await execAsync("npm pack", { cwd: outputFullPath });
        console.log(`\n\x1b[32m[ModularPack] Successfully built and packed vendor package! (Version: ${deliveryPkg.version})\x1b[0m\n`);
      } catch (err) {
        console.warn(`[ModularPack] Failed to execute 'npm pack' in "${outDir}":`, err);
      }
    } finally {
      // 5. 清理临时生成的物理入口文件
      try {
        if (entryFilePath && fsSync.existsSync(entryFilePath)) {
          await fs.rm(entryFilePath, { force: true });
        }
      } catch {}
    }
  };

  const mainPlugin: ModularPackPluginItem = {
    name: "vite-plugin-modular-pack",
    enforce: "pre",

    async config(config) {
      projectRoot = path.resolve(config.root || process.cwd());
      outputFullPath = path.resolve(projectRoot, outDir);

      const baseDir = extractBaseDir(modulesPath);
      const modulesRoot = path.resolve(projectRoot, baseDir);
      entryFilePath = path.resolve(projectRoot, entryFile);
      const entryFileDir = path.dirname(entryFilePath);

      await fs.mkdir(entryFileDir, { recursive: true });

      const subPattern = modulesPath.slice(baseDir.length).replace(/^\/+/, "");
      const scanRoots =
        subPattern && subPattern.startsWith("{") && subPattern.endsWith("}")
          ? subPattern
              .slice(1, -1)
              .split(",")
              .map((s) => path.join(modulesRoot, s.trim()))
          : [subPattern ? path.join(modulesRoot, subPattern) : modulesRoot];

      const absoluteFolders = await searchIndexTsFiles(scanRoots);
      const entryLines: string[] = [];
      const runtimeModulesArray: string[] = [];

      sharedMappings.length = 0;
      sharedContainerMappings.length = 0;

      const moduleFullNames: string[] = [];
      const moduleNames: string[] = [];
      const aliases: string[] = [];
      const shortNameCountMap = new Map<string, string[]>();

      absoluteFolders.forEach((absolutePath, index) => {
        const dirPath = path.dirname(absolutePath);
        let importRelPath = path.relative(entryFileDir, dirPath).replace(/\\/g, "/");
        if (!importRelPath.startsWith(".")) {
          importRelPath = "./" + importRelPath;
        }

        const logicalPath = path.relative(modulesRoot, dirPath).replace(/\\/g, "/");
        const folderName = logicalPath.split("/").pop();
        if (!folderName) return;

        const moduleName = folderName.charAt(0) + camelCase(folderName).slice(1);
        const logicalDir = logicalPath.substring(0, logicalPath.lastIndexOf(folderName));
        const moduleFullName = `/${logicalDir}${moduleName}`;

        const alias = `_Modular_Mod_${index}`;

        entryLines.push(`import * as ${alias} from '${importRelPath}/index';`);
        entryLines.push(`export { ${alias} };`);

        moduleFullNames.push(moduleFullName);
        moduleNames.push(moduleName);
        aliases.push(alias);

        if (!shortNameCountMap.has(moduleName)) {
          shortNameCountMap.set(moduleName, [moduleFullName]);
        } else {
          shortNameCountMap.get(moduleName)!.push(moduleFullName);
        }

        runtimeModulesArray.push(`  { key: "${moduleFullName}", module: ${alias} }`);
      });

      const namePushedSet = new Set<string>();
      moduleFullNames.forEach((moduleFullName, i) => {
        const alias = aliases[i];
        const moduleName = moduleNames[i];

        if (!namePushedSet.has(moduleFullName)) {
          namePushedSet.add(moduleFullName);
          sharedMappings.push(`    "${moduleFullName}": typeof ${alias};`);
          sharedContainerMappings.push(`    "${moduleFullName}": Awaited<ReturnType<typeof ${alias}["main"]>>;`);
        }

        const countList = shortNameCountMap.get(moduleName);
        if (countList && countList.length === 1 && !namePushedSet.has(moduleName)) {
          namePushedSet.add(moduleName);
          sharedMappings.push(`    "${moduleName}": typeof ${alias};`);
          sharedContainerMappings.push(`    "${moduleName}": Awaited<ReturnType<typeof ${alias}["main"]>>;`);
        }
      });

      entryLines.push(`\n// --- Runtime Exports ---`);
      entryLines.push(`export const modules = [`);
      entryLines.push(runtimeModulesArray.join(",\n"));
      entryLines.push(`];\n`);

      savedEntryLines = [...entryLines];

      await fs.writeFile(entryFilePath, entryLines.join("\n"), "utf-8");
      console.log(`\x1b[32m[ModularPack] Generated physical entry file: ${entryFile}\x1b[0m`);

      // 强行拦截并改写 Vite 构建配置为 Library 交付模式 (与 lianhanlin-modular 一致)
      if (!config.build) config.build = {};
      config.build.outDir = outDir;
      config.build.emptyOutDir = true;

      config.build.lib = {
        entry: entryFilePath,
        formats: ["es"],
        fileName: () => "index.js",
      };

      if (!config.build.rollupOptions) config.build.rollupOptions = {};
      if (config.build.rollupOptions.input) {
        delete config.build.rollupOptions.input;
      }

      // 读取 package.json，提取所有依赖作为 external
      let pkg: Record<string, any> = {};
      try {
        const pkgPath = path.resolve(projectRoot, "package.json");
        pkg = JSON.parse(fsSync.readFileSync(pkgPath, "utf-8"));
      } catch {}

      const externalDeps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
      ];

      const existingExternal = config.build.rollupOptions.external;
      config.build.rollupOptions.external = (
        source: string,
        importer: string | undefined,
        isResolved: boolean,
      ) => {
        if (source.includes("?worker")) return false;

        const isExternalDep =
          externalDeps.includes(source) ||
          externalDeps.some((dep) => source.startsWith(`${dep}/`));
        if (isExternalDep) return true;

        if (existingExternal) {
          if (Array.isArray(existingExternal)) {
            if (existingExternal.includes(source)) return true;
          } else if (typeof existingExternal === "function") {
            if (existingExternal(source, importer, isResolved)) return true;
          } else if (existingExternal instanceof RegExp) {
            if (existingExternal.test(source)) return true;
          }
        }
        return false;
      };

      if (!config.build.rollupOptions.output) {
        config.build.rollupOptions.output = {};
      }
      if (Array.isArray(config.build.rollupOptions.output)) {
        config.build.rollupOptions.output.forEach((out: any) => {
          out.entryFileNames = "index.js";
        });
      } else {
        config.build.rollupOptions.output.entryFileNames = "index.js";
      }
    },

    async closeBundle() {
      await finalizeDelivery();
    },
  };

  let dtsPluginInstance: Plugin | Plugin[] | null = null;
  if (enableDts) {
    const dtsFn = getDtsPlugin();
    const resolvedTsconfig = (() => {
      if (tsconfigPath) return tsconfigPath;
      const cwd = process.cwd();
      const appTsconfig = path.resolve(cwd, "tsconfig.app.json");
      if (fsSync.existsSync(appTsconfig)) return appTsconfig;
      const rootTsconfig = path.resolve(cwd, "tsconfig.json");
      if (fsSync.existsSync(rootTsconfig)) return rootTsconfig;
      return undefined;
    })();

    dtsPluginInstance = dtsFn({
      ...(resolvedTsconfig ? { tsconfigPath: resolvedTsconfig } : {}),
      include: [
        entryFile,
        `${modulesPath}/**/*`,
        "src/**/*",
      ],
      entryRoot: ".",
      outDirs: outDir,
      strictOutput: false,
      compilerOptions: {
        composite: false,
        incremental: false,
      },
      afterBuild: async () => {
        await finalizeDelivery();
      },
    });
  }

  if (!dtsPluginInstance) {
    return mainPlugin;
  }

  const dtsPlugins = Array.isArray(dtsPluginInstance) ? dtsPluginInstance : [dtsPluginInstance];
  const pluginGroup = [mainPlugin, ...dtsPlugins] as unknown as ModularPackPlugin;
  Object.assign(pluginGroup, {
    name: mainPlugin.name,
    enforce: mainPlugin.enforce,
    config: mainPlugin.config,
    closeBundle: mainPlugin.closeBundle,
  });

  return pluginGroup;
}

const searchIndexTsFiles = async (rootPaths: string | string[]): Promise<string[]> => {
  const roots = Array.isArray(rootPaths) ? rootPaths : [rootPaths];
  const result: string[] = [];

  for (const rootPath of roots) {
    try {
      await fs.access(rootPath);
    } catch {
      continue;
    }

    const dirsToScan = [rootPath];
    while (dirsToScan.length > 0) {
      const currentDir = dirsToScan.shift();
      if (!currentDir) continue;

      try {
        const entries = await fs.readdir(currentDir);
        for (const entry of entries) {
          if (entry === "node_modules" || entry.startsWith(".")) continue;

          const fullPath = path.join(currentDir, entry);
          const stats = await fs.stat(fullPath);

          if (stats.isDirectory()) {
            dirsToScan.push(fullPath);
          } else if (["index.ts", "index.tsx"].includes(entry)) {
            result.push(fullPath);
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  return result;
};

const searchJsFiles = async (dirPath: string): Promise<string[]> => {
  const result: string[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        result.push(...(await searchJsFiles(fullPath)));
      } else if (/\.(js|cjs|mjs)$/.test(entry.name) && !entry.name.includes("worker")) {
        result.push(fullPath);
      }
    }
  } catch {}
  return result;
};
