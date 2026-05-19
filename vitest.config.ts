import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./packages/ahtml/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "packages/**/*.test.ts",
      "apps/**/*.test.ts",
      "scripts/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: [...configDefaults.exclude, "packages/**/*.heavy.test.ts"],
    testTimeout: 15000,
  },
})
