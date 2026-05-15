import { describe, expect, it } from "vitest"

import type { AgentShellMessage, BuildRunSummary, InspectSnapshot, SessionDetail } from "./types"
import {
  getProposalDecisionTrend,
  findRecentProposalDecisions,
  findLatestProposalDecision,
  getCurrentReviewStageGuidance,
  getCurrentReviewStage,
  getSecondaryReadinessItems,
  getProposalChecklistContext,
  getProposalChecklistFocusOptions,
  getProposalChecklistProgress,
  getProposalChecklistActionConfig,
  getProposalChecklistStatus,
  getProposalReadiness,
  getReviewTimelineActionConfig,
  getReviewTimeline,
  parseProposalChecklist,
  parseProposalDecision,
} from "./review-flow"

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

describe("review flow helpers", () => {
  it("marks readiness blocked when unsaved draft changes are still pending", () => {
    const readiness = getProposalReadiness({
      build: succeededBuild,
      inspect: cleanInspect,
      session: baseSession,
      latestProposalExists: true,
      latestProposalIsStale: false,
      hasUnsavedSourceChanges: true,
      draftComparison: {
        savedLineCount: 3,
        draftLineCount: 3,
        changedLineCount: 2,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      },
    })

    expect(readiness.label).toBe("Blocked")
    expect(readiness.items[0]).toContain("Unsaved draft changes")
  })

  it("summarizes the latest proposal drift in the review timeline", () => {
    const proposal: AgentShellMessage = {
      id: "proposal-1",
      role: "placeholder",
      createdAt: "2026-05-15T11:57:00.000Z",
      text: "Proposal for Session One",
      kind: "proposal-placeholder",
    }
    const sourceSaved: AgentShellMessage = {
      id: "source-1",
      role: "system",
      createdAt: "2026-05-15T11:58:00.000Z",
      text: "Source saved\n- Lines: 4",
      kind: "context-card",
    }

    const timeline = getReviewTimeline({
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      latestProposal: proposal,
      latestProposalIsStale: false,
      messages: [proposal, sourceSaved],
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 1,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      },
      session: baseSession,
    })

    expect(timeline.find((item) => item.id === "source")?.statusLabel).toBe("Current")
    expect(timeline.find((item) => item.id === "proposal")).toMatchObject({
      statusLabel: "Drifted",
      pillClassName: "status-dirty",
    })
  })

  it("surfaces a needs-changes decision in proposal guidance and timeline summary", () => {
    const guidance = getCurrentReviewStageGuidance({
      stage: "proposal",
      latestProposalExists: true,
      latestProposalDecision: { proposalTitle: "Session One", status: "needs-changes" },
      latestProposalIsStale: false,
    })
    const timeline = getReviewTimeline({
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      latestProposal: {
        id: "proposal-1",
        role: "placeholder",
        createdAt: "2026-05-15T11:57:00.000Z",
        text: "Proposal for Session One",
        kind: "proposal-placeholder",
      },
      latestProposalDecision: { proposalTitle: "Session One", status: "needs-changes" },
      latestProposalIsStale: false,
      messages: [],
      session: baseSession,
    })

    expect(guidance).toContain("requests changes")
    expect(timeline.find((item) => item.id === "proposal")?.summary).toContain("requests changes")
  })

  it("parses tagged proposal checklist items and marks save/build actions as done when state is current", () => {
    const proposal = parseProposalChecklist(
      ["Proposal for Session One", "- [save] Save the latest draft.", "- [build] Run Build."].join("\n"),
    )

    expect(proposal?.items).toEqual([
      { action: "save", text: "Save the latest draft." },
      { action: "build", text: "Run Build." },
    ])

    const saveStatus = getProposalChecklistStatus({
      action: proposal?.items[0].action,
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      session: baseSession,
      staleProposal: false,
    })
    const buildStatus = getProposalChecklistStatus({
      action: proposal?.items[1].action,
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      session: baseSession,
      staleProposal: false,
    })

    expect(saveStatus).toEqual({ label: "Done", pillClassName: "status-ready" })
    expect(buildStatus).toEqual({ label: "Done", pillClassName: "status-ready" })
  })

  it("parses and finds the latest proposal decision from structured context cards", () => {
    const decision = parseProposalDecision(
      ["Proposal decision", "- Proposal: Session One", "- Status: approved"].join("\n"),
    )
    const latest = findLatestProposalDecision([
      {
        id: "msg-1",
        role: "system",
        createdAt: "2026-05-15T12:00:00.000Z",
        text: ["Proposal decision", "- Proposal: Session One", "- Status: needs changes"].join("\n"),
        kind: "context-card",
      },
      {
        id: "msg-2",
        role: "system",
        createdAt: "2026-05-15T12:05:00.000Z",
        text: ["Proposal decision", "- Proposal: Session One", "- Status: approved"].join("\n"),
        kind: "context-card",
      },
    ])

    expect(decision).toEqual({ proposalTitle: "Session One", status: "approved" })
    expect(latest).toEqual({ proposalTitle: "Session One", status: "approved" })
  })

  it("returns the most recent proposal decisions with timestamps", () => {
    const recent = findRecentProposalDecisions([
      {
        id: "msg-1",
        role: "system",
        createdAt: "2026-05-15T12:00:00.000Z",
        text: ["Proposal decision", "- Proposal: Session One", "- Status: needs changes"].join("\n"),
        kind: "context-card",
      },
      {
        id: "msg-2",
        role: "system",
        createdAt: "2026-05-15T12:05:00.000Z",
        text: "Other message",
        kind: "message",
      },
      {
        id: "msg-3",
        role: "system",
        createdAt: "2026-05-15T12:10:00.000Z",
        text: ["Proposal decision", "- Proposal: Session One", "- Status: approved"].join("\n"),
        kind: "context-card",
      },
    ])

    expect(recent).toEqual([
      {
        proposalTitle: "Session One",
        status: "approved",
        createdAt: "2026-05-15T12:10:00.000Z",
      },
      {
        proposalTitle: "Session One",
        status: "needs-changes",
        createdAt: "2026-05-15T12:00:00.000Z",
      },
    ])
  })

  it("summarizes proposal decision trend across recent decisions", () => {
    const approvedTrend = getProposalDecisionTrend([
      { proposalTitle: "Session One", status: "approved", createdAt: "2026-05-15T12:10:00.000Z" },
      { proposalTitle: "Session One", status: "approved", createdAt: "2026-05-15T12:00:00.000Z" },
    ])
    const mixedTrend = getProposalDecisionTrend([
      { proposalTitle: "Session One", status: "approved", createdAt: "2026-05-15T12:10:00.000Z" },
      { proposalTitle: "Session One", status: "needs-changes", createdAt: "2026-05-15T12:00:00.000Z" },
    ])

    expect(approvedTrend).toEqual({
      label: "Approved",
      summary: "Recent decisions are consistently approving the proposal direction.",
      pillClassName: "status-ready",
    })
    expect(mixedTrend).toEqual({
      label: "Mixed",
      summary: "Recent decisions changed direction, so review the latest drift and rationale before proceeding.",
      pillClassName: "status-dirty",
    })
  })

  it("suggests review-diff as the next action for review-tagged items when proposal and current draft diverge", () => {
    const action = getProposalChecklistActionConfig({
      action: "review",
      activeView: "preview",
      hasUnsavedSourceChanges: false,
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 2,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      },
      sessionHasPreview: true,
    })

    expect(action).toEqual({ label: "Review diff", handler: "reviewDiff" })
  })

  it("returns diff-oriented context for save and review checklist items", () => {
    const saveContext = getProposalChecklistContext({
      action: "save",
      build: succeededBuild,
      draftComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 2,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [
          {
            startLine: 2,
            endLine: 2,
            savedText: "<card>Saved</card>",
            draftText: "<card>Draft</card>",
          },
        ],
        previewItems: [
          {
            lineNumber: 2,
            savedText: "<card>Saved</card>",
            draftText: "<card>Draft</card>",
          },
        ],
      },
      inspect: cleanInspect,
    })
    const reviewContext = getProposalChecklistContext({
      action: "review",
      build: succeededBuild,
      inspect: cleanInspect,
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 1,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [
          {
            startLine: 2,
            endLine: 2,
            savedText: "<card>Snapshot</card>",
            draftText: "<card>Current</card>",
          },
        ],
        previewItems: [
          {
            lineNumber: 2,
            savedText: "<card>Snapshot</card>",
            draftText: "<card>Current</card>",
          },
        ],
      },
    })

    expect(saveContext).toMatchObject({
      summary: "2 changed line(s) relative to saved source.",
      previewGroups: [
        {
          startLine: 2,
          endLine: 2,
          savedText: "<card>Saved</card>",
          draftText: "<card>Draft</card>",
        },
      ],
    })
    expect(reviewContext).toMatchObject({
      summary: "1 changed line(s) relative to the latest proposal snapshot.",
      previewGroups: [
        {
          startLine: 2,
          endLine: 2,
          savedText: "<card>Snapshot</card>",
          draftText: "<card>Current</card>",
        },
      ],
    })
  })

  it("summarizes proposal checklist progress across done, pending, and review states", () => {
    const progress = getProposalChecklistProgress({
      proposalText: [
        "Proposal for Session One",
        "- [save] Save the latest draft.",
        "- [build] Run Build.",
        "- [review] Compare the preview.",
      ].join("\n"),
      build: succeededBuild,
      hasUnsavedSourceChanges: true,
      inspect: cleanInspect,
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 1,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      },
      session: baseSession,
      staleProposal: false,
    })

    expect(progress).toEqual({
      totalTaggedItems: 3,
      doneCount: 1,
      pendingCount: 1,
      reviewCount: 1,
    })
  })

  it("builds focus options for review-tagged checklist items in proposal compare mode", () => {
    const options = getProposalChecklistFocusOptions({
      proposalText: [
        "Proposal for Session One",
        "- [review] Compare the recommendation card.",
        "- [review] Compare the risk table.",
      ].join("\n"),
      comparisonMode: "proposal",
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 2,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [
          {
            startLine: 2,
            endLine: 3,
            savedText: "<card>Snapshot</card>\n<table>Old</table>",
            draftText: "<card>Current</card>\n<table>New</table>",
          },
        ],
        previewItems: [],
      },
    })

    expect(options).toEqual([
      {
        id: "review-0",
        label: "Compare the recommendation card.",
        groups: [
          {
            startLine: 2,
            endLine: 3,
            savedText: "<card>Snapshot</card>\n<table>Old</table>",
            draftText: "<card>Current</card>\n<table>New</table>",
          },
        ],
      },
      {
        id: "review-1",
        label: "Compare the risk table.",
        groups: [
          {
            startLine: 2,
            endLine: 3,
            savedText: "<card>Snapshot</card>\n<table>Old</table>",
            draftText: "<card>Current</card>\n<table>New</table>",
          },
        ],
      },
    ])
  })

  it("suggests save for the source stage and review-diff for a drifted proposal stage", () => {
    const sourceAction = getReviewTimelineActionConfig({
      stage: "source",
      activeView: "preview",
      build: succeededBuild,
      hasUnsavedSourceChanges: true,
      inspect: cleanInspect,
      latestProposalExists: true,
      latestProposalIsStale: false,
      sessionHasPreview: true,
    })
    const proposalAction = getReviewTimelineActionConfig({
      stage: "proposal",
      activeView: "preview",
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      latestProposalExists: true,
      latestProposalIsStale: false,
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 1,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      },
      sessionHasPreview: true,
    })

    expect(sourceAction).toEqual({
      label: "Save now",
      description: "Persist the current draft before continuing review.",
      handler: "save",
    })
    expect(proposalAction).toEqual({
      label: "Review diff",
      description: "Focus the current compare view on proposal drift.",
      handler: "reviewDiff",
    })
  })

  it("suggests a stage-specific timeline action when build or inspect need attention", () => {
    const buildAction = getReviewTimelineActionConfig({
      stage: "build",
      activeView: "preview",
      build: { ...succeededBuild, status: "failed", exitCode: 1 },
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      latestProposalExists: true,
      latestProposalIsStale: false,
      sessionHasPreview: false,
    })
    const inspectAction = getReviewTimelineActionConfig({
      stage: "inspect",
      activeView: "preview",
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: {
        ...cleanInspect,
        diagnostics: [{ id: "diag-1", severity: "error", message: "x", source: "inspect" }],
      },
      latestProposalExists: true,
      latestProposalIsStale: false,
      sessionHasPreview: true,
    })

    expect(buildAction).toEqual({
      label: "Run Build",
      description: "Generate or refresh the preview artifact.",
      handler: "build",
    })
    expect(inspectAction).toEqual({
      label: "Open Inspect",
      description: "Review diagnostics before trusting the proposal.",
      handler: "openInspect",
    })
  })

  it("detects the current review stage from the strongest blocking signal", () => {
    expect(
      getCurrentReviewStage({
        build: succeededBuild,
        hasUnsavedSourceChanges: true,
        inspect: cleanInspect,
        latestProposalExists: true,
        latestProposalIsStale: false,
        session: baseSession,
      }),
    ).toBe("source")

    expect(
      getCurrentReviewStage({
        build: succeededBuild,
        hasUnsavedSourceChanges: false,
        inspect: cleanInspect,
        latestProposalExists: true,
        latestProposalIsStale: false,
        proposalComparison: {
          savedLineCount: 3,
          draftLineCount: 4,
          changedLineCount: 1,
          firstChangedLine: 2,
          hasAdditionalChanges: false,
          previewGroups: [],
          previewItems: [],
        },
        session: baseSession,
      }),
    ).toBe("proposal")
  })

  it("returns stage-specific guidance for source and proposal drift states", () => {
    expect(
      getCurrentReviewStageGuidance({
        stage: "source",
        latestProposalExists: true,
        latestProposalIsStale: false,
      }),
    ).toContain("Save the current draft first")

    expect(
      getCurrentReviewStageGuidance({
        stage: "proposal",
        latestProposalExists: true,
        latestProposalIsStale: false,
        proposalComparison: {
          savedLineCount: 3,
          draftLineCount: 4,
          changedLineCount: 1,
          firstChangedLine: 2,
          hasAdditionalChanges: false,
          previewGroups: [],
          previewItems: [],
        },
      }),
    ).toContain("Review proposal drift")
  })

  it("filters duplicated readiness warnings that already match the current stage summary", () => {
    expect(
      getSecondaryReadinessItems("source", [
        "Unsaved draft changes are still pending (2 changed lines).",
        "2 checklist item(s) are still pending.",
      ]),
    ).toEqual(["2 checklist item(s) are still pending."])

    expect(
      getSecondaryReadinessItems("proposal", [
        "The latest proposal predates the current session state.",
        "1 checklist item(s) still require review.",
      ]),
    ).toEqual(["1 checklist item(s) still require review."])
  })
})
