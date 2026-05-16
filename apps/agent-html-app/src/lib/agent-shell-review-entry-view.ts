import type { DiagnosticItem, SourceValidationState } from "./types"
import type { InspectDiagnosticsViewModel } from "./inspect-diagnostics-view"
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

export type AgentShellEntryView = {
  chip: {
    label: string
    pillClassName: string
    action: AgentShellDetailAction
  }
  panel: {
    title: string
    pillLabel: string
    pillClassName: string
    summary: string
    meta: string[]
    issues?: Array<{
      id: string
      message: string
      meta: string
      action?: AgentShellDetailAction
    }>
    hasAdditionalIssues?: boolean
    actions: AgentShellDetailAction[]
  }
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
    chip: {
      label: `Source ${sourceFocusView.statusPill.label}`,
      pillClassName: sourceFocusView.statusPill.className,
      action: actions[0],
    },
    panel: {
      title: sourceFocusView.label,
      pillLabel: sourceFocusView.statusPill.label,
      pillClassName: sourceFocusView.statusPill.className,
      summary: sourceFocusView.summary ?? "",
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
