import type { BuildRunSummary, LogSnapshot } from "./types"

type LogInsightTone = "default" | "ready" | "dirty" | "error"

export type LogInsightItem = {
  id: string
  label: string
  detail: string
  tone: LogInsightTone
}

export type LogInsightStream = {
  id: "stdout" | "stderr"
  label: "stdout" | "stderr"
  headline: string
  detail: string
  preview: string
  tone: LogInsightTone
}

export type LogInsightViewModel = {
  headline: string
  summary: string
  items: LogInsightItem[]
  streams: LogInsightStream[]
}

export function getLogInsightViewModel({
  build,
  logs,
}: {
  build?: BuildRunSummary
  logs: LogSnapshot
}): LogInsightViewModel {
  const stdout = logs.stdout?.trim()
  const stderr = logs.stderr?.trim()
  const stdoutJson = parseJson(stdout)
  const stdoutLine = getRepresentativeLogLine(stdout)
  const stderrLine = getRepresentativeLogLine(stderr)
  const streams = buildLogStreams({ stdout, stderr, stdoutJson, stdoutLine, stderrLine })

  const items: LogInsightItem[] = [
    {
      id: "availability",
      label: "Streams",
      detail: `stdout ${stdout ? "available" : "missing"} · stderr ${stderr ? "available" : "missing"}`,
      tone: stderr ? "error" : stdout ? "ready" : "default",
    },
  ]

  if (stderrLine) {
    items.push({
      id: "stderr-primary",
      label: "Primary stderr clue",
      detail: stderrLine,
      tone: "error",
    })
  } else if (stdoutLine) {
    items.push({
      id: "stdout-primary",
      label: "Primary stdout clue",
      detail: stdoutLine,
      tone: "ready",
    })
  }

  if (stdoutJson?.kind === "agent-html-build-result") {
    const outputDir =
      typeof stdoutJson.outputDir === "string" ? stdoutJson.outputDir : undefined
    items.push({
      id: "stdout-kind",
      label: "Command shape",
      detail: outputDir
        ? `stdout reports a build result for ${outputDir}.`
        : "stdout reports a machine-readable build result.",
      tone:
        stdoutJson.ok === true
          ? "ready"
          : build?.status === "failed"
            ? "error"
            : "dirty",
    })
  } else if (stdoutJson?.kind === "agent-html-inspection") {
    items.push({
      id: "stdout-kind",
      label: "Command shape",
      detail: "stdout reports a machine-readable inspection payload.",
      tone: "ready",
    })
  }

  if (stderr) {
    if (looksLikeSourceValidation(stderr)) {
      return {
        headline: "stderr points to source validation",
        summary:
          "The latest CLI failure still looks source-level, so fix the document before treating this as a runtime problem.",
        items: items.slice(0, 3),
        streams,
      }
    }

    return {
      headline: "stderr captured the latest failure",
      summary:
        build?.status === "failed"
          ? "Use the first stderr line as the rebuild clue before editing again."
          : "stderr is currently the strongest signal for what happened in the latest command run.",
      items: items.slice(0, 3),
      streams,
    }
  }

  if (stdoutJson?.kind === "agent-html-build-result" && stdoutJson.ok === true) {
    return {
      headline: "Build stdout confirms artifact generation",
      summary:
        "The latest stdout reports a successful build, so Preview can be treated as the current artifact baseline.",
      items: items.slice(0, 3),
      streams,
    }
  }

  if (stdoutJson?.kind === "agent-html-inspection") {
    return {
      headline: "Inspect stdout confirms the latest analysis run",
      summary:
        "The latest stdout shows inspect completed cleanly, so the current structure summary is a usable review baseline.",
      items: items.slice(0, 3),
      streams,
    }
  }

  if (stdout) {
    return {
      headline: "stdout captured the latest command output",
      summary:
        "stderr is empty, so stdout is the primary CLI trace for the most recent run.",
      items: items.slice(0, 3),
      streams,
    }
  }

  return {
    headline: "No logs captured yet",
    summary:
      build?.status === "failed"
        ? "The latest command failed without captured stdout or stderr, so rely on diagnostics and structure summary before retrying."
        : "Build or Inspect once to capture CLI output for debugging and review.",
    items,
    streams,
  }
}

function buildLogStreams({
  stdout,
  stderr,
  stdoutJson,
  stdoutLine,
  stderrLine,
}: {
  stdout?: string
  stderr?: string
  stdoutJson?: Record<string, unknown>
  stdoutLine?: string
  stderrLine?: string
}): LogInsightStream[] {
  const stdoutStream: LogInsightStream =
    stdoutJson?.kind === "agent-html-build-result"
      ? {
          id: "stdout",
          label: "stdout",
          headline:
            stdoutJson.ok === true
              ? "Machine-readable build result"
              : "Machine-readable build error result",
          detail:
            typeof stdoutJson.outputDir === "string"
              ? `outputDir ${stdoutJson.outputDir}`
              : "build result payload captured",
          preview: stdout ?? "No stdout log yet.",
          tone: stdoutJson.ok === true ? "ready" : "dirty",
        }
      : stdoutJson?.kind === "agent-html-inspection"
        ? {
            id: "stdout",
            label: "stdout",
            headline: "Machine-readable inspect payload",
            detail: "inspect payload captured",
            preview: stdout ?? "No stdout log yet.",
            tone: "ready",
          }
        : stdoutLine
          ? {
              id: "stdout",
              label: "stdout",
              headline: "Plain text stdout",
              detail: stdoutLine,
              preview: stdout ?? "No stdout log yet.",
              tone: "ready",
            }
          : {
              id: "stdout",
              label: "stdout",
              headline: "No stdout log yet",
              detail: "No stdout output was captured for this session.",
              preview: "No stdout log yet.",
              tone: "default",
            }

  const stderrStream: LogInsightStream =
    stderrLine
      ? {
          id: "stderr",
          label: "stderr",
          headline: looksLikeSourceValidation(stderr ?? "")
            ? "Likely source validation failure"
            : "stderr failure trace",
          detail: stderrLine,
          preview: stderr ?? "No stderr log yet.",
          tone: "error",
        }
      : {
          id: "stderr",
          label: "stderr",
          headline: "No stderr log yet",
          detail: "stderr is empty for the latest captured run.",
          preview: "No stderr log yet.",
          tone: "default",
        }

  return [stdoutStream, stderrStream]
}

function parseJson(text?: string) {
  if (!text || !text.startsWith("{")) {
    return undefined
  }

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function looksLikeSourceValidation(stderr: string) {
  const normalized = stderr.toLowerCase()
  return (
    normalized.includes("missing-page") ||
    normalized.includes("unknown-attr") ||
    normalized.includes("validation") ||
    normalized.includes("missing <page>")
  )
}

function getRepresentativeLogLine(text?: string) {
  const line = text
    ?.split(/\r?\n/)
    .map((value) => value.trim())
    .find(Boolean)

  if (!line) {
    return undefined
  }

  return line.length > 180 ? `${line.slice(0, 177)}...` : line
}
