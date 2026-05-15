import {
  BLOCKED_AGENT_FACING_PROP_NAMES,
  DEFAULT_RENDER_CONFIG,
  PUBLIC_RENDER_CONFIG_DEFAULTS,
  RENDER_CONFIG_KEYS,
  RENDER_CONFIG_VALUES,
  VALIDATED_STANDARD_COMPONENT_SCHEMAS,
} from "@agent-html/core"

import { formatForbiddenPolicy } from "../config/defaults.mjs"
import {
  createRuntimeVerificationData,
  createRendererMapping,
} from "../config/render-capabilities.mjs"

const textChild = "#text"

export async function getCliSchemaOutput() {
  const components = VALIDATED_STANDARD_COMPONENT_SCHEMAS
  const renderConfigDefaults =
    PUBLIC_RENDER_CONFIG_DEFAULTS ?? DEFAULT_RENDER_CONFIG
  const renderConfig = {
    defaults: renderConfigDefaults,
    keys: RENDER_CONFIG_KEYS,
    values: Object.fromEntries(
      RENDER_CONFIG_KEYS.map((key) => {
        const values = RENDER_CONFIG_VALUES[key]

        if (!values) {
          throw new Error(`Cannot find render config values for ${key}`)
        }

        return [key, values]
      }),
    ),
  }
  const safetyPolicy = {
    blockedNames: BLOCKED_AGENT_FACING_PROP_NAMES,
    forbidden: formatForbiddenPolicy(BLOCKED_AGENT_FACING_PROP_NAMES),
  }
  const verificationData = createRuntimeVerificationData(components)
  const rendererMapping = createRendererMapping(components)

  return {
    kind: "agent-html-cli-schema",
    version: 1,
    components,
    verificationData,
    rendererMapping,
    renderConfig,
    safetyPolicy,
    forbidden: safetyPolicy.forbidden,
  }
}

export function formatPrompt(schema) {
  const lines = [
    "Write agent-html only.",
    "",
    "Header:",
    formatMetaAgentTemplate(schema.renderConfig.values),
    "",
    "Semantic compatibility tags:",
    ...schema.components.map(formatComponent),
    "",
    "Forbidden:",
    schema.forbidden,
  ]

  return lines.join("\n")
}

function formatMetaAgentTemplate(values) {
  const attrs = Object.entries(values)
    .map(([key, allowedValues]) => `${key}="${allowedValues.join("|")}"`)
    .join(" ")

  return `<meta-agent ${attrs} />`
}

function formatComponent(component) {
  const props = component.props.map(formatProp).join(" ")
  const propText = props ? `(${props})` : ""
  const children = (component.allowedChildren ?? [])
    .map((child) => (child === textChild ? "text" : child))
    .join("/")

  return `${component.name}${propText} -> ${children || "none"}`
}

function formatProp(prop) {
  const required = prop.required ? "*" : "?"
  const name = `${prop.name}${required}`

  if (prop.valueKind === "enum") {
    return `${name}=${prop.enumValues.join("|")}`
  }

  if (prop.valueKind === "boolean") {
    return `${name}=true|false`
  }

  return name
}
