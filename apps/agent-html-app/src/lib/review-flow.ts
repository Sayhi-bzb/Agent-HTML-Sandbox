import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  SessionDetail,
} from "./types"
import type { SourceComparisonSummary } from "./source-comparison"
import { getTimestampMillis } from "./time"

export type ProposalReadinessSummary = {
  label: "Blocked" | "Needs review" | "Ready"
  pillClassName: "status-error" | "status-dirty" | "status-ready"
  summary: string
  items: string[]
}

export type ProposalAction = "save" | "build" | "inspect" | "review"

export type ParsedProposalItem = {
  action?: ProposalAction
  text: string
}

export type ProposalChecklistActionConfig = {
  label: string
  handler:
    | "save"
    | "build"
    | "inspect"
    | "openInspect"
    | "reviewDiff"
    | "openPreview"
}

export type ProposalChecklistContext = {
  summary: string
  previewGroups?: Array<{
    startLine: number
    endLine: number
    savedText: string
    draftText: string
  }>
}

export type ProposalChecklistFocusOption = {
  id: string
  label: string
  groups: SourceComparisonSummary["previewGroups"]
}

export type ProposalChecklistProgress = {
  totalTaggedItems: number
  doneCount: number
  pendingCount: number
  reviewCount: number
}

export type ReviewTimelineItem = {
  id: "source" | "build" | "inspect" | "proposal"
  label: string
  statusLabel: string
  pillClassName: "status-dirty" | "status-ready" | "status-error" | "status-building" | ""
  summary: string
  timestamp?: string
}

export type ReviewTimelineActionConfig = {
  label: string
  description: string
  handler:
    | "save"
    | "build"
    | "inspect"
    | "openInspect"
    | "draftProposal"
    | "reviewDiff"
    | "openPreview"
}

export function parseStructuredMessageCard(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return undefined
  }

  const [title, ...rest] = lines
  const items = rest
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean)

  return {
    title,
    items,
    fallbackBody: rest.join(" "),
  }
}

export function parseProposalChecklist(text: string) {
  const parsed = parseStructuredMessageCard(text)
  if (!parsed) {
    return undefined
  }

  const items = parsed.items.map((item) => {
    const match = /^\[(save|build|inspect|review)\]\s*(.+)$/i.exec(item)
    if (!match) {
      return { text: item }
    }

    return {
      action: match[1].toLowerCase() as ProposalAction,
      text: match[2],
    }
  })

  return {
    title: parsed.title,
    items,
    fallbackBody: parsed.fallbackBody,
  }
}

export function findLatestStructuredMessage(messages: AgentShellMessage[], title: string) {
  return [...messages].reverse().find((message) => {
    const parsed = parseStructuredMessageCard(message.text)
    return parsed?.title === title
  })
}

export function isProposalStale(createdAt: string, session: SessionDetail) {
  const proposalMillis = getTimestampMillis(createdAt)
  if (proposalMillis === undefined) {
    return false
  }

  const sessionUpdatedMillis = getTimestampMillis(session.summary.updatedAt)
  const lastBuildMillis = getTimestampMillis(session.summary.lastBuildAt)

  return [sessionUpdatedMillis, lastBuildMillis].some(
    (candidate) => candidate !== undefined && candidate > proposalMillis,
  )
}

