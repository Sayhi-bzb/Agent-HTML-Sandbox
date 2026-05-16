import {
  getPreviewGroupKey,
  getPreviewGroupsByKeys,
  type SourceComparisonPreviewGroup,
  type SourceComparisonSummary,
} from "./source-comparison"
import { getProposalChecklistFocusOptions } from "./review-flow"
import type { BuildRunSummary, InspectSnapshot } from "./types"

export type ReviewFocusMode = "saved" | "proposal"

export type ReviewFocusTarget = {
  targetId: string
  mode: ReviewFocusMode
  label: string
  groupKeys: string[]
  groupCount: number
  lineLabel: string
}

export type ReviewFocusIntent = ReviewFocusTarget & {
  requestKey: string
}

export type ReviewFocusPreview = {
  mode: ReviewFocusMode
  lineLabel: string
  groups: SourceComparisonPreviewGroup[]
}

export function createReviewFocusTargetFromGroups({
  targetId,
  mode,
  label,
  groups,
}: {
  targetId: string
  mode: ReviewFocusMode
  label: string
  groups?: SourceComparisonPreviewGroup[]
}) {
  if (!groups?.length) {
    return undefined
  }

  return {
    targetId,
    mode,
    label,
    groupKeys: groups.map(getPreviewGroupKey),
    groupCount: groups.length,
    lineLabel: formatReviewFocusLineLabel(groups),
  } satisfies ReviewFocusTarget
}

export function createReviewFocusTarget({
  targetId,
  mode,
  label,
  comparison,
}: {
  targetId: string
  mode: ReviewFocusMode
  label: string
  comparison?: SourceComparisonSummary
}) {
  if (!comparison?.previewGroups.length) {
    return undefined
  }

  return {
    targetId,
    mode,
    label,
    groupKeys: comparison.previewGroups.map(getPreviewGroupKey),
    groupCount: comparison.previewGroups.length,
    lineLabel: formatReviewFocusLineLabel(comparison.previewGroups),
  } satisfies ReviewFocusTarget
}

export function getAvailableReviewFocusTargets({
  proposalText,
  build,
  hasUnsavedSourceChanges,
  inspect,
  draftComparison,
  proposalComparison,
}: {
  proposalText?: string
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
}) {
  const proposalTargets = getProposalChecklistFocusOptions({
    proposalText,
    comparisonMode: "proposal",
    build,
    hasUnsavedSourceChanges,
    inspect,
    draftComparison,
    proposalComparison,
  }).map((option) =>
    createReviewFocusTargetFromGroups({
      targetId: option.id,
      mode: "proposal",
      label: option.label,
      groups: option.groups,
    }),
  )

  const savedTargets = getProposalChecklistFocusOptions({
    proposalText,
    comparisonMode: "saved",
    build,
    hasUnsavedSourceChanges,
    inspect,
    draftComparison,
    proposalComparison,
  }).map((option) =>
    createReviewFocusTargetFromGroups({
      targetId: option.id,
      mode: "saved",
      label: option.label,
      groups: option.groups,
    }),
  )

  const fallbackTargets = [
    proposalTargets.length === 0
      ? createReviewFocusTarget({
          targetId: "proposal-drift",
          mode: "proposal",
          label: "Proposal drift",
          comparison: proposalComparison,
        })
      : undefined,
    savedTargets.length === 0
      ? createReviewFocusTarget({
          targetId: "saved-drift",
          mode: "saved",
          label: "Unsaved source drift",
          comparison: draftComparison,
        })
      : undefined,
  ]

  return dedupeReviewFocusTargets(
    [...proposalTargets, ...savedTargets, ...fallbackTargets].filter(
      (target): target is ReviewFocusTarget => target !== undefined,
    ),
  )
}

function dedupeReviewFocusTargets(targets: ReviewFocusTarget[]) {
  const uniqueTargets: ReviewFocusTarget[] = []

  for (const target of targets) {
    const duplicate = uniqueTargets.some(
      (candidate) =>
        candidate.mode === target.mode &&
        candidate.groupKeys.length === target.groupKeys.length &&
        candidate.groupKeys.every(
          (key, index) => key === target.groupKeys[index],
        ),
    )

    if (!duplicate) {
      uniqueTargets.push(target)
    }
  }

  return uniqueTargets
}

export function getFallbackReviewFocusTargets({
  draftComparison,
  proposalComparison,
}: {
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
}) {
  return [
    createReviewFocusTarget({
      targetId: "proposal-drift",
      mode: "proposal",
      label: "Proposal drift",
      comparison: proposalComparison,
    }),
    createReviewFocusTarget({
      targetId: "saved-drift",
      mode: "saved",
      label: "Unsaved source drift",
      comparison: draftComparison,
    }),
  ].filter((target): target is ReviewFocusTarget => target !== undefined)
}

export function isSameReviewFocusTarget(
  left: ReviewFocusTarget | undefined,
  right: ReviewFocusTarget | undefined,
) {
  if (!left || !right) {
    return false
  }

  return (
    left.mode === right.mode &&
    left.targetId === right.targetId &&
    left.groupKeys.length === right.groupKeys.length &&
    left.groupKeys.every((key, index) => key === right.groupKeys[index])
  )
}

export function findReviewFocusTargetById(
  targets: ReviewFocusTarget[],
  targetId?: string,
) {
  if (!targetId) {
    return undefined
  }

  return targets.find((target) => target.targetId === targetId)
}

export function getReviewFocusPreview({
  target,
  draftComparison,
  proposalComparison,
}: {
  target?: ReviewFocusTarget
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
}) {
  if (!target) {
    return undefined
  }

  const comparison =
    target.mode === "proposal" ? proposalComparison : draftComparison
  const groups = getPreviewGroupsByKeys(comparison, target.groupKeys)

  if (!groups?.length) {
    return undefined
  }

  return {
    mode: target.mode,
    lineLabel: target.lineLabel,
    groups,
  } satisfies ReviewFocusPreview
}

function formatReviewFocusLineLabel(groups: SourceComparisonPreviewGroup[]) {
  const segments = groups.map((group) =>
    group.startLine === group.endLine
      ? `${group.startLine}`
      : `${group.startLine}-${group.endLine}`,
  )

  if (segments.length === 1) {
    return `Line${segments[0].includes("-") ? "s" : ""} ${segments[0]}`
  }

  if (segments.length === 2) {
    return `Lines ${segments.join(", ")}`
  }

  return `Lines ${segments[0]}, ${segments[1]}, +${segments.length - 2} more`
}
