declare module "full-test-app/modular-entry" {
  export const modules: Array<{
    key: string;
    module: {
      main: (
        modularContainer: Record<string, unknown> & { $logs?: string[] },
        moduleDeclarationNames: string[],
      ) => unknown | Promise<unknown>;
      dependencies?: string[] | ((moduleDeclarationNames: string[]) => string[]);
      order?: number;
      skip?: boolean;
    };
  }>;
}
