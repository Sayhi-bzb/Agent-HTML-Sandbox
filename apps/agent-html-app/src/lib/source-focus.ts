import {
  getPreviewGroupKey,
  type SourceComparisonPreviewGroup,
  type SourceComparisonSummary,
} from "./source-comparison"
import {
  createReviewFocusTargetFromGroups,
  findReviewFocusTargetById,
  getReviewFocusPreview,
  type ReviewFocusTarget,
} from "./review-focus"
import type { DiagnosticItem } from "./types"

export type SourceFocusOriginKind =
  | "proposal-checklist-target"
  | "saved-checklist-target"
  | "proposal-compare-diff"
  | "saved-compare-diff"
  | "source-validation-diagnostic"
  | "inspect-diagnostic"

export type SourceFocusReviewOrigin = Pick<
  ReviewFocusTarget,
  "targetId" | "label" | "mode" | "lineLabel"
> & {
  groupKey: string
}

export type SourceFocusTarget = {
  label: string
  startLine: number
  endLine: number
  requestKey: string
  originKind?: SourceFocusOriginKind
  originId?: string
  reviewOrigin?: SourceFocusReviewOrigin
}

export function createSourceFocusTargetFromGroup({
  label,
  group,
  requestKey,
  compareMode,
  reviewTarget,
}: {
  label: string
  group: SourceComparisonPreviewGroup
  requestKey?: string
  compareMode?: "proposal" | "saved"
  reviewTarget?: ReviewFocusTarget
}) {
  const groupKey = getPreviewGroupKey(group)
  const originKind = getSourceFocusOriginKindFromGroup({
    compareMode,
    reviewTarget,
  })
  const originId = reviewTarget
    ? `${reviewTarget.targetId}:${groupKey}`
    : `${compareMode ?? "saved"}-compare-diff:${groupKey}`

  return {
    label,
    startLine: Math.max(1, Math.min(group.startLine, group.endLine)),
    endLine: Math.max(1, Math.max(group.startLine, group.endLine)),
    requestKey:
      requestKey ??
      `source-focus-${group.startLine}-${group.endLine}-${Date.now()}`,
    originKind,
    originId,
    reviewOrigin: reviewTarget
      ? {
          targetId: reviewTarget.targetId,
          label: reviewTarget.label,
          mode: reviewTarget.mode,
          lineLabel: reviewTarget.lineLabel,
          groupKey,
        }
      : undefined,
  } satisfies SourceFocusTarget
}

export function createSourceFocusTargetFromDiagnostic({
  diagnostic,
  requestKey,
}: {
  diagnostic: Pick<DiagnosticItem, "id" | "message" | "line" | "source">
  requestKey?: string
}) {
  if (typeof diagnostic.line !== "number") {
    return undefined
  }

  return {
    label: diagnostic.message,
    startLine: Math.max(1, diagnostic.line),
    endLine: Math.max(1, diagnostic.line),
    requestKey:
      requestKey ?? `source-focus-diagnostic-${diagnostic.line}-${Date.now()}`,
    originKind:
      diagnostic.source === "validation"
        ? "source-validation-diagnostic"
        : "inspect-diagnostic",
    originId: `${
      diagnostic.source === "validation"
        ? "source-validation-diagnostic"
        : "inspect-diagnostic"
    }:${diagnostic.id ?? diagnostic.line}`,
  } satisfies SourceFocusTarget
}

export function getSourceSelectionRange(
  source: string,
  target: Pick<SourceFocusTarget, "startLine" | "endLine">,
) {
  const lines = source.split(/\r?\n/)
  const normalizedStartLine = clampLine(target.startLine, lines.length)
  const normalizedEndLine = clampLine(
    Math.max(target.startLine, target.endLine),
    lines.length,
  )

  let selectionStart = 0
  for (let index = 0; index < normalizedStartLine - 1; index += 1) {
    selectionStart += lines[index].length + 1
  }

  let selectionEnd = selectionStart
  for (
    let index = normalizedStartLine - 1;
    index <= normalizedEndLine - 1;
    index += 1
  ) {
    selectionEnd += lines[index].length
    if (index < normalizedEndLine - 1) {
      selectionEnd += 1
    }
  }

  return {
    startLine: normalizedStartLine,
    endLine: normalizedEndLine,
    selectionStart,
    selectionEnd,
  }
}

export type SourceFocusReviewStatus = {
  kind: "linked" | "moved" | "missing"
  summary: string
  currentReviewTarget?: ReviewFocusTarget
  currentGroup?: SourceComparisonPreviewGroup
  currentDiagnostic?: DiagnosticItem
}

export function getSourceFocusLineLabel(
  target: Pick<SourceFocusTarget, "startLine" | "endLine">,
) {
  return target.startLine === target.endLine
    ? `Line ${target.startLine}`
    : `Lines ${target.startLine}-${target.endLine}`
}

