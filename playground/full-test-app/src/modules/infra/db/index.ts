export const main = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  console.log("1. [Infra] DB Type: PostgreSQL initialized.");
  return { type: "PostgreSQL", status: "CONNECTED" };
};
