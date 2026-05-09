import { parseFragment, type DefaultTreeAdapterMap } from "parse5"

import { STANDARD_COMPONENT_NAMES } from "../component-schema"

export type AgentHtmlDiagnosticSeverity = "error"

export type AgentHtmlDiagnostic = {
  readonly code:
    | "duplicate-meta-agent"
    | "invalid-child"
    | "invalid-render-config"
    | "missing-required-attr"
    | "missing-root"
    | "multiple-roots"
    | "unsupported-node"
    | "unknown-attr"
    | "unknown-component"
  readonly message: string
  readonly path: string
  readonly severity: AgentHtmlDiagnosticSeverity
}

export type ParsedAgentHtmlTextNode = {
  readonly type: "text"
  readonly value: string
  readonly path: string
}

export type ParsedAgentHtmlElementNode = {
  readonly type: "element"
  readonly name: string
  readonly attrs: Readonly<Record<string, string>>
  readonly children: readonly ParsedAgentHtmlNode[]
  readonly path: string
}

export type ParsedAgentHtmlNode =
  | ParsedAgentHtmlElementNode
  | ParsedAgentHtmlTextNode

export type ParsedAgentHtml = {
  readonly metaAttrs?: Readonly<Record<string, string>>
  readonly nodes: readonly ParsedAgentHtmlNode[]
  readonly diagnostics: readonly AgentHtmlDiagnostic[]
}

const AGENT_COMPONENT_NAME_PATTERN = STANDARD_COMPONENT_NAMES.join("|")
const AGENT_COMPONENT_ALIAS_PREFIX = "agent-html-"
const SELF_CLOSING_META_AGENT_PATTERN = /<meta-agent\b([^>]*)\/>/gi
const SELF_CLOSING_AGENT_COMPONENT_PATTERN = new RegExp(
  `<(${AGENT_COMPONENT_NAME_PATTERN})\\b([^>]*)/>`,
  "gi",
)
const AGENT_COMPONENT_TAG_PATTERN = new RegExp(
  `<(\\/?)(${AGENT_COMPONENT_NAME_PATTERN})\\b`,
  "gi",
)

type Parse5Node = DefaultTreeAdapterMap["node"]
type Parse5Element = DefaultTreeAdapterMap["element"]
type Parse5TextNode = DefaultTreeAdapterMap["textNode"]

export function parseAgentHtml(source: string): ParsedAgentHtml {
  const fragment = parseFragment(normalizeAgentHtmlSource(source))
  const diagnostics: AgentHtmlDiagnostic[] = []
  const nodes: ParsedAgentHtmlNode[] = []
  let metaAttrs: Readonly<Record<string, string>> | undefined

  fragment.childNodes.forEach((child, index) => {
    const path = `/${index}`

    if (isIgnorableTextNode(child)) {
      return
    }

    if (isTextNode(child)) {
      nodes.push({
        type: "text",
        value: child.value.trim(),
        path,
      })
      return
    }

    if (!isElementNode(child)) {
      diagnostics.push({
        code: "unsupported-node",
        message: "Only element and text nodes are supported in agent-html.",
        path,
        severity: "error",
      })
      return
    }

    if (child.tagName === "meta-agent") {
      if (metaAttrs) {
        diagnostics.push({
          code: "duplicate-meta-agent",
          message: "Only one top-level <meta-agent /> header is allowed.",
          path,
          severity: "error",
        })
        return
      }

      metaAttrs = getAttrs(child)
      return
    }

    nodes.push(convertElementNode(child, path))
  })

  return {
    metaAttrs,
    nodes,
    diagnostics,
  }
}

function normalizeAgentHtmlSource(source: string): string {
  // parse5 follows browser HTML rules: custom tags are not void elements and
  // native table parsing can reorder children. Normalize standard component syntax first.
  return source
    .replace(SELF_CLOSING_META_AGENT_PATTERN, "<meta-agent$1></meta-agent>")
    .replace(SELF_CLOSING_AGENT_COMPONENT_PATTERN, "<$1$2></$1>")
    .replace(
      AGENT_COMPONENT_TAG_PATTERN,
      `<$1${AGENT_COMPONENT_ALIAS_PREFIX}$2`,
    )
}

function convertElementNode(
  node: Parse5Element,
  path: string,
): ParsedAgentHtmlElementNode {
  return {
    type: "element",
    name: getAgentBlockName(node),
    attrs: getAttrs(node),
    children: node.childNodes.flatMap<ParsedAgentHtmlNode>((child, index) => {
      const childPath = `${path}/${index}`

      if (isIgnorableTextNode(child)) {
        return []
      }

      if (isTextNode(child)) {
        return [
          {
            type: "text" as const,
            value: child.value.trim(),
            path: childPath,
          },
        ]
      }

      if (isElementNode(child)) {
        return [convertElementNode(child, childPath)]
      }

      return []
    }),
    path,
  }
}

function getAgentBlockName(node: Parse5Element): string {
  return node.tagName.startsWith(AGENT_COMPONENT_ALIAS_PREFIX)
    ? node.tagName.slice(AGENT_COMPONENT_ALIAS_PREFIX.length)
    : node.tagName
}

function getAttrs(node: Parse5Element): Readonly<Record<string, string>> {
  return Object.fromEntries(node.attrs.map((attr) => [attr.name, attr.value]))
}

function isElementNode(node: Parse5Node): node is Parse5Element {
  return "tagName" in node
}

function isTextNode(node: Parse5Node): node is Parse5TextNode {
  return node.nodeName === "#text"
}

function isIgnorableTextNode(node: Parse5Node): boolean {
  return isTextNode(node) && node.value.trim().length === 0
}
