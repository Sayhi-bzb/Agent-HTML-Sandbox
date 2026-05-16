import { createPublicAgentContract } from "@agent-html/core"

import { createRuntimeContract } from "../config/runtime-contract.mjs"

const textChild = "#text"

export async function getCliSchemaOutput() {
  const publicAgentContract = createPublicAgentContract()
  const runtimeContract = createRuntimeContract(publicAgentContract.components)

  return {
    kind: "agent-html-cli-schema",
    version: 1,
    ...publicAgentContract,
    verificationData: runtimeContract.verificationData,
    rendererMapping: runtimeContract.rendererMapping,
  }
}

export function formatPrompt(schema) {
  const lines = [
    "Write agent-html only.",
    "",
    "Header:",
    formatRenderConfigGuidance(schema.renderConfig),
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

function formatRenderConfigGuidance(renderConfig) {
  const compatibilitySyntax = renderConfig.compatibilitySyntax

  if (
    renderConfig.model === "document-style-config-reference" &&
    compatibilitySyntax?.key === "profile"
  ) {
    return 'Use an approved document style config reference. Current compatibility syntax serializes that choice with profile="...".'
  }

  return "Use an approved render config choice."
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
