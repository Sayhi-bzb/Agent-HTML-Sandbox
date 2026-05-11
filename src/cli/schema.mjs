import path from "node:path"
import { fileURLToPath } from "node:url"

import { formatForbiddenPolicy } from "../config/defaults.mjs"
import { loadCoreModule } from "./module-loader.mjs"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)
const textChild = "#text"

export async function getCliSchemaOutput(root = packageRoot) {
  const { componentSchemaModule, renderConfigModule } =
    await loadSchemaModules(root)
  const components = componentSchemaModule.VALIDATED_STANDARD_COMPONENT_SCHEMAS
  const renderConfigDefaults = renderConfigModule.DEFAULT_RENDER_CONFIG
  const renderConfigKeys = renderConfigModule.RENDER_CONFIG_KEYS
  const renderConfigValueEntries = renderConfigModule.RENDER_CONFIG_VALUES
  const renderConfig = {
    defaults: renderConfigDefaults,
    keys: renderConfigKeys,
    values: Object.fromEntries(
      renderConfigKeys.map((key) => {
        const values = renderConfigValueEntries[key]

        if (!values) {
          throw new Error(`Cannot find render config values for ${key}`)
        }

        return [key, values]
      }),
    ),
  }
  const blockedNames = componentSchemaModule.BLOCKED_AGENT_FACING_PROP_NAMES
  const safetyPolicy = {
    blockedNames,
    forbidden: formatForbiddenPolicy(blockedNames),
  }

  return {
    kind: "agent-html-cli-schema",
    version: 1,
    components,
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
    "Standard components:",
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

  return name
}

async function loadSchemaModules(root) {
  const coreModule = await loadCoreModule(root)
  const componentSchemaModule = coreModule
  const renderConfigModule = coreModule

  assertSchemaModule(componentSchemaModule)
  assertRenderConfigModule(renderConfigModule)

  return { componentSchemaModule, renderConfigModule }
}

function assertSchemaModule(module) {
  if (!Array.isArray(module.VALIDATED_STANDARD_COMPONENT_SCHEMAS)) {
    throw new Error("Cannot load validated component schemas.")
  }

  if (!Array.isArray(module.BLOCKED_AGENT_FACING_PROP_NAMES)) {
    throw new Error("Cannot load blocked agent-facing prop names.")
  }
}

function assertRenderConfigModule(module) {
  if (!module.DEFAULT_RENDER_CONFIG) {
    throw new Error("Cannot load default render config.")
  }

  if (!Array.isArray(module.RENDER_CONFIG_KEYS)) {
    throw new Error("Cannot load render config keys.")
  }

  if (!module.RENDER_CONFIG_VALUES) {
    throw new Error("Cannot load render config values.")
  }

  for (const key of module.RENDER_CONFIG_KEYS) {
    if (!Array.isArray(module.RENDER_CONFIG_VALUES[key])) {
      throw new Error(`Cannot load render config values for ${key}.`)
    }
  }
}
