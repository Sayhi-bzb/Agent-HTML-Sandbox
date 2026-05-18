import { sanitizeAgentHtml } from "../config/internal-core-bridge.mjs"
import {
  createStyleProfileResolver,
  readCurrentStyleProfileReference,
  resolveStyleProfileByReference,
} from "./style-profile-storage.mjs"

export async function validateAgentHtmlSource(source, runtimeContext) {
  const renderConfigResolvers = await loadStyleProfileResolvers(
    runtimeContext,
  )
  const normalizedSource = await ensureDefaultStyleRefHeader(
    source,
    runtimeContext,
  )
  const result = sanitizeAgentHtml(normalizedSource, renderConfigResolvers)

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

async function loadStyleProfileResolvers(runtimeContext) {
  if (!isRuntimePaths(runtimeContext)) {
    return undefined
  }

  const resolveStyleProfileReference = await createStyleProfileResolver(
    runtimeContext,
  )
  const currentStyleReference = await readCurrentStyleProfileReference(
    runtimeContext,
  )
  const defaultStyleProfile = await resolveStyleProfileByReference(
    runtimeContext,
    currentStyleReference,
  )

  return {
    resolveStyleProfileReference,
    resolveDefaultStyleProfileReference: () => defaultStyleProfile,
  }
}

function isRuntimePaths(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.userStyleProfilesDir === "string"
  )
}

async function ensureDefaultStyleRefHeader(source, runtimeContext) {
  if (
    !isRuntimePaths(runtimeContext) ||
    /<meta-agent\b/i.test(source)
  ) {
    return source
  }

  const currentStyleReference = await readCurrentStyleProfileReference(
    runtimeContext,
  )

  return [`<meta-agent style-ref="${currentStyleReference}" />`, source].join(
    "\n\n",
  )
}
