/// <reference types="node" />
// @vitest-environment node

import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

import { GENERATED_COMPONENT_SCHEMA_FACTS } from "../engine/component-schema"

type CliContractModule = {
  readonly cliDefaults: {
    readonly shadcnComponents: readonly string[]
  }
}

const coreLoaderEntrypoints = ["src/cli/schema.mjs", "src/cli/validate.mjs"]

const coreModuleLoaderPath = "src/cli/module-loader.mjs"
const forbiddenCoreLoaderBoundaryPatterns = [
  /from\s+["']vite["']/,
  /from\s+["']@vitejs\/plugin-react["']/,
  /\bcreateServer\b/,
  /components\/ui/,
  /\btailwind\b/i,
]

describe("code governance sync blocks", () => {
  it("keeps CLI shadcn setup requirements synchronized with generated introspection", async () => {
    const { cliDefaults } = (await import(
      pathToFileURL(path.join(process.cwd(), "src", "config", "defaults.mjs"))
        .href
    )) as CliContractModule
    const introspectedRegistryNames = GENERATED_COMPONENT_SCHEMA_FACTS.map(
      (item) => item.registryName,
    ).sort()

    expect([...cliDefaults.shadcnComponents].sort()).toEqual(
      introspectedRegistryNames,
    )
  })

  it("keeps schema and validate CLI loaders on the core boundary", async () => {
    for (const relativePath of coreLoaderEntrypoints) {
      const source = await readFile(
        path.join(process.cwd(), relativePath),
        "utf8",
      )

      expect(source).toContain("module-loader.mjs")
      expect(source).toContain("loadCoreModule")

      for (const pattern of forbiddenCoreLoaderBoundaryPatterns) {
        expect(source).not.toMatch(pattern)
      }
    }

    const loaderSource = await readFile(
      path.join(process.cwd(), coreModuleLoaderPath),
      "utf8",
    )

    expect(loaderSource).toContain("src/engine/core.ts")
  })
})
