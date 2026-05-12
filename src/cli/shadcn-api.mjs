import {
  DEFAULT_PRESET_CONFIG,
  PRESET_STYLES,
  isPresetCode,
  isValidPreset,
} from "shadcn/preset"
import { searchRegistries } from "shadcn/registry"

const shadcnRegistry = "@shadcn"
export const fallbackShadcnComponents = ["card"]

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
    const search = await searchRegistries([shadcnRegistry], {
      limit: 1000,
      useCache: true,
    })
    const components = search.items
      .filter((item) => item.type === "registry:ui")
      .map((item) => item.name)

    if (components.length === 0) {
      throw new Error("shadcn registry returned no UI components.")
    }

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
