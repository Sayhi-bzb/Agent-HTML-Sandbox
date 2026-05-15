/// <reference types="node" />
// @vitest-environment node

import { readFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

const originalTemplateDir = process.env.AHTML_SHADCN_TEMPLATE_DIR
const originalAllowOverride =
  process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE
const originalRegistryUrl = process.env.REGISTRY_URL

afterEach(() => {
  restoreEnv("AHTML_SHADCN_TEMPLATE_DIR", originalTemplateDir)
  restoreEnv(
    "AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE",
    originalAllowOverride,
  )
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
  it("keeps the checked-in runtime element registry template in sync with shared mapping", async () => {
    const root = process.cwd()
    const { createRuntimeElementRegistrySource } =
      await importRuntimeTemplateModule()
    const [
      { getCliSchemaOutput },
      { createRuntimeElementRegistrySpec, createRuntimeRendererKindSpec },
      { createRuntimeRendererKindSource },
    ] =
      await Promise.all([
        import(
          pathToFileURL(
            path.join(root, "packages", "ahtml", "src", "cli", "schema.mjs"),
          ).href,
        ) as Promise<{
          readonly getCliSchemaOutput: (root?: string) => Promise<{
            readonly rendererMapping: unknown
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
              "render-capabilities.mjs",
            ),
          ).href,
        ) as Promise<{
          readonly createRuntimeElementRegistrySpec: (
            rendererMapping: unknown,
          ) => unknown
          readonly createRuntimeRendererKindSpec: () => unknown
        }>,
        importRuntimeTemplateModule(),
      ])
    const schema = await getCliSchemaOutput(root)
    const expected = createRuntimeElementRegistrySource(
      createRuntimeElementRegistrySpec(schema.rendererMapping),
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

    expect(normalizeNewlines(checkedIn).trimEnd()).toBe(
      normalizeNewlines(expected).trimEnd(),
    )

    const expectedKinds = createRuntimeRendererKindSource(
      createRuntimeRendererKindSpec(),
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

    expect(normalizeNewlines(checkedInKinds).trimEnd()).toBe(
      normalizeNewlines(expectedKinds).trimEnd(),
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
    path.join(process.cwd(), "packages", "ahtml", "src", "cli", "runtime-template.mjs"),
  ).href

  return import(moduleUrl) as Promise<{
    readonly createRuntimeElementRegistrySource: (
      registrySpec: unknown,
    ) => string
    readonly createRuntimeRendererKindSource: (kindSpec: unknown) => string
    readonly resolveShadcnTemplateDir: () => string | undefined
  }>
}
