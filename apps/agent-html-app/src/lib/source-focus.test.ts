import { describe, expect, it, vi } from "vitest"

import {
  createSourceFocusTargetFromDiagnostic,
  createSourceFocusTargetFromGroup,
  getSourceFocusLineLabel,
  getSourceFocusOriginLabel,
  getSourceFocusOriginReference,
  getSourceFocusPrimaryAction,
  getSourceFocusReadinessWarning,
  getSourceFocusRevealTarget,
  getSourceFocusReviewStatus,
  getSourceFocusSummary,
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
      originKind: "proposal-checklist-target",
      originId: "review-0:5:7",
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

  it("distinguishes checklist targets from generic compare diff provenance", () => {
    const group = {
      startLine: 2,
      endLine: 2,
      savedText: "<card>Old</card>",
      draftText: "<card>New</card>",
    }

    expect(
      createSourceFocusTargetFromGroup({
        label: "Proposal drift",
        group,
        reviewTarget: {
          targetId: "proposal-drift",
          mode: "proposal",
          label: "Proposal drift",
          groupKeys: ["2:2"],
          groupCount: 1,
          lineLabel: "Line 2",
        },
      }),
    ).toMatchObject({
      originKind: "proposal-compare-diff",
      originId: "proposal-drift:2:2",
    })

    expect(
      createSourceFocusTargetFromGroup({
        label: "Unsaved source delta",
        group,
        compareMode: "saved",
      }),
    ).toMatchObject({
      originKind: "saved-compare-diff",
      originId: "saved-compare-diff:2:2",
    })
  })

  it("creates a source focus target directly from a diagnostic line", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-16T03:00:00.000Z"))

    expect(
      createSourceFocusTargetFromDiagnostic({
        diagnostic: {
          id: "diag-1",
          message: "Unexpected attribute.",
          line: 8,
          source: "inspect",
        },
      }),
    ).toEqual({
      label: "Unexpected attribute.",
      originKind: "inspect-diagnostic",
      originId: "inspect-diagnostic:diag-1",
      startLine: 8,
      endLine: 8,
      requestKey: "source-focus-diagnostic-8-1778900400000",
    })

    expect(
      createSourceFocusTargetFromDiagnostic({
        diagnostic: {
          id: "diag-2",
          message: "No line available.",
          source: "inspect",
        },
      }),
    ).toBeUndefined()

    expect(
      createSourceFocusTargetFromDiagnostic({
        diagnostic: {
          id: "validation-1",
          message: "Missing <page> root.",
          line: 3,
          source: "validation",
        },
      }),
    ).toEqual({
      label: "Missing <page> root.",
      originKind: "source-validation-diagnostic",
      originId: "source-validation-diagnostic:validation-1",
      startLine: 3,
      endLine: 3,
      requestKey: "source-focus-diagnostic-3-1778900400000",
    })

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

  it("returns a stable origin label for each source focus provenance kind", () => {
    expect(
      getSourceFocusOriginLabel({
        label: "x",
        startLine: 1,
        endLine: 1,
        requestKey: "1",
        originKind: "proposal-checklist-target",
      }),
    ).toBe("Proposal checklist target")
    expect(
      getSourceFocusOriginLabel({
        label: "x",
        startLine: 1,
        endLine: 1,
        requestKey: "1",
        originKind: "saved-checklist-target",
      }),
    ).toBe("Saved checklist target")
    expect(
      getSourceFocusOriginLabel({
        label: "x",
        startLine: 1,
        endLine: 1,
        requestKey: "1",
        originKind: "proposal-compare-diff",
      }),
    ).toBe("Proposal compare diff")
    expect(
      getSourceFocusOriginLabel({
        label: "x",
        startLine: 1,
        endLine: 1,
        requestKey: "1",
        originKind: "saved-compare-diff",
      }),
    ).toBe("Saved compare diff")
    expect(
      getSourceFocusOriginLabel({
        label: "x",
        startLine: 1,
        endLine: 1,
        requestKey: "1",
        originKind: "source-validation-diagnostic",
      }),
    ).toBe("Source validation diagnostic")
    expect(
      getSourceFocusOriginLabel({
        label: "x",
        startLine: 1,
        endLine: 1,
        requestKey: "1",
        originKind: "inspect-diagnostic",
      }),
    ).toBe("Inspect diagnostic")
  })

  it("returns a stable provenance reference for review, compare, and diagnostic origins", () => {
    expect(
      getSourceFocusOriginReference({
        label: "Compare the recommendation card.",
        startLine: 5,
        endLine: 7,
        requestKey: "1",
        reviewOrigin: {
          targetId: "review-0",
          label: "Compare the recommendation card.",
          mode: "proposal",
          lineLabel: "Lines 5-7",
          groupKey: "5:7",
        },
      }),
    ).toBe("Ref review-0 · 5:7")
    expect(
      getSourceFocusOriginReference({
        label: "Proposal drift",
        startLine: 2,
        endLine: 2,
        requestKey: "2",
        originKind: "proposal-compare-diff",
        originId: "proposal-drift:2:2",
      }),
    ).toBe("Ref diff 2:2")
    expect(
      getSourceFocusOriginReference({
        label: "Unexpected attribute.",
        startLine: 8,
        endLine: 8,
        requestKey: "3",
        originKind: "inspect-diagnostic",
        originId: "inspect-diagnostic:diag-1",
      }),
    ).toBe("Ref diagnostic diag-1")
    expect(
      getSourceFocusOriginReference({
        label: "Missing <page> root.",
        startLine: 3,
        endLine: 3,
        requestKey: "4",
        originKind: "source-validation-diagnostic",
        originId: "source-validation-diagnostic:validation-1",
      }),
    ).toBe("Ref validation validation-1")
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

  it("reports linked, moved, and missing states for inspect-diagnostic source focus", () => {
    const sourceFocus = {
      label: "Unexpected attribute.",
      startLine: 8,
      endLine: 8,
      requestKey: "focus-diag",
      originKind: "inspect-diagnostic" as const,
      originId: "inspect-diagnostic:diag-1",
    }

    expect(
      getSourceFocusReviewStatus({
        sourceFocus,
        availableReviewFocusTargets: [],
        inspectDiagnostics: [
          {
            id: "diag-1",
            severity: "error",
            message: "Unexpected attribute.",
            source: "inspect",
            line: 8,
          },
        ],
      }),
    ).toEqual({
      kind: "linked",
      summary:
        "This source focus still matches the current inspect diagnostic.",
      currentDiagnostic: {
        id: "diag-1",
        severity: "error",
        message: "Unexpected attribute.",
        source: "inspect",
        line: 8,
      },
    })

    expect(
      getSourceFocusReviewStatus({
        sourceFocus,
        availableReviewFocusTargets: [],
        inspectDiagnostics: [
          {
            id: "diag-1",
            severity: "error",
            message: "Unexpected attribute.",
            source: "inspect",
            line: 11,
          },
        ],
      }),
    ).toEqual({
      kind: "moved",
      summary:
        "This inspect diagnostic moved to line 11 in the current inspect results.",
      currentDiagnostic: {
        id: "diag-1",
        severity: "error",
        message: "Unexpected attribute.",
        source: "inspect",
        line: 11,
      },
    })

    expect(
      getSourceFocusReviewStatus({
        sourceFocus,
        availableReviewFocusTargets: [],
        inspectDiagnostics: [],
      }),
    ).toEqual({
      kind: "missing",
      summary:
        "The originating inspect diagnostic is no longer present in the current inspect results.",
    })

    const validationSourceFocus = {
      label: "Missing <page> root.",
      startLine: 3,
      endLine: 3,
      requestKey: "focus-validation",
      originKind: "source-validation-diagnostic" as const,
      originId: "source-validation-diagnostic:validation-1",
    }

    expect(
      getSourceFocusReviewStatus({
        sourceFocus: validationSourceFocus,
        availableReviewFocusTargets: [],
        validationDiagnostics: [
          {
            id: "validation-1",
            severity: "error",
            message: "Missing <page> root.",
            source: "validation",
            line: 3,
          },
        ],
      }),
    ).toEqual({
      kind: "linked",
      summary:
        "This source focus still matches the current source validation diagnostic.",
      currentDiagnostic: {
        id: "validation-1",
        severity: "error",
        message: "Missing <page> root.",
        source: "validation",
        line: 3,
      },
    })

    expect(
      getSourceFocusReviewStatus({
        sourceFocus: validationSourceFocus,
        availableReviewFocusTargets: [],
        validationDiagnostics: [
          {
            id: "validation-1",
            severity: "error",
            message: "Missing <page> root.",
            source: "validation",
            line: 6,
          },
        ],
      }),
    ).toEqual({
      kind: "moved",
      summary:
        "This source validation diagnostic moved to line 6 in the current validation results.",
      currentDiagnostic: {
        id: "validation-1",
        severity: "error",
        message: "Missing <page> root.",
        source: "validation",
        line: 6,
      },
    })

    expect(
      getSourceFocusReviewStatus({
        sourceFocus: validationSourceFocus,
        availableReviewFocusTargets: [],
        validationDiagnostics: [],
      }),
    ).toEqual({
      kind: "missing",
      summary:
        "The originating source validation diagnostic is no longer present in the current validation results.",
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

  it("returns a readable summary for review and non-review source focus origins", () => {
    expect(
      getSourceFocusSummary({
        sourceFocus: {
          label: "Proposal drift",
          startLine: 2,
          endLine: 2,
          requestKey: "1",
          originKind: "proposal-compare-diff",
        },
      }),
    ).toBe("This source focus came from the proposal compare diff.")
    expect(
      getSourceFocusSummary({
        sourceFocus: {
          label: "Unexpected attribute.",
          startLine: 8,
          endLine: 8,
          requestKey: "2",
          originKind: "inspect-diagnostic",
        },
      }),
    ).toBe("This source focus came from an inspect diagnostic.")
    expect(
      getSourceFocusSummary({
        sourceFocus: {
          label: "Missing <page> root.",
          startLine: 3,
          endLine: 3,
          requestKey: "3",
          originKind: "source-validation-diagnostic",
        },
      }),
    ).toBe("This source focus came from a source validation diagnostic.")
    expect(
      getSourceFocusSummary({
        reviewStatus: {
          kind: "linked",
          summary: "Still aligned.",
        },
      }),
    ).toBe("Still aligned.")
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

  it("reveals a compare-diff source focus back to the matching review target", () => {
    const draftComparison = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n</page>",
      "<page>\n  <card>Draft</card>\n</page>",
    )
    const sourceFocus = createSourceFocusTargetFromGroup({
      label: "Unsaved source delta",
      group: draftComparison!.previewGroups[0],
      compareMode: "saved",
      requestKey: "focus-compare",
    })

    expect(
      getSourceFocusRevealTarget({
        sourceFocus,
        availableReviewFocusTargets: [],
        draftComparison,
      }),
    ).toEqual({
      targetId: "saved-drift",
      mode: "saved",
      label: "Unsaved source drift",
      groupKeys: ["2:2"],
      groupCount: 1,
      lineLabel: "Line 2",
    })
  })
})
