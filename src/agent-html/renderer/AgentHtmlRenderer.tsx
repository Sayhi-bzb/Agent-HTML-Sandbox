import { Fragment, type ReactNode } from "react"

import type {
  SanitizedAgentHtml,
  SanitizedBlockNode,
  SanitizedNode,
} from "../types"
import { getRendererBlock } from "./block-registry"
import type { RendererContext } from "./block-registry"
import { getRenderProfile } from "./render-profile"

type AgentHtmlRendererProps = {
  readonly document: SanitizedAgentHtml
}

export function AgentHtmlRenderer({ document }: AgentHtmlRendererProps) {
  const profile = getRenderProfile(document.meta)

  const renderChildren = (children: readonly SanitizedNode[]): ReactNode =>
    children.map((child, index) => renderNode(child, index, context))

  const context: RendererContext = {
    profile,
    renderChildren,
  }

  return (
    <>
      {document.blocks.map((block, index) =>
        renderBlock(block, index, context),
      )}
    </>
  )
}

function renderNode(
  node: SanitizedNode,
  index: number,
  context: RendererContext,
): ReactNode {
  if (node.type === "text") {
    return <span key={index}>{node.value}</span>
  }

  return renderBlock(node, index, context)
}

function renderBlock(
  node: SanitizedBlockNode,
  index: number,
  context: RendererContext,
): ReactNode {
  const rendererBlock = getRendererBlock(node.name)

  if (!rendererBlock) {
    throw new Error(`No renderer registered for block "${node.name}".`)
  }

  return (
    <Fragment key={`${node.name}-${index}`}>
      {rendererBlock.render(node, context)}
    </Fragment>
  )
}
