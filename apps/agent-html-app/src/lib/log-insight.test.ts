import { describe, expect, it } from "vitest"

import { getLogInsightViewModel } from "./log-insight"
import type { BuildRunSummary, LogSnapshot } from "./types"

const succeededBuild: BuildRunSummary = {
  runId: "build-1",
  sessionId: "session-1",
  startedAt: "2026-05-16T10:00:00.000Z",
  finishedAt: "2026-05-16T10:01:00.000Z",
  status: "succeeded",
  exitCode: 0,
  previewPath: "D:/tmp/session-1/build/index.html",
}

describe("log insight helpers", () => {
  it("explains the empty-log case", () => {
    expect(
      getLogInsightViewModel({
        build: succeededBuild,
        logs: { stdout: "", stderr: "" },
      }),
    ).toMatchObject({
      headline: "No logs captured yet",
      items: [
        {
          id: "availability",
          detail: "stdout missing · stderr missing",
        },
      ],
      streams: [
        {
          id: "stdout",
          headline: "No stdout log yet",
        },
        {
          id: "stderr",
          headline: "No stderr log yet",
        },
      ],
    })
  })

  it("recognizes successful build stdout JSON", () => {
    const logs: LogSnapshot = {
      stdout: JSON.stringify(
        {
          kind: "agent-html-build-result",
          ok: true,
          outputDir: "D:/tmp/session-1/build",
        },
        null,
        2,
      ),
      stderr: "",
    }

    expect(getLogInsightViewModel({ build: succeededBuild, logs })).toMatchObject({
      headline: "Build stdout confirms artifact generation",
      items: expect.arrayContaining([
        expect.objectContaining({
          id: "stdout-kind",
          detail: "stdout reports a build result for D:/tmp/session-1/build.",
          tone: "ready",
        }),
      ]),
      streams: expect.arrayContaining([
        expect.objectContaining({
          id: "stdout",
          headline: "Machine-readable build result",
          detail: "outputDir D:/tmp/session-1/build",
          tone: "ready",
        }),
      ]),
    })
  })

  it("recognizes validation-looking stderr", () => {
    expect(
      getLogInsightViewModel({
        build: { ...succeededBuild, status: "failed", exitCode: 1 },
        logs: {
          stdout: "",
          stderr: "error: missing-page: add a <page> root before build",
        },
      }),
    ).toMatchObject({
      headline: "stderr points to source validation",
      items: expect.arrayContaining([
        expect.objectContaining({
          id: "stderr-primary",
          tone: "error",
        }),
      ]),
      streams: expect.arrayContaining([
        expect.objectContaining({
          id: "stderr",
          headline: "Likely source validation failure",
        }),
      ]),
    })
  })

  it("falls back to stdout when stderr is empty but text output exists", () => {
    expect(
      getLogInsightViewModel({
        build: succeededBuild,
        logs: {
          stdout: "Rendered preview artifact to build/index.html",
          stderr: "",
        },
      }),
    ).toMatchObject({
      headline: "stdout captured the latest command output",
      items: expect.arrayContaining([
        expect.objectContaining({
          id: "stdout-primary",
          detail: "Rendered preview artifact to build/index.html",
        }),
      ]),
      streams: expect.arrayContaining([
        expect.objectContaining({
          id: "stdout",
          headline: "Plain text stdout",
          detail: "Rendered preview artifact to build/index.html",
        }),
      ]),
    })
  })
})
