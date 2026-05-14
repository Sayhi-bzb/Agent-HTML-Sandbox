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
  const shellClassName = getShellClassName(agentDocument)

  React.useEffect(() => {
    if (title && typeof window !== "undefined") {
      window.document.title = title
    }
  }, [title])

  return (
    <main
      className={shellClassName}
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

function getShellClassName(agentDocument: AgentDocument) {
  const { density, tone, width } = agentDocument.meta
  const widthClassName =
    width === "wide"
      ? "max-w-7xl"
      : width === "dashboard"
        ? "max-w-6xl"
        : "max-w-4xl"
  const densityClassName = density === "compact" ? "gap-4 py-8" : "gap-6 py-10"
  const toneClassName =
    tone === "dashboard"
      ? "items-stretch"
      : tone === "decision"
        ? "items-start"
        : "items-stretch"

  return [
    "mx-auto grid min-h-screen w-full px-4 sm:px-6",
    widthClassName,
    densityClassName,
    toneClassName,
  ].join(" ")
}

function getDocumentTitle(agentDocument: AgentDocument) {
  const page = agentDocument.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
