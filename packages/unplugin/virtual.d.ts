declare module "virtual:modular-container" {
  export const modules: Array<{ key: string; module: any }>;
  export function createModularContainer(
    modularContainer?: ModularContainer
  ): Promise<ModularContainer>;
}
