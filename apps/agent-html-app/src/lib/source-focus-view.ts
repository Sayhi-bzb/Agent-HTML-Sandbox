import type { SourceFocusReviewStatus, SourceFocusTarget } from "./source-focus"
import {
  getSourceFocusLineLabel,
  getSourceFocusOriginLabel,
  getSourceFocusOriginReference,
  getSourceFocusPrimaryAction,
  getSourceFocusSummary,
  getSourceFocusStatusPill,
} from "./source-focus"

export type SourceFocusActionModel = {
  primaryAction:
    | "open-source-focus"
    | "refresh-source-focus"
    | "reveal-source-origin"
  primaryLabel: "Open Source focus" | "Refresh focus" | "Reveal source origin"
  canRevealSourceOrigin: boolean
  canRefreshFocus: boolean
}

export type SourceFocusViewModel = {
  label: string
  selectionLabel: string
  originLabel?: string
  originReference?: string
  reviewOriginLabel?: string
  summary?: string
  statusPill?: { label: "Aligned" | "Moved" | "Missing"; className: string }
  actions: SourceFocusActionModel
}

export function getSourceFocusViewModel({
  sourceFocus,
  reviewStatus,
  canRevealSourceOrigin,
}: {
  sourceFocus?: SourceFocusTarget
  reviewStatus?: SourceFocusReviewStatus
  canRevealSourceOrigin?: boolean
}) {
  if (!sourceFocus) {
    return undefined
  }

  const primaryAction = getSourceFocusPrimaryAction(reviewStatus)
  const actions: SourceFocusActionModel =
    primaryAction === "refresh-source-focus"
      ? {
          primaryAction,
          primaryLabel: "Refresh focus",
          canRevealSourceOrigin: Boolean(canRevealSourceOrigin),
          canRefreshFocus: true,
        }
      : primaryAction === "reveal-review-target"
        ? {
            primaryAction: "reveal-source-origin",
            primaryLabel: "Reveal source origin",
            canRevealSourceOrigin: Boolean(canRevealSourceOrigin),
            canRefreshFocus: false,
          }
        : {
            primaryAction: "open-source-focus",
            primaryLabel: "Open Source focus",
            canRevealSourceOrigin: Boolean(canRevealSourceOrigin),
            canRefreshFocus: false,
          }

  return {
    label: sourceFocus.label,
    selectionLabel: getSourceFocusLineLabel(sourceFocus),
    originLabel: getSourceFocusOriginLabel(sourceFocus),
    originReference: getSourceFocusOriginReference(sourceFocus),
    reviewOriginLabel: sourceFocus.reviewOrigin?.label,
    summary: getSourceFocusSummary({
      sourceFocus,
      reviewStatus,
    }),
    statusPill: getSourceFocusStatusPill(reviewStatus),
    actions,
  } satisfies SourceFocusViewModel
}
