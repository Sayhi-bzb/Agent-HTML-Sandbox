import { describe, expect, it } from "vitest"

import type { SourceValidationState } from "./types"
import {
  formatSourceValidationDiagnosticMeta,
  getPrimarySourceValidationDiagnostic,
  getSourceValidationIssues,
  getSourceValidationHeadline,
  getSourceValidationPrimaryAction,
  getSourceValidationSnapshotLabel,
  getSourceValidationStatusPill,
  getSourceValidationSummary,
  getSourceValidationViewModel,
} from "./source-validation-view"

describe("source validation view helpers", () => {
  const invalidValidation: SourceValidationState = {
    status: "invalid",
    validatedAt: "2026-05-15T11:57:00.000Z",
    diagnostics: [
      {
        id: "validation-1",
        severity: "error",
        message: "Missing <page> root.",
        source: "validation",
        line: 1,
        code: "missing-page",
      },
    ],
    structureSummary: "Validation found source issues.",
  }

  it("derives status pills and snapshot labels from validation state", () => {
    expect(
      getSourceValidationStatusPill({ status: "idle", diagnostics: [] }),
    ).toEqual({ label: "Idle", className: "" })
    expect(
      getSourceValidationHeadline({ status: "idle", diagnostics: [] }),
    ).toBe("Validation standing by")
    expect(
      getSourceValidationStatusPill({ status: "running", diagnostics: [] }),
    ).toEqual({ label: "Validating", className: "status-building" })
    expect(
      getSourceValidationHeadline({ status: "running", diagnostics: [] }),
    ).toBe("Validation in progress")
    expect(getSourceValidationSnapshotLabel(invalidValidation)).toBe(
      "Validation 1",
    )
    expect(getSourceValidationHeadline(invalidValidation)).toBe(
      "Source needs review",
    )
  })

  it("returns readable summaries and primary diagnostics", () => {
    expect(
      getSourceValidationSummary({ status: "idle", diagnostics: [] }),
    ).toBe(
      "Lightweight validation will run automatically after you pause typing.",
    )
    expect(getSourceValidationSummary(invalidValidation)).toBe(
      "Validation found source issues.",
    )
    expect(getPrimarySourceValidationDiagnostic(invalidValidation)).toEqual(
      invalidValidation.diagnostics[0],
    )
    expect(getSourceValidationIssues(invalidValidation)).toEqual({
      issues: [
        {
          diagnostic: invalidValidation.diagnostics[0],
          meta: "line 1 · missing-page · validation",
          canOpenInSource: true,
        },
      ],
      hasAdditionalIssues: false,
    })
  })

  it("formats diagnostic meta with line, code, and source", () => {
    expect(
      formatSourceValidationDiagnosticMeta({
        line: 4,
        column: 2,
        code: "missing-page",
        source: "validation",
      }),
    ).toBe("line 4:2 · missing-page · validation")
  })

  it("returns a primary action that focuses the first issue when validation is invalid", () => {
    expect(getSourceValidationPrimaryAction(invalidValidation)).toBe(
      "focus-first-issue",
    )
    expect(
      getSourceValidationPrimaryAction({
        status: "running",
        diagnostics: [],
      }),
    ).toBe("open-source")
  })

  it("builds a shared validation view model for panel surfaces", () => {
    expect(getSourceValidationViewModel(invalidValidation)).toEqual({
      headline: "Source needs review",
      pill: {
        label: "Invalid",
        className: "status-dirty",
      },
      snapshotLabel: "Validation 1",
      summary: "Validation found source issues.",
      diagnosticsCount: 1,
      validatedAt: "2026-05-15T11:57:00.000Z",
      primaryDiagnostic: invalidValidation.diagnostics[0],
      issues: [
        {
          diagnostic: invalidValidation.diagnostics[0],
          meta: "line 1 · missing-page · validation",
          canOpenInSource: true,
        },
      ],
      hasAdditionalIssues: false,
      primaryAction: "focus-first-issue",
      primaryActionLabel: "Focus first issue",
    })
  })
})
