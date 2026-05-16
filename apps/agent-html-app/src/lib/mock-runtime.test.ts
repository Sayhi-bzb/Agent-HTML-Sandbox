import { describe, expect, it } from "vitest"

import {
  createMockBuildArtifacts,
  createMockInspectArtifacts,
  createMockValidationSnapshot,
} from "./mock-runtime"
import type { BuildRunSummary, SessionDetail } from "./types"

const session: SessionDetail = {
  summary: {
    id: "session-1",
    name: "Session One",
    directory: "D:/tmp/session-1",
    status: "dirty",
    pinned: false,
    updatedAt: "2026-05-16T09:00:00.000Z",
    hasPreview: false,
  },
  sourcePath: "D:/tmp/session-1/source.agent.html",
  previewPath: undefined,
  logDirectory: "D:/tmp/session-1/logs",
  chatPath: "D:/tmp/session-1/chat.jsonl",
  currentView: "source",
  source: "<page />",
}

describe("mock runtime helpers", () => {
  it("builds a success preview payload for valid source", () => {
    const result = createMockBuildArtifacts({
      session,
      source: '<page title="Review"><card>Ok</card></page>',
    })

    expect(result.build.status).toBe("succeeded")
    expect(result.build.previewPath).toContain("mock://sessions/session-1/build/index.html")
    expect(result.previewHtml).toContain("Mock preview generated in browser mode.")
    expect(result.logs.stdout).toContain('"ok": true')
    expect(result.logs.stderr).toBe("")
  })

  it("keeps the previous preview path when a mock build fails", () => {
    const result = createMockBuildArtifacts({
      session: {
        ...session,
        previewPath: "mock://sessions/session-1/build/index.html",
      },
      source: "<card>Missing root</card>",
    })

    expect(result.build.status).toBe("failed")
    expect(result.build.previewPath).toBe(
      "mock://sessions/session-1/build/index.html",
    )
    expect(result.logs.stderr).toContain("missing-page")
    expect(result.logs.stderr).toContain("The draft should include a <page> root component.")
    expect(result.previewHtml).toBeUndefined()
  })

  it("creates inspect diagnostics and structure summary from the draft", () => {
    const build: BuildRunSummary = {
      runId: "build-1",
      sessionId: session.summary.id,
      startedAt: "2026-05-16T09:00:00.000Z",
      status: "idle",
    }

    const result = createMockInspectArtifacts({
      build,
      session,
      source: '<page title="Review"><card>Ok</card><list><item>A</item></list></page>',
    })

    expect(result.inspect.diagnostics).toEqual([])
    expect(result.inspect.structureSummary).toBe(
      "card x1, item x1, list x1, page x1",
    )
    expect(result.inspect.lastBuild).toBeUndefined()
    expect(result.logs.stdout).toContain('"kind": "agent-html-inspection"')
  })

  it("retags mock inspect diagnostics as inspect-sourced output", () => {
    const result = createMockInspectArtifacts({
      build: {
        runId: "build-2",
        sessionId: session.summary.id,
        startedAt: "2026-05-16T09:00:00.000Z",
        status: "failed",
      },
      session,
      source: '<page title="Review" className="bad"></page>',
    })

    expect(result.inspect.diagnostics).toEqual([
      expect.objectContaining({
        code: "unknown-attr",
        source: "inspect",
      }),
    ])
  })

  it("reuses the same validation rules for source validation", () => {
    const result = createMockValidationSnapshot(
      session.summary.id,
      [
        '<page title="Review"',
        '  className="bad"',
        "></page>",
      ].join("\n"),
    )

    expect(result.status).toBe("invalid")
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "unknown-attr",
        line: 2,
        column: 3,
      }),
    ])
  })

  it("adds a fallback position for missing root diagnostics", () => {
    const result = createMockValidationSnapshot(
      session.summary.id,
      [
        "",
        "  <card>Missing root</card>",
      ].join("\n"),
    )

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "missing-page",
        line: 2,
        column: 3,
      }),
    ])
  })
})
