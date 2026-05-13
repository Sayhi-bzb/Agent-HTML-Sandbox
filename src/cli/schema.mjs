import path from "node:path"
import { fileURLToPath } from "node:url"

import { formatForbiddenPolicy } from "../config/defaults.mjs"
import {
  createRendererSpec,
  createUiCapabilities,
} from "../config/render-capabilities.mjs"
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
    uiCapabilities: createUiCapabilities(components),
    rendererSpec: createRendererSpec(components),
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
    "Preferred generic ui/slot syntax:",
    ...formatGenericUiSlotSyntax(),
    "",
    "Semantic compatibility tags:",
    ...schema.components.map(formatComponent),
    "",
    "Forbidden:",
    schema.forbidden,
  ]

  return lines.join("\n")
}

function formatGenericUiSlotSyntax() {
  return [
    '<ui name="page" title="...">...</ui>',
    '<ui name="card" title="...">text or child ui</ui>',
    '<ui name="alert" title="..." tone="neutral|danger">text</ui>',
    '<ui name="badge" tone="neutral|success|warning|danger">text</ui>',
    '<ui name="separator"></ui>',
    '<ui name="list" variant="ordered|unordered"><slot name="item">text</slot></ui>',
    '<ui name="table"><slot name="row" kind="header|body"><slot name="cell">text</slot></slot></ui>',
    '<ui name="tabs" default-value="id"><slot name="tabs-list"><slot name="tabs-trigger" value="id">Label</slot></slot><slot name="tabs-content" value="id">child ui</slot></ui>',
    '<ui name="accordion"><slot name="accordion-item" value="id" title="...">text or child ui</slot></ui>',
  ]
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
