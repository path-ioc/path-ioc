export const dependencies = (allNames: string[]) =>
  allNames.filter((name) => name.startsWith("/entities/"));

export const main = (container: ModularContainer, allNames: string[]) => {
  const entityNames = allNames.filter((name) => name.startsWith("/entities/"));
  const schemas = entityNames.map((name) => container[name]);
  console.log(`[ORM] Synced Schemas for ${schemas.length} entities:`, schemas.map((s: any) => s.tableName));
  return { schemas };
};
