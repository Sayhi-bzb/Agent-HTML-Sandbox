import { describe, expect, it } from "vitest"

import type { InspectSnapshot } from "./types"
import {
  formatInspectDiagnosticMeta,
  getInspectDiagnosticsHeadline,
  getInspectDiagnosticsIssues,
  getInspectDiagnosticsPrimaryAction,
  getInspectDiagnosticsStatusPill,
  getInspectDiagnosticsViewModel,
  getPrimaryInspectDiagnostic,
} from "./inspect-diagnostics-view"

describe("inspect diagnostics view helpers", () => {
  const inspect: InspectSnapshot = {
    sessionId: "session-1",
    generatedAt: "2026-05-15T11:56:00.000Z",
    diagnostics: [
      {
        id: "diag-1",
        severity: "error",
        message: "Missing <page> root.",
        source: "inspect",
        line: 1,
        code: "missing-page",
      },
    ],
    structureSummary: "1 page",
  }

  it("derives a readable headline and primary action from inspect diagnostics", () => {
    expect(getInspectDiagnosticsHeadline(inspect)).toBe("Errors need attention")
    expect(getInspectDiagnosticsStatusPill(inspect)).toEqual({
      label: "Needs review",
      className: "status-dirty",
    })
    expect(getPrimaryInspectDiagnostic(inspect)).toEqual(inspect.diagnostics[0])
    expect(getInspectDiagnosticsPrimaryAction(inspect)).toBe(
      "focus-first-issue",
    )
    expect(
      getInspectDiagnosticsPrimaryAction({
        ...inspect,
        diagnostics: [],
      }),
    ).toBe("open-inspect")
  })

  it("builds a shared diagnostics view model for panel surfaces", () => {
    expect(getInspectDiagnosticsViewModel(inspect)).toEqual({
      headline: "Errors need attention",
      pill: {
        label: "Needs review",
        className: "status-dirty",
      },
      diagnosticsCount: 1,
      countSummary: "1 diagnostic(s)",
      snapshotLabel: "Diagnostics 1",
      summary:
        "Review 1 diagnostic(s) from the latest inspect run before trusting the proposal.",
      primaryDiagnostic: inspect.diagnostics[0],
      issues: [
        {
          diagnostic: inspect.diagnostics[0],
          meta: "line 1 · missing-page · inspect",
          canOpenInSource: true,
        },
      ],
      hasAdditionalIssues: false,
      primaryAction: "focus-first-issue",
      primaryActionLabel: "Focus first issue",
    })
  })

  it("returns the first diagnostics as a shared issues list", () => {
    expect(getInspectDiagnosticsIssues(inspect)).toEqual({
      issues: [
        {
          diagnostic: inspect.diagnostics[0],
          meta: "line 1 · missing-page · inspect",
          canOpenInSource: true,
        },
      ],
      hasAdditionalIssues: false,
    })
  })

  it("formats inspect diagnostic meta with line, code, and source", () => {
    expect(
      formatInspectDiagnosticMeta({
        line: 4,
        column: 2,
        code: "missing-page",
        source: "inspect",
      }),
    ).toBe("line 4:2 · missing-page · inspect")
  })
})
