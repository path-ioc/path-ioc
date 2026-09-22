export const dependencies = ["db", "redis", "orderService", "ormAggregator"];

export const main = (container: ModularContainer) => {
  const { db, orderService } = container;
  const order = orderService.createOrder("MacBook Pro M4", 19999);

  console.log("==================================================");
  console.log("🚀 [full-test-app] Core & Unplugin Boot Complete!");
  console.log("Order Result:", order);
  console.log("==================================================");

  const appDiv = document.getElementById("app");
  if (appDiv) {
    appDiv.innerHTML = `<h1>[full-test-app] Path-IoC Running...</h1><p>DB: ${db.type} | Order: ${order.orderId}</p>`;
  }
};
