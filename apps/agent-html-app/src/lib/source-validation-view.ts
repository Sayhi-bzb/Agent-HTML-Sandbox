import type { DiagnosticItem, SourceValidationState } from "./types"

export type SourceValidationPrimaryAction = "open-source" | "focus-first-issue"
export type SourceValidationStatusPill = {
  label: "Idle" | "Validating" | "Invalid" | "Valid"
  className: string
}

export type SourceValidationViewModel = {
  headline: string
  pill: SourceValidationStatusPill
  snapshotLabel: string
  summary: string
  diagnosticsCount: number
  validatedAt?: string
  primaryDiagnostic?: DiagnosticItem
  issues: Array<{
    diagnostic: DiagnosticItem
    meta: string
    canOpenInSource: boolean
  }>
  hasAdditionalIssues: boolean
  primaryAction: SourceValidationPrimaryAction
  primaryActionLabel: "Open Source" | "Focus first issue"
}

export function getSourceValidationHeadline(validation: SourceValidationState) {
  switch (validation.status) {
    case "running":
      return "Validation in progress"
    case "invalid":
      return "Source needs review"
    case "valid":
      return "Source validation is clean"
    default:
      return "Validation standing by"
  }
}

export function getSourceValidationStatusPill(
  validation: SourceValidationState,
): SourceValidationStatusPill {
  switch (validation.status) {
    case "running":
      return { label: "Validating", className: "status-building" as const }
    case "invalid":
      return { label: "Invalid", className: "status-dirty" as const }
    case "valid":
      return { label: "Valid", className: "status-ready" as const }
    default:
      return { label: "Idle", className: "" as const }
  }
}

export function getSourceValidationSnapshotLabel(
  validation: SourceValidationState,
) {
  switch (validation.status) {
    case "running":
      return "Validation running"
    case "invalid":
      return `Validation ${validation.diagnostics.length}`
    case "valid":
      return "Validation ready"
    default:
      return "Validation idle"
  }
}

export function getSourceValidationSummary(validation: SourceValidationState) {
  if (validation.status === "idle") {
    return "Lightweight validation will run automatically after you pause typing."
  }

  return (
    validation.structureSummary ??
    (validation.status === "running"
      ? "Validation is running on the current draft."
      : "Validation summary unavailable.")
  )
}

export function getPrimarySourceValidationDiagnostic(
  validation: SourceValidationState,
) {
  return validation.diagnostics.find(
    (diagnostic) => typeof diagnostic.line === "number",
  )
}

export function getSourceValidationIssues(
  validation: SourceValidationState,
  limit = 2,
) {
  const issues = validation.diagnostics.slice(0, limit).map((diagnostic) => ({
    diagnostic,
    meta: formatSourceValidationDiagnosticMeta(diagnostic),
    canOpenInSource: typeof diagnostic.line === "number",
  }))

  return {
    issues,
    hasAdditionalIssues: validation.diagnostics.length > issues.length,
  }
}

export function formatSourceValidationDiagnosticMeta(
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

export function getSourceValidationPrimaryAction(
  validation: SourceValidationState,
): SourceValidationPrimaryAction {
  if (
    validation.status === "invalid" &&
    getPrimarySourceValidationDiagnostic(validation)
  ) {
    return "focus-first-issue"
  }

  return "open-source"
}

export function getSourceValidationViewModel(
  validation: SourceValidationState,
): SourceValidationViewModel {
  const pill = getSourceValidationStatusPill(validation)
  const primaryDiagnostic = getPrimarySourceValidationDiagnostic(validation)
  const primaryAction = getSourceValidationPrimaryAction(validation)
  const { issues, hasAdditionalIssues } = getSourceValidationIssues(validation)

  return {
    headline: getSourceValidationHeadline(validation),
    pill,
    snapshotLabel: getSourceValidationSnapshotLabel(validation),
    summary: getSourceValidationSummary(validation),
    diagnosticsCount: validation.diagnostics.length,
    validatedAt: validation.validatedAt,
    primaryDiagnostic,
    issues,
    hasAdditionalIssues,
    primaryAction,
    primaryActionLabel:
      primaryAction === "focus-first-issue"
        ? "Focus first issue"
        : "Open Source",
  }
}
