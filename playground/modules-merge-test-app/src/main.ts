import { compileModuleGraph, instantiateModuleContainer } from "@path-ioc/core";
import { modules as localModules } from "virtual:modular-container";
import { modules as remoteFullAppModules } from "full-test-app/node_modules/.path-ioc/.modular-plugin-entry";

// 遵照 @path-ioc/core 原始设计：传入依赖容器物理对象，严格恪守框架契约
const compiledGraph = compileModuleGraph([...remoteFullAppModules, ...localModules]);
const modularContainer = {};
await instantiateModuleContainer(compiledGraph, modularContainer);
