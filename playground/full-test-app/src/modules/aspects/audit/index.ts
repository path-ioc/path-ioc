export const main = (container: ModularContainer) => {
  const target = container.orderService;
  if (!target) return;

  const originalCreateOrder = target.createOrder;
  target.createOrder = function (item: string, amount: number) {
    console.log(`[Audit Aspect] Intercepted createOrder for: ${item}, amount: ${amount}`);
    return originalCreateOrder.call(this, item, amount);
  };
};
