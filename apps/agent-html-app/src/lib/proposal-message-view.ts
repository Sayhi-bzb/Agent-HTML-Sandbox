import {
  getProposalChecklistActionConfig,
  getProposalChecklistContext,
  getProposalChecklistStatus,
  parseProposalChecklist,
  type ProposalDecision,
} from "./review-flow"
import { getPreviewGroupKey } from "./source-comparison"
import type { SourceComparisonSummary } from "./source-comparison"
import type { BuildRunSummary, InspectSnapshot, SessionDetail } from "./types"
import type { WorkbenchView } from "./types"

export type ProposalMessageView = {
  footerActions: ProposalMessageActionConfig[]
  title: string
  decision?: {
    label: "Approved" | "Needs changes"
    pillClassName: "status-ready" | "status-dirty"
  }
  staleNote?: string
  compare?: {
    changedLineCount: number
    pillClassName: "status-dirty"
    summary: string
    action: ProposalMessageActionConfig
  }
  checklistItems: Array<{
    id: string
    text: string
    status?: {
      label: string
      pillClassName: string
    }
    context?: {
      summary: string
      previewGroups: Array<{
        key: string
        lineLabel: string
        group: SourceComparisonSummary["previewGroups"][number]
      }>
    }
    focusCompare?: {
      mode: "saved" | "proposal"
      targetId: string
      label: string
      groups: SourceComparisonSummary["previewGroups"]
    }
    action?: ProposalMessageActionConfig
  }>
  fallbackBody: string
}

export type ProposalMessageActionConfig = {
  label: string
  handler:
    | "save"
    | "build"
    | "inspect"
    | "openInspect"
    | "openPreview"
    | "openSource"
    | "reviewDiff"
  disabled?: boolean
}

export function getProposalMessageView({
  proposalText,
  activeView,
  build,
  draftComparison,
  hasUnsavedSourceChanges,
  inspect,
  isStale,
  latestDecision,
  proposalComparison,
  session,
}: {
  proposalText: string
  activeView: WorkbenchView
  build: BuildRunSummary
  draftComparison?: SourceComparisonSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  isStale: boolean
  latestDecision?: ProposalDecision
  proposalComparison?: SourceComparisonSummary
  session: SessionDetail
}): ProposalMessageView | undefined {
  const parsedProposal = parseProposalChecklist(proposalText)
  if (!parsedProposal) {
    return undefined
  }

  const checklistItems = parsedProposal.items.map((item) => {
    const checklistStatus = getProposalChecklistStatus({
      action: item.action,
      build,
      hasUnsavedSourceChanges,
      inspect,
      proposalComparison,
      session,
      staleProposal: isStale,
    })
    const checklistAction = getProposalChecklistActionConfig({
      action: item.action,
      activeView,
      hasUnsavedSourceChanges,
      proposalComparison,
      sessionHasPreview: session.summary.hasPreview,
    })
    const checklistContext = getProposalChecklistContext({
      action: item.action,
      build,
      draftComparison,
      inspect,
      proposalComparison,
    })
    const focusCompare =
      checklistContext?.previewGroups?.length && item.action
        ? {
            mode:
              item.action === "review"
                ? ("proposal" as const)
                : ("saved" as const),
            targetId: `${item.action}-${item.text}`,
            label: item.text,
            groups: checklistContext.previewGroups,
          }
        : undefined

    return {
      id: `${item.action ?? "free"}-${item.text}`,
      text: item.text,
      status: checklistStatus,
      action: checklistAction,
      focusCompare,
      context: checklistContext
        ? {
            summary: checklistContext.summary,
            previewGroups:
              checklistContext.previewGroups?.map((group) => ({
                key: getPreviewGroupKey(group),
                lineLabel:
                  group.startLine === group.endLine
                    ? `Line ${group.startLine}`
                    : `Lines ${group.startLine}-${group.endLine}`,
                group,
              })) ?? [],
          }
        : undefined,
    }
  })

  return {
    footerActions: [
      {
        label: "Open Source",
        handler: "openSource",
        disabled: activeView === "source",
      },
      {
        label: "Run Inspect",
        handler: "inspect",
        disabled: activeView === "inspect",
      },
      {
        label: "Build",
        handler: "build",
      },
      {
        label: "Open Preview",
        handler: "openPreview",
        disabled: !session.summary.hasPreview || activeView === "preview",
      },
    ],
    title: parsedProposal.title,
    decision: latestDecision
      ? {
          label:
            latestDecision.status === "approved" ? "Approved" : "Needs changes",
          pillClassName:
            latestDecision.status === "approved"
              ? "status-ready"
              : "status-dirty",
        }
      : undefined,
    staleNote: isStale
      ? "This proposal is based on older session state. Rebuild, reinspect, or redraft before applying it."
      : undefined,
    compare: proposalComparison
      ? {
            changedLineCount: proposalComparison.changedLineCount,
            pillClassName: "status-dirty",
            summary: `The current unsaved draft has diverged from the proposal snapshot.${
              proposalComparison.firstChangedLine
                ? ` First change around line ${proposalComparison.firstChangedLine}.`
                : ""
            }`,
            action: {
              label: "Review draft diff",
              handler: "reviewDiff",
            },
          }
        : undefined,
    checklistItems,
    fallbackBody: parsedProposal.fallbackBody,
  }
}
