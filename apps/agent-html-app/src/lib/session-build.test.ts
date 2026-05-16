import { describe, expect, it } from "vitest"

import {
  beginBuildRun,
  applyBuildCommandFailure,
  applyCommandFailureToSession,
  applyBuildResultToSession,
  applyInspectResultToSession,
  applySourceSaveToSession,
  deriveBuildSummaryFromSession,
  deriveInspectSnapshotFromSession,
  syncInspectSnapshotWithBuild,
} from "./session-build"
import type { BuildRunSummary, InspectSnapshot, SessionDetail } from "./types"

const baseSession: SessionDetail = {
  summary: {
    id: "session-1",
    name: "Session One",
    directory: "D:/tmp/session-1",
    status: "ready",
    pinned: false,
    updatedAt: "2026-05-16T09:05:00.000Z",
    lastBuildAt: "2026-05-16T09:00:00.000Z",
    hasPreview: true,
  },
  sourcePath: "D:/tmp/session-1/source.agent.html",
  previewPath: "D:/tmp/session-1/build/index.html",
  logDirectory: "D:/tmp/session-1/logs",
  chatPath: "D:/tmp/session-1/chat.jsonl",
  currentView: "preview",
  source: "<page />",
}

const baseInspect: InspectSnapshot = {
  sessionId: baseSession.summary.id,
  generatedAt: "2026-05-16T09:06:00.000Z",
  diagnostics: [],
  structureSummary: "1 page",
}

