export const main = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  console.log("2. [Infra] Redis Status: READY.");
  return { status: "READY" };
};
