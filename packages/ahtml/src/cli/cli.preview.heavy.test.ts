/// <reference types="node" />
// @vitest-environment node

import { spawn } from "node:child_process"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  cliPath,
  createCliEnv,
  removeTempDir,
  useShadcnCliHarness,
  waitForPreviewUrl,
  waitForProcessExit,
} from "./cli-test-helpers"

const { getRegistryUrl } = useShadcnCliHarness()

describe("agent-html CLI heavy preview flows", () => {
  it("serves a preview from the generated static output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="CLI Preview"><card>Preview by CLI</card></page>',
    )

    const preview = spawn(
      process.execPath,
      [cliPath, "preview", inputPath, "--out", outputDir, "--port", "0"],
      {
        cwd: tempDir,
        env: createCliEnv(
          {
            AHTML_HOME: runtimeHome,
          },
          getRegistryUrl(),
        ),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )

    try {
      const url = await waitForPreviewUrl(preview)
      const response = await fetch(url)
      const body = await response.text()

      expect(body).toContain("Preview by CLI")
      expect(body).toContain(
        'rel="icon" type="image/svg+xml" href="./ghost.svg"',
      )
    } finally {
      preview.kill("SIGTERM")
      await waitForProcessExit(preview)
      await removeTempDir(tempDir)
    }
  }, 120000)
})
