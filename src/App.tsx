import collaborationWorkbenchSource from "@/agent-html/examples/human-agent-collaboration-workbench.agent.html?raw"
import { sanitizeAgentHtml } from "@/agent-html/parse/sanitize-agent-html"
import { AgentHtmlRenderer } from "@/agent-html/renderer/AgentHtmlRenderer"

const artifactSource = String(
  import.meta.env.VITE_AGENT_HTML_SOURCE || collaborationWorkbenchSource,
)
const artifact = sanitizeAgentHtml(artifactSource)
const artifactTitle =
  artifact.document?.components[0]?.props.title ??
  "Human Agent Collaboration Workbench"

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">agent-html MVP</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {artifactTitle}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          A static artifact rendered through the sanitized agent-html pipeline.
        </p>
      </header>

      <article className="bg-card text-card-foreground rounded-lg border">
        {artifact.document ? (
          <AgentHtmlRenderer document={artifact.document} />
        ) : (
          <p className="text-destructive p-6 text-sm">
            The artifact could not be rendered.
          </p>
        )}
      </article>
    </main>
  )
}
