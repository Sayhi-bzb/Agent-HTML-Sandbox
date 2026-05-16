import { describe, expect, it } from "vitest"

import { hydrateDiagnosticPositions } from "./diagnostic-position"
import type { DiagnosticItem } from "./types"

describe("diagnostic position fallback", () => {
  it("keeps explicit line and column values", () => {
    const diagnostics: DiagnosticItem[] = [
      {
        id: "diag-1",
        severity: "error",
        message: "Already positioned.",
        source: "validation",
        code: "missing-root",
        line: 8,
        column: 3,
      },
    ]

    expect(hydrateDiagnosticPositions(diagnostics, "<page />")).toEqual(
      diagnostics,
    )
  })

  it("maps missing-root to the first non-empty line", () => {
    const diagnostics: DiagnosticItem[] = [
      {
        id: "diag-1",
        severity: "error",
        message: "agent-html requires a <page> root component.",
        source: "validation",
        code: "missing-root",
      },
    ]

    expect(
      hydrateDiagnosticPositions(diagnostics, "\n  <card>Missing root</card>"),
    ).toEqual([
      expect.objectContaining({
        line: 2,
        column: 3,
      }),
    ])
  })

  it("maps unknown-attr diagnostics to the offending attribute token", () => {
    const diagnostics: DiagnosticItem[] = [
      {
        id: "diag-1",
        severity: "error",
        message:
          '"className" is not an allowed agent-facing attribute on <page>.',
        source: "validation",
        code: "unknown-attr",
      },
    ]

    expect(
      hydrateDiagnosticPositions(
        diagnostics,
        ['<page title="Review"', '  className="bad"', "></page>"].join("\n"),
      ),
    ).toEqual([
      expect.objectContaining({
        line: 2,
        column: 3,
      }),
    ])
  })

  it("maps unknown-component diagnostics to the component tag", () => {
    const diagnostics: DiagnosticItem[] = [
      {
        id: "diag-1",
        severity: "error",
        message:
          "Unknown component <hero-block> is not registered in the standard component schema.",
        source: "validation",
        code: "unknown-component",
      },
    ]

    expect(
      hydrateDiagnosticPositions(
        diagnostics,
        ['<page title="Review">', "  <hero-block />", "</page>"].join("\n"),
      ),
    ).toEqual([
      expect.objectContaining({
        line: 2,
        column: 3,
      }),
    ])
  })
})
