import {
  compileModuleGraph,
  instantiateModuleContainer,
  IOCModule,
} from "./graph";

// --- 重新导出底层图计算的核心类型与函数，保持 100% API 兼容与高并发优化能力 ---
export {
  compileModuleGraph,
  instantiateModuleContainer,
} from "./graph";
export type {
  IOCModule,
  CompiledModuleGraph,
  ModuleDeclaration,
} from "./graph";

/**
 * 无锁反应式模块化初始化函数 (兼容包壳)。
 * 底层逻辑已拆分为 compileModuleGraph (静态图纯同步编译) 与 instantiateModuleContainer (动态实例填充)。
 *
 * @param modules - 模块加载器列表，每个包含 key 和 getter
 * @param modularContainer - 依赖查找与拓扑解构容器 (ModularContainer)
 */
export const initialize = async (
  modules: { key: string; module: IOCModule }[],
  modularContainer: Record<string, unknown> & { $logs?: string[] },
): Promise<void> => {
  // 1. 编译模块依赖图（纯同步纳秒级运行）
  const compiledGraph = compileModuleGraph(modules);

  // 2. 动态填充容器实例（按拓扑顺序调度模块 main 执行）
  await instantiateModuleContainer(compiledGraph, modularContainer);
};
