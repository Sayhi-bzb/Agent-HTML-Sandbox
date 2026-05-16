import type { SourceComparisonSummary } from "./source-comparison"
import {
  findLatestProposalDecision,
  findRecentProposalDecisions,
  getCurrentReviewStage,
  getCurrentReviewStageGuidance,
  getProposalChecklistProgress,
  getProposalDecisionTrend,
  getProposalReadiness,
  getProposalStageState,
  getReviewTimelineActionConfig,
  getReviewTimeline,
  isProposalStale,
  type ReviewTimelineActionConfig,
} from "./review-flow"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationState,
} from "./types"

type ReviewStatusClassName =
  | "status-dirty"
  | "status-ready"
  | "status-error"
  | "status-building"
  | ""

export type InspectReviewStep = {
  id: string
  title: string
  detail: string
  action?: ReviewTimelineActionConfig
}

export type InspectEvidenceItem = {
  id: string
  label: string
  detail: string
  pillClassName: ReviewStatusClassName
}

export type InspectReviewSummary = {
  currentStage: "source" | "build" | "inspect" | "proposal"
  stageLabel: string
  stageStatusLabel: string
  stagePillClassName: ReviewStatusClassName
  stageSummary: string
  currentAction?: ReviewTimelineActionConfig
  readiness: ReturnType<typeof getProposalReadiness>
  proposalState: ReturnType<typeof getProposalStageState>
  nextSteps: InspectReviewStep[]
  evidence: InspectEvidenceItem[]
}

export function getInspectReviewSummary({
  build,
  draftComparison,
  hasUnsavedSourceChanges,
  inspect,
  logs,
  messages,
  proposalComparison,
  session,
  sourceValidation,
}: {
  build: BuildRunSummary
  draftComparison?: SourceComparisonSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  logs: LogSnapshot
  messages: AgentShellMessage[]
  proposalComparison?: SourceComparisonSummary
  session: SessionDetail
  sourceValidation?: SourceValidationState
}): InspectReviewSummary {
  const latestProposal = [...messages]
    .reverse()
    .find((message) => message.kind === "proposal-placeholder")
  const latestProposalDecision = findLatestProposalDecision(messages)
  const recentProposalDecisions = findRecentProposalDecisions(messages)
  const proposalDecisionTrend = getProposalDecisionTrend(
    recentProposalDecisions,
  )
  const latestProposalIsStale = latestProposal
    ? isProposalStale(latestProposal.createdAt, session)
    : false
  const proposalProgress = getProposalChecklistProgress({
    proposalText: latestProposal?.text,
    build,
    hasUnsavedSourceChanges,
    inspect,
    proposalComparison,
    session,
    staleProposal: latestProposalIsStale,
  })
  const currentStage = getCurrentReviewStage({
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposalExists: Boolean(latestProposal),
    latestProposalIsStale,
    proposalComparison,
    session,
    sourceValidation,
  })
  const reviewTimeline = getReviewTimeline({
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposal,
    latestProposalDecision,
    proposalDecisionTrend,
    latestProposalIsStale,
    messages,
    proposalComparison,
    proposalProgress,
    session,
    sourceValidation,
  })
  const currentStageState = reviewTimeline.find(
    (item) => item.id === currentStage,
  )
  const readiness = getProposalReadiness({
    build,
    inspect,
    session,
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    latestProposalIsStale,
    hasUnsavedSourceChanges,
    draftComparison,
    proposalComparison,
    proposalProgress,
    sourceValidation,
  })
  const proposalState = getProposalStageState({
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    latestProposalIsStale,
    proposalComparison,
    proposalDecisionTrend,
    proposalProgress,
  })
  const currentAction = getReviewTimelineActionConfig({
    stage: currentStage,
    activeView: "inspect",
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    latestProposalIsStale,
    proposalComparison,
    sessionHasPreview: session.summary.hasPreview,
    sourceValidation,
  })

  return {
    currentStage,
    stageLabel: currentStageState?.label ?? stageLabelFor(currentStage),
    stageStatusLabel: currentStageState?.statusLabel ?? readiness.label,
    stagePillClassName:
      currentStageState?.pillClassName ?? readiness.pillClassName,
    stageSummary: getCurrentReviewStageGuidance({
      stage: currentStage,
      latestProposalExists: Boolean(latestProposal),
      latestProposalDecision,
      latestProposalIsStale,
      proposalDecisionTrend,
      proposalComparison,
      sourceValidationStatus: sourceValidation?.status,
    }),
    currentAction,
    readiness,
    proposalState,
    nextSteps: buildInspectReviewSteps({
      build,
      currentStage,
      hasUnsavedSourceChanges,
      inspect,
      latestProposalDecision,
      latestProposalExists: Boolean(latestProposal),
      latestProposalIsStale,
      logs,
      proposalComparison,
      session,
      sourceValidation,
    }),
    evidence: buildInspectEvidence({
      draftComparison,
      inspect,
      logs,
      latestProposalExists: Boolean(latestProposal),
      latestProposalIsStale,
      proposalComparison,
      sourceValidation,
    }),
  }
}

