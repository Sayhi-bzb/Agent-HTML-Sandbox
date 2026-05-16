import { describe, expect, it, vi } from "vitest"

import {
  createSourceFocusTargetFromDiagnostic,
  createSourceFocusTargetFromGroup,
  getSourceFocusLineLabel,
  getSourceFocusPrimaryAction,
  getSourceFocusReadinessWarning,
  getSourceFocusReviewStatus,
  getSourceFocusStatusPill,
  getSourceSelectionRange,
} from "./source-focus"
import { getSourceComparisonSummary } from "./source-comparison"

describe("source focus helpers", () => {
  it("creates a stable source focus target from a preview group", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-16T03:00:00.000Z"))

    const target = createSourceFocusTargetFromGroup({
      label: "Compare the recommendation card.",
      group: {
        startLine: 5,
        endLine: 7,
        savedText: "<card>Old</card>",
        draftText: "<card>New</card>",
      },
      reviewTarget: {
        targetId: "review-0",
        mode: "proposal",
        label: "Compare the recommendation card.",
        groupKeys: ["5:7"],
        groupCount: 1,
        lineLabel: "Lines 5-7",
      },
    })

    expect(target).toEqual({
      label: "Compare the recommendation card.",
      startLine: 5,
      endLine: 7,
      requestKey: "source-focus-5-7-1778900400000",
      reviewOrigin: {
        targetId: "review-0",
        mode: "proposal",
        label: "Compare the recommendation card.",
        lineLabel: "Lines 5-7",
        groupKey: "5:7",
      },
    })

    vi.useRealTimers()
  })

  it("creates a source focus target directly from a diagnostic line", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-16T03:00:00.000Z"))

    expect(
      createSourceFocusTargetFromDiagnostic({
        diagnostic: {
          message: "Unexpected attribute.",
          line: 8,
        },
      }),
    ).toEqual({
      label: "Unexpected attribute.",
      startLine: 8,
      endLine: 8,
      requestKey: "source-focus-diagnostic-8-1778900400000",
    })

    expect(
      createSourceFocusTargetFromDiagnostic({
        diagnostic: {
          message: "No line available.",
        },
      }),
    ).toBeUndefined()

    vi.useRealTimers()
  })

  it("maps a line range to textarea selection offsets", () => {
    const selection = getSourceSelectionRange(
      ["<page>", "  <card>One</card>", "  <list>Two</list>", "</page>"].join(
        "\n",
      ),
      { startLine: 2, endLine: 3 },
    )

    expect(selection).toEqual({
      startLine: 2,
      endLine: 3,
      selectionStart: 7,
      selectionEnd: 44,
    })
  })

  it("formats source focus line labels for single and multi-line ranges", () => {
    expect(getSourceFocusLineLabel({ startLine: 4, endLine: 4 })).toBe("Line 4")
    expect(getSourceFocusLineLabel({ startLine: 4, endLine: 6 })).toBe(
      "Lines 4-6",
    )
  })

  it("clamps out-of-range requests back into the available source lines", () => {
    const selection = getSourceSelectionRange("<page>\n</page>", {
      startLine: 8,
      endLine: 10,
    })

    expect(selection).toEqual({
      startLine: 2,
      endLine: 2,
      selectionStart: 7,
      selectionEnd: 14,
    })
  })

  it("reports when a source focus still matches its originating review target", () => {
    const draftComparison = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n</page>",
      "<page>\n  <card>Draft</card>\n</page>",
    )
    const target = {
      targetId: "save-0",
      mode: "saved" as const,
      label: "Save the latest draft.",
      groupKeys: ["2:2"],
      groupCount: 1,
      lineLabel: "Line 2",
    }
    const sourceFocus = createSourceFocusTargetFromGroup({
      label: target.label,
      group: draftComparison!.previewGroups[0],
      reviewTarget: target,
      requestKey: "focus-1",
    })

    expect(
      getSourceFocusReviewStatus({
        sourceFocus,
        availableReviewFocusTargets: [target],
        draftComparison,
      }),
    ).toEqual({
      kind: "linked",
      summary:
        "This source focus still matches the current review target segment.",
      currentReviewTarget: target,
      currentGroup: draftComparison!.previewGroups[0],
    })
  })

  it("reports when the originating review target moved to a different line range", () => {
    const draftComparison = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n  <list>Old</list>\n</page>",
      "<page>\n  <card>Stable</card>\n  <card>Draft</card>\n  <list>New</list>\n</page>",
    )
    const target = {
      targetId: "save-0",
      mode: "saved" as const,
      label: "Save the latest draft.",
      groupKeys: ["2:5"],
      groupCount: 1,
      lineLabel: "Lines 2-5",
    }
    const sourceFocus = {
      label: target.label,
      startLine: 2,
      endLine: 3,
      requestKey: "focus-2",
      reviewOrigin: {
        targetId: target.targetId,
        label: target.label,
        mode: target.mode,
        lineLabel: target.lineLabel,
        groupKey: "2:5",
      },
    }

    expect(
      getSourceFocusReviewStatus({
        sourceFocus,
        availableReviewFocusTargets: [target],
        draftComparison,
      }),
    ).toEqual({
      kind: "moved",
      summary: "This review segment moved to lines 2-5 in the current draft.",
      currentReviewTarget: target,
      currentGroup: draftComparison!.previewGroups[0],
    })
  })

  it("reports when the originating review target is no longer available", () => {
    const sourceFocus = {
      label: "Save the latest draft.",
      startLine: 2,
      endLine: 2,
      requestKey: "focus-3",
      reviewOrigin: {
        targetId: "save-0",
        label: "Save the latest draft.",
        mode: "saved" as const,
        lineLabel: "Line 2",
        groupKey: "2:2",
      },
    }

    expect(
      getSourceFocusReviewStatus({
        sourceFocus,
        availableReviewFocusTargets: [],
      }),
    ).toEqual({
      kind: "missing",
      summary:
        "The originating review target is no longer available from the current compare state.",
    })
  })

  it("returns a stable pill mapping for each source focus review status", () => {
    expect(
      getSourceFocusStatusPill({
        kind: "linked",
        summary: "x",
      }),
    ).toEqual({
      label: "Aligned",
      className: "status-ready",
    })
    expect(
      getSourceFocusStatusPill({
        kind: "moved",
        summary: "x",
      }),
    ).toEqual({
      label: "Moved",
      className: "status-dirty",
    })
    expect(
      getSourceFocusStatusPill({
        kind: "missing",
        summary: "x",
      }),
    ).toEqual({
      label: "Missing",
      className: "status-error",
    })
  })

  it("returns readiness warnings only when source focus drift needs attention", () => {
    expect(
      getSourceFocusReadinessWarning({
        kind: "linked",
        summary: "x",
      }),
    ).toBeUndefined()
    expect(
      getSourceFocusReadinessWarning({
        kind: "moved",
        summary: "x",
      }),
    ).toBe(
      "The current source focus moved away from its originating review target.",
    )
    expect(
      getSourceFocusReadinessWarning({
        kind: "missing",
        summary: "x",
      }),
    ).toBe(
      "The current source focus no longer maps to an available review target.",
    )
  })

  it("returns a primary action for each source focus status", () => {
    expect(
      getSourceFocusPrimaryAction({
        kind: "linked",
        summary: "x",
      }),
    ).toBe("open-source-focus")
    expect(
      getSourceFocusPrimaryAction({
        kind: "moved",
        summary: "x",
      }),
    ).toBe("refresh-source-focus")
    expect(
      getSourceFocusPrimaryAction({
        kind: "missing",
        summary: "x",
      }),
    ).toBe("open-source-focus")
    expect(
      getSourceFocusPrimaryAction({
        kind: "missing",
        summary: "x",
        currentReviewTarget: {
          targetId: "review-0",
          mode: "proposal",
          label: "Compare the recommendation card.",
          groupKeys: ["2:2"],
          groupCount: 1,
          lineLabel: "Line 2",
        },
      }),
    ).toBe("reveal-review-target")
  })
})
