import fsSync from "node:fs";
import path from "node:path";
import { createUnplugin } from "unplugin";
import type { Plugin as VitePlugin } from "vite";
import { generateTypeDefinitions } from "./generator";
import { extractBaseDir } from "./utils";

export interface PathIocPluginOptions {
  /**
   * 生成的类型文件的输出目录
   * @default 'types'
   */
  typeFileOutput?: string;
  /**
   * 模块扫描的根目录或 Glob 表达式，相对于项目根目录
   * 支持纯路径或正向大括号白名单，例如：
   * - "src/modules" (默认)
   * - "src/modules/{common,component,page}"
   * @default 'src/modules'
   */
  modulesPath?: string;
}

const VIRTUAL_MODULE_ID = "virtual:modular-container";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

export const PathIocPlugin = createUnplugin<PathIocPluginOptions | undefined>(
  (options = {}, meta) => {
    const { typeFileOutput = "types", modulesPath = "src/modules" } = options;

    if (!/^[^*?[\]{}]+(?:\{[^/{}]+})?$/.test(modulesPath)) {
      throw new Error(
        `[@path-ioc/unplugin] 'modulesPath' syntax is strictly constrained. It must be an exact static path (e.g., 'src/modules') or end with a deterministic brace group (e.g., 'src/modules/{a,b}'). Wildcards (*, ?) or nested/mid-path braces are forbidden.`,
      );
    }

    let projectRoot: string = process.cwd();
    const isWebpackLike = meta.framework === "webpack" || meta.framework === "rspack";

    const baseDir = extractBaseDir(modulesPath);
    const cleanBaseDir = baseDir.replace(/^(\.\/|\/)+/, "").replace(/\/+$/, "");
    const subPattern = modulesPath.slice(baseDir.length).replace(/^\/+/, "");
    let cleanSubPattern = subPattern;
    if (cleanSubPattern.startsWith("{") && cleanSubPattern.endsWith("}")) {
      const inner = cleanSubPattern.slice(1, -1);
      if (!inner.includes(",")) {
        cleanSubPattern = inner;
      }
    }

    const globSub = cleanSubPattern ? `${cleanSubPattern}/**/index.{ts,tsx}` : `**/index.{ts,tsx}`;
    const webpackRegexStr = cleanSubPattern
      ? cleanSubPattern.startsWith("{") && cleanSubPattern.endsWith("}")
        ? `^\\./(${cleanSubPattern
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim())
            .join("|")})/.*\\/index\\.[jt]sx?$`
        : `^\\./${cleanSubPattern}/.*\\/index\\.[jt]sx?$`
      : "/\\/index\\.[jt]sx?$/";

    return {
      name: "unplugin-path-ioc",
      enforce: "pre",

      // Webpack / Vite 钩子获取根目录
      vite: {
        configResolved(config: unknown) {
          if (
            config &&
            typeof config === "object" &&
            "root" in config &&
            typeof config.root === "string"
          ) {
            projectRoot = path.resolve(config.root);
          }
        },
        async handleHotUpdate(ctx: unknown) {
          if (ctx && typeof ctx === "object" && "file" in ctx && typeof ctx.file === "string") {
            const file = ctx.file;
            if (file.endsWith(".d.ts") || file.includes("ignore.")) return;
            const relativeModulesPath = path.normalize(baseDir);
            if (file.includes(path.join(projectRoot, relativeModulesPath))) {
              await generateTypeDefinitions(projectRoot, typeFileOutput, modulesPath);
            }
          }
        },
      },
      webpack(compiler) {
        projectRoot = compiler.context;
        const virtualPath = path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
        const absModulesPath = path.resolve(projectRoot, cleanBaseDir).replace(/\\/g, "/");

        const virtualCode = `
        import { compileModuleGraph, instantiateModuleContainer } from '@path-ioc/core';

        const reqContext = require.context('${absModulesPath}', true, ${subPattern ? `new RegExp('${webpackRegexStr}')` : `/\\/index\\.[jt]sx?$/`});
        export const modules = reqContext.keys().map((k) => {
          const rawKey = k.replace(/^\\.\\//, '').replace(/\\/index\\.[jt]sx?$/, '');
          return { key: '/' + rawKey, module: reqContext(k) };
        });

        let compiledGraph = null;

        export async function createModularContainer(modularContainer = {}) {
          if (!compiledGraph) {
            compiledGraph = compileModuleGraph(modules);
          }
          await instantiateModuleContainer(compiledGraph, modularContainer);
          return modularContainer;
        }
      `;

        try {
          fsSync.mkdirSync(path.dirname(virtualPath), { recursive: true });
          fsSync.writeFileSync(virtualPath, virtualCode, "utf-8");
        } catch {
          // Ignore
        }

        if (compiler.webpack && compiler.webpack.NormalModuleReplacementPlugin) {
          new compiler.webpack.NormalModuleReplacementPlugin(
            /^virtual:modular-container$/,
            virtualPath,
          ).apply(compiler);
        }
      },

      resolveId(id) {
        if (id === VIRTUAL_MODULE_ID || id.includes("virtual:modular-container")) {
          if (isWebpackLike && projectRoot) {
            return path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
          }
          return RESOLVED_VIRTUAL_MODULE_ID;
        }
        return undefined;
      },

      loadInclude(id) {
        const virtualPath = path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
        return (
          id === RESOLVED_VIRTUAL_MODULE_ID ||
          id === virtualPath ||
          id.endsWith(".virtual-modular-container.js") ||
          id.includes("virtual:modular-container")
        );
      },

      load(id) {
        const virtualPath = path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
        if (
          id === RESOLVED_VIRTUAL_MODULE_ID ||
          id === virtualPath ||
          id.endsWith(".virtual-modular-container.js") ||
          id.includes("virtual:modular-container")
        ) {
          if (isWebpackLike) {
            const absModulesPath = path.resolve(projectRoot, cleanBaseDir).replace(/\\/g, "/");
            return `
            import { compileModuleGraph, instantiateModuleContainer } from '@path-ioc/core';

            const reqContext = require.context('${absModulesPath}', true, ${subPattern ? `new RegExp('${webpackRegexStr}')` : `/\\/index\\.[jt]sx?$/`});
            export const modules = reqContext.keys().map((k) => {
              const rawKey = k.replace(/^\\.\\//, '').replace(/\\/index\\.[jt]sx?$/, '');
              return { key: '/' + rawKey, module: reqContext(k) };
            });

            let compiledGraph = null;

            export async function createModularContainer(modularContainer = {}) {
              if (!compiledGraph) {
                compiledGraph = compileModuleGraph(modules);
              }
              await instantiateModuleContainer(compiledGraph, modularContainer);
              return modularContainer;
            }
          `;
          }

          return `
          import { compileModuleGraph, instantiateModuleContainer } from '@path-ioc/core';

          const viteModules = import.meta.glob(['/${cleanBaseDir}/${globSub}', './${cleanBaseDir}/${globSub}'], { eager: true });
          export const modules = Object.entries(viteModules).map(([k, iocModule]) => {
            const rawKey = k.replace(/^(\\.\\/|\\/)+/, '').replace('${cleanBaseDir}', '').replace(/^(\\.\\/|\\/)+/, '').replace(/\\/index\\.(ts|tsx)$/, '');
            return { key: '/' + rawKey, module: iocModule };
          });

          let compiledGraph = null;

          export async function createModularContainer(modularContainer = {}) {
            if (!compiledGraph) {
              compiledGraph = compileModuleGraph(modules);
            }
            await instantiateModuleContainer(compiledGraph, modularContainer);
            return modularContainer;
          }
        `;
        }
        return undefined;
      },

      async buildStart() {
        await generateTypeDefinitions(projectRoot, typeFileOutput, modulesPath);
      },
    };
  },
);

