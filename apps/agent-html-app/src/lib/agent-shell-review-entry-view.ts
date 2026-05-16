import type {
  BuildRunSummary,
  DiagnosticItem,
  SourceValidationState,
} from "./types"
import type { InspectDiagnosticsViewModel } from "./inspect-diagnostics-view"
import type {
  ProposalReadinessSummary,
  ProposalDecision,
  ProposalDecisionEntry,
  ProposalChecklistProgress,
  ProposalDecisionTrend,
  ReviewTimelineActionConfig,
  ReviewTimelineItem,
} from "./review-flow"
import type { SourceComparisonSummary } from "./source-comparison"
import type { SourceFocusViewModel } from "./source-focus-view"
import type { SourceValidationViewModel } from "./source-validation-view"

export type AgentShellDetailAction =
  | {
      id: string
      label: string
      kind: "open-source"
    }
  | {
      id: string
      label: string
      kind: "open-inspect"
    }
  | {
      id: string
      label: string
      kind: "focus-diagnostic"
      diagnostic: DiagnosticItem
    }
  | {
      id: string
      label: string
      kind: "open-source-focus"
    }
  | {
      id: string
      label: string
      kind: "refresh-source-focus"
    }
  | {
      id: string
      label: string
      kind: "reveal-source-origin"
    }
  | {
      id: string
      label: string
      kind: "review-diff"
    }
  | {
      id: string
      label: string
      kind: "open-preview"
    }
  | {
      id: string
      label: string
      kind: "save"
    }
  | {
      id: string
      label: string
      kind: "inspect"
    }
  | {
      id: string
      label: string
      kind: "draft-proposal"
    }
  | {
      id: string
      label: string
      kind: "approve-proposal"
    }
  | {
      id: string
      label: string
      kind: "needs-changes-proposal"
    }
  | {
      id: string
      label: string
      kind: "build"
    }

export type AgentShellSnapshotEntry = {
  label: string
  pillClassName: string
  action?: AgentShellDetailAction
}

export type AgentShellEntryPanel = {
  eyebrow: string
  title: string
  pillLabel: string
  pillClassName: string
  summary: string
  meta: string[]
  metaDisplay?: "pills" | "first-pill"
  issues?: Array<{
    id: string
    message: string
    meta: string
    action?: AgentShellDetailAction
  }>
  hasAdditionalIssues?: boolean
  additionalIssuesLabel?: string
  actions: AgentShellDetailAction[]
}

export type AgentShellEntryView = {
  id: string
  chip: AgentShellSnapshotEntry
  panel?: AgentShellEntryPanel
}

export type AgentShellReadinessView = {
  label: ProposalReadinessSummary["label"]
  pillClassName: ProposalReadinessSummary["pillClassName"]
  summary: string
  items: string[]
  stages: Array<{
    id: ReviewTimelineItem["id"]
    label: string
    statusLabel: string
    pillClassName: ReviewTimelineItem["pillClassName"]
    isActive: boolean
    action?: AgentShellDetailAction
  }>
  currentAction?: {
    action: AgentShellDetailAction
    description: string
  }
}

function getWorkflowDetailAction(
  config: Pick<ReviewTimelineActionConfig, "handler" | "label"> | undefined,
) {
  if (!config) {
    return undefined
  }

  switch (config.handler) {
    case "save":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "save",
      } satisfies AgentShellDetailAction
    case "inspect":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "inspect",
      } satisfies AgentShellDetailAction
    case "openInspect":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "open-inspect",
      } satisfies AgentShellDetailAction
    case "reviewDiff":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "review-diff",
      } satisfies AgentShellDetailAction
    case "openPreview":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "open-preview",
      } satisfies AgentShellDetailAction
    case "build":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "build",
      } satisfies AgentShellDetailAction
    case "draftProposal":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "draft-proposal",
      } satisfies AgentShellDetailAction
    case "openSource":
      return {
        id: `workflow-${config.handler}`,
        label: config.label,
        kind: "open-source",
      } satisfies AgentShellDetailAction
    default:
      return undefined
  }
}

function getEntryPillClassName(
  pillClassName: ReviewTimelineItem["pillClassName"] | "" | undefined,
) {
  return pillClassName || "accent"
}

