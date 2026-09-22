export const dependencies = ["db", "redis"];

export const main = (container: ModularContainer) => {
  return {
    createOrder(item: string, amount: number) {
      const orderId = `ORD_${Date.now()}`;
      return { orderId, item, amount, dbStatus: container.db.status };
    },
  };
};
