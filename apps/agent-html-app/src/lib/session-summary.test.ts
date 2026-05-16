import { describe, expect, it } from "vitest"

import { sortSessionSummaries, upsertSessionSummary } from "./session-summary"
import type { SessionSummary } from "./types"

const sessions: SessionSummary[] = [
  {
    id: "unpinned-newer",
    name: "Beta",
    directory: "D:/tmp/beta",
    status: "dirty",
    pinned: false,
    updatedAt: "2026-05-16T09:10:00.000Z",
    hasPreview: false,
  },
  {
    id: "pinned-older",
    name: "Alpha",
    directory: "D:/tmp/alpha",
    status: "ready",
    pinned: true,
    updatedAt: "2026-05-16T09:00:00.000Z",
    hasPreview: true,
  },
  {
    id: "pinned-newer",
    name: "Gamma",
    directory: "D:/tmp/gamma",
    status: "ready",
    pinned: true,
    updatedAt: "2026-05-16T09:20:00.000Z",
    hasPreview: true,
  },
]

describe("session summary ordering", () => {
  it("sorts summaries to match the backend pin and recency order", () => {
    expect(sortSessionSummaries(sessions).map((session) => session.id)).toEqual(
      ["pinned-newer", "pinned-older", "unpinned-newer"],
    )
  })

  it("keeps pinned sessions ahead of a locally updated unpinned session", () => {
    const updated = {
      ...sessions[0],
      status: "ready" as const,
      hasPreview: true,
      updatedAt: "2026-05-16T09:30:00.000Z",
    }

    expect(upsertSessionSummary(sessions, updated).map((session) => session.id)).toEqual(
      ["pinned-newer", "pinned-older", "unpinned-newer"],
    )
  })
})
