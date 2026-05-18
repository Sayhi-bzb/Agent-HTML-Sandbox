import { sanitizeAgentHtml } from "../config/internal-core-bridge.mjs"
import { createStyleProfileResolver } from "./style-profile-storage.mjs"

export async function validateAgentHtmlSource(source, runtimeContext) {
  const resolveStyleProfileReference = await loadStyleProfileResolver(
    runtimeContext,
  )
  const result = sanitizeAgentHtml(source, {
    resolveStyleProfileReference,
  })

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

async function loadStyleProfileResolver(runtimeContext) {
  if (!isRuntimePaths(runtimeContext)) {
    return undefined
  }

  return createStyleProfileResolver(runtimeContext)
}

function isRuntimePaths(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.userStyleProfilesDir === "string"
  )
}
