import path from "node:path"
import { fileURLToPath } from "node:url"

import { loadCoreModule } from "./module-loader.mjs"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)

export async function validateAgentHtmlSource(source, root = packageRoot) {
  const sanitizeAgentHtml = await loadSanitizeAgentHtml(root)
  const result = sanitizeAgentHtml(source)

  return { diagnostics: result.diagnostics, document: result.document }
}

export function validateRenderConfig(config, values) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false
  }

  return (
    Object.keys(config).every((key) => key in values) &&
    Object.entries(values).every(
      ([key, allowedValues]) =>
        typeof config[key] === "string" && allowedValues.includes(config[key]),
    )
  )
}

async function loadSanitizeAgentHtml(root) {
  const module = await loadCoreModule(root)

  if (typeof module.sanitizeAgentHtml !== "function") {
    throw new Error("Cannot load sanitizeAgentHtml from canonical parser.")
  }

  return module.sanitizeAgentHtml
}