export function getProposalReadinessView({
  proposalReadiness,
  currentStage,
  currentStageGuidance,
  secondaryReadinessItems,
  reviewTimeline,
  stageActions,
  currentStageAction,
}: {
  proposalReadiness: ProposalReadinessSummary
  currentStage: ReviewTimelineItem["id"]
  currentStageGuidance: string
  secondaryReadinessItems: string[]
  reviewTimeline: ReviewTimelineItem[]
  stageActions: Partial<
    Record<ReviewTimelineItem["id"], ReviewTimelineActionConfig | undefined>
  >
  currentStageAction?: ReviewTimelineActionConfig
}) {
  return {
    label: proposalReadiness.label,
    pillClassName: proposalReadiness.pillClassName,
    summary: currentStageGuidance,
    items: secondaryReadinessItems,
    stages: reviewTimeline.map((item) => ({
      id: item.id,
      label: item.label,
      statusLabel: item.statusLabel,
      pillClassName: item.pillClassName,
      isActive: item.id === currentStage,
      action: getWorkflowDetailAction(stageActions[item.id]),
    })),
    currentAction: currentStageAction
      ? {
          action: getWorkflowDetailAction(currentStageAction)!,
          description: currentStageAction.description,
        }
      : undefined,
  } satisfies AgentShellReadinessView
}

export function getCurrentStageEntryView({
  stage,
  guidance,
  actionConfig,
}: {
  stage: ReviewTimelineItem
  guidance: string
  actionConfig?: ReviewTimelineActionConfig
}) {
  const action = getWorkflowDetailAction(actionConfig)
  const pillClassName = getEntryPillClassName(stage.pillClassName)

  return {
    id: "current-stage",
    chip: {
      label: `Stage ${stage.label}`,
      pillClassName,
      action,
    },
    panel: {
      eyebrow: "Current stage",
      title: `${stage.label} is the active review gate`,
      pillLabel: stage.statusLabel,
      pillClassName,
      summary: guidance,
      meta: actionConfig?.description ? [actionConfig.description] : [],
      actions: action ? [action] : [],
    },
  } satisfies AgentShellEntryView
}

export function getProposalDecisionTrendEntryView(
  proposalDecisionTrend?: ProposalDecisionTrend,
) {
  if (!proposalDecisionTrend) {
    return undefined
  }

  return {
    id: "proposal-decision-trend",
    chip: {
      label: `Trend ${proposalDecisionTrend.label}`,
      pillClassName: proposalDecisionTrend.pillClassName,
    },
  } satisfies AgentShellEntryView
}

export function getProposalChecklistEntryView({
  proposalProgress,
  currentStageAction,
}: {
  proposalProgress?: ProposalChecklistProgress
  currentStageAction?: ReviewTimelineActionConfig
}) {
  if (!proposalProgress?.totalTaggedItems) {
    return undefined
  }

  const isComplete =
    proposalProgress.pendingCount === 0 && proposalProgress.reviewCount === 0
  const primaryAction =
    proposalProgress.reviewCount > 0
      ? ({
          id: "proposal-checklist-review",
          label: "Review diff",
          kind: "review-diff",
        } satisfies AgentShellDetailAction)
      : proposalProgress.pendingCount > 0
        ? getWorkflowDetailAction(currentStageAction)
        : undefined

  return {
    id: "proposal-checklist",
    chip: {
      label: `Checklist ${proposalProgress.doneCount}/${proposalProgress.totalTaggedItems}`,
      pillClassName: isComplete ? "status-ready" : "status-dirty",
      action: primaryAction,
    },
    panel: {
      eyebrow: "Checklist progress",
      title: isComplete
        ? "Tagged checklist items are complete"
        : "Tagged checklist items still need attention",
      pillLabel: isComplete ? "Complete" : "In progress",
      pillClassName: isComplete ? "status-ready" : "status-dirty",
      summary: isComplete
        ? "All tagged checklist items are complete against the current session state."
        : proposalProgress.reviewCount > 0
          ? `${proposalProgress.reviewCount} tagged item(s) still need diff review before the proposal is fully settled.`
          : `${proposalProgress.pendingCount} tagged item(s) still depend on upstream save, build, inspect, or preview work.`,
      meta: [
        `Done ${proposalProgress.doneCount}`,
        `Pending ${proposalProgress.pendingCount}`,
        `Review ${proposalProgress.reviewCount}`,
      ],
      actions: primaryAction ? [primaryAction] : [],
    },
  } satisfies AgentShellEntryView
}

