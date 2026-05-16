import { describe, expect, it } from "vitest"

import {
  createReviewFocusTarget,
  createReviewFocusTargetFromGroups,
  findReviewFocusTargetById,
  getAvailableReviewFocusTargets,
  getReviewFocusPreview,
  isSameReviewFocusTarget,
} from "./review-focus"
import type { BuildRunSummary, InspectSnapshot } from "./types"
import { getSourceComparisonSummary } from "./source-comparison"

const succeededBuild: BuildRunSummary = {
  runId: "build-1",
  sessionId: "session-1",
  startedAt: "2026-05-15T11:54:00.000Z",
  finishedAt: "2026-05-15T11:55:00.000Z",
  status: "succeeded",
  exitCode: 0,
  previewPath: "D:/tmp/session-1/build/index.html",
}

const cleanInspect: InspectSnapshot = {
  sessionId: "session-1",
  generatedAt: "2026-05-15T11:56:00.000Z",
  diagnostics: [],
  structureSummary: "1 page",
  lastBuild: succeededBuild,
}

describe("review focus helpers", () => {
  it("creates a precise target from preview groups", () => {
    const comparison = getSourceComparisonSummary(
      [
        "<page>",
        "  <card>Saved</card>",
        "  <list>Old</list>",
        "  <note>Stable</note>",
        "  <footer>Before</footer>",
        "</page>",
      ].join("\n"),
      [
        "<page>",
        "  <card>Draft</card>",
        "  <list>New</list>",
        "  <note>Stable</note>",
        "  <footer>After</footer>",
        "</page>",
      ].join("\n"),
    )

    const target = createReviewFocusTarget({
      targetId: "saved-drift",
      mode: "saved",
      label: "Unsaved source drift",
      comparison,
    })

    expect(target).toEqual({
      targetId: "saved-drift",
      mode: "saved",
      label: "Unsaved source drift",
      groupKeys: ["2:3", "5:5"],
      groupCount: 2,
      lineLabel: "Lines 2-3, 5",
    })
  })

  it("creates a precise target directly from a focused group subset", () => {
    const target = createReviewFocusTargetFromGroups({
      targetId: "review-0",
      mode: "proposal",
      label: "Compare the recommendation card.",
      groups: [
        {
          startLine: 2,
          endLine: 3,
          savedText: "<card>Snapshot</card>\n<table>Old</table>",
          draftText: "<card>Current</card>\n<table>New</table>",
        },
      ],
    })

    expect(target).toEqual({
      targetId: "review-0",
      mode: "proposal",
      label: "Compare the recommendation card.",
      groupKeys: ["2:3"],
      groupCount: 1,
      lineLabel: "Lines 2-3",
    })
  })

  it("returns checklist-derived focus targets before falling back to generic compare labels", () => {
    const draftComparison = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n</page>",
      "<page>\n  <card>Draft</card>\n</page>",
    )
    const proposalComparison = getSourceComparisonSummary(
      "<page>\n  <card>Snapshot</card>\n</page>",
      "<page>\n  <card>Current</card>\n</page>",
    )

    const targets = getAvailableReviewFocusTargets({
      proposalText: [
        "Proposal for Session One",
        "- [review] Compare the recommendation card.",
        "- [save] Save the latest draft.",
      ].join("\n"),
      build: succeededBuild,
      hasUnsavedSourceChanges: true,
      inspect: cleanInspect,
      draftComparison,
      proposalComparison,
    })

    expect(targets).toEqual([
      {
        targetId: "review-0",
        mode: "proposal",
        label: "Compare the recommendation card.",
        groupKeys: ["2:2"],
        groupCount: 1,
        lineLabel: "Line 2",
      },
      {
        targetId: "save-1",
        mode: "saved",
        label: "Save the latest draft.",
        groupKeys: ["2:2"],
        groupCount: 1,
        lineLabel: "Line 2",
      },
    ])
  })

  it("falls back to generic compare labels when no checklist-derived focus target is available", () => {
    const draftComparison = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n</page>",
      "<page>\n  <card>Draft</card>\n</page>",
    )
    const proposalComparison = getSourceComparisonSummary(
      "<page>\n  <card>Snapshot</card>\n</page>",
      "<page>\n  <card>Current</card>\n</page>",
    )

    const targets = getAvailableReviewFocusTargets({
      build: succeededBuild,
      hasUnsavedSourceChanges: true,
      inspect: cleanInspect,
      draftComparison,
      proposalComparison,
    })

    expect(targets).toEqual([
      {
        targetId: "proposal-drift",
        mode: "proposal",
        label: "Proposal drift",
        groupKeys: ["2:2"],
        groupCount: 1,
        lineLabel: "Line 2",
      },
      {
        targetId: "saved-drift",
        mode: "saved",
        label: "Unsaved source drift",
        groupKeys: ["2:2"],
        groupCount: 1,
        lineLabel: "Line 2",
      },
    ])
  })

  it("deduplicates checklist-derived targets that point at the same focused groups", () => {
    const proposalComparison = getSourceComparisonSummary(
      "<page>\n  <card>Snapshot</card>\n</page>",
      "<page>\n  <card>Current</card>\n</page>",
    )

    const targets = getAvailableReviewFocusTargets({
      proposalText: [
        "Proposal for Session One",
        "- [review] Compare the recommendation card.",
        "- [review] Compare the risk table.",
      ].join("\n"),
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      proposalComparison,
    })

    expect(targets).toEqual([
      {
        targetId: "review-0",
        mode: "proposal",
        label: "Compare the recommendation card.",
        groupKeys: ["2:2"],
        groupCount: 1,
        lineLabel: "Line 2",
      },
    ])
  })

  it("compares review targets by exact mode, label, and group keys", () => {
    const left = {
      targetId: "review-0",
      mode: "proposal" as const,
      label: "Proposal drift",
      groupKeys: ["2:3", "5:5"],
      groupCount: 2,
      lineLabel: "Lines 2-3, 5",
    }

    expect(isSameReviewFocusTarget(left, { ...left })).toBe(true)
    expect(
      isSameReviewFocusTarget(left, {
        ...left,
        targetId: "review-1",
        groupKeys: ["2:3"],
        groupCount: 1,
        lineLabel: "Lines 2-3",
      }),
    ).toBe(false)
  })

  it("resolves the active review target back to the current focused preview groups", () => {
    const draftComparison = getSourceComparisonSummary(
      [
        "<page>",
        "  <card>Saved</card>",
        "  <list>Old</list>",
        "  <note>Stable</note>",
        "  <footer>Before</footer>",
        "</page>",
      ].join("\n"),
      [
        "<page>",
        "  <card>Draft</card>",
        "  <list>New</list>",
        "  <note>Stable</note>",
        "  <footer>After</footer>",
        "</page>",
      ].join("\n"),
    )
    const target = createReviewFocusTargetFromGroups({
      targetId: "save-1",
      mode: "saved",
      label: "Save the latest draft.",
      groups: draftComparison?.previewGroups.slice(0, 1),
    })

    const preview = getReviewFocusPreview({
      target,
      draftComparison,
    })

    expect(preview).toEqual({
      mode: "saved",
      lineLabel: "Lines 2-3",
      groups: [
        {
          startLine: 2,
          endLine: 3,
          savedText: "<card>Saved</card>\n<list>Old</list>",
          draftText: "<card>Draft</card>\n<list>New</list>",
        },
      ],
    })
  })

  it("finds a review focus target by its stable target id", () => {
    const targets = [
      {
        targetId: "review-0",
        mode: "proposal" as const,
        label: "Compare the recommendation card.",
        groupKeys: ["2:3"],
        groupCount: 1,
        lineLabel: "Lines 2-3",
      },
      {
        targetId: "save-1",
        mode: "saved" as const,
        label: "Save the latest draft.",
        groupKeys: ["5:5"],
        groupCount: 1,
        lineLabel: "Line 5",
      },
    ]

    expect(findReviewFocusTargetById(targets, "save-1")).toEqual(targets[1])
    expect(findReviewFocusTargetById(targets, "missing")).toBeUndefined()
  })
})