describe("session build hydration", () => {
  it("prefers a persisted last build summary when reopening a session", () => {
    const lastBuild: BuildRunSummary = {
      runId: "build-1",
      sessionId: baseSession.summary.id,
      startedAt: "2026-05-16T08:59:00.000Z",
      finishedAt: "2026-05-16T09:00:00.000Z",
      status: "failed",
      exitCode: 1,
      stdoutPath: "D:/tmp/session-1/logs/build-1.stdout.log",
      stderrPath: "D:/tmp/session-1/logs/build-1.stderr.log",
      previewPath: baseSession.previewPath,
    }

    const session = {
      ...baseSession,
      summary: {
        ...baseSession.summary,
        status: "error" as const,
      },
      lastBuild,
    }

    expect(deriveBuildSummaryFromSession(session)).toEqual(lastBuild)
    expect(deriveInspectSnapshotFromSession(session).lastBuild).toEqual(
      lastBuild,
    )
  })

  it("falls back to session summary state for legacy sessions without persisted build details", () => {
    const session: SessionDetail = {
      ...baseSession,
      summary: {
        ...baseSession.summary,
        status: "error",
        hasPreview: false,
      },
      previewPath: undefined,
      lastBuild: undefined,
    }

    expect(deriveBuildSummaryFromSession(session)).toMatchObject({
      runId: "session-1-last-build",
      status: "failed",
      startedAt: "2026-05-16T09:00:00.000Z",
      finishedAt: "2026-05-16T09:00:00.000Z",
      previewPath: undefined,
    })
    expect(deriveInspectSnapshotFromSession(session).lastBuild).toMatchObject({
      status: "failed",
    })
  })

  it("keeps a dirty session dirty when inspect succeeds before any build", () => {
    const session: SessionDetail = {
      ...baseSession,
      summary: {
        ...baseSession.summary,
        status: "dirty",
        hasPreview: false,
        lastBuildAt: undefined,
        updatedAt: "2026-05-16T09:05:00.000Z",
      },
      previewPath: undefined,
      lastBuild: undefined,
    }
    const inspect: InspectSnapshot = {
      sessionId: session.summary.id,
      generatedAt: "2026-05-16T09:06:00.000Z",
      diagnostics: [],
      structureSummary: "1 page",
    }
    const idleBuild: BuildRunSummary = {
      runId: "session-1-idle",
      sessionId: session.summary.id,
      startedAt: "2026-05-16T09:05:00.000Z",
      status: "idle",
    }

    expect(applyInspectResultToSession(session, inspect, idleBuild)).toMatchObject({
      currentView: "inspect",
      previewPath: undefined,
      summary: {
        status: "dirty",
        hasPreview: false,
        lastBuildAt: undefined,
        updatedAt: "2026-05-16T09:06:00.000Z",
      },
      lastBuild: undefined,
    })
  })

  it("updates updatedAt and preview metadata when a build finishes", () => {
    const build: BuildRunSummary = {
      runId: "build-2",
      sessionId: baseSession.summary.id,
      startedAt: "2026-05-16T09:09:00.000Z",
      finishedAt: "2026-05-16T09:10:00.000Z",
      status: "failed",
      exitCode: 1,
      previewPath: baseSession.previewPath,
      stderrPath: "D:/tmp/session-1/logs/build-2.stderr.log",
    }

    expect(applyBuildResultToSession(baseSession, build)).toMatchObject({
      currentView: "inspect",
      previewPath: baseSession.previewPath,
      lastBuild: build,
      summary: {
        status: "error",
        hasPreview: true,
        lastBuildAt: "2026-05-16T09:10:00.000Z",
        updatedAt: "2026-05-16T09:10:00.000Z",
      },
    })
  })

  it("syncs the inspect snapshot with the latest build summary", () => {
    const nextBuild: BuildRunSummary = {
      runId: "build-2",
      sessionId: baseSession.summary.id,
      startedAt: "2026-05-16T09:09:00.000Z",
      finishedAt: "2026-05-16T09:10:00.000Z",
      status: "failed",
      exitCode: 1,
      previewPath: baseSession.previewPath,
    }

    expect(
      syncInspectSnapshotWithBuild(
        {
          ...baseInspect,
          structureSummary: "stale summary",
        },
        nextBuild,
      ),
    ).toEqual({
      ...baseInspect,
      structureSummary: "stale summary",
      lastBuild: nextBuild,
    })
  })

  it("starts a fresh build run without reusing old log metadata", () => {
    expect(
      beginBuildRun(
        {
          ...baseSession,
          lastBuild: {
            runId: "build-old",
            sessionId: baseSession.summary.id,
            startedAt: "2026-05-16T08:00:00.000Z",
            finishedAt: "2026-05-16T08:01:00.000Z",
            status: "succeeded",
            exitCode: 0,
            stdoutPath: "D:/tmp/old.stdout.log",
            stderrPath: "D:/tmp/old.stderr.log",
            previewPath: baseSession.previewPath,
          },
        },
        "2026-05-16T09:20:00.000Z",
        "build-pending-1",
      ),
    ).toMatchObject({
      session: {
        lastBuild: {
          runId: "build-pending-1",
          status: "running",
        },
        summary: {
          status: "building",
          updatedAt: "2026-05-16T09:20:00.000Z",
        },
      },
      build: {
        runId: "build-pending-1",
        sessionId: baseSession.summary.id,
        startedAt: "2026-05-16T09:20:00.000Z",
        status: "running",
        previewPath: baseSession.previewPath,
      },
    })
  })

  it("marks the saved source as dirty without dropping preview metadata", () => {
    expect(
      applySourceSaveToSession(
        baseSession,
        '<page title="Saved"><card>Updated</card></page>',
        "2026-05-16T09:12:00.000Z",
      ),
    ).toMatchObject({
      currentView: "source",
      source: '<page title="Saved"><card>Updated</card></page>',
      previewPath: baseSession.previewPath,
      summary: {
        status: "dirty",
        hasPreview: true,
        lastBuildAt: "2026-05-16T09:00:00.000Z",
        updatedAt: "2026-05-16T09:12:00.000Z",
      },
    })
  })

  it("marks the session as error and switches to inspect on command failure", () => {
    const failedBuild: BuildRunSummary = {
      runId: "build-4",
      sessionId: baseSession.summary.id,
      startedAt: "2026-05-16T09:14:00.000Z",
      finishedAt: "2026-05-16T09:15:00.000Z",
      status: "failed",
      exitCode: 1,
      previewPath: baseSession.previewPath,
    }

    expect(
      applyCommandFailureToSession(
        {
          ...baseSession,
          currentView: "preview",
        },
        "2026-05-16T09:15:00.000Z",
        {
          lastBuild: failedBuild,
        },
      ),
    ).toMatchObject({
      currentView: "inspect",
      lastBuild: failedBuild,
      summary: {
        status: "error",
        updatedAt: "2026-05-16T09:15:00.000Z",
      },
    })
  })

  it("converts the in-flight build summary into a failed build result", () => {
    expect(
      applyBuildCommandFailure(
        {
          runId: "build-3",
          sessionId: baseSession.summary.id,
          startedAt: "2026-05-16T09:14:00.000Z",
          status: "running",
        },
        "2026-05-16T09:15:00.000Z",
      ),
    ).toMatchObject({
      runId: "build-3",
      status: "failed",
      startedAt: "2026-05-16T09:14:00.000Z",
      finishedAt: "2026-05-16T09:15:00.000Z",
    })
  })
})
