import path from "node:path";
import fs from "node:fs/promises";
import { camelCase } from "lodash-es";
import type { Plugin } from "vite";

// PackPlugin 仅负责打包构建期的物理文件映射，用于微前端或组件库的 Mesh 发版
export interface PackPluginOptions {
  modulesPath?: string;
  entryFile?: string;
  sharedMappings?: string[];
  sharedContainerMappings?: string[];
}

export type ModularPackPlugin = Pick<Plugin, "name" | "enforce" | "config">;

export function modularPackPlugin({
  modulesPath = "src/modules",
  entryFile = "node_modules/.path-ioc/.modular-plugin-entry.ts",
  sharedMappings = [],
  sharedContainerMappings = [],
}: PackPluginOptions = {}): ModularPackPlugin {
  let projectRoot: string;

  return {
    name: "vite-plugin-modular-pack",
    enforce: "pre",

    async config(config) {
      projectRoot = path.resolve(config.root || process.cwd());

      const modulesRoot = path.resolve(projectRoot, modulesPath);
      const entryFilePath = path.resolve(projectRoot, entryFile);
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

      await fs.writeFile(entryFilePath, entryLines.join("\n"), "utf-8");
      console.log(`\x1b[32m[ModularPack] Generated physical entry file: ${entryFile}\x1b[0m`);
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
