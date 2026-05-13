import {
  BLOCKED_AGENT_FACING_PROP_NAMES,
  getComponentPropSchema,
  getComponentSchema,
  TEXT_CHILD,
} from "../component-schema"
import { DEFAULT_RENDER_CONFIG, RenderConfigSchema } from "../render-config"
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

export const UI_PROTOCOL_SLOT_NAMES: Readonly<
  Record<string, readonly string[]>
> = {
  accordion: ["accordion-item"],
  alert: ["children"],
  badge: ["children"],
  card: ["children"],
  list: ["item"],
  page: ["children"],
  separator: ["children"],
  table: ["row", "cell"],
  tabs: ["tabs-list", "tabs-trigger", "tabs-content"],
}

export function validateAgentHtml(parsed: ParsedAgentHtml): ValidatedAgentHtml {
  const diagnostics = [...parsed.diagnostics]
  const meta = validateRenderConfig(parsed.metaAttrs, diagnostics)
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
): RenderConfig {
  if (!attrs) {
    return DEFAULT_RENDER_CONFIG
  }

  const result = RenderConfigSchema.safeParse(attrs)

  if (result.success) {
    return result.data
  }

  diagnostics.push({
    code: "invalid-render-config",
    message:
      "The <meta-agent /> header must use only registered render config enum values.",
    path: "/meta-agent",
    severity: "error",
  })

  return DEFAULT_RENDER_CONFIG
}

