import {
  CompiledModuleGraph,
  instantiateModuleContainer,
  ModuleDeclaration,
  compileModuleGraph,
} from "@path-ioc/core";
import { extractSubModules } from "./extract";

export interface CreateContainerOptions {
  strategy: "eager" | "demand";
  mode: "async" | "turbo";
}

// 统一辅助函数：回填模块结果并记录实例化标记
const bindModuleResult = (
  targetContainer: Record<string, unknown>,
  instantiated: Set<string>,
  mod: ModuleDeclaration,
  result: unknown
) => {
  targetContainer[mod.fullName] = result;
  if (!targetContainer.hasOwnProperty(mod.name)) {
    targetContainer[mod.name] = result;
  }
  instantiated.add(mod.fullName);
  instantiated.add(mod.name);
};

// 统一辅助函数：按名称查找 ModuleDeclaration
const findModuleDecl = (
  graph: CompiledModuleGraph,
  prop: string
): ModuleDeclaration | undefined => {
  if (graph.fullNameToModuleMap.has(prop)) {
    return graph.fullNameToModuleMap.get(prop);
  }
  const fullName = graph.moduleDeclarationNames.find(
    (n) => n.endsWith("/" + prop) || n === prop
  );
  return fullName ? graph.fullNameToModuleMap.get(fullName) : undefined;
};

// 统一辅助函数：Turbo 模式下基于触达点计算子图并按拓扑纯同步求值
const resolveTurboSync = (
  graph: CompiledModuleGraph,
  targetContainer: Record<string, unknown>,
  instantiated: Set<string>,
  containerProxy: Record<string, unknown>,
  prop: string
) => {
  const decl = findModuleDecl(graph, prop);
  if (!decl || decl.skip) return undefined;
  if (instantiated.has(decl.fullName)) return targetContainer[decl.fullName];

  // 1. 基于触达点提取子图模块
  const subModules = extractSubModules(graph, decl.fullName);
  const uninitSubModules = subModules.filter((m) => !instantiated.has(m.key));

  if (uninitSubModules.length > 0) {
    // 2. 编译子图并按拓扑顺序纯同步求值
    const subGraph = compileModuleGraph(subModules);
    for (const m of subGraph.sortedDeclarations) {
      if (instantiated.has(m.fullName) || m.skip) continue;

      const result = m.main(containerProxy, graph.moduleDeclarationNames);
      if (result instanceof Promise) {
        throw new Error(
          `[Turbo Mode] Async module '${m.fullName}' is not supported in turbo mode. Use async mode instead.`
        );
      }
      bindModuleResult(targetContainer, instantiated, m, result);
    }
  }

  return targetContainer[decl.fullName];
};

