import {
  getPreviewGroupKey,
  type SourceComparisonPreviewGroup,
  type SourceComparisonSummary,
} from "./source-comparison"
import {
  findReviewFocusTargetById,
  getReviewFocusPreview,
  type ReviewFocusTarget,
} from "./review-focus"
import type { DiagnosticItem } from "./types"

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
  reviewOrigin?: SourceFocusReviewOrigin
}

export function createSourceFocusTargetFromGroup({
  label,
  group,
  requestKey,
  reviewTarget,
}: {
  label: string
  group: SourceComparisonPreviewGroup
  requestKey?: string
  reviewTarget?: ReviewFocusTarget
}) {
  return {
    label,
    startLine: Math.max(1, Math.min(group.startLine, group.endLine)),
    endLine: Math.max(1, Math.max(group.startLine, group.endLine)),
    requestKey:
      requestKey ??
      `source-focus-${group.startLine}-${group.endLine}-${Date.now()}`,
    reviewOrigin: reviewTarget
      ? {
          targetId: reviewTarget.targetId,
          label: reviewTarget.label,
          mode: reviewTarget.mode,
          lineLabel: reviewTarget.lineLabel,
          groupKey: getPreviewGroupKey(group),
        }
      : undefined,
  } satisfies SourceFocusTarget
}

export function createSourceFocusTargetFromDiagnostic({
  diagnostic,
  requestKey,
}: {
  diagnostic: Pick<DiagnosticItem, "message" | "line">
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
}

export function getSourceFocusLineLabel(
  target: Pick<SourceFocusTarget, "startLine" | "endLine">,
) {
  return target.startLine === target.endLine
    ? `Line ${target.startLine}`
    : `Lines ${target.startLine}-${target.endLine}`
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

export function getSourceFocusReviewStatus({
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
  if (!sourceFocus?.reviewOrigin) {
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
