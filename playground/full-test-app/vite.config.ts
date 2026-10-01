import { modularPackPlugin } from "@path-ioc/pack";
import pathIoc from "@path-ioc/unplugin";
import { defineConfig } from "vite";

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
