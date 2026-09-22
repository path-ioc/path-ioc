import type { CompiledModuleGraph, IOCModule } from "@path-ioc/core";

/**
 * 子图提取器 (Subgraph Extraction)
 * 基于一个或多个入口点，在已编译的依赖图中顺藤摸瓜提取出所有正向依赖模块。
 *
 * 核心原理：基于 resolvedDepsMap 深度优先遍历所有正向依赖，极速交集计算，
 * 返回提纯后的精简子图 Raw Modules 列表。
 *
 * @param graph - 全量编译后的静态依赖图
 * @param entryPoints - 入口点列表（支持 fullName 如 "/page/A" 或 shortName 如 "A"）
 * @returns 过滤后的子集 raw modules
 */
export const extractSubModules = (
  graph: CompiledModuleGraph,
  ...entryPoints: string[]
): { key: string; module: IOCModule }[] => {
  const subgraphNames = new Set<string>();
  const queue = new Set<string>();

  for (const entry of entryPoints) {
    let fullName = entry;
    if (!graph.fullNameToModuleMap.has(fullName)) {
      const mapped = graph.moduleDeclarationNames.find(
        (n) => n.endsWith("/" + entry) || n === entry
      );
      if (mapped) fullName = mapped;
      else continue;
    }
    queue.add(fullName);
  }

  while (queue.size > 0) {
    const current = Array.from(queue);
    queue.clear();

    for (const name of current) {
      if (!subgraphNames.has(name)) {
        subgraphNames.add(name);
        const deps = graph.resolvedDepsMap.get(name) || [];
        for (const dep of deps) {
          if (!subgraphNames.has(dep)) {
            queue.add(dep);
          }
        }
      }
    }
  }

  return Array.from(subgraphNames)
    .map((name) => {
      const decl = graph.fullNameToModuleMap.get(name);
      return decl ? { key: name, module: decl.rawModule } : null;
    })
    .filter(Boolean) as { key: string; module: IOCModule }[];
};