export function getProposalDecisionEntryView({
  latestProposalExists,
  latestProposalDecision,
  latestProposalIsStale,
  recentProposalDecisions,
  proposalDecisionTrend,
}: {
  latestProposalExists: boolean
  latestProposalDecision?: ProposalDecision
  latestProposalIsStale: boolean
  recentProposalDecisions: ProposalDecisionEntry[]
  proposalDecisionTrend?: ProposalDecisionTrend
}) {
  if (!latestProposalExists) {
    return undefined
  }

  const isApproved = latestProposalDecision?.status === "approved"
  const needsChanges = latestProposalDecision?.status === "needs-changes"
  const pillLabel = isApproved
    ? "Approved"
    : needsChanges
      ? "Needs changes"
      : "Pending"
  const pillClassName = isApproved
    ? "status-ready"
    : needsChanges
      ? "status-dirty"
      : "accent"

  return {
    id: "proposal-decision",
    chip: {
      label: `Decision ${pillLabel}`,
      pillClassName,
    },
    panel: {
      eyebrow: "Proposal decision",
      title: isApproved
        ? "Latest proposal decision is approved"
        : needsChanges
          ? "Latest proposal decision still requests changes"
          : "Latest proposal decision is still pending",
      pillLabel,
      pillClassName,
      summary: latestProposalIsStale
        ? "The latest proposal is stale, so confirm the current session state before reusing its decision."
        : isApproved
          ? "The latest proposal has been approved, but you can still record a new decision if the current review state changed."
          : needsChanges
            ? "The latest recorded decision still requests changes before approval."
            : "No decision has been recorded for the latest proposal yet.",
      meta: [
        `Recent decisions ${recentProposalDecisions.length}`,
        ...(proposalDecisionTrend
          ? [`Trend ${proposalDecisionTrend.label}`]
          : []),
      ],
      issues: recentProposalDecisions.map((decision, index) => ({
        id: `decision-${decision.createdAt}-${index}`,
        message: decision.proposalTitle,
        meta: `${decision.status === "approved" ? "Approved" : "Needs changes"} · ${decision.createdAt}`,
      })),
      actions: [
        {
          id: "proposal-decision-approve",
          label: "Approve",
          kind: "approve-proposal",
        },
        {
          id: "proposal-decision-needs-changes",
          label: "Needs changes",
          kind: "needs-changes-proposal",
        },
      ],
    },
  } satisfies AgentShellEntryView
}

export function getSourceValidationEntryView({
  sourceValidation,
  sourceValidationView,
}: {
  sourceValidation: SourceValidationState
  sourceValidationView: SourceValidationViewModel
}) {
  if (sourceValidation.status === "idle") {
    return undefined
  }

  return {
    id: "source-validation",
    chip: {
      label: sourceValidationView.snapshotLabel,
      pillClassName: sourceValidationView.pill.className,
      action:
        sourceValidationView.primaryAction === "focus-first-issue" &&
        sourceValidationView.primaryDiagnostic
          ? ({
              id: "source-validation-focus-first",
              label: sourceValidationView.primaryActionLabel,
              kind: "focus-diagnostic",
              diagnostic: sourceValidationView.primaryDiagnostic,
            } satisfies AgentShellDetailAction)
          : ({
              id: "source-validation-open-source",
              label: sourceValidationView.primaryActionLabel,
              kind: "open-source",
            } satisfies AgentShellDetailAction),
    },
    panel: {
      eyebrow: "Source validation",
      title: sourceValidationView.headline,
      pillLabel: sourceValidationView.pill.label,
      pillClassName: sourceValidationView.pill.className,
      summary: sourceValidationView.summary,
      meta: [
        `Diagnostics ${sourceValidationView.diagnosticsCount}`,
        ...(sourceValidationView.validatedAt
          ? [sourceValidationView.validatedAt]
          : []),
      ],
      issues: sourceValidationView.issues.map((issue) => ({
        id: issue.diagnostic.id,
        message: issue.diagnostic.message,
        meta: issue.meta,
        action: issue.canOpenInSource
          ? ({
              id: `source-validation-${issue.diagnostic.id}`,
              label: "Open in Source",
              kind: "focus-diagnostic",
              diagnostic: issue.diagnostic,
            } satisfies AgentShellDetailAction)
          : undefined,
      })),
      hasAdditionalIssues: sourceValidationView.hasAdditionalIssues,
      additionalIssuesLabel:
        "More validation issues are available in the Source panel.",
      actions: [
        {
          id: "source-validation-open-source",
          label: "Open Source",
          kind: "open-source",
        },
        ...(sourceValidationView.primaryDiagnostic
          ? [
              {
                id: "source-validation-focus-first",
                label: "Focus first issue",
                kind: "focus-diagnostic",
                diagnostic: sourceValidationView.primaryDiagnostic,
              } satisfies AgentShellDetailAction,
            ]
          : []),
      ],
    },
  } satisfies AgentShellEntryView
}