export function getReviewTimeline({
  build,
  hasUnsavedSourceChanges,
  inspect,
  latestProposal,
  latestProposalIsStale,
  messages,
  proposalComparison,
  proposalProgress,
  session,
}: {
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  latestProposal?: AgentShellMessage
  latestProposalIsStale: boolean
  messages: AgentShellMessage[]
  proposalComparison?: SourceComparisonSummary
  proposalProgress?: ProposalChecklistProgress
  session: SessionDetail
}): ReviewTimelineItem[] {
  const latestSourceSave = findLatestStructuredMessage(messages, "Source saved")
  const latestBuildUpdate = findLatestStructuredMessage(messages, "Build update")
  const latestInspectUpdate = findLatestStructuredMessage(messages, "Inspect update")

  return [
    {
      id: "source",
      label: "Source saved",
      statusLabel: hasUnsavedSourceChanges ? "Pending" : "Current",
      pillClassName: hasUnsavedSourceChanges ? "status-dirty" : "status-ready",
      summary: hasUnsavedSourceChanges
        ? "The current draft has diverged from session truth and should be saved before trusting review output."
        : "Session truth is up to date with the current source state.",
      timestamp: latestSourceSave?.createdAt ?? session.summary.updatedAt,
    },
    {
      id: "build",
      label: "Build",
      statusLabel:
        build.status === "succeeded"
          ? "Ready"
          : build.status === "failed"
            ? "Failed"
            : build.status === "running"
              ? "Running"
              : "Idle",
      pillClassName:
        build.status === "succeeded"
          ? "status-ready"
          : build.status === "failed"
            ? "status-error"
            : build.status === "running"
              ? "status-building"
              : "",
      summary:
        build.status === "succeeded"
          ? "A preview artifact is available for review."
          : build.status === "failed"
            ? "The latest build failed, so preview review is blocked."
            : build.status === "running"
              ? "The next preview artifact is still being generated."
              : "No successful preview artifact has been generated yet.",
      timestamp: latestBuildUpdate?.createdAt ?? build.finishedAt ?? build.startedAt,
    },
    {
      id: "inspect",
      label: "Inspect",
      statusLabel: inspect.diagnostics.length > 0 ? "Needs review" : "Current",
      pillClassName: inspect.diagnostics.length > 0 ? "status-dirty" : "status-ready",
      summary:
        inspect.diagnostics.length > 0
          ? `${inspect.diagnostics.length} diagnostic(s) still need review before the proposal can be trusted.`
          : "Diagnostics and structure summary are aligned enough for proposal review.",
      timestamp: latestInspectUpdate?.createdAt ?? inspect.generatedAt,
    },
    {
      id: "proposal",
      label: "Proposal",
      statusLabel: !latestProposal
        ? "Missing"
        : latestProposalIsStale
          ? "Stale"
          : proposalComparison?.changedLineCount
            ? "Drifted"
            : "Current",
      pillClassName: !latestProposal
        ? "status-error"
        : latestProposalIsStale
          ? "status-dirty"
          : proposalComparison?.changedLineCount
            ? "status-dirty"
            : "status-ready",
      summary: !latestProposal
        ? "No proposal has been drafted for the current session yet."
        : latestProposalIsStale
          ? "The latest proposal predates the current session state."
          : proposalComparison?.changedLineCount
            ? `The current source differs from the proposal snapshot by ${proposalComparison.changedLineCount} line(s).`
            : proposalProgress?.totalTaggedItems
              ? `Checklist ${proposalProgress.doneCount}/${proposalProgress.totalTaggedItems} item(s) are already in a done state.`
              : "The latest proposal snapshot still matches the current source state.",
      timestamp: latestProposal?.createdAt,
    },
  ]
}

export function getProposalReadiness({
  build,
  inspect,
  session,
  latestProposalExists,
  latestProposalIsStale,
  hasUnsavedSourceChanges,
  draftComparison,
  proposalComparison,
  proposalProgress,
}: {
  build: BuildRunSummary
  inspect: InspectSnapshot
  session: SessionDetail
  latestProposalExists: boolean
  latestProposalIsStale: boolean
  hasUnsavedSourceChanges: boolean
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  proposalProgress?: ProposalChecklistProgress
}): ProposalReadinessSummary {
  const blockers: string[] = []
  const warnings: string[] = []

  if (!latestProposalExists) {
    warnings.push("No proposal has been drafted for the current session yet.")
  }

  if (hasUnsavedSourceChanges) {
    blockers.push(
      draftComparison
        ? `Unsaved draft changes are still pending (${draftComparison.changedLineCount} changed lines).`
        : "Unsaved draft changes are still pending.",
    )
  }

  if (inspect.diagnostics.length > 0) {
    blockers.push(`${inspect.diagnostics.length} inspect diagnostic(s) still need review.`)
  }

  if (build.status === "failed") {
    blockers.push("The latest build failed, so preview review is not trustworthy yet.")
  } else if (build.status === "running") {
    warnings.push("A build is currently running.")
  } else if (!session.summary.hasPreview) {
    warnings.push("No successful preview artifact is available yet.")
  } else if (session.summary.status === "dirty") {
    warnings.push("Preview may lag behind the latest saved source.")
  }

  if (latestProposalIsStale) {
    warnings.push("The latest proposal predates the current session state.")
  }

  if (proposalComparison?.changedLineCount) {
    warnings.push(
      `The current source differs from the latest proposal snapshot (${proposalComparison.changedLineCount} changed lines).`,
    )
  }

  if (proposalProgress?.pendingCount) {
    warnings.push(`${proposalProgress.pendingCount} checklist item(s) are still pending.`)
  }

  if (proposalProgress?.reviewCount) {
    warnings.push(`${proposalProgress.reviewCount} checklist item(s) still require review.`)
  }

  if (blockers.length > 0) {
    return {
      label: "Blocked",
      pillClassName: "status-error",
      summary: "Resolve the blocking issues before trusting the next proposal review.",
      items: [...blockers, ...warnings],
    }
  }

  if (warnings.length > 0) {
    return {
      label: "Needs review",
      pillClassName: "status-dirty",
      summary: "The proposal flow is usable, but some context still needs attention.",
      items: warnings,
    }
  }

  return {
    label: "Ready",
    pillClassName: "status-ready",
    summary: "Proposal, preview, and inspect context are aligned enough for review.",
    items: [],
  }
}

