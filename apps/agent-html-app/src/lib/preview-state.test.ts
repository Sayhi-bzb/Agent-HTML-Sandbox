import { describe, expect, it } from "vitest"

import { getPreviewHeaderMeta, getSessionPreviewStatusText } from "./preview-state"
import type { BuildRunSummary, SessionSummary } from "./types"

const baseBuild: BuildRunSummary = {
  runId: "build-1",
  sessionId: "session-1",
  startedAt: "2026-05-16T12:00:00.000Z",
  finishedAt: "2026-05-16T12:01:00.000Z",
  status: "succeeded",
  exitCode: 0,
  previewPath: "D:/tmp/session-1/build/index.html",
}

const baseSession: SessionSummary = {
  id: "session-1",
  name: "Session One",
  directory: "D:/tmp/session-1",
  status: "ready",
  pinned: false,
  updatedAt: "2026-05-16T12:01:00.000Z",
  lastBuildAt: "2026-05-16T12:01:00.000Z",
  hasPreview: true,
}

describe("preview state helpers", () => {
  it("uses the live build state for the preview header", () => {
    expect(
      getPreviewHeaderMeta({
        ...baseBuild,
        status: "running",
        finishedAt: undefined,
      }),
    ).toContain("Build started")

    expect(
      getPreviewHeaderMeta({
        ...baseBuild,
        status: "failed",
      }),
    ).toContain("Latest attempt")
  })

  it("distinguishes stale preview, preview missing, and no build", () => {
    expect(
      getSessionPreviewStatusText({
        ...baseSession,
        status: "error",
      }),
    ).toBe("Stale preview")

    expect(
      getSessionPreviewStatusText({
        ...baseSession,
        hasPreview: false,
        status: "error",
      }),
    ).toBe("Preview missing")

    expect(
      getSessionPreviewStatusText({
        ...baseSession,
        hasPreview: false,
        status: "draft",
        lastBuildAt: undefined,
      }),
    ).toBe("No build yet")
  })
})
