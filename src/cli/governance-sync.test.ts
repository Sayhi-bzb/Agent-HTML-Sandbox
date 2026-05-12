/// <reference types="node" />
// @vitest-environment node

import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

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

  it("keeps managed runtime logic out of project-local scaffold mode", async () => {
    const commandModule = (await import(
      pathToFileURL(path.join(process.cwd(), "src", "cli", "commands.mjs")).href
    )) as {
      readonly commandMetadata: Record<string, { readonly usage: string }>
    }
    const cliSource = await readFile(
      path.join(process.cwd(), "src", "cli", "index.mjs"),
      "utf8",
    )
    const runtimeSource = await readFile(
      path.join(process.cwd(), "src", "cli", "runtime.mjs"),
      "utf8",
    )

    expect(commandModule.commandMetadata.init.usage).toBe(
      "ahtml init [--dry-run]",
    )
    expect(`${cliSource}\n${runtimeSource}`).not.toContain(
      "agent-html.project.json",
    )
    expect(`${cliSource}\n${runtimeSource}`).not.toContain("--local-project")
    expect(`${cliSource}\n${runtimeSource}`).not.toContain("--scaffold")
  })
})