export function getSourceFocusOriginLabel(target: SourceFocusTarget) {
  switch (target.originKind) {
    case "proposal-checklist-target":
      return "Proposal checklist target"
    case "saved-checklist-target":
      return "Saved checklist target"
    case "proposal-compare-diff":
      return "Proposal compare diff"
    case "saved-compare-diff":
      return "Saved compare diff"
    case "source-validation-diagnostic":
      return "Source validation diagnostic"
    case "inspect-diagnostic":
      return "Inspect diagnostic"
    default:
      return undefined
  }
}

export function getSourceFocusOriginReference(target: SourceFocusTarget) {
  if (target.reviewOrigin) {
    return `Ref ${target.reviewOrigin.targetId} · ${target.reviewOrigin.groupKey}`
  }

  if (!target.originId) {
    return undefined
  }

  const detail = target.originId.split(":").slice(1).join(":")
  switch (target.originKind) {
    case "proposal-compare-diff":
    case "saved-compare-diff":
      return `Ref diff ${detail}`
    case "source-validation-diagnostic":
      return `Ref validation ${detail}`
    case "inspect-diagnostic":
      return `Ref diagnostic ${detail}`
    default:
      return `Ref ${target.originId}`
  }
}

function getSourceFocusOriginKindFromGroup({
  compareMode,
  reviewTarget,
}: {
  compareMode?: "proposal" | "saved"
  reviewTarget?: ReviewFocusTarget
}): SourceFocusOriginKind {
  if (!reviewTarget) {
    return compareMode === "proposal"
      ? "proposal-compare-diff"
      : "saved-compare-diff"
  }

  if (reviewTarget.targetId === "proposal-drift") {
    return "proposal-compare-diff"
  }

  if (reviewTarget.targetId === "saved-drift") {
    return "saved-compare-diff"
  }

  return reviewTarget.mode === "proposal"
    ? "proposal-checklist-target"
    : "saved-checklist-target"
}

export function getSourceFocusStatusPill(
  status?: SourceFocusReviewStatus,
): { label: "Aligned" | "Moved" | "Missing"; className: string } | undefined {
  if (!status) {
    return undefined
  }

  switch (status.kind) {
    case "linked":
      return { label: "Aligned", className: "status-ready" }
    case "moved":
      return { label: "Moved", className: "status-dirty" }
    case "missing":
      return { label: "Missing", className: "status-error" }
    default:
      return undefined
  }
}

export function getSourceFocusSummary({
  sourceFocus,
  reviewStatus,
}: {
  sourceFocus?: SourceFocusTarget
  reviewStatus?: SourceFocusReviewStatus
}) {
  if (reviewStatus) {
    return reviewStatus.summary
  }

  switch (sourceFocus?.originKind) {
    case "proposal-checklist-target":
      return "This source focus came from a proposal checklist target."
    case "saved-checklist-target":
      return "This source focus came from a saved-source checklist target."
    case "proposal-compare-diff":
      return "This source focus came from the proposal compare diff."
    case "saved-compare-diff":
      return "This source focus came from the saved compare diff."
    case "source-validation-diagnostic":
      return "This source focus came from a source validation diagnostic."
    case "inspect-diagnostic":
      return "This source focus came from an inspect diagnostic."
    default:
      return undefined
  }
}

export function getSourceFocusReadinessWarning(
  status?: SourceFocusReviewStatus,
) {
  switch (status?.kind) {
    case "moved":
      return "The current source focus moved away from its originating review target."
    case "missing":
      return "The current source focus no longer maps to an available review target."
    default:
      return undefined
  }
}

export type SourceFocusPrimaryAction =
  | "open-source-focus"
  | "refresh-source-focus"
  | "reveal-review-target"

export function getSourceFocusPrimaryAction(
  status?: SourceFocusReviewStatus,
): SourceFocusPrimaryAction | undefined {
  switch (status?.kind) {
    case "linked":
      return "open-source-focus"
    case "moved":
      return "refresh-source-focus"
    case "missing":
      return status.currentReviewTarget
        ? "reveal-review-target"
        : "open-source-focus"
    default:
      return undefined
  }
}

export function getSourceFocusRevealTarget({
  sourceFocus,
  availableReviewFocusTargets,
  draftComparison,
  proposalComparison,
}: {
  sourceFocus?: SourceFocusTarget
  availableReviewFocusTargets: ReviewFocusTarget[]
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
}) {
  if (!sourceFocus?.originKind) {
    return undefined
  }

  if (sourceFocus.reviewOrigin?.targetId) {
    return findReviewFocusTargetById(
      availableReviewFocusTargets,
      sourceFocus.reviewOrigin.targetId,
    )
  }

  const groupKey = sourceFocus.originId?.split(":").slice(1).join(":")
  if (!groupKey) {
    return undefined
  }

  if (sourceFocus.originKind === "proposal-compare-diff") {
    const groups = proposalComparison?.previewGroups.filter(
      (group) => getPreviewGroupKey(group) === groupKey,
    )

    return createReviewFocusTargetFromGroups({
      targetId: "proposal-drift",
      mode: "proposal",
      label: "Proposal drift",
      groups,
    })
  }

  if (sourceFocus.originKind === "saved-compare-diff") {
    const groups = draftComparison?.previewGroups.filter(
      (group) => getPreviewGroupKey(group) === groupKey,
    )

    return createReviewFocusTargetFromGroups({
      targetId: "saved-drift",
      mode: "saved",
      label: "Unsaved source drift",
      groups,
    })
  }

  return undefined
}