export function getSourceFocusEntryView(
  sourceFocusView?: SourceFocusViewModel,
) {
  if (!sourceFocusView?.statusPill) {
    return undefined
  }

  const actions: AgentShellDetailAction[] = [
    {
      id: "source-focus-primary",
      label: sourceFocusView.actions.primaryLabel,
      kind:
        sourceFocusView.actions.primaryAction === "refresh-source-focus"
          ? "refresh-source-focus"
          : sourceFocusView.actions.primaryAction === "reveal-source-origin"
            ? "reveal-source-origin"
            : "open-source-focus",
    },
    ...(sourceFocusView.actions.canRevealSourceOrigin &&
    sourceFocusView.actions.primaryAction !== "reveal-source-origin"
      ? [
          {
            id: "source-focus-reveal",
            label: "Reveal source origin",
            kind: "reveal-source-origin",
          } satisfies AgentShellDetailAction,
        ]
      : []),
    ...(sourceFocusView.actions.canRefreshFocus &&
    sourceFocusView.actions.primaryAction !== "refresh-source-focus"
      ? [
          {
            id: "source-focus-refresh",
            label: "Refresh focus",
            kind: "refresh-source-focus",
          } satisfies AgentShellDetailAction,
        ]
      : []),
  ]

  return {
    id: "source-focus",
    chip: {
      label: `Source ${sourceFocusView.statusPill.label}`,
      pillClassName: sourceFocusView.statusPill.className,
      action: actions[0],
    },
    panel: {
      eyebrow: "Source focus",
      title: sourceFocusView.label,
      pillLabel: sourceFocusView.statusPill.label,
      pillClassName: sourceFocusView.statusPill.className,
      summary: sourceFocusView.summary ?? "",
      metaDisplay: "first-pill",
      meta: [
        ...(sourceFocusView.originLabel ? [sourceFocusView.originLabel] : []),
        sourceFocusView.selectionLabel,
        ...(sourceFocusView.reviewOriginLabel
          ? [`From ${sourceFocusView.reviewOriginLabel}`]
          : []),
        ...(sourceFocusView.originReference
          ? [sourceFocusView.originReference]
          : []),
      ],
      actions,
    },
  } satisfies AgentShellEntryView
}

