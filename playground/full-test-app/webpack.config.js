import path from "path";
import { fileURLToPath } from "url";
import pathIoc from "@path-ioc/unplugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "production",
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "dist-webpack"),
    filename: "bundle.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "virtual:modular-container": path.resolve(__dirname, "node_modules/.virtual-modular-container.js"),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "swc-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    pathIoc.webpack({
      modulesPath: "src/modules",
      typeFileOutput: "types",
    }),
  ],
};