function buildInspectReviewSteps({
  build,
  currentStage,
  hasUnsavedSourceChanges,
  inspect,
  latestProposalDecision,
  latestProposalExists,
  latestProposalIsStale,
  logs,
  proposalComparison,
  session,
  sourceValidation,
}: {
  build: BuildRunSummary
  currentStage: InspectReviewSummary["currentStage"]
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  latestProposalDecision?: {
    status: "approved" | "needs-changes"
    proposalTitle: string
  }
  latestProposalExists: boolean
  latestProposalIsStale: boolean
  logs: LogSnapshot
  proposalComparison?: SourceComparisonSummary
  session: SessionDetail
  sourceValidation?: SourceValidationState
}) {
  const steps: InspectReviewStep[] = []

  if (hasUnsavedSourceChanges) {
    steps.push({
      id: "save-source",
      title: "Save the current draft",
      detail:
        "Persist the draft before using Build, Inspect, or proposal review as a reliable baseline.",
      action: {
        label: "Save now",
        description: "Persist the current draft before continuing review.",
        handler: "save",
      },
    })
  }

  if (sourceValidation?.status === "invalid") {
    steps.push({
      id: "review-source-validation",
      title: `Review ${sourceValidation.diagnostics.length} source validation diagnostic(s)`,
      detail:
        "Source validation already found issues in the current draft, so fix those before trusting build or proposal review.",
      action: {
        label: "Open Source",
        description:
          "Review the current source and validation state before continuing.",
        handler: "openSource",
      },
    })
  } else if (sourceValidation?.status === "running") {
    steps.push({
      id: "wait-source-validation",
      title: "Wait for source validation to settle",
      detail:
        "Source validation is still running on the current draft, so the review state may still change.",
    })
  }

  if (inspect.diagnostics.length > 0) {
    steps.push({
      id: "review-diagnostics",
      title: `Review ${inspect.diagnostics.length} diagnostic(s)`,
      detail:
        currentStage === "inspect"
          ? "Inspect is the strongest blocker right now. Clear or confirm these diagnostics before trusting the proposal."
          : "Use the diagnostics list to confirm whether the next edit is structural, schema-level, or runtime-related.",
      action: {
        label: "Run Inspect",
        description:
          "Refresh diagnostics and structure after the latest changes.",
        handler: "inspect",
      },
    })
  }

  if (build.status === "failed") {
    steps.push({
      id: "read-stderr",
      title: "Read stderr before rebuilding",
      detail: logs.stderr?.trim()
        ? "The latest stderr output is available below and is usually the fastest explanation for preview failure."
        : "The last build failed without captured stderr, so use diagnostics and structure summary before retrying.",
    })
  } else if (build.status === "running") {
    steps.push({
      id: "wait-build",
      title: "Wait for the current build to finish",
      detail:
        "Preview and proposal review may still change while the new artifact is being generated.",
    })
  } else if (
    !session.summary.hasPreview ||
    session.summary.status === "dirty" ||
    build.status === "idle"
  ) {
    steps.push({
      id: "run-build",
      title: "Refresh the preview artifact",
      detail:
        "Build the latest saved source so Inspect and Preview both point at the current session truth.",
      action: {
        label: "Run Build",
        description: "Generate or refresh the preview artifact.",
        handler: "build",
      },
    })
  }

  if (!latestProposalExists) {
    steps.push({
      id: "draft-proposal",
      title: "Draft the first proposal",
      detail:
        "Once source, preview, and inspect signals are current, generate a proposal from the latest session state.",
      action: {
        label: "Draft proposal",
        description:
          "Generate the first proposal from the current session state.",
        handler: "draftProposal",
      },
    })
  } else if (latestProposalIsStale) {
    steps.push({
      id: "redraft-proposal",
      title: "Redraft the proposal",
      detail:
        "The latest proposal predates the current session state, so its review summary is no longer trustworthy.",
      action: {
        label: "Redraft proposal",
        description:
          "Generate a fresh proposal from the current session state.",
        handler: "draftProposal",
      },
    })
  } else if (proposalComparison?.changedLineCount) {
    steps.push({
      id: "review-drift",
      title: "Review proposal drift",
      detail: `The source has moved ${proposalComparison.changedLineCount} line(s) away from the proposal snapshot.`,
      action: {
        label: "Review diff",
        description: "Focus the current compare view on proposal drift.",
        handler: "reviewDiff",
      },
    })
  } else if (latestProposalDecision?.status === "needs-changes") {
    steps.push({
      id: "resolve-proposal-decision",
      title: "Address the latest proposal feedback",
      detail:
        "A recent decision still requests changes, so confirm the proposal direction before approval.",
      action: {
        label: "Redraft proposal",
        description:
          "Refresh the proposal after the latest review requested changes.",
        handler: "draftProposal",
      },
    })
  } else if (session.summary.hasPreview) {
    steps.push({
      id: "compare-preview",
      title: "Compare preview against intent",
      detail:
        "Use the current preview artifact as the final check before the next proposal or artifact decision.",
      action: {
        label: "Open Preview",
        description:
          "Compare the current artifact before approving the proposal.",
        handler: "openPreview",
      },
    })
  }

  return steps.slice(0, 4)
}

