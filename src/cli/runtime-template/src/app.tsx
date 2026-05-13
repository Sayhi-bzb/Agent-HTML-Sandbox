import React from "react"

import generatedDocument from "../document.generated.json"
import runtimeCapabilities from "../render-capabilities.generated.json"
import {
  assertRendererRegistryParity,
  createRendererSpecMap,
} from "./renderer/parity"
import { createRendererNode } from "./renderer/render-node"
import type { AgentComponentNode, AgentDocument } from "./renderer/types"
import type { RuntimeCapabilities } from "./renderer/types"

const agentDocument = generatedDocument as AgentDocument
const runtimeRenderCapabilities = runtimeCapabilities as RuntimeCapabilities
const rendererSpecByName = createRendererSpecMap(runtimeRenderCapabilities)
const RendererNode = createRendererNode(rendererSpecByName)

assertRendererRegistryParity(runtimeRenderCapabilities, rendererSpecByName)

export function App() {
  const title = getDocumentTitle(agentDocument)

  React.useEffect(() => {
    if (title && typeof window !== "undefined") {
      window.document.title = title
    }
  }, [title])

  return (
    <main
      className="ahtml-shell"
      data-theme={agentDocument.meta.theme}
      data-density={agentDocument.meta.density}
      data-tone={agentDocument.meta.tone}
      data-width={agentDocument.meta.width}
    >
      {agentDocument.components.map((node, index) => (
        <RendererNode key={index} node={node} />
      ))}
    </main>
  )
}

function getDocumentTitle(agentDocument: AgentDocument) {
  const page = agentDocument.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
