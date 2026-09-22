import { compileModuleGraph } from "@path-ioc/core";
import { createContainer } from "@path-ioc/container";

console.log("==================================================");
console.log("🚀 [playground/container-test-app] Extension Modes & Edge Case Fail-Fast Test");
console.log("==================================================");

// --- 正常模块声明 ---
const dbModule = {
  main: async () => {
    await new Promise((res) => setTimeout(res, 20));
    return { name: "PostgreSQL" };
  },
};

const userServiceModule = {
  main: () => ({ name: "UserService" }),
};

const orderServiceModule = {
  dependencies: ["user", "/infra/db"],
  main: (container: any) => ({
    orderId: "ORD_CONTAINER_888",
    db: container.db,
    user: container.user,
  }),
};

const modules = [
  { key: "/infra/db", module: dbModule },
  { key: "/services/user", module: userServiceModule },
  { key: "/services/order", module: orderServiceModule },
];

const compiledGraph = compileModuleGraph(modules);

// --- 测试 1: Demand Proxy 模式按需延迟求值 ---
async function testDemandMode() {
  console.log("\n[Test 1] Container Demand Proxy Mode:");
  const demandContainer: any = createContainer(compiledGraph, { strategy: "demand", mode: "async" });
  console.log("👉 Triggering lazy-load for 'order'...");
  const result = await demandContainer.order;
  console.log("✅ Demand Container Order Result:", result);
}

// --- 测试 2: Turbo 模式 Fail-Fast 异常强校验 ---
function testTurboModeFailFast() {
  console.log("\n[Test 2] Container Turbo Mode Fail-Fast Error Catch:");
  try {
    createContainer(compiledGraph, { strategy: "eager", mode: "turbo" });
    console.error("❌ Turbo mode should have thrown for async db module!");
  } catch (e: any) {
    console.log("✅ Expected Turbo Fail-Fast Error Caught:", e.message);
  }
}

// --- 测试 3: 边缘异常 1 —— 循环依赖拦截 ---
function testCycleDetectionFailFast() {
  console.log("\n[Test 3] Edge Case Fail-Fast: Circular Dependency Catch:");
  const cycleModules = [
    { key: "/modA", module: { dependencies: ["modB"], main: () => {} } },
    { key: "/modB", module: { dependencies: ["modA"], main: () => {} } },
  ];
  try {
    compileModuleGraph(cycleModules);
    console.error("❌ Cycle detection should have thrown!");
  } catch (e: any) {
    console.log("✅ Expected Cycle Error Caught:", e.message);
  }
}

// --- 测试 4: 边缘异常 2 —— 缺失 main 函数非法模块拦截 ---
function testMissingMainFailFast() {
  console.log("\n[Test 4] Edge Case Fail-Fast: Missing 'main' Function Catch:");
  const invalidModules = [
    { key: "/badModule", module: { default: { main: () => {} } } as any },
  ];
  try {
    compileModuleGraph(invalidModules);
    console.error("❌ Missing main should have thrown!");
  } catch (e: any) {
    console.log("✅ Expected Invalid Module Error Caught:", e.message);
  }
}

async function run() {
  await testDemandMode();
  testTurboModeFailFast();
  testCycleDetectionFailFast();
  testMissingMainFailFast();
  console.log("\n==================================================");
  console.log("🎉 All Container & Edge Case Tests Passed!");
  console.log("==================================================");
}

run();
