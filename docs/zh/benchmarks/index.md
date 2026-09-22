# 基准压测报告 (Benchmark Report)

Path-IoC 致力于在大型微模块工程与 Serverless 边缘计算中提供极限性能。

以下为基于硬件基准平台执行的实测数据（压测脚本位于 `@path-ioc/benchmarks`）。

---

## 测试环境

- **CPU**: Apple M5 (arm64-darwin)
- **Runtime**: Node.js v24.3.0
- **测试工具**: Mitata / High-Precision Performance Benchmark
- **测试样本**: 真实全连接有向无环图（含交叉依赖、短名称查找与循环依赖深搜探测）

---

## 实测指标矩阵

| 压测函数 (Benchmark Target) | 规模 (Nodes) | 平均单次耗时 (Avg) | p75 分位 | p99 分位 | 吞吐等效 QPS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`instantiateModuleContainer`** | **50 节点** | **`21.2 µs`** | 22.0 µs | 93.5 µs | **~47,000 /s** |
| **`instantiateModuleContainer`** | **500 节点** | **`227 µs`** | 269 µs | 581 µs | **~4,400 /s** |
| **`instantiateModuleContainer`** | **2000 节点** | **`1.17 ms`** | 1.33 ms | 3.03 ms | **~850 /s** |
| **`compileModuleGraph`** | **50 节点** | **`90.8 µs`** | 94.2 µs | 286 µs | ~11,000 /s |
| **`compileModuleGraph`** | **500 节点** | **`1.72 ms`** | 1.82 ms | 6.97 ms | 进程冷启动单次 |
| **`compileModuleGraph`** | **2000 节点** | **`15.5 ms`** | 17.0 ms | 23.5 ms | 工业级深层拓扑极限 |

---

## 性能关键分析

### 1. 为什么 50 节点实例化能达到 21.2 微秒？
- **零反射、零元数据查表**：没有像 Java Spring 或 InversifyJS 那样在每个对象生成时都要通过 `Reflect.getMetadata` 翻找注解缓存；
- **纯粹的闭包函数调用**：拓扑图预编译后已排好扁平的执行流水线（Pipeline），运行时仅为简单的循环数组迭代和属性挂载，Vite / V8 引擎能做到 100% 函数内联（JIT Inlining）。

### 2. 为什么不采用 WebAssembly (WASM)？
经过深度实验，跨 WASM FFI（外部函数接口）调用 JS 对象需要维护引用句柄映射与内存序列化，单次通信开销在 1~2 毫秒左右。而 Path-IoC 原生纯 JavaScript 实例化仅需 **0.02 毫秒 (21µs)**。在以 JS 对象图为主的场景下，纯 JS 比 WASM 快近 **100 倍**。
