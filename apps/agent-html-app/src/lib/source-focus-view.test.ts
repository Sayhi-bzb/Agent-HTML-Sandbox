import { describe, expect, it } from "vitest"

import { getSourceFocusViewModel } from "./source-focus-view"

describe("source focus view helpers", () => {
  it("returns a shared display model for review-linked source focus", () => {
    const model = getSourceFocusViewModel({
      sourceFocus: {
        label: "Compare the recommendation card.",
        startLine: 5,
        endLine: 7,
        requestKey: "focus-1",
        originKind: "proposal-checklist-target",
        originId: "review-0:5:7",
        reviewOrigin: {
          targetId: "review-0",
          label: "Compare the recommendation card.",
          mode: "proposal",
          lineLabel: "Lines 5-7",
          groupKey: "5:7",
        },
      },
      reviewStatus: {
        kind: "linked",
        summary:
          "This source focus still matches the current review target segment.",
      },
      canRevealSourceOrigin: true,
    })

    expect(model).toEqual({
      label: "Compare the recommendation card.",
      selectionLabel: "Lines 5-7",
      originLabel: "Proposal checklist target",
      originReference: "Ref review-0 · 5:7",
      reviewOriginLabel: "Compare the recommendation card.",
      summary:
        "This source focus still matches the current review target segment.",
      statusPill: {
        label: "Aligned",
        className: "status-ready",
      },
      actions: {
        primaryAction: "open-source-focus",
        primaryLabel: "Open Source focus",
        canRevealSourceOrigin: true,
        canRefreshFocus: false,
      },
    })
  })

  it("returns a shared display model for non-review source focus", () => {
    const model = getSourceFocusViewModel({
      sourceFocus: {
        label: "Unexpected attribute.",
        startLine: 8,
        endLine: 8,
        requestKey: "focus-2",
        originKind: "inspect-diagnostic",
        originId: "inspect-diagnostic:diag-1",
      },
      reviewStatus: {
        kind: "moved",
        summary:
          "This inspect diagnostic moved to line 9 in the current inspect results.",
      },
    })

    expect(model).toEqual({
      label: "Unexpected attribute.",
      selectionLabel: "Line 8",
      originLabel: "Inspect diagnostic",
      originReference: "Ref diagnostic diag-1",
      reviewOriginLabel: undefined,
      summary:
        "This inspect diagnostic moved to line 9 in the current inspect results.",
      statusPill: {
        label: "Moved",
        className: "status-dirty",
      },
      actions: {
        primaryAction: "refresh-source-focus",
        primaryLabel: "Refresh focus",
        canRevealSourceOrigin: false,
        canRefreshFocus: true,
      },
    })
  })
})
