import { defineConfig } from "vite";
import pathIoc from "@path-ioc/unplugin";

export default defineConfig({
  build: {
    target: "esnext",
  },
  plugins: [
    pathIoc.vite({
      modulesPath: "src/modules",
      typeFileOutput: "types",
    }),
  ],
});
