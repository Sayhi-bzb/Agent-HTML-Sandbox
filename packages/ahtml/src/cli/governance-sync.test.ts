/// <reference types="node" />
// @vitest-environment node

import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

const coreBoundaryEntrypoints = [
  "packages/ahtml/src/cli/schema.mjs",
  "packages/ahtml/src/cli/validate.mjs",
]
const managedRuntimeSourcePaths = [
  "packages/ahtml/src/cli/index.mjs",
  "packages/ahtml/src/cli/runtime-build.mjs",
  "packages/ahtml/src/cli/runtime-paths.mjs",
  "packages/ahtml/src/cli/runtime-status.mjs",
  "packages/ahtml/src/cli/runtime-template.mjs",
]
const forbiddenCoreBoundaryPatterns = [
  /from\s+["']vite["']/,
  /from\s+["']@vitejs\/plugin-react["']/,
  /\bcreateServer\b/,
  /components\/ui/,
  /\btailwind\b/i,
]

describe("code governance sync blocks", () => {
  it("keeps schema and validate on the published core boundary", async () => {
    for (const relativePath of coreBoundaryEntrypoints) {
      const source = await readFile(
        path.join(process.cwd(), relativePath),
        "utf8",
      )

      expect(source).toContain("@agent-html/core")
      expect(source).not.toContain("../config/internal-core-bridge.mjs")
      expect(source).not.toContain("module-loader.mjs")
      expect(source).not.toContain("loadCoreModule")

      for (const pattern of forbiddenCoreBoundaryPatterns) {
        expect(source).not.toMatch(pattern)
      }
    }
  })

  it("keeps managed runtime logic out of project-local scaffold mode", async () => {
    const commandModule = (await import(
      pathToFileURL(
        path.join(
          process.cwd(),
          "packages",
          "ahtml",
          "src",
          "cli",
          "command-contract.mjs",
        ),
      ).href
    )) as {
      readonly commandMetadata: Record<string, { readonly usage: string }>
    }
    const managedRuntimeSource = (
      await Promise.all(
        managedRuntimeSourcePaths.map((relativePath) =>
          readFile(path.join(process.cwd(), relativePath), "utf8"),
        ),
      )
    ).join("\n")

    expect(commandModule.commandMetadata).not.toHaveProperty("init")
    expect(managedRuntimeSource).not.toContain("agent-html.project.json")
    expect(managedRuntimeSource).not.toContain("--local-project")
    expect(managedRuntimeSource).not.toContain("--scaffold")
    expect(managedRuntimeSource).not.toContain("--apply")
    const commandUsage = Object.values(commandModule.commandMetadata)
      .map((definition) => definition.usage)
      .join("\n")

    expect(commandUsage).not.toContain("--template")
    expect(managedRuntimeSource).not.toContain("src/cli/scaffold.mjs")
  })

  it("keeps public docs off the removed init command", async () => {
    const publicDocsPaths = [
      "README.md",
      ".agents/skills/ahtml/SKILL.md",
      ".agents/skills/ahtml/references/install.md",
      ".agents/skills/ahtml/references/debug.md",
    ]
    const publicDocsSource = (
      await Promise.all(
        publicDocsPaths.map((relativePath) =>
          readFile(path.join(process.cwd(), relativePath), "utf8"),
        ),
      )
    ).join("\n")

    expect(publicDocsSource).not.toContain("ahtml init")
    expect(publicDocsSource).not.toContain("init --dry-run")
    expect(publicDocsSource).not.toContain("init --scaffold")
  })

  it("keeps runtime templates outside runtime orchestration modules", async () => {
    const runtimeModuleSource = (
      await Promise.all(
        managedRuntimeSourcePaths.map((relativePath) =>
          readFile(path.join(process.cwd(), relativePath), "utf8"),
        ),
      )
    ).join("\n")

    expect(runtimeModuleSource).not.toContain("const appTsxSource")
    expect(runtimeModuleSource).not.toContain("const stylesSource")
    expect(runtimeModuleSource).not.toContain("function Card(")
    expect(runtimeModuleSource).toContain("runtime-template")
  })
})
