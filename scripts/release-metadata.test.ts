/// <reference types="node" />
// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  assertReleaseChannel,
  createReleaseMetadata,
  getSharedWorkspaceVersion,
} from "./release-metadata.mjs"

describe("release metadata", () => {
  it("maps stable versions to latest", () => {
    expect(createReleaseMetadata("0.2.0")).toEqual({
      version: "0.2.0",
      gitTag: "v0.2.0",
      channel: "stable",
      distTag: "latest",
    })
  })

  it("maps alpha prereleases to alpha", () => {
    expect(createReleaseMetadata("0.2.0-alpha.1")).toEqual({
      version: "0.2.0-alpha.1",
      gitTag: "v0.2.0-alpha.1",
      channel: "alpha",
      distTag: "alpha",
    })
  })

  it("rejects unsupported prerelease channels", () => {
    expect(() => createReleaseMetadata("0.2.0-preview.1")).toThrow(
      'Unsupported prerelease channel "preview.1". Supported channels: alpha.',
    )
    expect(() => createReleaseMetadata("0.2.0-beta.1")).toThrow(
      'Unsupported prerelease channel "beta.1". Supported channels: alpha.',
    )
  })

  it("asserts the expected release channel", () => {
    expect(assertReleaseChannel("0.2.0", "stable")).toMatchObject({
      distTag: "latest",
    })
    expect(assertReleaseChannel("0.2.0-alpha.3", "alpha")).toMatchObject({
      distTag: "alpha",
    })
    expect(() => assertReleaseChannel("0.2.0-alpha.3", "stable")).toThrow(
      "Version 0.2.0-alpha.3 is alpha, expected stable.",
    )
  })

  it("accepts the single publishable package version", () => {
    expect(
      getSharedWorkspaceVersion([
        { name: "@agent-html/ahtml", version: "0.2.0" },
      ]),
    ).toBe("0.2.0")
  })

  it("still rejects mismatched manual version sets", () => {
    expect(() =>
      getSharedWorkspaceVersion([
        { name: "@agent-html/core", version: "0.2.0" },
        { name: "@agent-html/ahtml", version: "0.2.0-alpha.1" },
      ]),
    ).toThrow("Release package versions are out of sync")
  })
})
