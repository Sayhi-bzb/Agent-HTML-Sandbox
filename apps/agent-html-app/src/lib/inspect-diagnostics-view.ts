import type { DiagnosticItem, InspectSnapshot } from "./types"

export type InspectDiagnosticsPrimaryAction =
  | "open-inspect"
  | "focus-first-issue"

export type InspectDiagnosticsViewModel = {
  headline: string
  pill: { label: "Clean" | "Needs review"; className: string }
  diagnosticsCount: number
  countSummary: string
  snapshotLabel: string
  summary: string
  primaryDiagnostic?: DiagnosticItem
  issues: Array<{
    diagnostic: DiagnosticItem
    meta: string
    canOpenInSource: boolean
  }>
  hasAdditionalIssues: boolean
  primaryAction: InspectDiagnosticsPrimaryAction
  primaryActionLabel: "Open Inspect" | "Focus first issue"
}

export function getInspectDiagnosticsHeadline(inspect: InspectSnapshot) {
  if (inspect.diagnostics.length === 0) {
    return "No structured diagnostics"
  }

  const errorCount = inspect.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length
  return errorCount > 0 ? "Errors need attention" : "Review warnings and notes"
}

export function getPrimaryInspectDiagnostic(inspect: InspectSnapshot) {
  return inspect.diagnostics.find(
    (diagnostic) => typeof diagnostic.line === "number",
  )
}

export function getInspectDiagnosticsStatusPill(inspect: InspectSnapshot) {
  return inspect.diagnostics.length > 0
    ? ({ label: "Needs review", className: "status-dirty" } as const)
    : ({ label: "Clean", className: "status-ready" } as const)
}

export function formatInspectDiagnosticMeta(
  diagnostic: Pick<DiagnosticItem, "line" | "column" | "code" | "source">,
) {
  return [
    typeof diagnostic.line === "number"
      ? `line ${diagnostic.line}${
          typeof diagnostic.column === "number" ? `:${diagnostic.column}` : ""
        }`
      : undefined,
    diagnostic.code,
    diagnostic.source,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function getInspectDiagnosticsIssues(
  inspect: InspectSnapshot,
  limit = 2,
) {
  const issues = inspect.diagnostics.slice(0, limit).map((diagnostic) => ({
    diagnostic,
    meta: formatInspectDiagnosticMeta(diagnostic),
    canOpenInSource: typeof diagnostic.line === "number",
  }))

  return {
    issues,
    hasAdditionalIssues: inspect.diagnostics.length > issues.length,
  }
}

export function getInspectDiagnosticsPrimaryAction(inspect: InspectSnapshot) {
  if (getPrimaryInspectDiagnostic(inspect)) {
    return "focus-first-issue" satisfies InspectDiagnosticsPrimaryAction
  }

  return "open-inspect" satisfies InspectDiagnosticsPrimaryAction
}

export function getInspectDiagnosticsViewModel(
  inspect: InspectSnapshot,
): InspectDiagnosticsViewModel {
  const primaryDiagnostic = getPrimaryInspectDiagnostic(inspect)
  const primaryAction = getInspectDiagnosticsPrimaryAction(inspect)
  const pill = getInspectDiagnosticsStatusPill(inspect)
  const diagnosticsCount = inspect.diagnostics.length
  const { issues, hasAdditionalIssues } = getInspectDiagnosticsIssues(inspect)

  return {
    headline: getInspectDiagnosticsHeadline(inspect),
    pill,
    diagnosticsCount,
    countSummary: `${diagnosticsCount} diagnostic(s)`,
    snapshotLabel: `Diagnostics ${diagnosticsCount}`,
    summary:
      diagnosticsCount > 0
        ? `Review ${diagnosticsCount} diagnostic(s) from the latest inspect run before trusting the proposal.`
        : "No structured diagnostics from the latest inspect run.",
    primaryDiagnostic,
    issues,
    hasAdditionalIssues,
    primaryAction,
    primaryActionLabel:
      primaryAction === "focus-first-issue"
        ? "Focus first issue"
        : "Open Inspect",
  }
}
