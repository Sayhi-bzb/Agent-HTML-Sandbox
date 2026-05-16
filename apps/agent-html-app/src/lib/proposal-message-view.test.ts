import { describe, expect, it } from "vitest"

import { getProposalMessageView } from "./proposal-message-view"
import type { BuildRunSummary, InspectSnapshot, SessionDetail } from "./types"

const baseSession: SessionDetail = {
  summary: {
    id: "session-1",
    name: "Session One",
    directory: "D:/tmp/session-1",
    status: "ready",
    pinned: false,
    updatedAt: "2026-05-15T12:00:00.000Z",
    lastBuildAt: "2026-05-15T11:55:00.000Z",
    hasPreview: true,
  },
  sourcePath: "D:/tmp/session-1/source.agent.html",
  previewPath: "D:/tmp/session-1/build/index.html",
  logDirectory: "D:/tmp/session-1/logs",
  chatPath: "D:/tmp/session-1/chat.jsonl",
  currentView: "preview",
  source: "<page />",
}

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

describe("proposal message view", () => {
  it("builds compare, stale note, and checklist focus data", () => {
    const view = getProposalMessageView({
      proposalText: [
        "Proposal for Session One",
        "- [review] Compare the hero block",
        "- [build] Refresh preview artifact",
      ].join("\n"),
      activeView: "source",
      build: succeededBuild,
      draftComparison: {
        savedLineCount: 4,
        draftLineCount: 4,
        changedLineCount: 1,
        firstChangedLine: 3,
        hasAdditionalChanges: false,
        previewGroups: [
          {
            startLine: 3,
            endLine: 4,
            savedText: "<hero />",
            draftText: '<hero variant="next" />',
          },
        ],
        previewItems: [],
      },
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      isStale: true,
      latestDecision: {
        proposalTitle: "Session One",
        status: "approved",
      },
      proposalComparison: {
        savedLineCount: 4,
        draftLineCount: 4,
        changedLineCount: 2,
        firstChangedLine: 3,
        hasAdditionalChanges: false,
        previewGroups: [
          {
            startLine: 3,
            endLine: 4,
            savedText: "<hero />",
            draftText: '<hero variant="next" />',
          },
        ],
        previewItems: [],
      },
      session: baseSession,
    })

    expect(view).toMatchObject({
      footerActions: [
        {
          label: "Open Source",
          handler: "openSource",
          disabled: true,
        },
        {
          label: "Run Inspect",
          handler: "inspect",
          disabled: false,
        },
        {
          label: "Build",
          handler: "build",
        },
        {
          label: "Open Preview",
          handler: "openPreview",
          disabled: false,
        },
      ],
      title: "Proposal for Session One",
      decision: {
        label: "Approved",
        pillClassName: "status-ready",
      },
      staleNote:
        "This proposal is based on older session state. Rebuild, reinspect, or redraft before applying it.",
      compare: {
        changedLineCount: 2,
        summary:
          "The current unsaved draft has diverged from the proposal snapshot. First change around line 3.",
        action: {
          label: "Review draft diff",
          handler: "reviewDiff",
        },
      },
      checklistItems: [
        {
          id: "review-Compare the hero block",
          focusCompare: {
            mode: "proposal",
            targetId: "review-Compare the hero block",
            label: "Compare the hero block",
          },
          context: {
            summary:
              "2 changed line(s) relative to the latest proposal snapshot.",
            previewGroups: [
              {
                key: "3:4",
                lineLabel: "Lines 3-4",
              },
            ],
          },
        },
        {
          id: "build-Refresh preview artifact",
          action: {
            handler: "build",
            label: "Run Build",
          },
        },
      ],
    })
  })

  it("returns undefined for non-structured proposal text", () => {
    expect(
      getProposalMessageView({
        proposalText: "",
        activeView: "preview",
        build: succeededBuild,
        hasUnsavedSourceChanges: false,
        inspect: cleanInspect,
        isStale: false,
        session: baseSession,
      }),
    ).toBeUndefined()
  })
})
