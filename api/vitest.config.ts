import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  plugins: [
    {
      // The API uses NodeNext-style explicit ".js" extensions in TS source.
      // Map relative "./x.js" imports to the real "./x.ts" file for Vitest.
      name: "resolve-ts-from-js",
      enforce: "pre",
      resolveId(source, importer) {
        if (importer && source.startsWith(".") && source.endsWith(".js")) {
          const candidate = resolve(dirname(importer), source).replace(
            /\.js$/,
            ".ts",
          );
          if (existsSync(candidate)) {
            return candidate;
          }
        }
        return null;
      },
    },
  ],
});
