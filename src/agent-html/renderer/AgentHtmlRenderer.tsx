import { Fragment, type ReactNode } from "react"

import type {
  SanitizedAgentHtml,
  SanitizedNode,
  StandardAgentNode,
} from "../types"
import { getRendererComponent } from "./component-registry"
import type { RendererContext } from "./renderer-types"
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
      {document.components.map((component, index) =>
        renderComponent(component, index, context),
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

  return renderComponent(node, index, context)
}

function renderComponent(
  node: StandardAgentNode,
  index: number,
  context: RendererContext,
): ReactNode {
  const rendererComponent = getRendererComponent(node.name)

  if (!rendererComponent) {
    throw new Error(`No renderer registered for component "${node.name}".`)
  }

  return (
    <Fragment key={`${node.name}-${index}`}>
      {rendererComponent.render(node, context)}
    </Fragment>
  )
}
