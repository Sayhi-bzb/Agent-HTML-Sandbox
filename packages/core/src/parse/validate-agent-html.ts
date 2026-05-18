import {
  BLOCKED_AGENT_FACING_PROP_NAMES,
  getComponentPropSchema,
  getComponentSchema,
  TEXT_CHILD,
} from "../component-schema"
import { DEFAULT_RENDER_CONFIG, parseRenderConfig } from "../render-config"
import type { ParseRenderConfigOptions } from "../render-config"
import type { RenderConfig, SanitizedNode, StandardAgentNode } from "../types"
import type {
  AgentHtmlDiagnostic,
  ParsedAgentHtml,
  ParsedAgentHtmlElementNode,
  ParsedAgentHtmlNode,
} from "./parse-agent-html"

type ValidatedAgentHtml = {
  readonly meta: RenderConfig
  readonly components: readonly StandardAgentNode[]
  readonly diagnostics: readonly AgentHtmlDiagnostic[]
}

const FORBIDDEN_ATTR_NAMES = new Set(
  BLOCKED_AGENT_FACING_PROP_NAMES.flatMap((name) => [name, name.toLowerCase()]),
)

export function validateAgentHtml(
  parsed: ParsedAgentHtml,
  options: ParseRenderConfigOptions = {},
): ValidatedAgentHtml {
  const diagnostics = [...parsed.diagnostics]
  const meta = validateRenderConfig(parsed.metaAttrs, diagnostics, options)
  const components = validateRootNodes(parsed.nodes, diagnostics)

  return {
    meta,
    components,
    diagnostics,
  }
}

function validateRenderConfig(
  attrs: Readonly<Record<string, string>> | undefined,
  diagnostics: AgentHtmlDiagnostic[],
  options: ParseRenderConfigOptions,
): RenderConfig {
  if (!attrs) {
    const defaultStyleProfile = options.resolveDefaultStyleProfileReference?.()

    if (defaultStyleProfile) {
      return {
        documentStyleConfigReference: defaultStyleProfile.id,
        styleProfile: defaultStyleProfile,
      }
    }

    return DEFAULT_RENDER_CONFIG
  }

  try {
    return parseRenderConfig(attrs, options)
  } catch {
    // fall through to structured diagnostics
  }

  diagnostics.push({
    code: "invalid-render-config",
    message:
      'The <meta-agent /> header must use an approved document style config choice via style-ref="...".',
    path: "/meta-agent",
    severity: "error",
  })

  return DEFAULT_RENDER_CONFIG
}

function validateRootNodes(
  nodes: readonly ParsedAgentHtmlNode[],
  diagnostics: AgentHtmlDiagnostic[],
): readonly StandardAgentNode[] {
  const elementNodes = nodes.filter(isParsedElementNode)

  for (const node of nodes) {
    if (node.type === "text") {
      diagnostics.push({
        code: "invalid-child",
        message: "Top-level text is not allowed; agent-html must use <page>.",
        path: node.path,
        severity: "error",
      })
    }
  }

  if (elementNodes.length === 0) {
    diagnostics.push({
      code: "missing-root",
      message: "agent-html requires a <page> root component.",
      path: "/",
      severity: "error",
    })
    return []
  }

  if (elementNodes.length > 1) {
    diagnostics.push({
      code: "multiple-roots",
      message: "agent-html supports exactly one root component.",
      path: "/",
      severity: "error",
    })
  }

  const root = elementNodes[0]

  if (root?.name !== "page") {
    diagnostics.push({
      code: "invalid-child",
      message: "The root component must be <page>.",
      path: root?.path ?? "/",
      severity: "error",
    })
  }

  if (!root) {
    return []
  }

  const sanitizedRoot = validateElementNode(root, undefined, diagnostics)
  return sanitizedRoot ? [sanitizedRoot] : []
}
function validateElementNode(
  node: ParsedAgentHtmlElementNode,
  parent: ParsedAgentHtmlElementNode | undefined,
  diagnostics: AgentHtmlDiagnostic[],
): StandardAgentNode | undefined {
  const componentSchema = getComponentSchema(node.name)

  if (!componentSchema) {
    diagnostics.push({
      code: "unknown-component",
      message: `Unknown component <${node.name}> is not registered in the standard component schema.`,
      path: node.path,
      severity: "error",
    })
    return undefined
  }

  if (
    parent &&
    !getComponentSchema(parent.name)?.allowedChildren?.includes(node.name)
  ) {
    diagnostics.push({
      code: "invalid-child",
      message: `<${node.name}> is not allowed inside <${parent.name}>.`,
      path: node.path,
      severity: "error",
    })
  }

  const attrs = validateAttrs(node, diagnostics)
  const children = validateChildren(node, diagnostics)

  return {
    type: "component",
    name: node.name,
    props: attrs,
    children,
  }
}