// =========================================================================
// 模式 1: strategy: "eager" + mode: "async" (全量异步预热，同步返回容器并挂载 $ready)
// =========================================================================
const createAsyncEagerContainer = (graph: CompiledModuleGraph) => {
  const targetContainer: Record<string, unknown> = { $logs: [] };
  const readyPromise = instantiateModuleContainer(graph, targetContainer).then(
    () => {}
  );
  
  Object.defineProperty(targetContainer, "$ready", {
    value: readyPromise,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return targetContainer;
};

// =========================================================================
// 模式 2: strategy: "demand" + mode: "async" (按需异步子图 + 严格单点并发熔断)
// =========================================================================
const createAsyncDemandContainer = (graph: CompiledModuleGraph) => {
  const targetContainer: Record<string, unknown> = { $logs: [] };
  const instantiated = new Set<string>();
  let activeInitPromise: Promise<void> | null = null;
  let activeInitModuleName: string | null = null;

  const loadSubgraph = async (prop: string): Promise<void> => {
    const decl = findModuleDecl(graph, prop);
    if (!decl) return;

    const fullName = decl.fullName;
    if (instantiated.has(fullName)) return;

    // 🛡️ 严格单点并发熔断防护：若前一个异步子图初始化尚未完成，直接当场报错熔断！
    if (activeInitPromise) {
      throw new Error(
        `[Path-IoC Error] Concurrent subgraph initialization detected! ` +
          `Cannot access '${prop}' while '${activeInitModuleName}' is still initializing. ` +
          `Ensure 'await container.${activeInitModuleName}' completes before accessing another module in demand+async mode.`
      );
    }

    activeInitModuleName = prop;
    activeInitPromise = (async () => {
      const subModules = extractSubModules(graph, fullName);
      const uninitSubModules = subModules.filter(
        (m) => !instantiated.has(m.key)
      );

      if (uninitSubModules.length > 0) {
        const subGraph = compileModuleGraph(subModules);
        await instantiateModuleContainer(subGraph, targetContainer);
        for (const m of subGraph.sortedDeclarations) {
          instantiated.add(m.fullName);
          instantiated.add(m.name);
        }
      }
    })();

    try {
      await activeInitPromise;
    } finally {
      activeInitPromise = null;
      activeInitModuleName = null;
    }
  };

  return new Proxy(targetContainer, {
    get(targetObj, prop) {
      if (typeof prop !== "string") return Reflect.get(targetObj, prop);
      if (targetObj.hasOwnProperty(prop)) return Reflect.get(targetObj, prop);
      const loadPromise = loadSubgraph(prop);
      return loadPromise.then(() => Reflect.get(targetObj, prop));
    },
  });
};

// =========================================================================
// 模式 3: strategy: "eager" + mode: "turbo" (全量纯同步：等同纯同步 Core)
// =========================================================================
const createTurboEagerContainer = (graph: CompiledModuleGraph) => {
  const targetContainer: Record<string, unknown> = { $logs: [] };
  const instantiated = new Set<string>();

  const containerProxy: Record<string, unknown> = new Proxy(targetContainer, {
    get(targetObj, prop) {
      if (typeof prop === "string" && !targetObj.hasOwnProperty(prop)) {
        return resolveTurboSync(
          graph,
          targetContainer,
          instantiated,
          containerProxy,
          prop
        );
      }
      return Reflect.get(targetObj, prop);
    },
  });

  // 启动时按排序好的全量拓扑纯同步求值完成预热
  for (const m of graph.sortedDeclarations) {
    if (!m.skip && !instantiated.has(m.fullName)) {
      const result = m.main(containerProxy, graph.moduleDeclarationNames);
      if (result instanceof Promise) {
        throw new Error(
          `[Turbo Mode] Async module '${m.fullName}' is not supported in turbo mode. Use async mode instead.`
        );
      }
      bindModuleResult(targetContainer, instantiated, m, result);
    }
  }

  return containerProxy;
};

// =========================================================================
// 模式 4: strategy: "demand" + mode: "turbo" (按需纯同步直通：零 Promise 延迟)
// =========================================================================
const createTurboDemandContainer = (graph: CompiledModuleGraph) => {
  const targetContainer: Record<string, unknown> = { $logs: [] };
  const instantiated = new Set<string>();

  const containerProxy: Record<string, unknown> = new Proxy(targetContainer, {
    get(targetObj, prop) {
      if (typeof prop === "string" && !targetObj.hasOwnProperty(prop)) {
        return resolveTurboSync(
          graph,
          targetContainer,
          instantiated,
          containerProxy,
          prop
        );
      }
      return Reflect.get(targetObj, prop);
    },
  });

  return containerProxy;
};

// =========================================================================
// 统一分发器 (Dispatcher) - 100% 同步返回 Container 句柄！
// =========================================================================
export const createContainer = (
  graph: CompiledModuleGraph,
  options: CreateContainerOptions
) => {
  const { strategy, mode } = options;

  if (strategy === "eager" && mode === "async") {
    return createAsyncEagerContainer(graph);
  }
  if (strategy === "demand" && mode === "async") {
    return createAsyncDemandContainer(graph);
  }
  if (strategy === "eager" && mode === "turbo") {
    return createTurboEagerContainer(graph);
  }
  if (strategy === "demand" && mode === "turbo") {
    return createTurboDemandContainer(graph);
  }

  throw new Error(
    `[Path-IoC Container Error] Invalid container options: strategy='${strategy}', mode='${mode}'.`
  );
};

