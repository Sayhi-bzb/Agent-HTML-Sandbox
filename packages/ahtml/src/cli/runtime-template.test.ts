/// <reference types="node" />
// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest"

// @ts-expect-error runtime-template.mjs is exercised directly in tests.
import { resolveShadcnTemplateDir } from "./runtime-template.mjs"

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
  it("ignores template overrides unless explicitly allowed", () => {
    process.env.AHTML_SHADCN_TEMPLATE_DIR = "fixtures/shadcn-template"
    process.env.REGISTRY_URL = "http://127.0.0.1:4312/r"
    delete process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE

    expect(resolveShadcnTemplateDir()).toBeUndefined()

    process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE = "1"

    expect(resolveShadcnTemplateDir()).toContain("fixtures")
  })

  it("ignores template overrides outside local registry flows", () => {
    process.env.AHTML_SHADCN_TEMPLATE_DIR = "fixtures/shadcn-template"
    process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE = "1"
    process.env.REGISTRY_URL = "https://registry.example.com/r"

    expect(resolveShadcnTemplateDir()).toBeUndefined()
  })
})

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[name]
    return
  }

  process.env[name] = value
}