// 基础元信息 100% 复用官方 VitePlugin，仅对存在 this 上下文逆变冲突的钩子做精准补丁
export type PathIocVitePlugin = Pick<VitePlugin, "name" | "enforce"> & {
  buildStart?: () => Promise<void> | void;
  resolveId?: (
    source: string,
    importer?: string,
    options?: unknown,
  ) =>
    | Promise<string | null | undefined | false | { id: string }>
    | string
    | null
    | undefined
    | false
    | { id: string };
  load?: (
    id: string,
    options?: unknown,
  ) =>
    | Promise<string | null | undefined | { code: string }>
    | string
    | null
    | undefined
    | { code: string };
  transform?: (
    code: string,
    id: string,
  ) =>
    | Promise<string | null | undefined | { code: string }>
    | string
    | null
    | undefined
    | { code: string };
};

export type PathIocPluginType = Omit<typeof PathIocPlugin, "vite"> & {
  vite: (options?: PathIocPluginOptions) => PathIocVitePlugin;
};

export const vitePlugin = PathIocPlugin.vite as (
  options?: PathIocPluginOptions,
) => PathIocVitePlugin;
export const webpackPlugin = PathIocPlugin.webpack;
export const rollupPlugin = PathIocPlugin.rollup;
export const rspackPlugin = PathIocPlugin.rspack;
export const esbuildPlugin = PathIocPlugin.esbuild;
export const rolldownPlugin = PathIocPlugin.rolldown;

const pathIoc: PathIocPluginType = PathIocPlugin as PathIocPluginType;
export default pathIoc;
