type ExtractModule<ContainerType, M extends string> = ContainerType[Extract<
  keyof ContainerType,
  M
>];

type EntityName = ExtractModule<ModularContainer, `/entities/${string}`>;

export const dependencies = (allNames: string[]) =>
  allNames.filter((name) => name.startsWith("/entities/"));

export const main = (container: ModularContainer, allNames: string[]) => {
  const entityNames = allNames.filter((name) => name.startsWith("/entities/"));
  const schemas: EntityName[] = entityNames.map(
    (name) => container[name as keyof ModularContainer] as EntityName,
  );
  console.log(
    `[ORM] Synced Schemas for ${schemas.length} entities:`,
    schemas.map((s) => (s as { tableName: string }).tableName), // TS can't guarantee every entity has tableName statically without further generic bounds, but the EntityName union is strongly typed.
  );
  return { schemas };
};
