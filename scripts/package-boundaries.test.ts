/// <reference types="node" />
// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  assertPackBoundary,
  packageBoundaryChecks,
} from "./package-boundaries.mjs"

describe("package boundaries", () => {
  it("defines package boundary checks for publishable packages", () => {
    expect(Object.keys(packageBoundaryChecks).sort()).toEqual(["ahtml", "core"])
    expect(packageBoundaryChecks.core.requiredFiles).toEqual([
      "index.mjs",
      "package.json",
    ])
    expect(packageBoundaryChecks.ahtml.requiredFiles).toEqual([
      "bin/ahtml.mjs",
      "src/cli/command-contract.mjs",
      "package.json",
      "README.md",
    ])
  })

  it("rejects forbidden files and accepts required package files", () => {
    expect(() =>
      assertPackBoundary("ahtml", [
        "bin/ahtml.mjs",
        "src/cli/command-contract.mjs",
        "package.json",
        "README.md",
      ]),
    ).not.toThrow()

    expect(() =>
      assertPackBoundary("core", ["index.mjs", "src/schema-overlays.ts"]),
    ).toThrow("Forbidden package file included")
  })
})
