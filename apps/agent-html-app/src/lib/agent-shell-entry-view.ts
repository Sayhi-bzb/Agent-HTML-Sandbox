import type { DiagnosticItem, SourceValidationState } from "./types"
import type {
  SourceFocusReviewStatus,
  SourceFocusTarget,
} from "./source-focus"
import { getSourceFocusViewModel } from "./source-focus-view"
import { getInspectDiagnosticsViewModel } from "./inspect-diagnostics-view"
import { getSourceValidationViewModel } from "./source-validation-view"
import type { InspectSnapshot } from "./types"

export type AgentShellEntryAction =
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
      kind: "build"
    }

export type AgentShellEntryChip = {
  label: string
  pillClassName: string
  action: AgentShellEntryAction
}

export type AgentShellDetailPanel = {
  title: string
  pillLabel: string
  pillClassName: string
  summary: string
  meta: string[]
  issues?: Array<{
    id: string
    message: string
    meta: string
    action?: AgentShellEntryAction
  }>
  hasAdditionalIssues?: boolean
  actions: AgentShellEntryAction[]
}

export function getSourceValidationEntryView(
  sourceValidation: SourceValidationState,
) {
  if (sourceValidation.status === "idle") {
    return undefined
  }

  const view = getSourceValidationViewModel(sourceValidation)

  return {
    chip: {
      label: view.snapshotLabel,
      pillClassName: view.pill.className,
      action:
        view.primaryAction === "focus-first-issue" && view.primaryDiagnostic
          ? ({
              id: "source-validation-focus-first",
              label: view.primaryActionLabel,
              kind: "focus-diagnostic",
              diagnostic: view.primaryDiagnostic,
            } satisfies AgentShellEntryAction)
          : ({
              id: "source-validation-open-source",
              label: view.primaryActionLabel,
              kind: "open-source",
            } satisfies AgentShellEntryAction),
    } satisfies AgentShellEntryChip,
    panel: {
      title: view.headline,
      pillLabel: view.pill.label,
      pillClassName: view.pill.className,
      summary: view.summary,
      meta: [
        `Diagnostics ${view.diagnosticsCount}`,
        ...(view.validatedAt ? [view.validatedAt] : []),
      ],
      issues: view.issues.map((issue) => ({
        id: issue.diagnostic.id,
        message: issue.diagnostic.message,
        meta: issue.meta,
        action: issue.canOpenInSource
          ? ({
              id: `source-validation-${issue.diagnostic.id}`,
              label: "Open in Source",
              kind: "focus-diagnostic",
              diagnostic: issue.diagnostic,
            } satisfies AgentShellEntryAction)
          : undefined,
      })),
      hasAdditionalIssues: view.hasAdditionalIssues,
      actions: [
        {
          id: "source-validation-open-source",
          label: "Open Source",
          kind: "open-source",
        },
        ...(view.primaryDiagnostic
          ? [
              {
                id: "source-validation-focus-first",
                label: "Focus first issue",
                kind: "focus-diagnostic",
                diagnostic: view.primaryDiagnostic,
              } satisfies AgentShellEntryAction,
            ]
          : []),
      ],
    } satisfies AgentShellDetailPanel,
  }
}

export function getSourceFocusEntryView({
  activeSourceFocus,
  activeSourceFocusReviewStatus,
  canRevealSourceOrigin,
}: {
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  canRevealSourceOrigin: boolean
}) {
  const view = getSourceFocusViewModel({
    sourceFocus: activeSourceFocus,
    reviewStatus: activeSourceFocusReviewStatus,
    canRevealSourceOrigin,
  })
  if (!activeSourceFocus || !view?.statusPill) {
    return undefined
  }

  const actions: AgentShellEntryAction[] = [
    {
      id: "source-focus-primary",
      label: view.actions.primaryLabel,
      kind:
        view.actions.primaryAction === "refresh-source-focus"
          ? "refresh-source-focus"
          : view.actions.primaryAction === "reveal-source-origin"
            ? "reveal-source-origin"
            : "open-source-focus",
    },
    ...(view.actions.canRevealSourceOrigin &&
    view.actions.primaryAction !== "reveal-source-origin"
      ? [
          {
            id: "source-focus-reveal",
            label: "Reveal source origin",
            kind: "reveal-source-origin",
          } satisfies AgentShellEntryAction,
        ]
      : []),
    ...(view.actions.canRefreshFocus &&
    view.actions.primaryAction !== "refresh-source-focus"
      ? [
          {
            id: "source-focus-refresh",
            label: "Refresh focus",
            kind: "refresh-source-focus",
          } satisfies AgentShellEntryAction,
        ]
      : []),
  ]

  return {
    chip: {
      label: `Source ${view.statusPill.label}`,
      pillClassName: view.statusPill.className,
      action: actions[0],
    } satisfies AgentShellEntryChip,
    panel: {
      title: view.label,
      pillLabel: view.statusPill.label,
      pillClassName: view.statusPill.className,
      summary: view.summary ?? "",
      meta: [
        ...(view.originLabel ? [view.originLabel] : []),
        view.selectionLabel,
        ...(view.reviewOriginLabel ? [`From ${view.reviewOriginLabel}`] : []),
        ...(view.originReference ? [view.originReference] : []),
      ],
      actions,
    } satisfies AgentShellDetailPanel,
  }
}

export function getInspectDiagnosticsEntryView(inspect: InspectSnapshot) {
  if (inspect.diagnostics.length === 0) {
    return undefined
  }

  const view = getInspectDiagnosticsViewModel(inspect)

  return {
    chip: {
      label: view.snapshotLabel,
      pillClassName: view.pill.className,
      action:
        view.primaryAction === "focus-first-issue" && view.primaryDiagnostic
          ? ({
              id: "inspect-diagnostics-focus-first",
              label: view.primaryActionLabel,
              kind: "focus-diagnostic",
              diagnostic: view.primaryDiagnostic,
            } satisfies AgentShellEntryAction)
          : ({
              id: "inspect-diagnostics-open-inspect",
              label: view.primaryActionLabel,
              kind: "open-inspect",
            } satisfies AgentShellEntryAction),
    } satisfies AgentShellEntryChip,
    panel: {
      title: view.headline,
      pillLabel: view.pill.label,
      pillClassName: view.pill.className,
      summary: view.summary,
      meta: [view.countSummary],
      issues: view.issues.map((issue) => ({
        id: issue.diagnostic.id,
        message: issue.diagnostic.message,
        meta: issue.meta,
        action: issue.canOpenInSource
          ? ({
              id: `inspect-diagnostic-${issue.diagnostic.id}`,
              label: "Open in Source",
              kind: "focus-diagnostic",
              diagnostic: issue.diagnostic,
            } satisfies AgentShellEntryAction)
          : undefined,
      })),
      hasAdditionalIssues: view.hasAdditionalIssues,
      actions: [
        {
          id: "inspect-diagnostics-primary",
          label: view.primaryActionLabel,
          kind:
            view.primaryAction === "focus-first-issue"
              ? "focus-diagnostic"
              : "open-inspect",
          ...(view.primaryAction === "focus-first-issue" && view.primaryDiagnostic
            ? { diagnostic: view.primaryDiagnostic }
            : {}),
        } as AgentShellEntryAction,
      ],
    } satisfies AgentShellDetailPanel,
  }
}
