import type {
  BuildRunSummary,
  DiagnosticItem,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationSnapshot,
} from "./types"

export function createMockValidationSnapshot(
  sessionId: string,
  source: string,
): SourceValidationSnapshot {
  const diagnostics = getMockDiagnostics(source)

  return {
    sessionId,
    validatedAt: new Date().toISOString(),
    status: diagnostics.length > 0 ? "invalid" : "valid",
    diagnostics,
    structureSummary:
      diagnostics.length > 0
        ? "Mock validation found source issues."
        : getMockStructureSummary(source),
  }
}

export function createMockBuildArtifacts({
  session,
  source,
}: {
  session: SessionDetail
  source: string
}): {
  build: BuildRunSummary
  logs: LogSnapshot
  previewHtml?: string
} {
  const diagnostics = getMockDiagnostics(source)
  const startedAt = new Date().toISOString()
  const previewPath =
    diagnostics.length === 0
      ? `mock://sessions/${session.summary.id}/build/index.html`
      : session.previewPath

  const build: BuildRunSummary = {
    runId: `mock-build-${Date.now()}`,
    sessionId: session.summary.id,
    startedAt,
    finishedAt: startedAt,
    status: diagnostics.length === 0 ? "succeeded" : "failed",
    exitCode: diagnostics.length === 0 ? 0 : 1,
    previewPath,
  }

  return {
    build,
    logs:
      diagnostics.length === 0
        ? {
            stdout: JSON.stringify(
              {
                kind: "agent-html-build-result",
                ok: true,
                inputPath: session.sourcePath,
                outputDir: previewPath,
              },
              null,
              2,
            ),
            stderr: "",
          }
        : {
            stdout: "",
            stderr: diagnostics
              .map(
                (diagnostic) =>
                  `${diagnostic.severity}: ${diagnostic.code ?? "mock"}: ${diagnostic.message}`,
              )
              .join("\n"),
          },
    previewHtml:
      diagnostics.length === 0
        ? renderMockPreviewHtml(session.summary.name, source)
        : undefined,
  }
}

export function createMockInspectArtifacts({
  build,
  session,
  source,
}: {
  build: BuildRunSummary
  session: SessionDetail
  source: string
}): {
  inspect: InspectSnapshot
  logs: LogSnapshot
} {
  const diagnostics = getMockDiagnostics(source).map((diagnostic) => ({
    ...diagnostic,
    source: "inspect" as const,
  }))
  const generatedAt = new Date().toISOString()

  return {
    inspect: {
      sessionId: session.summary.id,
      generatedAt,
      diagnostics,
      structureSummary: getMockStructureSummary(source),
      lastBuild:
        build.status === "idle" && !build.previewPath && !build.finishedAt
          ? undefined
          : build,
    },
    logs:
      diagnostics.length === 0
        ? {
            stdout: JSON.stringify(
              {
                kind: "agent-html-inspection",
                ok: true,
                sessionId: session.summary.id,
              },
              null,
              2,
            ),
            stderr: "",
          }
        : {
            stdout: "",
            stderr: diagnostics
              .map(
                (diagnostic) =>
                  `${diagnostic.severity}: ${diagnostic.code ?? "mock"}: ${diagnostic.message}`,
              )
              .join("\n"),
          },
  }
}

function getMockDiagnostics(source: string): DiagnosticItem[] {
  const diagnostics: DiagnosticItem[] = []

  if (!source.includes("<page")) {
    const fallbackPosition = getFirstNonEmptyPosition(source)
    diagnostics.push({
      id: "mock-validation-page",
      severity: "error",
      message: "The draft should include a <page> root component.",
      source: "validation",
      code: "missing-page",
      line: fallbackPosition.line,
      column: fallbackPosition.column,
    })
  }

  const classNamePosition = findTokenPosition(source, "className=")
  if (classNamePosition) {
    diagnostics.push({
      id: "mock-validation-classname",
      severity: "error",
      message: '"className" is not an allowed agent-facing attribute.',
      source: "validation",
      code: "unknown-attr",
      line: classNamePosition.line,
      column: classNamePosition.column,
    })
  }

  return diagnostics
}

function getMockStructureSummary(source: string) {
  const counts = new Map<string, number>()

  for (const match of source.matchAll(/<([a-z-]+)(?=\s|>)/g)) {
    const name = match[1]
    if (name.startsWith("/") || name === "meta-agent") {
      continue
    }
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  if (counts.size === 0) {
    return "No component tags detected in the current draft."
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name} x${count}`)
    .join(", ")
}

function renderMockPreviewHtml(title: string, source: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; background: #f5f1e8; color: #1f2937; }
      main { max-width: 860px; margin: 0 auto; background: #fffdf8; border: 1px solid #e7dcc7; border-radius: 18px; padding: 24px; box-shadow: 0 18px 50px rgba(120, 98, 63, 0.08); }
      h1 { margin: 0 0 8px; font-size: 1.8rem; }
      p { margin: 0 0 16px; color: #6b7280; }
      pre { white-space: pre-wrap; word-break: break-word; background: #f7f3ea; border-radius: 12px; padding: 16px; border: 1px solid #eadfcd; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>Mock preview generated in browser mode.</p>
      <pre>${escapeHtml(source)}</pre>
    </main>
  </body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function getFirstNonEmptyPosition(source: string) {
  const lines = source.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmedIndex = line.search(/\S/)
    if (trimmedIndex >= 0) {
      return {
        line: index + 1,
        column: trimmedIndex + 1,
      }
    }
  }

  return { line: 1, column: 1 }
}

function findTokenPosition(source: string, token: string) {
  const index = source.indexOf(token)
  if (index < 0) {
    return undefined
  }

  const before = source.slice(0, index)
  const lines = before.split(/\r?\n/)
  const line = lines.length
  const column = lines.at(-1)?.length ?? 0

  return {
    line,
    column: column + 1,
  }
}
