import { describe, expect, it } from "vitest"

import {
  getInspectDiagnosticsEntryView,
  getSourceFocusEntryView,
  getSourceValidationEntryView,
} from "./agent-shell-review-entry-view"
import { getInspectDiagnosticsViewModel } from "./inspect-diagnostics-view"
import { getSourceFocusViewModel } from "./source-focus-view"
import { getSourceValidationViewModel } from "./source-validation-view"
import type { InspectSnapshot, SourceValidationState } from "./types"

describe("agent shell review entry helpers", () => {
  it("builds a source validation entry model", () => {
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

    expect(
      getSourceValidationEntryView({
        sourceValidation: validation,
        sourceValidationView: getSourceValidationViewModel(validation),
      }),
    ).toMatchObject({
      chip: {
        label: "Validation 1",
      },
      panel: {
        title: "Source needs review",
        actions: [{ label: "Open Source" }, { label: "Focus first issue" }],
      },
    })
  })

  it("builds a source focus entry model", () => {
    expect(
      getSourceFocusEntryView(
        getSourceFocusViewModel({
          sourceFocus: {
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
          reviewStatus: {
            kind: "linked",
            summary:
              "This source focus still matches the current review target segment.",
          },
          canRevealSourceOrigin: true,
        }),
      ),
    ).toMatchObject({
      chip: {
        label: "Source Aligned",
      },
      panel: {
        title: "Compare the recommendation card.",
        actions: [
          { label: "Open Source focus" },
          { label: "Reveal source origin" },
        ],
      },
    })
  })

  it("builds an inspect diagnostics entry model", () => {
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

    expect(
      getInspectDiagnosticsEntryView(getInspectDiagnosticsViewModel(inspect)),
    ).toMatchObject({
      chip: {
        label: "Diagnostics 1",
      },
      panel: {
        title: "Errors need attention",
        actions: [{ label: "Focus first issue" }],
      },
    })
  })
})