function validateAttrs(
  node: ParsedAgentHtmlElementNode,
  diagnostics: AgentHtmlDiagnostic[],
): Readonly<Record<string, string>> {
  const componentSchema = getComponentSchema(node.name)

  if (!componentSchema) {
    return {}
  }

  const sanitizedAttrs: Record<string, string> = {}

  for (const prop of componentSchema.props) {
    if (prop.required && !(prop.name in node.attrs)) {
      diagnostics.push({
        code: "missing-required-attr",
        message: `<${node.name}> requires the "${prop.name}" attribute.`,
        path: node.path,
        severity: "error",
      })
    }
  }

  for (const [attrName, attrValue] of Object.entries(node.attrs)) {
    const prop = getComponentPropSchema(componentSchema, attrName)

    if (!prop || FORBIDDEN_ATTR_NAMES.has(attrName)) {
      diagnostics.push({
        code: "unknown-attr",
        message: `"${attrName}" is not an allowed agent-facing attribute on <${node.name}>.`,
        path: node.path,
        severity: "error",
      })
      continue
    }

    if (prop.valueKind === "enum" && !prop.enumValues?.includes(attrValue)) {
      diagnostics.push({
        code: "unknown-attr",
        message: `"${attrValue}" is not an allowed value for ${node.name}.${attrName}.`,
        path: node.path,
        severity: "error",
      })
      continue
    }

    if (
      prop.valueKind === "boolean" &&
      attrValue !== "true" &&
      attrValue !== "false"
    ) {
      diagnostics.push({
        code: "unknown-attr",
        message: `"${attrValue}" is not an allowed boolean value for ${node.name}.${attrName}. Use "true" or "false".`,
        path: node.path,
        severity: "error",
      })
      continue
    }

    if (
      prop.valueKind === "number" &&
      (!Number.isFinite(Number(attrValue)) || attrValue.trim() === "")
    ) {
      diagnostics.push({
        code: "unknown-attr",
        message: `"${attrValue}" is not an allowed numeric value for ${node.name}.${attrName}.`,
        path: node.path,
        severity: "error",
      })
      continue
    }

    sanitizedAttrs[attrName] = attrValue
  }

  return sanitizedAttrs
}

function validateChildren(
  node: ParsedAgentHtmlElementNode,
  diagnostics: AgentHtmlDiagnostic[],
): readonly SanitizedNode[] {
  const componentSchema = getComponentSchema(node.name)

  if (!componentSchema) {
    return []
  }

  return node.children.flatMap((child): SanitizedNode[] => {
    if (child.type === "text") {
      if (!componentSchema.allowedChildren?.includes(TEXT_CHILD)) {
        diagnostics.push({
          code: "invalid-child",
          message: `Text content is not allowed inside <${node.name}>.`,
          path: child.path,
          severity: "error",
        })
        return []
      }

      return [
        {
          type: "text",
          value: child.value,
        },
      ]
    }

    if (!componentSchema.allowedChildren?.includes(child.name)) {
      if (!getComponentSchema(child.name)) {
        diagnostics.push({
          code: "unknown-component",
          message: `Unknown component <${child.name}> is not registered in the standard component schema.`,
          path: child.path,
          severity: "error",
        })
        return []
      }

      diagnostics.push({
        code: "invalid-child",
        message: `<${child.name}> is not allowed inside <${node.name}>.`,
        path: child.path,
        severity: "error",
      })
      return []
    }

    const sanitizedChild = validateElementNode(child, node, diagnostics)
    return sanitizedChild ? [sanitizedChild] : []
  })
}

function isParsedElementNode(
  node: ParsedAgentHtmlNode,
): node is ParsedAgentHtmlElementNode {
  return node.type === "element"
}
