import { describe, expect, it } from "vitest"

import {
  getInspectDiagnosticsEntryView,
  getSourceFocusEntryView,
  getSourceValidationEntryView,
} from "./agent-shell-entry-view"
import type {
  InspectSnapshot,
  SourceValidationState,
} from "./types"

describe("agent shell entry view helpers", () => {
  it("builds a source validation entry model with chip, issue list, and actions", () => {
    const validation: SourceValidationState = {
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

    expect(getSourceValidationEntryView(validation)).toEqual({
      chip: {
        label: "Validation 1",
        pillClassName: "status-dirty",
        action: {
          id: "source-validation-focus-first",
          label: "Focus first issue",
          kind: "focus-diagnostic",
          diagnostic: validation.diagnostics[0],
        },
      },
      panel: {
        title: "Source needs review",
        pillLabel: "Invalid",
        pillClassName: "status-dirty",
        summary: "Validation found source issues.",
        meta: ["Diagnostics 1", "2026-05-15T11:57:00.000Z"],
        issues: [
          {
            id: "validation-1",
            message: "Missing <page> root.",
            meta: "line 1 · missing-page · validation",
            action: {
              id: "source-validation-validation-1",
              label: "Open in Source",
              kind: "focus-diagnostic",
              diagnostic: validation.diagnostics[0],
            },
          },
        ],
        hasAdditionalIssues: false,
        actions: [
          {
            id: "source-validation-open-source",
            label: "Open Source",
            kind: "open-source",
          },
          {
            id: "source-validation-focus-first",
            label: "Focus first issue",
            kind: "focus-diagnostic",
            diagnostic: validation.diagnostics[0],
          },
        ],
      },
    })
  })

  it("builds a source focus entry model with shared action wiring", () => {
    expect(
      getSourceFocusEntryView({
        activeSourceFocus: {
          label: "Compare the recommendation card.",
          startLine: 5,
          endLine: 7,
          requestKey: "focus-1",
          originKind: "proposal-checklist-target",
          originId: "review-0:5:7",
          reviewOrigin: {
            targetId: "review-0",
            label: "Compare the recommendation card.",
            mode: "proposal",
            lineLabel: "Lines 5-7",
            groupKey: "5:7",
          },
        },
        activeSourceFocusReviewStatus: {
          kind: "linked",
          summary:
            "This source focus still matches the current review target segment.",
        },
        canRevealSourceOrigin: true,
      }),
    ).toMatchObject({
      chip: {
        label: "Source Aligned",
        pillClassName: "status-ready",
      },
      panel: {
        title: "Compare the recommendation card.",
        pillLabel: "Aligned",
        actions: [
          {
            id: "source-focus-primary",
            label: "Open Source focus",
            kind: "open-source-focus",
          },
          {
            id: "source-focus-reveal",
            label: "Reveal source origin",
            kind: "reveal-source-origin",
          },
        ],
      },
    })
  })

  it("builds an inspect diagnostics entry model with issues and primary action", () => {
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

    expect(getInspectDiagnosticsEntryView(inspect)).toEqual({
      chip: {
        label: "Diagnostics 1",
        pillClassName: "status-dirty",
        action: {
          id: "inspect-diagnostics-focus-first",
          label: "Focus first issue",
          kind: "focus-diagnostic",
          diagnostic: inspect.diagnostics[0],
        },
      },
      panel: {
        title: "Errors need attention",
        pillLabel: "Needs review",
        pillClassName: "status-dirty",
        summary:
          "Review 1 diagnostic(s) from the latest inspect run before trusting the proposal.",
        meta: ["1 diagnostic(s)"],
        issues: [
          {
            id: "diag-1",
            message: "Missing <page> root.",
            meta: "line 1 · missing-page · inspect",
            action: {
              id: "inspect-diagnostic-diag-1",
              label: "Open in Source",
              kind: "focus-diagnostic",
              diagnostic: inspect.diagnostics[0],
            },
          },
        ],
        hasAdditionalIssues: false,
        actions: [
          {
            id: "inspect-diagnostics-primary",
            label: "Focus first issue",
            kind: "focus-diagnostic",
            diagnostic: inspect.diagnostics[0],
          },
        ],
      },
    })
  })
})
