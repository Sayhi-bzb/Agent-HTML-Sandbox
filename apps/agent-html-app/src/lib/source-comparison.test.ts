import { describe, expect, it } from "vitest"

import type { AgentShellMessage } from "./types"
import {
  getLatestProposalComparisonSummary,
  getPreviewGroupKey,
  getPreviewGroupsByKeys,
  getSourceComparisonSummary,
} from "./source-comparison"

describe("source comparison helpers", () => {
  it("summarizes changed lines between two source snapshots", () => {
    const summary = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n</page>",
      "<page>\n  <card>Draft</card>\n</page>",
    )

    expect(summary).toMatchObject({
      changedLineCount: 1,
      firstChangedLine: 2,
      savedLineCount: 3,
      draftLineCount: 3,
      hasAdditionalChanges: false,
    })
    expect(summary?.previewItems).toEqual([
      {
        lineNumber: 2,
        savedText: "<card>Saved</card>",
        draftText: "<card>Draft</card>",
      },
    ])
    expect(summary?.previewGroups).toEqual([
      {
        startLine: 2,
        endLine: 2,
        savedText: "<card>Saved</card>",
        draftText: "<card>Draft</card>",
      },
    ])
  })

  it("anchors proposal comparison to the latest proposal snapshot instead of the current saved source", () => {
    const messages: AgentShellMessage[] = [
      {
        id: "msg-1",
        role: "placeholder",
        createdAt: "2026-05-15T12:00:00.000Z",
        text: "Proposal for review",
        kind: "proposal-placeholder",
        proposalSnapshot: {
          source: "<page>\n  <card>Snapshot</card>\n</page>",
          lineCount: 3,
        },
      },
      {
        id: "msg-2",
        role: "system",
        createdAt: "2026-05-15T12:05:00.000Z",
        text: "Build update",
        kind: "context-card",
      },
    ]

    const summary = getLatestProposalComparisonSummary(
      messages,
      "<page>\n  <card>Current draft</card>\n</page>",
    )

    expect(summary?.changedLineCount).toBe(1)
    expect(summary?.previewItems[0]).toEqual({
      lineNumber: 2,
      savedText: "<card>Snapshot</card>",
      draftText: "<card>Current draft</card>",
    })
  })

  it("groups adjacent changed lines into a focused preview group", () => {
    const summary = getSourceComparisonSummary(
      "<page>\n  <card>Saved</card>\n  <list>Old</list>\n</page>",
      "<page>\n  <card>Draft</card>\n  <list>New</list>\n</page>",
    )

    expect(summary?.previewGroups).toEqual([
      {
        startLine: 2,
        endLine: 3,
        savedText: "<card>Saved</card>\n<list>Old</list>",
        draftText: "<card>Draft</card>\n<list>New</list>",
      },
    ])
  })

  it("can recover a precise subset of preview groups from shared keys", () => {
    const summary = getSourceComparisonSummary(
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

    const keys = summary?.previewGroups.map(getPreviewGroupKey)
    const focused = getPreviewGroupsByKeys(summary, keys?.slice(1))

    expect(focused).toEqual([
      {
        startLine: 5,
        endLine: 5,
        savedText: "<footer>Before</footer>",
        draftText: "<footer>After</footer>",
      },
    ])
  })
})
