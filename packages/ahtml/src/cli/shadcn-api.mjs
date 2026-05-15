import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { promisify } from "node:util"

import {
  DEFAULT_PRESET_CONFIG,
  PRESET_STYLES,
  isPresetCode,
  isValidPreset,
} from "shadcn/preset"

import { requiredShadcnRuntimeComponents } from "../config/render-capabilities.mjs"

const shadcnRegistry = "@shadcn"
const execFileAsync = promisify(execFile)
export const fallbackShadcnComponents = requiredShadcnRuntimeComponents

export function getDefaultShadcnPreset() {
  return DEFAULT_PRESET_CONFIG.style
}

export function listShadcnPresets() {
  return [...PRESET_STYLES]
}

export function validateShadcnPreset(value) {
  if (PRESET_STYLES.includes(value)) {
    return true
  }

  return isPresetCode(value) && isValidPreset(value)
}

export async function getShadcnComponentCatalog({ allowFallback = true } = {}) {
  try {
    const search = await withLocalShadcnRegistryEnv(async () => {
      const { searchRegistries } = await import("shadcn/registry")

      return searchRegistries([shadcnRegistry], {
        limit: 1000,
        useCache: true,
      })
    })
    const components = search.items
      .filter((item) => item.type === "registry:ui")
      .map((item) => item.name)

    if (components.length === 0) {
      throw new Error("shadcn registry returned no UI components.")
    }

    assertRequiredRuntimeComponentCoverage(components)

    return {
      components,
      source: "shadcn-api",
    }
  } catch (error) {
    if (!allowFallback) {
      throw error
    }

    return {
      components: fallbackShadcnComponents,
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function assertRequiredRuntimeComponentCoverage(components) {
  const availableComponents = new Set(components)
  const missingRequiredComponents = requiredShadcnRuntimeComponents.filter(
    (component) => !availableComponents.has(component),
  )

  if (missingRequiredComponents.length > 0) {
    throw new Error(
      `shadcn registry is missing required runtime components: ${missingRequiredComponents.join(", ")}.`,
    )
  }
}

export async function getShadcnProjectInfo({
  cwd,
  packageRoot = process.cwd(),
}) {
  const packageRequire = createRequire(path.join(packageRoot, "package.json"))
  const shadcnBin = packageRequire.resolve("shadcn")
  const result = await withLocalShadcnRegistryEnv(async () =>
    execFileAsync(
      process.execPath,
      [shadcnBin, "info", "--cwd", cwd, "--json"],
      {
        cwd,
        env: {
          ...process.env,
        },
      },
    ),
  )

  return JSON.parse(result.stdout)
}

async function withLocalShadcnRegistryEnv(run) {
  if (!isLocalRegistryUrl(process.env.REGISTRY_URL)) {
    return run()
  }

  const overrides = {
    ALL_PROXY: "",
    HTTPS_PROXY: "",
    HTTP_PROXY: "",
    NO_PROXY: withLocalNoProxy(process.env.NO_PROXY),
    all_proxy: "",
    http_proxy: "",
    https_proxy: "",
    no_proxy: withLocalNoProxy(process.env.no_proxy),
  }
  const original = Object.fromEntries(
    Object.keys(overrides).map((key) => [key, process.env[key]]),
  )

  Object.assign(process.env, overrides)

  try {
    return await run()
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (typeof value === "undefined") {
        delete process.env[key]
        continue
      }

      process.env[key] = value
    }
  }
}

function withLocalNoProxy(value) {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const localHost of ["127.0.0.1", "localhost"]) {
    if (!entries.includes(localHost)) {
      entries.push(localHost)
    }
  }

  return entries.join(",")
}

function isLocalRegistryUrl(value) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.hostname === "127.0.0.1" || url.hostname === "localhost"
  } catch {
    return false
  }
}