export function getInspectDiagnosticsEntryView(
  inspectDiagnosticsView: InspectDiagnosticsViewModel,
) {
  if (inspectDiagnosticsView.diagnosticsCount === 0) {
    return undefined
  }

  return {
    id: "inspect-diagnostics",
    chip: {
      label: inspectDiagnosticsView.snapshotLabel,
      pillClassName: inspectDiagnosticsView.pill.className,
      action:
        inspectDiagnosticsView.primaryAction === "focus-first-issue" &&
        inspectDiagnosticsView.primaryDiagnostic
          ? ({
              id: "inspect-diagnostics-focus-first",
              label: inspectDiagnosticsView.primaryActionLabel,
              kind: "focus-diagnostic",
              diagnostic: inspectDiagnosticsView.primaryDiagnostic,
            } satisfies AgentShellDetailAction)
          : ({
              id: "inspect-diagnostics-open-inspect",
              label: inspectDiagnosticsView.primaryActionLabel,
              kind: "open-inspect",
            } satisfies AgentShellDetailAction),
    },
    panel: {
      eyebrow: "Inspect diagnostics",
      title: inspectDiagnosticsView.headline,
      pillLabel: inspectDiagnosticsView.pill.label,
      pillClassName: inspectDiagnosticsView.pill.className,
      summary: inspectDiagnosticsView.summary,
      meta: [inspectDiagnosticsView.countSummary],
      issues: inspectDiagnosticsView.issues.map((issue) => ({
        id: issue.diagnostic.id,
        message: issue.diagnostic.message,
        meta: issue.meta,
        action: issue.canOpenInSource
          ? ({
              id: `inspect-diagnostic-${issue.diagnostic.id}`,
              label: "Open in Source",
              kind: "focus-diagnostic",
              diagnostic: issue.diagnostic,
            } satisfies AgentShellDetailAction)
          : undefined,
      })),
      hasAdditionalIssues: inspectDiagnosticsView.hasAdditionalIssues,
      additionalIssuesLabel:
        "More inspect diagnostics are available in the Inspect panel.",
      actions: [
        {
          id: "inspect-diagnostics-primary",
          label: inspectDiagnosticsView.primaryActionLabel,
          kind:
            inspectDiagnosticsView.primaryAction === "focus-first-issue"
              ? "focus-diagnostic"
              : "open-inspect",
          ...(inspectDiagnosticsView.primaryAction === "focus-first-issue" &&
          inspectDiagnosticsView.primaryDiagnostic
            ? { diagnostic: inspectDiagnosticsView.primaryDiagnostic }
            : {}),
        } as AgentShellDetailAction,
      ],
    },
  } satisfies AgentShellEntryView
}

export function getProposalDriftEntryView(
  proposalComparison?: SourceComparisonSummary,
) {
  const changedLineCount = proposalComparison?.changedLineCount ?? 0
  const hasDrift = changedLineCount > 0
  const reviewDiffAction = hasDrift
    ? ({
        id: "proposal-drift-review",
        label: "Review diff",
        kind: "review-diff",
      } satisfies AgentShellDetailAction)
    : undefined

  return {
    id: "proposal-drift",
    chip: {
      label: `Drift ${changedLineCount}`,
      pillClassName: hasDrift ? "status-dirty" : "status-ready",
      action: reviewDiffAction,
    },
    panel: hasDrift
      ? {
          eyebrow: "Proposal drift",
          title: "Proposal snapshot drift detected",
          pillLabel: "Needs review",
          pillClassName: "status-dirty",
          summary:
            "The current draft/source has drifted away from the latest proposal snapshot. Review the compare groups before approving or redrafting.",
          meta: [
            `Changed lines ${changedLineCount}`,
            `Changed groups ${proposalComparison?.previewGroups.length ?? 0}`,
            ...(proposalComparison?.firstChangedLine
              ? [`First line ${proposalComparison.firstChangedLine}`]
              : []),
          ],
          actions: reviewDiffAction ? [reviewDiffAction] : [],
        }
      : undefined,
  } satisfies AgentShellEntryView
}

export function getPreviewEntryView({
  buildStatus,
  hasPreview,
}: {
  buildStatus: BuildRunSummary["status"]
  hasPreview: boolean
}) {
  const previewAction = hasPreview
    ? ({
        id: "preview-open",
        label: "Open Preview",
        kind: "open-preview",
      } satisfies AgentShellDetailAction)
    : buildStatus === "running"
      ? undefined
      : ({
          id: "preview-build",
          label: "Run Build",
          kind: "build",
        } satisfies AgentShellDetailAction)

  return {
    id: "preview",
    chip: {
      label: hasPreview ? "Preview ready" : "Preview missing",
      pillClassName: hasPreview ? "status-ready" : "status-dirty",
      action: previewAction,
    },
    panel: hasPreview
      ? undefined
      : {
          eyebrow: "Preview artifact",
          title:
            buildStatus === "running"
              ? "Preview build in progress"
              : "Preview artifact missing",
          pillLabel: buildStatus === "running" ? "Building" : "Missing",
          pillClassName: "status-dirty",
          summary:
            buildStatus === "running"
              ? "A build is running and the next preview artifact has not been written yet."
              : "No preview artifact is currently available for this session. Run a build to regenerate it.",
          meta: [`Build ${buildStatus}`],
          actions: previewAction ? [previewAction] : [],
        },
  } satisfies AgentShellEntryView
}
