export const dependencies = ["db", "orderService"];

export const main = (container: ModularContainer) => {
  return {
    processPayment(orderId: string, amount: number) {
      console.log(`[Cross-App Payment] Processing payment for ${orderId}, amount: $${amount} via ${container.db?.type || 'DB'}`);
      return { paymentId: `PAY_${Date.now()}`, status: "PAID" };
    },
  };
};
