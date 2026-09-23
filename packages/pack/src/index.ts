import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { camelCase } from "lodash-es";
import JavaScriptObfuscator from "javascript-obfuscator";
import type { Plugin } from "vite";

const execAsync = promisify(exec);

export interface PackPluginOptions {
  /**
   * Root directory to scan for modules containing index.ts or index.tsx.
   * @default "src/modules"
   */
  modulesPath?: string;

  /**
   * Destination path for the physical entry file.
   * @default "node_modules/.path-ioc/.modular-plugin-entry.ts"
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
}

export function modularPackPlugin({
  modulesPath = "src/modules",
  entryFile = "node_modules/.path-ioc/.modular-plugin-entry.ts",
  outDir = "dist-plugin",
  sharedMappings = [],
  sharedContainerMappings = [],
}: PackPluginOptions = {}): Plugin {
  let projectRoot: string;
  let entryFilePath: string;
  let outputFullPath: string;
  let savedEntryLines: string[] = [];

  return {
    name: "vite-plugin-modular-pack",
    enforce: "pre",

    async config(config) {
      projectRoot = path.resolve(config.root || process.cwd());
      outputFullPath = path.resolve(projectRoot, outDir);

      const modulesRoot = path.resolve(projectRoot, modulesPath);
      entryFilePath = path.resolve(projectRoot, entryFile);
      const entryFileDir = path.dirname(entryFilePath);

      await fs.mkdir(entryFileDir, { recursive: true });

      const absoluteFolders = await searchIndexTsFiles(modulesRoot);
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
        config.build.rollupOptions.output.forEach((out) => {
          out.entryFileNames = "index.js";
        });
      } else {
        config.build.rollupOptions.output.entryFileNames = "index.js";
      }
    },

    async closeBundle() {
      try {
        await fs.access(outputFullPath);
      } catch {
        return;
      }

      // 1. 生成交付标准的 index.d.ts (与 lianhanlin-modular 一致)
      try {
        const dtsPath = path.resolve(outputFullPath, "index.d.ts");
        const dtsContent = [
          `/// <reference types="@path-ioc/unplugin/virtual" />`,
          ...savedEntryLines.filter((l) => !l.startsWith("//")),
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

        await fs.writeFile(dtsPath, dtsContent, "utf-8");
        console.log(`\x1b[32m[ModularPack] Generated declarations: ${path.relative(projectRoot, dtsPath)}\x1b[0m`);
      } catch (err) {
        console.warn("[ModularPack] Failed to generate index.d.ts:", err);
      }

      // 2. 源码混淆保护 (与 lianhanlin-modular 环境变量一致)
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

      // 3. 生成交付专用 package.json (与 lianhanlin-modular 一致)
      let pkg: Record<string, any> = {};
      try {
        const pkgPath = path.resolve(projectRoot, "package.json");
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

      // 4. 执行 npm pack 打包交付物 (与 lianhanlin-modular 一致)
      try {
        await execAsync("npm pack", { cwd: outputFullPath });
        console.log(`\n\x1b[32m[ModularPack] Successfully built and packed vendor package! (Version: ${deliveryPkg.version})\x1b[0m\n`);
      } catch (err) {
        console.warn(`[ModularPack] Failed to execute 'npm pack' in "${outDir}":`, err);
      }
    },
  };
}

const searchIndexTsFiles = async (rootPath: string): Promise<string[]> => {
  try {
    await fs.access(rootPath);
  } catch {
    return [];
  }

  const dirsToScan = [rootPath];
  const result: string[] = [];

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