export function getProposalChecklistStatus({
  action,
  build,
  hasUnsavedSourceChanges,
  inspect,
  proposalComparison,
  session,
  staleProposal,
}: {
  action?: ProposalAction
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  proposalComparison?: SourceComparisonSummary
  session: SessionDetail
  staleProposal: boolean
}) {
  if (!action) {
    return undefined
  }

  switch (action) {
    case "save":
      return hasUnsavedSourceChanges
        ? { label: "Pending", pillClassName: "status-dirty" as const }
        : { label: "Done", pillClassName: "status-ready" as const }
    case "build":
      return build.status === "succeeded" && session.summary.hasPreview && session.summary.status !== "dirty"
        ? { label: "Done", pillClassName: "status-ready" as const }
        : { label: "Pending", pillClassName: "status-dirty" as const }
    case "inspect":
      return inspect.diagnostics.length === 0 && build.status !== "failed"
        ? { label: "Done", pillClassName: "status-ready" as const }
        : { label: "Pending", pillClassName: "status-dirty" as const }
    case "review":
      return !staleProposal && !proposalComparison?.changedLineCount && session.summary.hasPreview
        ? { label: "Ready", pillClassName: "status-ready" as const }
        : { label: "Review", pillClassName: "status-dirty" as const }
    default:
      return undefined
  }
}

export function getProposalChecklistActionConfig({
  action,
  activeView,
  hasUnsavedSourceChanges,
  proposalComparison,
  sessionHasPreview,
}: {
  action?: ProposalAction
  activeView: "preview" | "source" | "inspect"
  hasUnsavedSourceChanges: boolean
  proposalComparison?: SourceComparisonSummary
  sessionHasPreview: boolean
}): ProposalChecklistActionConfig | undefined {
  if (!action) {
    return undefined
  }

  switch (action) {
    case "save":
      return hasUnsavedSourceChanges ? { label: "Save now", handler: "save" } : undefined
    case "build":
      return hasUnsavedSourceChanges
        ? { label: "Save first", handler: "save" }
        : { label: "Run Build", handler: "build" }
    case "inspect":
      return activeView === "inspect"
        ? { label: "Run Inspect", handler: "inspect" }
        : { label: "Open Inspect", handler: "openInspect" }
    case "review":
      if (proposalComparison?.changedLineCount) {
        return { label: "Review diff", handler: "reviewDiff" }
      }

      if (sessionHasPreview && activeView !== "preview") {
        return { label: "Open Preview", handler: "openPreview" }
      }

      return undefined
    default:
      return undefined
  }
}

export function getReviewTimelineActionConfig({
  stage,
  activeView,
  build,
  hasUnsavedSourceChanges,
  inspect,
  latestProposalExists,
  latestProposalIsStale,
  proposalComparison,
  sessionHasPreview,
}: {
  stage: ReviewTimelineItem["id"]
  activeView: "preview" | "source" | "inspect"
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  latestProposalExists: boolean
  latestProposalIsStale: boolean
  proposalComparison?: SourceComparisonSummary
  sessionHasPreview: boolean
}): ReviewTimelineActionConfig | undefined {
  switch (stage) {
    case "source":
      return hasUnsavedSourceChanges
        ? {
            label: "Save now",
            description: "Persist the current draft before continuing review.",
            handler: "save",
          }
        : undefined
    case "build":
      return build.status === "succeeded" && sessionHasPreview
        ? undefined
        : {
            label: "Run Build",
            description: "Generate or refresh the preview artifact.",
            handler: "build",
          }
    case "inspect":
      if (inspect.diagnostics.length === 0 && activeView === "inspect") {
        return undefined
      }

      return activeView === "inspect"
        ? {
            label: "Run Inspect",
            description: "Refresh diagnostics and structure after the latest changes.",
            handler: "inspect",
          }
        : {
            label: "Open Inspect",
            description: "Review diagnostics before trusting the proposal.",
            handler: "openInspect",
          }
    case "proposal":
      if (!latestProposalExists || latestProposalIsStale) {
        return {
          label: "Draft proposal",
          description: "Generate a fresh proposal from the current session state.",
          handler: "draftProposal",
        }
      }

      if (proposalComparison?.changedLineCount) {
        return {
          label: "Review diff",
          description: "Focus the current compare view on proposal drift.",
          handler: "reviewDiff",
        }
      }

      return sessionHasPreview && activeView !== "preview"
        ? {
            label: "Open Preview",
            description: "Compare the current artifact before approving the proposal.",
            handler: "openPreview",
          }
        : undefined
    default:
      return undefined
  }
}