export function getSourceFocusReviewStatus({
  sourceFocus,
  availableReviewFocusTargets,
  draftComparison,
  inspectDiagnostics,
  proposalComparison,
  validationDiagnostics,
}: {
  sourceFocus?: SourceFocusTarget
  availableReviewFocusTargets: ReviewFocusTarget[]
  draftComparison?: SourceComparisonSummary
  inspectDiagnostics?: DiagnosticItem[]
  proposalComparison?: SourceComparisonSummary
  validationDiagnostics?: DiagnosticItem[]
}) {
  if (!sourceFocus) {
    return undefined
  }

  if (
    (sourceFocus.originKind === "inspect-diagnostic" ||
      sourceFocus.originKind === "source-validation-diagnostic") &&
    sourceFocus.originId &&
    (sourceFocus.originKind === "inspect-diagnostic"
      ? inspectDiagnostics
      : validationDiagnostics)
  ) {
    const diagnostics =
      sourceFocus.originKind === "inspect-diagnostic"
        ? inspectDiagnostics
        : validationDiagnostics
    const diagnosticId = sourceFocus.originId.split(":").slice(1).join(":")
    const currentDiagnostic = diagnostics?.find(
      (diagnostic) => diagnostic.id === diagnosticId,
    )

    if (!currentDiagnostic) {
      return {
        kind: "missing",
        summary:
          sourceFocus.originKind === "inspect-diagnostic"
            ? "The originating inspect diagnostic is no longer present in the current inspect results."
            : "The originating source validation diagnostic is no longer present in the current validation results.",
      } satisfies SourceFocusReviewStatus
    }

    if (currentDiagnostic.line === sourceFocus.startLine) {
      return {
        kind: "linked",
        summary:
          sourceFocus.originKind === "inspect-diagnostic"
            ? "This source focus still matches the current inspect diagnostic."
            : "This source focus still matches the current source validation diagnostic.",
        currentDiagnostic,
      } satisfies SourceFocusReviewStatus
    }

    return {
      kind: "moved",
      summary: `This ${
        sourceFocus.originKind === "inspect-diagnostic"
          ? "inspect diagnostic"
          : "source validation diagnostic"
      } moved to ${
        typeof currentDiagnostic.line === "number"
          ? `line ${currentDiagnostic.line}`
          : "a different location"
      } in the current ${
        sourceFocus.originKind === "inspect-diagnostic"
          ? "inspect results"
          : "validation results"
      }.`,
      currentDiagnostic,
    } satisfies SourceFocusReviewStatus
  }

  if (!sourceFocus.reviewOrigin) {
    return undefined
  }

  const currentReviewTarget = findReviewFocusTargetById(
    availableReviewFocusTargets,
    sourceFocus.reviewOrigin.targetId,
  )
  if (!currentReviewTarget) {
    return {
      kind: "missing",
      summary:
        "The originating review target is no longer available from the current compare state.",
    } satisfies SourceFocusReviewStatus
  }

  const preview = getReviewFocusPreview({
    target: currentReviewTarget,
    draftComparison,
    proposalComparison,
  })
  const currentGroup = preview?.groups.find(
    (group) => getPreviewGroupKey(group) === sourceFocus.reviewOrigin?.groupKey,
  )

  if (!currentGroup) {
    return {
      kind: "missing",
      summary:
        "The originating review target still exists, but this focused segment no longer matches any current diff group.",
      currentReviewTarget,
    } satisfies SourceFocusReviewStatus
  }

  if (
    currentGroup.startLine === sourceFocus.startLine &&
    currentGroup.endLine === sourceFocus.endLine
  ) {
    return {
      kind: "linked",
      summary:
        "This source focus still matches the current review target segment.",
      currentReviewTarget,
      currentGroup,
    } satisfies SourceFocusReviewStatus
  }

  return {
    kind: "moved",
    summary: `This review segment moved to ${
      currentGroup.startLine === currentGroup.endLine
        ? `line ${currentGroup.startLine}`
        : `lines ${currentGroup.startLine}-${currentGroup.endLine}`
    } in the current draft.`,
    currentReviewTarget,
    currentGroup,
  } satisfies SourceFocusReviewStatus
}

function clampLine(line: number, lineCount: number) {
  if (lineCount <= 0) {
    return 1
  }

  return Math.min(Math.max(1, line), lineCount)
}
