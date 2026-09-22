export const dependencies = ["db", "orderService", "payment"];

export const main = (container: ModularContainer) => {
  const { db, orderService, payment } = container;
  const remoteOrder = orderService.createOrder("iPhone 16 Pro", 9999);
  const localPayment = payment.processPayment("ORD_123", 9999);

  console.log("==================================================");
  console.log("🚀 [modules-merge-test-app] Cross-App Topology Merged Successfully!");
  console.log("Remote DB:", db.type);
  console.log("Remote OrderService Result:", remoteOrder);
  console.log("Local Payment Result:", localPayment);
  console.log("==================================================");

  const appDiv = document.getElementById("app");
  if (appDiv) {
    appDiv.innerHTML = `
      <h1>[modules-merge-test-app] Cross-App Topology Merged!</h1>
      <p><b>Remote DB</b>: ${db.type} | <b>Remote Order</b>: ${remoteOrder.orderId}</p>
      <p><b>Local Payment</b>: ${localPayment.paymentId} (${localPayment.status})</p>
    `;
  }
};
