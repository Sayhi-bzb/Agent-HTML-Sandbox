import { describe, expect, it } from "vitest"

import { getInspectReviewSummary } from "./inspect-review"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
} from "./types"

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

const emptyLogs: LogSnapshot = {
  stdout: "",
  stderr: "",
}

describe("inspect review helpers", () => {
  it("treats invalid source validation as a source-stage review signal", () => {
    const summary = getInspectReviewSummary({
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      logs: emptyLogs,
      messages: [],
      session: baseSession,
      sourceValidation: {
        status: "invalid",
        validatedAt: "2026-05-15T11:57:00.000Z",
        diagnostics: [
          {
            id: "validation-1",
            severity: "error",
            message: "Missing <page> root.",
            source: "validation",
            line: 1,
          },
        ],
        structureSummary: "Validation found source issues.",
      },
    })

    expect(summary.currentStage).toBe("source")
    expect(summary.currentAction).toEqual({
      label: "Open Source",
      description:
        "Review the current source and validation state before continuing.",
      handler: "openSource",
    })
    expect(summary.nextSteps[0]?.id).toBe("review-source-validation")
    expect(summary.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "SOURCE validation",
          detail: expect.stringContaining("Missing <page> root."),
        }),
      ]),
    )
  })

  it("surfaces inspect as the current gate when diagnostics and a failed build both need attention", () => {
    const summary = getInspectReviewSummary({
      build: { ...succeededBuild, status: "failed", exitCode: 1 },
      hasUnsavedSourceChanges: false,
      inspect: {
        ...cleanInspect,
        diagnostics: [
          {
            id: "diag-1",
            severity: "error",
            message: "Missing <page> root.",
            source: "inspect",
            line: 1,
            code: "missing-page",
          },
        ],
      },
      logs: {
        stdout: "",
        stderr:
          "error: build failed because the root page is missing\nstack line",
      },
      messages: [],
      session: {
        ...baseSession,
        summary: { ...baseSession.summary, hasPreview: false, status: "error" },
      },
    })

    expect(summary.currentStage).toBe("inspect")
    expect(summary.readiness.label).toBe("Blocked")
    expect(summary.currentAction).toEqual({
      label: "Run Inspect",
      description:
        "Refresh diagnostics and structure after the latest changes.",
      handler: "inspect",
    })
    expect(summary.nextSteps.map((step) => step.id)).toEqual([
      "review-diagnostics",
      "read-stderr",
      "draft-proposal",
    ])
    expect(summary.nextSteps[0]?.action).toEqual({
      label: "Run Inspect",
      description:
        "Refresh diagnostics and structure after the latest changes.",
      handler: "inspect",
    })
    expect(summary.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "ERROR diagnostic",
          detail: expect.stringContaining("Missing <page> root."),
        }),
        expect.objectContaining({
          label: "stderr signal",
          detail: "error: build failed because the root page is missing",
        }),
      ]),
    )
  })

  it("marks proposal review as approved when the latest decision is clean and the artifact is current", () => {
    const messages: AgentShellMessage[] = [
      {
        id: "proposal-1",
        role: "placeholder",
        createdAt: "2026-05-15T12:01:00.000Z",
        text: [
          "Proposal for Session One",
          "- [review] Compare the preview.",
        ].join("\n"),
        kind: "proposal-placeholder",
      },
      {
        id: "decision-1",
        role: "system",
        createdAt: "2026-05-15T12:02:00.000Z",
        text: [
          "Proposal decision",
          "- Proposal: Session One",
          "- Status: approved",
        ].join("\n"),
        kind: "context-card",
      },
    ]

    const summary = getInspectReviewSummary({
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      logs: {
        stdout: "Rendered preview artifact to build/index.html",
        stderr: "",
      },
      messages,
      session: baseSession,
    })

    expect(summary.currentStage).toBe("proposal")
    expect(summary.readiness.label).toBe("Approved")
    expect(summary.proposalState.statusLabel).toBe("Approved")
    expect(summary.currentAction).toEqual({
      label: "Open Preview",
      description:
        "Compare the current artifact before approving the proposal.",
      handler: "openPreview",
    })
    expect(summary.nextSteps[0]).toEqual({
      id: "compare-preview",
      title: "Compare preview against intent",
      detail:
        "Use the current preview artifact as the final check before the next proposal or artifact decision.",
      action: {
        label: "Open Preview",
        description:
          "Compare the current artifact before approving the proposal.",
        handler: "openPreview",
      },
    })
    expect(summary.evidence).toEqual([
      {
        id: "stdout-line",
        label: "stdout signal",
        detail: "Rendered preview artifact to build/index.html",
        pillClassName: "status-ready",
      },
    ])
  })

  it("calls out stale proposal drift with redraft guidance and proposal evidence", () => {
    const messages: AgentShellMessage[] = [
      {
        id: "proposal-1",
        role: "placeholder",
        createdAt: "2026-05-15T11:40:00.000Z",
        text: [
          "Proposal for Session One",
          "- [review] Compare the preview.",
        ].join("\n"),
        kind: "proposal-placeholder",
      },
    ]

    const summary = getInspectReviewSummary({
      build: succeededBuild,
      hasUnsavedSourceChanges: false,
      inspect: cleanInspect,
      logs: emptyLogs,
      messages,
      proposalComparison: {
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 2,
        firstChangedLine: 3,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      },
      session: {
        ...baseSession,
        summary: {
          ...baseSession.summary,
          updatedAt: "2026-05-15T12:10:00.000Z",
          lastBuildAt: "2026-05-15T12:05:00.000Z",
        },
      },
    })

    expect(summary.currentStage).toBe("proposal")
    expect(summary.proposalState.statusLabel).toBe("Stale")
    expect(summary.currentAction).toEqual({
      label: "Redraft proposal",
      description: "Generate a fresh proposal from the current session state.",
      handler: "draftProposal",
    })
    expect(summary.nextSteps.map((step) => step.id)).toEqual([
      "redraft-proposal",
    ])
    expect(summary.nextSteps[0]?.action).toEqual({
      label: "Redraft proposal",
      description: "Generate a fresh proposal from the current session state.",
      handler: "draftProposal",
    })
    expect(summary.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Proposal drift",
          detail: "2 changed line(s), first change near line 3.",
        }),
        expect.objectContaining({
          label: "Proposal age",
          detail:
            "The latest proposal was generated before the current saved source or build state.",
        }),
      ]),
    )
  })
})
