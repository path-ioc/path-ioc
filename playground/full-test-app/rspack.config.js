import path from "path";
import { fileURLToPath } from "url";
import pathIoc from "@path-ioc/unplugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "production",
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "dist-rspack"),
    filename: "bundle.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: { syntax: "typescript" },
          },
        },
      },
    ],
  },
  plugins: [
    pathIoc.rspack({
      modulesPath: "src/modules",
      typeFileOutput: "types",
    }),
  ],
};
