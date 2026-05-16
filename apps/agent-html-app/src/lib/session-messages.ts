import type { SourceComparisonSummary } from "./source-comparison"
import type {
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
} from "./types"

export function buildLocalProposalText(
  session: SessionDetail,
  build: BuildRunSummary,
  inspect: InspectSnapshot,
  logs: LogSnapshot,
  draftSource: string,
) {
  const items: string[] = []

  if (draftSource !== session.source) {
    items.push(
      "[save] Save the current source changes before trusting the next build or proposal review.",
    )
  }

  if (!draftSource.includes("<page")) {
    items.push(
      "[build] Add a <page> root before the next build. The current draft is missing the required top-level structure.",
    )
  }

  if (draftSource.includes("className=")) {
    items.push(
      '[inspect] Remove "className" from the draft. agent-html documents should stay schema-level and not carry raw UI props.',
    )
  }

  if (inspect.diagnostics.length > 0) {
    items.push(
      `[inspect] Resolve ${inspect.diagnostics.length} inspect diagnostic(s) before sharing the next artifact.`,
    )
  }

  if (build.status === "failed") {
    items.push(
      "[build] Read stderr first, then rebuild once the source issues or runtime failure are understood.",
    )
  } else if (!session.summary.hasPreview) {
    items.push(
      "[build] Run Build to generate the first preview artifact for this session.",
    )
  } else if (session.summary.status === "dirty") {
    items.push(
      "[build] Rebuild the session so Preview and Inspect reflect the latest saved source.",
    )
  } else {
    items.push(
      "[review] Compare the current preview artifact against the source intent and confirm the recommendation still holds.",
    )
  }

  if (logs.stderr?.trim()) {
    items.push(
      "[inspect] Keep the latest stderr log open while editing. It contains the fastest explanation path for build or inspect failures.",
    )
  } else if (logs.stdout?.trim()) {
    items.push(
      "[review] Use the captured stdout summary as the artifact baseline, then return to Source only if the preview diverges from the expected structure.",
    )
  }

  if (items.length === 0) {
    items.push(
      "[review] Keep the source, preview, and inspect summary aligned before making the next artifact decision.",
    )
  }

  return [
    `Proposal for ${session.summary.name}`,
    ...items.map((item) => `- ${item}`),
  ].join("\n")
}

export function buildProposalDecisionMessage(
  proposalText: string,
  status: "approved" | "needs changes",
) {
  const [titleLine] = proposalText.split(/\r?\n/).filter(Boolean)
  const proposalTitle =
    titleLine?.replace(/^Proposal for\s+/, "").trim() || "Unknown proposal"

  return [
    "Proposal decision",
    `- Proposal: ${proposalTitle}`,
    `- Status: ${status}`,
  ].join("\n")
}

export function buildEventMessage(build: BuildRunSummary) {
  const details: string[] = [`- Status: ${build.status}`]

  if (build.previewPath) {
    details.push(`- Preview: ${build.previewPath}`)
  }

  if (typeof build.exitCode === "number") {
    details.push(`- Exit code: ${build.exitCode}`)
  }

  return ["Build update", ...details].join("\n")
}

export function buildSourceSavedEventMessage(
  source: string,
  comparison?: SourceComparisonSummary,
) {
  const details = [`- Lines: ${source.split(/\r?\n/).length}`]

  if (comparison) {
    details.push(`- Changed lines: ${comparison.changedLineCount}`)
    if (comparison.firstChangedLine) {
      details.push(`- First change: line ${comparison.firstChangedLine}`)
    }
  }

  return ["Source saved", ...details].join("\n")
}

export function inspectEventMessage(inspect: InspectSnapshot) {
  const diagnosticsCount = inspect.diagnostics.length
  const summary =
    diagnosticsCount > 0
      ? `${diagnosticsCount} diagnostic(s)`
      : "no structured diagnostics"
  return [
    "Inspect update",
    `- Diagnostics: ${summary}`,
    `- Structure: ${inspect.structureSummary}`,
  ].join("\n")
}
