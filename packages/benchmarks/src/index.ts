import { bench, run } from "mitata";
import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";

// 生成模拟图谱的辅助函数
const generateMockGraph = (size: number) => {
  const modules: { key: string, module: import("@path-ioc/core").IOCModule }[] = [];
  for (let i = 0; i < size; i++) {
    const deps = i > 0 ? [`/module${Math.floor(Math.random() * i)}`] : [];
    modules.push({
      key: `/module${i}`,
      module: {
        main: () => `instance_${i}`,
        dependencies: deps
      }
    });
  }
  return modules;
};

const smallGraph = generateMockGraph(50);
const mediumGraph = generateMockGraph(500);
const largeGraph = generateMockGraph(2000);

bench("compileModuleGraph (50 nodes)", () => {
  compileModuleGraph(smallGraph);
});

bench("compileModuleGraph (500 nodes)", () => {
  compileModuleGraph(mediumGraph);
});

bench("compileModuleGraph (2000 nodes)", () => {
  compileModuleGraph(largeGraph);
});

const smallCompiled = compileModuleGraph(smallGraph);
const mediumCompiled = compileModuleGraph(mediumGraph);
const largeCompiled = compileModuleGraph(largeGraph);

bench("instantiateModuleContainer (50 nodes)", async () => {
  await instantiateModuleContainer(smallCompiled, {});
});

bench("instantiateModuleContainer (500 nodes)", async () => {
  await instantiateModuleContainer(mediumCompiled, {});
});

bench("instantiateModuleContainer (2000 nodes)", async () => {
  await instantiateModuleContainer(largeCompiled, {});
});

await run();
