# @path-ioc/benchmarks

High-precision hardware-verified benchmark suites for Path-IoC DAG compilation and container instantiation algorithms.

---

## Benchmark Design & Methodology

This package measures the physical performance boundaries of Path-IoC using [Mitata](https://github.com/v8/mitata), an ultra-low-overhead JavaScript benchmarking harness.

### Test Scenarios
1. **`compileModuleGraph`**:
   - Evaluates Kahn's topological sort, cycle detection via depth-first traversal, and short-alias resolution across Directed Acyclic Graphs of varying sizes (50, 500, and 2,000 nodes).
2. **`instantiateModuleContainer`**:
   - Evaluates pure container assembly duration, simulating per-request container initialization in serverless and Cloudflare Workers environments.

---

## Hardware Baseline

- **Processor**: Apple M5 (arm64-darwin)
- **Node.js**: v24.3.0
- **Harness**: Mitata v0.1.x

---

## Reproduction Guide

From the root of the Monorepo:

```bash
# Run all benchmark suites
pnpm bench
```

Or from this directory:

```bash
cd packages/benchmarks
pnpm run bench
```

---

## Baseline Results Summary

| Target Benchmark | Complexity | Mean Duration | Evaluation |
| :--- | :--- | :--- | :--- |
| `instantiateModuleContainer` | 50 Nodes | **21.2 µs** | Microsecond direct pass; zero request-time latency |
| `compileModuleGraph` | 50 Nodes | **90.8 µs** | Sub-millisecond cycle validation |
| `instantiateModuleContainer` | 500 Nodes | **227 µs** | Negligible cost even at enterprise scale |
| `compileModuleGraph` | 500 Nodes | **1.72 ms** | Executed once per process boot, cached permanently |
| `compileModuleGraph` | 2,000 Nodes | **15.5 ms** | Extreme industrial topology limit |

---

## License

Released under the [MIT License](./LICENSE).  
Copyright © 2026 [Path-IoC Organization](https://github.com/path-ioc).
