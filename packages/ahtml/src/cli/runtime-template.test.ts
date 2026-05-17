/// <reference types="node" />
// @vitest-environment node

import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import prettier from "prettier"
import { afterEach, describe, expect, it } from "vitest"

import { removeTempDir } from "./cli-test-helpers"

const originalTemplateDir = process.env.AHTML_SHADCN_TEMPLATE_DIR
const originalAllowOverride = process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE
const originalRegistryUrl = process.env.REGISTRY_URL

afterEach(() => {
  restoreEnv("AHTML_SHADCN_TEMPLATE_DIR", originalTemplateDir)
  restoreEnv("AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE", originalAllowOverride)
  restoreEnv("REGISTRY_URL", originalRegistryUrl)
})

describe("runtime template override guard", () => {
  it("ignores template overrides unless explicitly allowed", async () => {
    const { resolveShadcnTemplateDir } = await importRuntimeTemplateModule()
    process.env.AHTML_SHADCN_TEMPLATE_DIR = "fixtures/shadcn-template"
    process.env.REGISTRY_URL = "http://127.0.0.1:4312/r"
    delete process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE

    expect(resolveShadcnTemplateDir()).toBeUndefined()

    process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE = "1"

    expect(resolveShadcnTemplateDir()).toContain("fixtures")
  })

  it("ignores template overrides outside local registry flows", async () => {
    const { resolveShadcnTemplateDir } = await importRuntimeTemplateModule()
    process.env.AHTML_SHADCN_TEMPLATE_DIR = "fixtures/shadcn-template"
    process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE = "1"
    process.env.REGISTRY_URL = "https://registry.example.com/r"

    expect(resolveShadcnTemplateDir()).toBeUndefined()
  })
})

describe("checked-in runtime templates", () => {
  it("rewrites runtime vite configs to an ESM-safe template", async () => {
    const { ensureRuntimeBuildConfig } = await importRuntimeTemplateModule()
    const runtimeDir = await mkdtemp(
      path.join(tmpdir(), "ahtml-runtime-template-"),
    )
    const runtimeViteConfigPath = path.join(runtimeDir, "vite.ahtml.config.mjs")

    try {
      await writeFile(
        path.join(runtimeDir, "vite.config.ts"),
        [
          'import path from "path"',
          'import tailwindcss from "@tailwindcss/vite"',
          'import react from "@vitejs/plugin-react"',
          'import { defineConfig } from "vite"',
          "",
          "export default defineConfig({",
          "  plugins: [react(), tailwindcss()],",
          "  resolve: {",
          "    alias: {",
          '      "@": path.resolve(__dirname, "./src"),',
          "    },",
          "  },",
          "})",
          "",
        ].join("\n"),
      )

      await ensureRuntimeBuildConfig({
        packageRoot: process.cwd(),
        paths: {
          runtimeDir,
          runtimeViteConfigPath,
        },
      })

      const templateConfig = await readFile(
        path.join(runtimeDir, "vite.config.ts"),
        "utf8",
      )
      const ahtmlConfig = await readFile(runtimeViteConfigPath, "utf8")

      expect(templateConfig).toContain(
        "const rootDir = path.dirname(fileURLToPath(import.meta.url))",
      )
      expect(templateConfig).toContain('path.resolve(rootDir, "./src")')
      expect(templateConfig).not.toContain("__dirname")
      expect(ahtmlConfig).toContain("rewriteTemplateRoot")
    } finally {
      await removeTempDir(runtimeDir)
    }
  })

  it("keeps the checked-in runtime element registry template in sync with shared mapping", async () => {
    const root = process.cwd()
    const { createRuntimeElementRegistrySource } =
      await importRuntimeTemplateModule()
    const [
      { getCliSchemaOutput },
      { createRuntimeContract },
      { createRuntimeRendererKindSource },
    ] = await Promise.all([
      import(
        pathToFileURL(
          path.join(root, "packages", "ahtml", "src", "cli", "schema.mjs"),
        ).href
      ) as Promise<{
        readonly getCliSchemaOutput: (root?: string) => Promise<{
          readonly components: readonly { readonly name: string }[]
        }>
      }>,
      import(
        pathToFileURL(
          path.join(
            root,
            "packages",
            "ahtml",
            "src",
            "config",
            "runtime-contract.mjs",
          ),
        ).href
      ) as Promise<{
        readonly createRuntimeContract: (
          components: readonly { readonly name: string }[],
        ) => {
          readonly elementRegistrySpec: unknown
          readonly rendererKindSpec: unknown
        }
      }>,
      importRuntimeTemplateModule(),
    ])
    const schema = await getCliSchemaOutput(root)
    const runtimeContract = createRuntimeContract(schema.components)
    const expected = createRuntimeElementRegistrySource(
      runtimeContract.elementRegistrySpec,
    )
    const checkedIn = await readFile(
      path.join(
        root,
        "packages",
        "ahtml",
        "src",
        "cli",
        "runtime-template",
        "src",
        "renderer",
        "elements.tsx",
      ),
      "utf8",
    )

    const formattedExpected = await prettier.format(expected, {
      parser: "typescript",
      semi: false,
    })
    expect(normalizeNewlines(checkedIn).trimEnd()).toBe(
      normalizeNewlines(formattedExpected).trimEnd(),
    )

    const expectedKinds = createRuntimeRendererKindSource(
      runtimeContract.rendererKindSpec,
    )
    const checkedInKinds = await readFile(
      path.join(
        root,
        "packages",
        "ahtml",
        "src",
        "cli",
        "runtime-template",
        "src",
        "renderer",
        "kinds.ts",
      ),
      "utf8",
    )

    const formattedExpectedKinds = await prettier.format(expectedKinds, {
      parser: "typescript",
      semi: false,
    })
    expect(normalizeNewlines(checkedInKinds).trimEnd()).toBe(
      normalizeNewlines(formattedExpectedKinds).trimEnd(),
    )
  })
})

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

function normalizeNewlines(value: string) {
  return value.replaceAll("\r\n", "\n")
}

async function importRuntimeTemplateModule() {
  const moduleUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "cli",
      "runtime-template.mjs",
    ),
  ).href

  return import(moduleUrl) as Promise<{
    readonly createRuntimeElementRegistrySource: (
      registrySpec: unknown,
    ) => string
    readonly createRuntimeRendererKindSource: (kindSpec: unknown) => string
    readonly ensureRuntimeBuildConfig: (input: {
      readonly packageRoot: string
      readonly paths: {
        readonly runtimeDir: string
        readonly runtimeViteConfigPath: string
      }
    }) => Promise<void>
    readonly resolveShadcnTemplateDir: () => string | undefined
  }>
}
