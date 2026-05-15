import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./packages/ahtml/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["packages/**/*.heavy.test.ts"],
    exclude: configDefaults.exclude,
    testTimeout: 15000,
  },
})
