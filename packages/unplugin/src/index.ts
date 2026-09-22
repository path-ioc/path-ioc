import path from "node:path";
import fsSync from "node:fs";
import { createUnplugin } from "unplugin";
import type { Plugin as VitePlugin } from "vite";
import { generateTypeDefinitions } from "./generator";
// @ts-ignore
import VirtualModulesPlugin from "webpack-virtual-modules/lib/index.js";

export interface PathIocPluginOptions {
  /**
   * 生成的类型文件的输出目录
   * @default 'types'
   */
  typeFileOutput?: string;
  /**
   * 模块扫描的根目录，相对于项目根目录
   * @default 'src/modules'
   */
  modulesPath?: string;
}

const VIRTUAL_MODULE_ID = "virtual:modular-container";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

export const PathIocPlugin = createUnplugin<PathIocPluginOptions | undefined>((options = {}, meta) => {
  const { typeFileOutput = "types", modulesPath = "src/modules" } = options;
  let projectRoot: string = process.cwd();
  const isWebpackLike = meta.framework === "webpack" || meta.framework === "rspack";

  return {
    name: "unplugin-path-ioc",
    enforce: "pre",
    
    // Webpack / Vite 钩子获取根目录
    vite: {
      configResolved(config: unknown) {
        if (config && typeof config === "object" && "root" in config && typeof config.root === "string") {
          projectRoot = path.resolve(config.root);
        }
      },
      async handleHotUpdate(ctx: unknown) {
        if (ctx && typeof ctx === "object" && "file" in ctx && typeof ctx.file === "string") {
          const file = ctx.file;
          if (file.endsWith(".d.ts") || file.includes("ignore.")) return;
          const relativeModulesPath = path.normalize(modulesPath);
          if (file.includes(path.join(projectRoot, relativeModulesPath))) {
            await generateTypeDefinitions(projectRoot, typeFileOutput, modulesPath);
          }
        }
      }
    },
    webpack(compiler) {
      projectRoot = compiler.context;
      const cleanPath = modulesPath.replace(/\/$/, "");
      const virtualPath = path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
      const absModulesPath = path.resolve(projectRoot, cleanPath).replace(/\\/g, "/");

      const virtualCode = `
        import { compileModuleGraph, instantiateModuleContainer } from '@path-ioc/core';

        const reqContext = require.context('${absModulesPath}', true, /\\/index\\.[jt]sx?$/);
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
      } catch (e) {}

      if (compiler.webpack && compiler.webpack.NormalModuleReplacementPlugin) {
        new compiler.webpack.NormalModuleReplacementPlugin(
          /^virtual:modular-container$/,
          virtualPath
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
    },

    loadInclude(id) {
      const virtualPath = path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
      return id === RESOLVED_VIRTUAL_MODULE_ID || id === virtualPath || id.endsWith(".virtual-modular-container.js") || id.includes("virtual:modular-container");
    },

    load(id) {
      const virtualPath = path.resolve(projectRoot, "node_modules/.virtual-modular-container.js");
      if (id === RESOLVED_VIRTUAL_MODULE_ID || id === virtualPath || id.endsWith(".virtual-modular-container.js") || id.includes("virtual:modular-container")) {
        const cleanPath = modulesPath.replace(/\/$/, "");

        if (isWebpackLike) {
          const absModulesPath = path.resolve(projectRoot, cleanPath).replace(/\\/g, "/");
          return `
            import { compileModuleGraph, instantiateModuleContainer } from '@path-ioc/core';

            const reqContext = require.context('${absModulesPath}', true, /\\/index\\.[jt]sx?$/);
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

          const viteModules = import.meta.glob(['/${cleanPath}/**/index.{ts,tsx}', './${cleanPath}/**/index.{ts,tsx}'], { eager: true });
          export const modules = Object.entries(viteModules).map(([k, iocModule]) => {
            const rawKey = k.replace(/^(\\.\\/|\\/)+/, '').replace('${cleanPath}', '').replace(/^(\\.\\/|\\/)+/, '').replace(/\\/index\\.(ts|tsx)$/, '');
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
    },

    async buildStart() {
      await generateTypeDefinitions(projectRoot, typeFileOutput, modulesPath);
    }
  };
});

// 基础元信息 100% 复用官方 VitePlugin，仅对存在 this 上下文逆变冲突的钩子做精准补丁
export type PathIocVitePlugin = Pick<VitePlugin, "name" | "enforce"> & {
  buildStart?: () => Promise<void> | void;
  resolveId?: (
    source: string,
    importer?: string,
    options?: any
  ) => Promise<string | null | undefined | false | { id: string }> | string | null | undefined | false | { id: string };
  load?: (
    id: string,
    options?: any
  ) => Promise<string | null | undefined | { code: string }> | string | null | undefined | { code: string };
  transform?: (
    code: string,
    id: string
  ) => Promise<string | null | undefined | { code: string }> | string | null | undefined | { code: string };
};

export type PathIocPluginType = Omit<typeof PathIocPlugin, "vite"> & {
  vite: (options?: PathIocPluginOptions) => PathIocVitePlugin;
};

export const vitePlugin = PathIocPlugin.vite as (options?: PathIocPluginOptions) => PathIocVitePlugin;
export const webpackPlugin = PathIocPlugin.webpack;
export const rollupPlugin = PathIocPlugin.rollup;
export const rspackPlugin = PathIocPlugin.rspack;
export const esbuildPlugin = PathIocPlugin.esbuild;
export const rolldownPlugin = PathIocPlugin.rolldown;

const pathIoc: PathIocPluginType = PathIocPlugin as PathIocPluginType;
export default pathIoc;