export function getProposalChecklistContext({
  action,
  build,
  draftComparison,
  inspect,
  proposalComparison,
}: {
  action?: ProposalAction
  build: BuildRunSummary
  draftComparison?: SourceComparisonSummary
  inspect: InspectSnapshot
  proposalComparison?: SourceComparisonSummary
}): ProposalChecklistContext | undefined {
  if (!action) {
    return undefined
  }

  switch (action) {
    case "save":
      return draftComparison
        ? {
            summary: `${draftComparison.changedLineCount} changed line(s) relative to saved source.`,
            previewGroups: draftComparison.previewGroups.slice(0, 2),
          }
        : undefined
    case "build":
      if (build.status === "failed") {
        return {
          summary:
            typeof build.exitCode === "number"
              ? `Last build failed with exit code ${build.exitCode}.`
              : "Last build failed before a stable preview was available.",
        }
      }

      if (build.status === "running") {
        return { summary: "A build is currently running." }
      }

      if (build.status === "idle") {
        return { summary: "No successful build has been recorded for this session yet." }
      }

      return { summary: "Preview is already built from the current session state." }
    case "inspect":
      return inspect.diagnostics.length > 0
        ? { summary: `${inspect.diagnostics.length} diagnostic(s) are still pending review.` }
        : { summary: "No structured diagnostics are currently blocking review." }
    case "review":
      return proposalComparison
        ? {
            summary: `${proposalComparison.changedLineCount} changed line(s) relative to the latest proposal snapshot.`,
            previewGroups: proposalComparison.previewGroups.slice(0, 2),
          }
        : { summary: "The latest proposal snapshot still matches the current source state." }
    default:
      return undefined
  }
}

export function getProposalChecklistFocusOptions({
  proposalText,
  comparisonMode,
  build,
  hasUnsavedSourceChanges,
  inspect,
  draftComparison,
  proposalComparison,
}: {
  proposalText?: string
  comparisonMode: "saved" | "proposal"
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
}) {
  const parsed = proposalText ? parseProposalChecklist(proposalText) : undefined
  if (!parsed) {
    return []
  }

  return parsed.items
    .map((item, index) => {
      const context = getProposalChecklistContext({
        action: item.action,
        build,
        draftComparison,
        inspect,
        proposalComparison,
      })

      if (!context?.previewGroups?.length) {
        return undefined
      }

      if (comparisonMode === "saved" && item.action !== "save") {
        return undefined
      }

      if (comparisonMode === "proposal" && item.action !== "review") {
        return undefined
      }

      return {
        id: `${item.action ?? "free"}-${index}`,
        label: item.text,
        groups: context.previewGroups,
      } satisfies ProposalChecklistFocusOption
    })
    .filter((item): item is ProposalChecklistFocusOption => item !== undefined)
}

export function getProposalChecklistProgress({
  proposalText,
  build,
  hasUnsavedSourceChanges,
  inspect,
  proposalComparison,
  session,
  staleProposal,
}: {
  proposalText?: string
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  proposalComparison?: SourceComparisonSummary
  session: SessionDetail
  staleProposal: boolean
}): ProposalChecklistProgress | undefined {
  const parsed = proposalText ? parseProposalChecklist(proposalText) : undefined
  if (!parsed) {
    return undefined
  }

  let totalTaggedItems = 0
  let doneCount = 0
  let pendingCount = 0
  let reviewCount = 0

  for (const item of parsed.items) {
    if (!item.action) {
      continue
    }

    totalTaggedItems += 1
    const status = getProposalChecklistStatus({
      action: item.action,
      build,
      hasUnsavedSourceChanges,
      inspect,
      proposalComparison,
      session,
      staleProposal,
    })

    switch (status?.label) {
      case "Done":
      case "Ready":
        doneCount += 1
        break
      case "Pending":
        pendingCount += 1
        break
      case "Review":
        reviewCount += 1
        break
      default:
        break
    }
  }

  return { totalTaggedItems, doneCount, pendingCount, reviewCount }
}
