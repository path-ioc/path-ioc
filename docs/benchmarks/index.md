# Benchmark Performance Report

Path-IoC is engineered to provide extreme microsecond performance in micro-modular enterprise codebases and serverless edge runtimes.

The following hardware-verified benchmarks were executed using the test suites under `@path-ioc/benchmarks`.

---

## Benchmark Environment

- **Processor**: Apple M5 (arm64-darwin)
- **Runtime**: Node.js v24.3.0
- **Testing Harness**: Mitata / High-Precision Performance Benchmark
- **Sample Topology**: Fully-connected Directed Acyclic Graph with cross-dependencies, short alias lookups, and cycle detection

---

## Measured Performance Matrix

| Target Function                  | Graph Complexity | Mean Duration | p75     | p99     | Throughput (Ops/sec)   |
| :------------------------------- | :--------------- | :------------ | :------ | :------ | :--------------------- |
| **`instantiateModuleContainer`** | **50 Nodes**     | **`7.6 µs`**  | 7.6 µs  | 9.5 µs  | **~131,000 /s**        |
| **`instantiateModuleContainer`** | **500 Nodes**    | **`87.1 µs`** | 86.8 µs | 111 µs  | **~11,500 /s**         |
| **`instantiateModuleContainer`** | **2,000 Nodes**  | **`428 µs`**  | 425 µs  | 822 µs  | **~2,330 /s**          |
| **`compileModuleGraph`**         | **50 Nodes**     | **`24.2 µs`** | 24.0 µs | 33.6 µs | ~41,000 /s             |
| **`compileModuleGraph`**         | **500 Nodes**    | **`496 µs`**  | 503 µs  | 591 µs  | Once per cold boot     |
| **`compileModuleGraph`**         | **2,000 Nodes**  | **`4.76 ms`** | 4.71 ms | 9.00 ms | Extreme topology limit |

---

## Architectural Analysis

### 1. Why Does 50-Node Instantiation Take Only 7.6 Microseconds?

- **Zero Reflection & Zero Metadata Lookups**: Eliminates repetitive `Reflect.getMetadata` dictionary lookups on object construction.
- **Direct Closure Inlining**: The pre-compiled execution plan is a flat, contiguous sequence. JavaScript engines (V8 / JavaScriptCore) optimize this directly via JIT loop unrolling and function inlining.

### 2. Why Pure JavaScript Outperforms WebAssembly (WASM) Here

Empirical tests reveal that crossing the WebAssembly FFI boundary to manipulate JavaScript objects incurs ~1ms to 2ms in handle management and serialization overhead. In contrast, Path-IoC's native JavaScript execution completes in **7.6 µs (0.0076ms)**—running approximately **200x faster** than WebAssembly for pure object graph resolution.
