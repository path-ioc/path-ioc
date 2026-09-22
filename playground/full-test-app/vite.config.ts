import { defineConfig } from "vite";
import pathIoc from "@path-ioc/unplugin";
import { modularPackPlugin } from "@path-ioc/pack";

export default defineConfig({
  build: {
    target: "esnext",
  },
  plugins: [
    pathIoc.vite({
      modulesPath: "src/modules",
      typeFileOutput: "types",
    }),
    modularPackPlugin({
      modulesPath: "src/modules",
    }),
  ],
});
