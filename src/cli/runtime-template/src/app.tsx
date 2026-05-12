import React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import generatedDocument from "../document.generated.json"

type AgentTextNode = {
  type: "text"
  value: string
}

type AgentComponentNode = {
  type: "component"
  name: string
  props: Record<string, string>
  children: AgentNode[]
}

type AgentNode = AgentTextNode | AgentComponentNode

type AgentDocument = {
  meta: {
    theme: string
    density: string
    tone: string
    width: string
  }
  components: AgentNode[]
}

const agentDocument = generatedDocument as AgentDocument

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

function RendererNode({ node }: { node: AgentNode }) {
  if (node.type === "text") {
    return <p className="ahtml-text">{node.value}</p>
  }

  if (node.name === "page") {
    return (
      <article className="ahtml-page" data-agent-html-component={node.name}>
        {node.props.title ? (
          <h1 className="ahtml-page-title">{node.props.title}</h1>
        ) : null}
        {renderChildren(node)}
      </article>
    )
  }

  if (node.name === "card") {
    return (
      <Card data-agent-html-component={node.name}>
        {node.props.title ? (
          <CardHeader>
            <CardTitle>{node.props.title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent>{renderChildren(node)}</CardContent>
      </Card>
    )
  }

  return (
    <section className="ahtml-section" data-agent-html-component={node.name}>
      {node.props.title ? (
        <h2 className="ahtml-section-title">{node.props.title}</h2>
      ) : null}
      {renderChildren(node)}
    </section>
  )
}

function renderChildren(node: AgentComponentNode) {
  return node.children.map((child, index) => (
    <RendererNode key={index} node={child} />
  ))
}

function getDocumentTitle(agentDocument: AgentDocument) {
  const page = agentDocument.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