function buildInspectEvidence({
  draftComparison,
  inspect,
  logs,
  latestProposalExists,
  latestProposalIsStale,
  proposalComparison,
  sourceValidation,
}: {
  draftComparison?: SourceComparisonSummary
  inspect: InspectSnapshot
  logs: LogSnapshot
  latestProposalExists: boolean
  latestProposalIsStale: boolean
  proposalComparison?: SourceComparisonSummary
  sourceValidation?: SourceValidationState
}) {
  const evidence: InspectEvidenceItem[] = []

  if (sourceValidation?.status === "invalid") {
    for (const diagnostic of sourceValidation.diagnostics.slice(0, 2)) {
      evidence.push({
        id: `source-validation-${diagnostic.id}`,
        label: "SOURCE validation",
        detail: formatDiagnosticEvidence(diagnostic),
        pillClassName: "status-dirty",
      })
    }
  }

  for (const diagnostic of inspect.diagnostics.slice(0, 2)) {
    evidence.push({
      id: `diagnostic-${diagnostic.id}`,
      label: `${diagnostic.severity.toUpperCase()} diagnostic`,
      detail: formatDiagnosticEvidence(diagnostic),
      pillClassName:
        diagnostic.severity === "error"
          ? "status-error"
          : diagnostic.severity === "warning"
            ? "status-dirty"
            : "status-ready",
    })
  }

  if (draftComparison?.changedLineCount) {
    evidence.push({
      id: "source-drift",
      label: "Unsaved source drift",
      detail:
        draftComparison.firstChangedLine !== undefined
          ? `${draftComparison.changedLineCount} changed line(s), first change near line ${draftComparison.firstChangedLine}.`
          : `${draftComparison.changedLineCount} changed line(s) relative to the saved source.`,
      pillClassName: "status-dirty",
    })
  }

  const stderrLine = getRepresentativeLogLine(logs.stderr)
  if (stderrLine) {
    evidence.push({
      id: "stderr-line",
      label: "stderr signal",
      detail: stderrLine,
      pillClassName: "status-error",
    })
  }

  if (proposalComparison?.changedLineCount) {
    evidence.push({
      id: "proposal-drift",
      label: "Proposal drift",
      detail:
        proposalComparison.firstChangedLine !== undefined
          ? `${proposalComparison.changedLineCount} changed line(s), first change near line ${proposalComparison.firstChangedLine}.`
          : `${proposalComparison.changedLineCount} changed line(s) relative to the latest proposal snapshot.`,
      pillClassName: "status-dirty",
    })
  }

  if (latestProposalExists && latestProposalIsStale) {
    evidence.push({
      id: "proposal-age",
      label: "Proposal age",
      detail:
        "The latest proposal was generated before the current saved source or build state.",
      pillClassName: "status-dirty",
    })
  }

  const stdoutLine = getRepresentativeLogLine(logs.stdout)
  if (evidence.length < 3 && stdoutLine) {
    evidence.push({
      id: "stdout-line",
      label: "stdout signal",
      detail: stdoutLine,
      pillClassName: "status-ready",
    })
  }

  if (evidence.length === 0) {
    evidence.push({
      id: "no-evidence",
      label: "No strong signal yet",
      detail:
        "Inspect has no structured diagnostics or captured logs yet, so build the session to produce stronger review evidence.",
      pillClassName: "",
    })
  }

  return evidence.slice(0, 4)
}

function formatDiagnosticEvidence(
  diagnostic: InspectSnapshot["diagnostics"][number],
) {
  const position =
    typeof diagnostic.line === "number"
      ? `line ${diagnostic.line}${typeof diagnostic.column === "number" ? `:${diagnostic.column}` : ""}`
      : undefined
  const tags = [position, diagnostic.code, diagnostic.source]
    .filter(Boolean)
    .join(" · ")

  return tags ? `${diagnostic.message} (${tags})` : diagnostic.message
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

function stageLabelFor(stage: InspectReviewSummary["currentStage"]) {
  switch (stage) {
    case "source":
      return "Source saved"
    case "build":
      return "Build"
    case "inspect":
      return "Inspect"
    case "proposal":
      return "Proposal"
    default:
      return "Review"
  }
}