function validateRootNodes(
  nodes: readonly ParsedAgentHtmlNode[],
  diagnostics: AgentHtmlDiagnostic[],
): readonly StandardAgentNode[] {
  const normalizedNodes = nodes.map((node) =>
    normalizeUiProtocolNode(node, diagnostics),
  )
  const elementNodes = normalizedNodes.filter(isParsedElementNode)

  for (const node of normalizedNodes) {
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

function normalizeUiProtocolNode(
  node: ParsedAgentHtmlNode,
  diagnostics: AgentHtmlDiagnostic[],
): ParsedAgentHtmlNode {
  if (node.type === "text") {
    return node
  }

  if (node.name !== "ui") {
    return normalizeElementChildren(node, diagnostics)
  }

  const componentName = node.attrs.name

  if (!componentName) {
    return normalizeElementChildren(node, diagnostics)
  }

  diagnoseUnknownUiSlots(node, componentName, diagnostics)

  if (componentName === "tabs") {
    return normalizeTabsUiNode(node, diagnostics)
  }

  if (componentName === "accordion") {
    return normalizeSlottedUiNode(
      node,
      {
        componentName,
        slotComponent: "accordion-item",
        slotName: "accordion-item",
      },
      diagnostics,
    )
  }

  if (componentName === "list") {
    return normalizeSlottedUiNode(
      node,
      {
        componentName,
        slotComponent: "item",
        slotName: "item",
      },
      diagnostics,
    )
  }

  if (componentName === "table") {
    return normalizeTableUiNode(node, diagnostics)
  }

  return {
    ...node,
    name: componentName,
    attrs: normalizeUiAttrs(node.attrs),
    children: node.children.flatMap((child) =>
      normalizeUiProtocolChild(child, diagnostics),
    ),
  }
}

function normalizeElementChildren(
  node: ParsedAgentHtmlElementNode,
  diagnostics: AgentHtmlDiagnostic[],
): ParsedAgentHtmlElementNode {
  return {
    ...node,
    children: node.children.map((child) =>
      normalizeUiProtocolNode(child, diagnostics),
    ),
  }
}

function normalizeUiProtocolChild(
  node: ParsedAgentHtmlNode,
  diagnostics: AgentHtmlDiagnostic[],
): ParsedAgentHtmlNode[] {
  const normalized = normalizeUiProtocolNode(node, diagnostics)

  if (normalized.type !== "element" || normalized.name !== "slot") {
    return [normalized]
  }

  return normalized.children.map((child) =>
    normalizeUiProtocolNode(child, diagnostics),
  )
}

function normalizeTabsUiNode(
  node: ParsedAgentHtmlElementNode,
  diagnostics: AgentHtmlDiagnostic[],
): ParsedAgentHtmlElementNode {
  const triggers = getSlotDescendants(node, "tabs-trigger")
  const contents = getSlotChildren(node, "tabs-content")

  return {
    ...node,
    name: "tabs",
    attrs: normalizeUiAttrs(node.attrs),
    children: contents.map((content) => {
      const value = content.attrs.value
      const trigger = triggers.find((item) => item.attrs.value === value)
      const label =
        content.attrs.label ??
        trigger?.attrs.label ??
        getTextContent(trigger) ??
        value

      return {
        ...content,
        name: "tab",
        attrs: normalizeSlotAttrs({
          ...content.attrs,
          value,
          label,
        }),
        children: content.children.flatMap((child) =>
          normalizeUiProtocolChild(child, diagnostics),
        ),
      }
    }),
  }
}

function normalizeTableUiNode(
  node: ParsedAgentHtmlElementNode,
  diagnostics: AgentHtmlDiagnostic[],
): ParsedAgentHtmlElementNode {
  return {
    ...node,
    name: "table",
    attrs: normalizeUiAttrs(node.attrs),
    children: getSlotChildren(node, "row").map((row) => ({
      ...row,
      name: "row",
      attrs: normalizeSlotAttrs(row.attrs),
      children: getSlotChildren(row, "cell").map((cell) => ({
        ...cell,
        name: "cell",
        attrs: normalizeSlotAttrs(cell.attrs),
        children: cell.children.flatMap((child) =>
          normalizeUiProtocolChild(child, diagnostics),
        ),
      })),
    })),
  }
}

function normalizeSlottedUiNode(
  node: ParsedAgentHtmlElementNode,
  {
    componentName,
    slotComponent,
    slotName,
  }: {
    readonly componentName: string
    readonly slotComponent: string
    readonly slotName: string
  },
  diagnostics: AgentHtmlDiagnostic[],
): ParsedAgentHtmlElementNode {
  return {
    ...node,
    name: componentName,
    attrs: normalizeUiAttrs(node.attrs),
    children: getSlotChildren(node, slotName).map((slot) => ({
      ...slot,
      name: slotComponent,
      attrs: normalizeSlotAttrs(slot.attrs),
      children: slot.children.flatMap((child) =>
        normalizeUiProtocolChild(child, diagnostics),
      ),
    })),
  }
}

function diagnoseUnknownUiSlots(
  node: ParsedAgentHtmlElementNode,
  componentName: string,
  diagnostics: AgentHtmlDiagnostic[],
) {
  const allowedSlots = UI_PROTOCOL_SLOT_NAMES[componentName]

  if (!allowedSlots) {
    return
  }

  for (const slot of getUiSlotDescendants(node)) {
    const slotName = slot.attrs.name

    if (slotName && allowedSlots.includes(slotName)) {
      continue
    }

    diagnostics.push({
      code: "unknown-slot",
      message: `"${slotName || "missing"}" is not a registered slot on <ui name="${componentName}">.`,
      path: slot.path,
      severity: "error",
    })
  }
}

function getUiSlotDescendants(
  node: ParsedAgentHtmlElementNode,
): ParsedAgentHtmlElementNode[] {
  return node.children.flatMap((child): ParsedAgentHtmlElementNode[] => {
    if (child.type !== "element" || child.name === "ui") {
      return []
    }

    const matched = child.name === "slot" ? [child] : []

    return [...matched, ...getUiSlotDescendants(child)]
  })
}

function getSlotChildren(
  node: ParsedAgentHtmlElementNode | undefined,
  slotName: string,
): ParsedAgentHtmlElementNode[] {
  if (!node) {
    return []
  }

  return node.children.filter(
    (child): child is ParsedAgentHtmlElementNode =>
      child.type === "element" &&
      child.name === "slot" &&
      child.attrs.name === slotName,
  )
}

function getSlotDescendants(
  node: ParsedAgentHtmlElementNode | undefined,
  slotName: string,
): ParsedAgentHtmlElementNode[] {
  if (!node) {
    return []
  }

  return node.children.flatMap((child): ParsedAgentHtmlElementNode[] => {
    if (child.type !== "element") {
      return []
    }

    const matched =
      child.name === "slot" && child.attrs.name === slotName ? [child] : []

    return [...matched, ...getSlotDescendants(child, slotName)]
  })
}

function normalizeUiAttrs(
  attrs: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const rest = { ...attrs }
  delete rest.name
  return normalizeKnownAttrAliases(rest)
}

function normalizeSlotAttrs(
  attrs: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const rest = { ...attrs }
  delete rest.name
  return normalizeKnownAttrAliases(rest)
}

function normalizeKnownAttrAliases(
  attrs: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const normalized = { ...attrs }

  if ("default-value" in normalized && !("default" in normalized)) {
    normalized.default = normalized["default-value"]
    delete normalized["default-value"]
  }

  return normalized
}

function getTextContent(
  node: ParsedAgentHtmlElementNode | undefined,
): string | undefined {
  const text = node?.children
    .filter(
      (child): child is Extract<ParsedAgentHtmlNode, { type: "text" }> =>
        child.type === "text",
    )
    .map((child) => child.value)
    .join(" ")
    .trim()

  return text || undefined
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
