import { describe, expect, it } from "vitest"

import {
  getCurrentStageEntryView,
  getInspectDiagnosticsEntryView,
  getPreviewEntryView,
  getProposalChecklistEntryView,
  getProposalDecisionEntryView,
  getProposalDecisionTrendEntryView,
  getProposalDriftEntryView,
  getProposalReadinessView,
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
      id: "source-validation",
      chip: {
        label: "Validation 1",
      },
      panel: {
        eyebrow: "Source validation",
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
      id: "source-focus",
      chip: {
        label: "Source Aligned",
      },
      panel: {
        eyebrow: "Source focus",
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
      id: "inspect-diagnostics",
      chip: {
        label: "Diagnostics 1",
      },
      panel: {
        eyebrow: "Inspect diagnostics",
        title: "Errors need attention",
        actions: [{ label: "Focus first issue" }],
      },
    })
  })

  it("builds drift and preview snapshot entries", () => {
    expect(
      getProposalDriftEntryView({
        savedLineCount: 3,
        draftLineCount: 4,
        changedLineCount: 2,
        firstChangedLine: 2,
        hasAdditionalChanges: false,
        previewGroups: [
          {
            startLine: 2,
            endLine: 3,
            savedText: "<card>",
            draftText: '<card data-variant="next">',
          },
        ],
        previewItems: [],
      }),
    ).toMatchObject({
      id: "proposal-drift",
      chip: {
        label: "Drift 2",
        pillClassName: "status-dirty",
        action: {
          id: "proposal-drift-review",
          label: "Review diff",
          kind: "review-diff",
        },
      },
      panel: {
        eyebrow: "Proposal drift",
        title: "Proposal snapshot drift detected",
        actions: [{ label: "Review diff" }],
      },
    })
    expect(getProposalDriftEntryView()).toMatchObject({
      chip: {
        label: "Drift 0",
        pillClassName: "status-ready",
        action: undefined,
      },
      panel: undefined,
    })
    expect(
      getPreviewEntryView({
        buildStatus: "idle",
        hasPreview: false,
      }),
    ).toMatchObject({
      id: "preview",
      chip: {
        label: "Preview missing",
        pillClassName: "status-dirty",
        action: {
          id: "preview-build",
          label: "Run Build",
          kind: "build",
        },
      },
      panel: {
        eyebrow: "Preview artifact",
        title: "Preview artifact missing",
        actions: [{ label: "Run Build" }],
      },
    })
    expect(
      getPreviewEntryView({
        buildStatus: "running",
        hasPreview: false,
      }),
    ).toMatchObject({
      chip: {
        label: "Preview missing",
        pillClassName: "status-dirty",
        action: undefined,
      },
      panel: {
        title: "Preview build in progress",
        actions: [],
      },
    })
    expect(
      getPreviewEntryView({
        buildStatus: "succeeded",
        hasPreview: true,
      }),
    ).toMatchObject({
      chip: {
        label: "Preview ready",
        pillClassName: "status-ready",
        action: {
          id: "preview-open",
          label: "Open Preview",
          kind: "open-preview",
        },
      },
      panel: undefined,
    })
  })

  it("builds stage, trend, and checklist snapshot entries", () => {
    expect(
      getCurrentStageEntryView({
        stage: {
          id: "build",
          label: "Build",
          statusLabel: "Pending",
          pillClassName: "status-dirty",
          summary: "Preview needs refresh.",
        },
        guidance:
          "Refresh the preview artifact before trusting proposal review or artifact-level comparison.",
        actionConfig: {
          label: "Run Build",
          description:
            "Refresh the preview artifact from the latest saved source.",
          handler: "build",
        },
      }),
    ).toMatchObject({
      id: "current-stage",
      chip: {
        label: "Stage Build",
        pillClassName: "status-dirty",
        action: {
          label: "Run Build",
          kind: "build",
        },
      },
      panel: {
        eyebrow: "Current stage",
        title: "Build is the active review gate",
        actions: [{ label: "Run Build" }],
      },
    })

    expect(
      getProposalDecisionTrendEntryView({
        label: "Mixed",
        summary: "Recent proposal decisions changed direction.",
        pillClassName: "status-dirty",
      }),
    ).toMatchObject({
      id: "proposal-decision-trend",
      chip: {
        label: "Trend Mixed",
        pillClassName: "status-dirty",
      },
    })

    expect(
      getProposalChecklistEntryView({
        proposalProgress: {
          totalTaggedItems: 4,
          doneCount: 2,
          pendingCount: 1,
          reviewCount: 1,
        },
        currentStageAction: {
          label: "Run Build",
          description:
            "Refresh the preview artifact from the latest saved source.",
          handler: "build",
        },
      }),
    ).toMatchObject({
      id: "proposal-checklist",
      chip: {
        label: "Checklist 2/4",
        pillClassName: "status-dirty",
        action: {
          label: "Review diff",
          kind: "review-diff",
        },
      },
      panel: {
        eyebrow: "Checklist progress",
        pillLabel: "In progress",
        actions: [{ label: "Review diff" }],
      },
    })
    expect(
      getProposalChecklistEntryView({
        proposalProgress: {
          totalTaggedItems: 2,
          doneCount: 2,
          pendingCount: 0,
          reviewCount: 0,
        },
      }),
    ).toMatchObject({
      chip: {
        label: "Checklist 2/2",
        pillClassName: "status-ready",
        action: undefined,
      },
      panel: {
        pillLabel: "Complete",
        actions: [],
      },
    })
  })

  it("builds a proposal decision entry with history and actions", () => {
    expect(
      getProposalDecisionEntryView({
        latestProposalExists: true,
        latestProposalDecision: {
          proposalTitle: "Landing refresh",
          status: "needs-changes",
        },
        latestProposalIsStale: false,
        recentProposalDecisions: [
          {
            proposalTitle: "Landing refresh",
            status: "needs-changes",
            createdAt: "2026-05-15T12:00:00.000Z",
          },
          {
            proposalTitle: "Landing refresh v1",
            status: "approved",
            createdAt: "2026-05-15T11:00:00.000Z",
          },
        ],
        proposalDecisionTrend: {
          label: "Mixed",
          summary: "Recent decisions changed direction.",
          pillClassName: "status-dirty",
        },
      }),
    ).toMatchObject({
      id: "proposal-decision",
      chip: {
        label: "Decision Needs changes",
        pillClassName: "status-dirty",
      },
      panel: {
        eyebrow: "Proposal decision",
        pillLabel: "Needs changes",
        meta: ["Recent decisions 2", "Trend Mixed"],
        issues: [
          {
            message: "Landing refresh",
            meta: "Needs changes · 2026-05-15T12:00:00.000Z",
          },
          {
            message: "Landing refresh v1",
            meta: "Approved · 2026-05-15T11:00:00.000Z",
          },
        ],
        actions: [{ label: "Approve" }, { label: "Needs changes" }],
      },
    })
    expect(
      getProposalDecisionEntryView({
        latestProposalExists: true,
        latestProposalIsStale: true,
        recentProposalDecisions: [],
      }),
    ).toMatchObject({
      chip: {
        label: "Decision Pending",
        pillClassName: "accent",
      },
      panel: {
        pillLabel: "Pending",
        summary:
          "The latest proposal is stale, so confirm the current session state before reusing its decision.",
      },
    })
  })

  it("builds a proposal readiness view with shared stage actions", () => {
    expect(
      getProposalReadinessView({
        proposalReadiness: {
          label: "Needs review",
          pillClassName: "status-dirty",
          summary: "Review pending signals.",
          items: ["Stale proposal context."],
        },
        currentStage: "inspect",
        currentStageGuidance:
          "Resolve or re-check diagnostics before trusting the proposal.",
        secondaryReadinessItems: ["Stale proposal context."],
        reviewTimeline: [
          {
            id: "source",
            label: "Source",
            statusLabel: "Done",
            pillClassName: "status-ready",
            summary: "Source is saved.",
          },
          {
            id: "inspect",
            label: "Inspect",
            statusLabel: "Needs review",
            pillClassName: "status-dirty",
            summary: "Diagnostics need review.",
          },
        ],
        stageActions: {
          source: {
            label: "Open Source",
            description: "Return to the source editor.",
            handler: "openSource",
          },
          inspect: {
            label: "Open Inspect",
            description: "Review the latest inspect diagnostics.",
            handler: "openInspect",
          },
        },
        currentStageAction: {
          label: "Open Inspect",
          description: "Review the latest inspect diagnostics.",
          handler: "openInspect",
        },
      }),
    ).toMatchObject({
      label: "Needs review",
      pillClassName: "status-dirty",
      summary: "Resolve or re-check diagnostics before trusting the proposal.",
      items: ["Stale proposal context."],
      stages: [
        {
          id: "source",
          isActive: false,
          action: {
            label: "Open Source",
            kind: "open-source",
          },
        },
        {
          id: "inspect",
          isActive: true,
          action: {
            label: "Open Inspect",
            kind: "open-inspect",
          },
        },
      ],
      currentAction: {
        action: {
          label: "Open Inspect",
          kind: "open-inspect",
        },
        description: "Review the latest inspect diagnostics.",
      },
    })
  })
})
