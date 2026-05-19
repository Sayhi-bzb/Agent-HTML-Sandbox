/// <reference types="node" />
// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  assertPackBoundary,
  packageBoundaryChecks,
} from "./package-boundaries.mjs"

describe("package boundaries", () => {
  it("defines package boundary checks for the publishable package", () => {
    const checks = packageBoundaryChecks as {
      ahtml: { requiredFiles: string[] }
    }

    expect(Object.keys(checks).sort()).toEqual(["ahtml"])
    expect(checks.ahtml.requiredFiles).toEqual([
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
      assertPackBoundary("ahtml", ["src/cli/command-contract.mjs"]),
    ).toThrow("Required package file missing")
  })
})
