import { describe, expect, it } from "vitest"

import {
  buildEventMessage,
  buildLocalProposalText,
  buildProposalDecisionMessage,
  buildSourceSavedEventMessage,
  inspectEventMessage,
} from "./session-messages"
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

describe("session message helpers", () => {
  it("builds a local proposal with save, build, and stderr guidance", () => {
    const proposal = buildLocalProposalText(
      {
        ...baseSession,
        summary: {
          ...baseSession.summary,
          status: "dirty",
          hasPreview: false,
        },
      },
      { ...succeededBuild, status: "failed" },
      {
        ...cleanInspect,
        diagnostics: [
          {
            id: "diag-1",
            severity: "error",
            message: "Missing page",
            source: "inspect",
          },
        ],
      },
      {
        stdout: "",
        stderr: "error: validation failed",
      },
      '<card className="bad" />',
    )

    expect(proposal).toContain("Proposal for Session One")
    expect(proposal).toContain("[save] Save the current source changes")
    expect(proposal).toContain("[build] Add a <page> root")
    expect(proposal).toContain('[inspect] Remove "className" from the draft')
    expect(proposal).toContain("[inspect] Keep the latest stderr log open")
  })

  it("builds stable event messages", () => {
    expect(buildEventMessage(succeededBuild)).toBe(
      [
        "Build update",
        "- Status: succeeded",
        "- Preview: D:/tmp/session-1/build/index.html",
        "- Exit code: 0",
      ].join("\n"),
    )

    expect(
      buildSourceSavedEventMessage("<page>\n  <card />\n</page>", {
        savedLineCount: 3,
        draftLineCount: 3,
        changedLineCount: 1,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [],
        previewItems: [],
      }),
    ).toBe(
      ["Source saved", "- Lines: 3", "- Changed lines: 1", "- First change: line 2"].join(
        "\n",
      ),
    )

    expect(inspectEventMessage(cleanInspect)).toBe(
      ["Inspect update", "- Diagnostics: no structured diagnostics", "- Structure: 1 page"].join(
        "\n",
      ),
    )
  })

  it("builds a proposal decision message from the proposal title", () => {
    expect(
      buildProposalDecisionMessage(
        "Proposal for Session One\n- [review] Compare preview",
        "approved",
      ),
    ).toBe(
      ["Proposal decision", "- Proposal: Session One", "- Status: approved"].join(
        "\n",
      ),
    )
  })
})
