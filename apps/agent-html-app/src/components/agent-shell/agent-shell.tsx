import { type FormEvent, useEffect, useState } from "react"

import {
  findLatestProposalDecision,
  findRecentProposalDecisions,
  getProposalDecisionTrend,
  getCurrentReviewStageGuidance,
  getCurrentReviewStage,
  getSecondaryReadinessItems,
  getProposalChecklistFocusOptions,
  getProposalChecklistProgress,
  getProposalReadiness,
  getReviewTimelineActionConfig,
  getReviewTimeline,
  isProposalStale,
  parseProposalChecklist,
  parseStructuredMessageCard,
} from "../../lib/review-flow"
import {
  getProposalMessageView,
  type ProposalMessageActionConfig,
} from "../../lib/proposal-message-view"
import {
  type AgentShellEntryView,
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
  type AgentShellDetailAction,
} from "../../lib/agent-shell-review-entry-view"
import {
  createReviewFocusTargetFromGroups,
  type ReviewFocusIntent,
  type ReviewFocusTarget,
} from "../../lib/review-focus"
import {
  createSourceFocusTargetFromDiagnostic,
  createSourceFocusTargetFromGroup,
  getSourceFocusReadinessWarning,
  type SourceFocusReviewStatus,
  type SourceFocusTarget,
} from "../../lib/source-focus"
import {
  formatInspectDiagnosticMeta,
  getInspectDiagnosticsViewModel,
} from "../../lib/inspect-diagnostics-view"
import { getSourceFocusViewModel } from "../../lib/source-focus-view"
import {
  formatSourceValidationDiagnosticMeta,
  getSourceValidationViewModel,
} from "../../lib/source-validation-view"
import { formatTimestampLabel } from "../../lib/time"
import {
  getPreviewGroupKey,
  getPreviewGroupsByKeys,
} from "../../lib/source-comparison"
import type { SourceComparisonSummary } from "../../lib/source-comparison"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  SessionDetail,
  SourceValidationState,
  WorkbenchView,
} from "../../lib/types"

type AgentShellProps = {
  session: SessionDetail
  messages: AgentShellMessage[]
  activeView: WorkbenchView
  build: BuildRunSummary
  inspect: InspectSnapshot
  hasUnsavedSourceChanges: boolean
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  sourceValidation: SourceValidationState
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  isSavingSource: boolean
  isRunningBuild: boolean
  isRunningInspect: boolean
  isSending: boolean
  isDraftingProposal: boolean
  canRevealSourceOrigin: boolean
  clearReviewFocusKey?: string
  reviewIntent?: ReviewFocusIntent
  onReviewFocusChange?: (focus?: ReviewFocusTarget) => void
  onSend: (text: string) => Promise<void> | void
  onDecision: (
    proposalText: string,
    status: "approved" | "needs changes",
  ) => Promise<void> | void
  onDraftProposal: () => Promise<void> | void
  onOpenView: (view: WorkbenchView) => Promise<void> | void
  onOpenSourceFocus: (target: SourceFocusTarget) => Promise<void> | void
  onRefreshSourceFocus: () => Promise<void> | void
  onRevealSourceReviewTarget: () => Promise<void> | void
  onBuild: () => Promise<void> | void
  onInspect: () => Promise<void> | void
  onSaveDraft: () => Promise<void> | void
}

type ComparisonMode = "saved" | "proposal"
type FocusedComparison = {
  mode: ComparisonMode
  targetId: string
  keys: string[]
  label: string
}

export function AgentShell({
  session,
  messages,
  activeView,
  build,
  inspect,
  hasUnsavedSourceChanges,
  draftComparison,
  proposalComparison,
  sourceValidation,
  activeSourceFocus,
  activeSourceFocusReviewStatus,
  isSavingSource,
  isRunningBuild,
  isRunningInspect,
  isSending,
  isDraftingProposal,
  canRevealSourceOrigin,
  clearReviewFocusKey,
  reviewIntent,
  onReviewFocusChange,
  onSend,
  onDecision,
  onDraftProposal,
  onOpenView,
  onOpenSourceFocus,
  onRefreshSourceFocus,
  onRevealSourceReviewTarget,
  onBuild,
  onInspect,
  onSaveDraft,
}: AgentShellProps) {
  const [draft, setDraft] = useState("")
  const [isDraftPreviewExpanded, setIsDraftPreviewExpanded] = useState(false)
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("saved")
  const [focusedComparison, setFocusedComparison] = useState<
    FocusedComparison | undefined
  >(undefined)
  const latestProposal = [...messages]
    .reverse()
    .find((message) => message.kind === "proposal-placeholder")
  const latestProposalDecision = findLatestProposalDecision(messages)
  const recentProposalDecisions = findRecentProposalDecisions(messages)
  const proposalDecisionTrend = getProposalDecisionTrend(
    recentProposalDecisions,
  )
  const latestProposalIsStale = latestProposal
    ? isProposalStale(latestProposal.createdAt, session)
    : false
  const latestProposalHasDraftDelta = Boolean(
    latestProposal && proposalComparison,
  )
  const proposalProgress = getProposalChecklistProgress({
    proposalText: latestProposal?.text,
    build,
    hasUnsavedSourceChanges,
    inspect,
    proposalComparison,
    session,
    staleProposal: latestProposalIsStale,
  })
  const reviewTimeline = getReviewTimeline({
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposal,
    latestProposalDecision,
    proposalDecisionTrend,
    latestProposalIsStale,
    messages,
    proposalComparison,
    proposalProgress,
    session,
    sourceValidation,
  })
  const currentReviewStage = getCurrentReviewStage({
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposalExists: Boolean(latestProposal),
    latestProposalIsStale,
    proposalComparison,
    session,
    sourceValidation,
  })
  const isProposalActionBusy =
    isDraftingProposal ||
    isSending ||
    isSavingSource ||
    isRunningBuild ||
    isRunningInspect
  const proposalReadiness = getProposalReadiness({
    build,
    inspect,
    session,
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    latestProposalIsStale,
    hasUnsavedSourceChanges,
    draftComparison,
    proposalComparison,
    proposalProgress,
    sourceFocusReviewStatus: activeSourceFocusReviewStatus,
    sourceValidation,
  })
  const sourceFocusReadinessWarning = getSourceFocusReadinessWarning(
    activeSourceFocusReviewStatus,
  )
  const secondaryReadinessItems = getSecondaryReadinessItems(
    currentReviewStage,
    proposalReadiness.items,
  ).filter((item) => item !== sourceFocusReadinessWarning)
  const activeComparison =
    comparisonMode === "proposal" && proposalComparison
      ? proposalComparison
      : draftComparison
  const proposalFocusOptions = getProposalChecklistFocusOptions({
    proposalText: latestProposal?.text,
    comparisonMode,
    build,
    hasUnsavedSourceChanges,
    inspect,
    draftComparison,
    proposalComparison,
  })
  const sourceFocusView = getSourceFocusViewModel({
    sourceFocus: activeSourceFocus,
    reviewStatus: activeSourceFocusReviewStatus,
    canRevealSourceOrigin,
  })
  const sourceValidationView = getSourceValidationViewModel(sourceValidation)
  const inspectDiagnosticsView = getInspectDiagnosticsViewModel(inspect)
  const sourceValidationEntry = getSourceValidationEntryView({
    sourceValidation,
    sourceValidationView,
  })
  const sourceFocusEntry = getSourceFocusEntryView(sourceFocusView)
  const inspectDiagnosticsEntry = getInspectDiagnosticsEntryView(
    inspectDiagnosticsView,
  )
  const proposalDriftEntry = getProposalDriftEntryView(proposalComparison)
  const previewEntry = getPreviewEntryView({
    buildStatus: build.status,
    hasPreview: session.summary.hasPreview,
  })
  const currentStageGuidance = getCurrentReviewStageGuidance({
    stage: currentReviewStage,
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    proposalDecisionTrend,
    latestProposalIsStale,
    proposalComparison,
    sourceValidationStatus: sourceValidation.status,
  })
  const stageActions = Object.fromEntries(
    reviewTimeline.map((item) => [
      item.id,
      getReviewTimelineActionConfig({
        stage: item.id,
        activeView,
        build,
        hasUnsavedSourceChanges,
        inspect,
        latestProposalExists: Boolean(latestProposal),
        latestProposalDecision,
        latestProposalIsStale,
        proposalComparison,
        sessionHasPreview: session.summary.hasPreview,
        sourceValidation,
      }),
    ]),
  ) as Partial<
    Record<
      (typeof reviewTimeline)[number]["id"],
      ReturnType<typeof getReviewTimelineActionConfig>
    >
  >
  const currentStageAction = stageActions[currentReviewStage]
  const currentStageItem =
    reviewTimeline.find((item) => item.id === currentReviewStage) ??
    reviewTimeline[0]
  const currentStageEntry = currentStageItem
    ? getCurrentStageEntryView({
        stage: currentStageItem,
        guidance: currentStageGuidance,
        actionConfig: currentStageAction,
      })
    : undefined
  const proposalDecisionTrendEntry = getProposalDecisionTrendEntryView(
    proposalDecisionTrend,
  )
  const proposalChecklistEntry = getProposalChecklistEntryView({
    proposalProgress,
    currentStageAction,
  })
  const proposalDecisionEntry = getProposalDecisionEntryView({
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    latestProposalIsStale,
    recentProposalDecisions,
    proposalDecisionTrend,
  })
  const proposalReadinessView = getProposalReadinessView({
    proposalReadiness,
    currentStage: currentReviewStage,
    currentStageGuidance,
    secondaryReadinessItems,
    reviewTimeline,
    stageActions,
    currentStageAction,
  })
  const snapshotEntries: AgentShellEntryView[] = [
    currentStageEntry,
    proposalDecisionEntry,
    proposalDecisionTrendEntry,
    proposalChecklistEntry,
    sourceValidationEntry,
    sourceFocusEntry,
    inspectDiagnosticsEntry,
    proposalDriftEntry,
    previewEntry,
  ].flatMap((entry) => (entry ? [entry] : []))
  const detailEntries: Array<
    AgentShellEntryView & {
      panel: NonNullable<AgentShellEntryView["panel"]>
    }
  > = snapshotEntries.flatMap((entry) =>
    entry.panel ? [{ ...entry, panel: entry.panel }] : [],
  )
  const showComparisonModeSwitch = Boolean(
    draftComparison && proposalComparison,
  )
  const showCompareCard = Boolean(activeComparison)
  const comparisonLabels =
    comparisonMode === "proposal"
      ? {
          cardTitle: "Proposal snapshot delta",
          baseLabel: "Proposal snapshot",
          currentLabel: hasUnsavedSourceChanges
            ? "Current draft"
            : "Current source",
          helper:
            "This compare is anchored to the latest proposal snapshot, so you can review how far the current draft/source has drifted.",
        }
      : {
          cardTitle: "Unsaved source delta",
          baseLabel: "Saved source",
          currentLabel: "Current draft",
          helper:
            "Proposal, build, and inspect actions will be more reliable after this draft is saved into session truth.",
        }
  const focusedPreviewGroups =
    activeComparison && focusedComparison?.mode === comparisonMode
      ? getPreviewGroupsByKeys(activeComparison, focusedComparison.keys)
      : undefined
  const visibleDraftPreviewGroups = activeComparison
    ? focusedPreviewGroups && focusedPreviewGroups.length > 0
      ? focusedPreviewGroups
      : isDraftPreviewExpanded
        ? activeComparison.previewGroups
        : activeComparison.previewGroups.slice(0, 3)
    : []

  useEffect(() => {
    setDraft("")
  }, [session.summary.id])

  useEffect(() => {
    setIsDraftPreviewExpanded(false)
    setFocusedComparison(undefined)
  }, [
    session.summary.id,
    draftComparison?.changedLineCount,
    proposalComparison?.changedLineCount,
  ])

  useEffect(() => {
    if (comparisonMode === "proposal" && !proposalComparison) {
      setComparisonMode("saved")
    }
  }, [comparisonMode, proposalComparison])

  useEffect(() => {
    if (!clearReviewFocusKey) {
      return
    }

    setFocusedComparison(undefined)
    setIsDraftPreviewExpanded(false)
  }, [clearReviewFocusKey])

  useEffect(() => {
    if (!onReviewFocusChange) {
      return
    }

    if (!focusedComparison || focusedComparison.mode !== comparisonMode) {
      onReviewFocusChange(undefined)
      return
    }

    onReviewFocusChange(
      createReviewFocusTargetFromGroups({
        targetId: focusedComparison.targetId,
        mode: focusedComparison.mode,
        label: focusedComparison.label,
        groups: focusedPreviewGroups,
      }),
    )
  }, [
    comparisonMode,
    focusedComparison,
    focusedPreviewGroups,
    onReviewFocusChange,
  ])

  useEffect(() => {
    if (!reviewIntent) {
      return
    }

    const groups =
      reviewIntent.mode === "proposal"
        ? getPreviewGroupsByKeys(proposalComparison, reviewIntent.groupKeys)
        : getPreviewGroupsByKeys(draftComparison, reviewIntent.groupKeys)

    focusComparisonGroups(
      reviewIntent.mode,
      reviewIntent.targetId,
      reviewIntent.label,
      groups,
    )
  }, [
    reviewIntent,
    draftComparison?.changedLineCount,
    proposalComparison?.changedLineCount,
  ])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) {
      return
    }

    await onSend(draft)
    setDraft("")
  }

  function getFocusedReviewTarget(
    groups?: SourceComparisonSummary["previewGroups"],
  ) {
    if (!focusedComparison || focusedComparison.mode !== comparisonMode) {
      return undefined
    }

    return createReviewFocusTargetFromGroups({
      targetId: focusedComparison.targetId,
      mode: focusedComparison.mode,
      label: focusedComparison.label,
      groups,
    })
  }

  function getDefaultProposalFocusOption() {
    return proposalFocusOptions[0]
  }

  function focusChecklistOption(option?: {
    id?: string
    label: string
    groups: SourceComparisonSummary["previewGroups"]
  }) {
    if (!option) {
      focusComparisonGroups(
        "proposal",
        "proposal-drift",
        "Current proposal drift",
        proposalComparison?.previewGroups,
      )
      return
    }

    focusComparisonGroups(
      "proposal",
      option.id ?? `proposal-${option.label}`,
      option.label,
      option.groups,
    )
  }

  function focusComparisonGroups(
    mode: ComparisonMode,
    targetId: string,
    label: string,
    groups?: SourceComparisonSummary["previewGroups"],
  ) {
    setComparisonMode(mode)
    setFocusedComparison(
      groups && groups.length > 0
        ? {
            mode,
            targetId,
            keys: groups.map((group) => getPreviewGroupKey(group)),
            label,
          }
        : undefined,
    )
    setIsDraftPreviewExpanded(true)
  }

  function runWorkflowAction(
    handler:
      | "save"
      | "build"
      | "inspect"
      | "openInspect"
      | "openSource"
      | "reviewDiff"
      | "openPreview"
      | "draftProposal",
  ) {
    switch (handler) {
      case "save":
        void onSaveDraft()
        break
      case "build":
        void onBuild()
        break
      case "inspect":
        void onInspect()
        break
      case "openInspect":
        void onOpenView("inspect")
        break
      case "openSource":
        void onOpenView("source")
        break
      case "reviewDiff":
        focusChecklistOption(getDefaultProposalFocusOption())
        break
      case "openPreview":
        void onOpenView("preview")
        break
      case "draftProposal":
        void onDraftProposal()
        break
    }
  }

  function runDetailAction(action: AgentShellDetailAction) {
    switch (action.kind) {
      case "open-source":
        runWorkflowAction("openSource")
        break
      case "open-inspect":
        runWorkflowAction(activeView === "inspect" ? "inspect" : "openInspect")
        break
      case "focus-diagnostic": {
        const target = createSourceFocusTargetFromDiagnostic({
          diagnostic: action.diagnostic,
        })
        if (target) {
          void onOpenSourceFocus(target)
        }
        break
      }
      case "open-source-focus":
        if (activeSourceFocus) {
          void onOpenSourceFocus(activeSourceFocus)
        }
        break
      case "refresh-source-focus":
        void onRefreshSourceFocus()
        break
      case "reveal-source-origin":
        void onRevealSourceReviewTarget()
        break
      case "review-diff":
        runWorkflowAction("reviewDiff")
        break
      case "open-preview":
        runWorkflowAction("openPreview")
        break
      case "save":
        runWorkflowAction("save")
        break
      case "inspect":
        runWorkflowAction("inspect")
        break
      case "draft-proposal":
        runWorkflowAction("draftProposal")
        break
      case "approve-proposal":
        if (latestProposal) {
          void onDecision(latestProposal.text, "approved")
        }
        break
      case "needs-changes-proposal":
        if (latestProposal) {
          void onDecision(latestProposal.text, "needs changes")
        }
        break
      case "build":
        runWorkflowAction("build")
        break
    }
  }

  function isDetailActionDisabled(action: AgentShellDetailAction) {
    if (isProposalActionBusy) {
      return true
    }

    switch (action.kind) {
      case "approve-proposal":
        return !latestProposal || latestProposalDecision?.status === "approved"
      case "needs-changes-proposal":
        return (
          !latestProposal || latestProposalDecision?.status === "needs-changes"
        )
      case "open-source":
        return activeView === "source"
      case "open-preview":
        return activeView === "preview"
      default:
        return false
    }
  }

  function renderEntryPanel(
    entry: AgentShellEntryView & {
      panel: NonNullable<AgentShellEntryView["panel"]>
    },
  ) {
    const { panel } = entry

    return (
      <div className="proposal-entry-panel" key={entry.id}>
        <div className="message-topline">
          <div>
            <p className="eyebrow">{panel.eyebrow}</p>
            <h4>{panel.title}</h4>
          </div>
          <span className={`pill ${panel.pillClassName}`}>
            {panel.pillLabel}
          </span>
        </div>
        <p className="proposal-starter-copy">{panel.summary}</p>
        {panel.meta.length > 0 ? (
          <div className="proposal-meta-row">
            {panel.meta.map((item, index) => (
              <span
                className={
                  panel.metaDisplay === "first-pill"
                    ? index === 0
                      ? "pill accent"
                      : "inline-meta"
                    : "pill"
                }
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {panel.issues?.length ? (
          <div className="proposal-list">
            {panel.issues.map((issue) => (
              <div className="proposal-meta-row" key={issue.id}>
                <span className="inline-meta">{issue.message}</span>
                <span className="inline-meta">{issue.meta}</span>
                {issue.action ? (
                  <button
                    className="mini-button"
                    disabled={isDetailActionDisabled(issue.action)}
                    onClick={() => runDetailAction(issue.action!)}
                    type="button"
                  >
                    {issue.action.label}
                  </button>
                ) : null}
              </div>
            ))}
            {panel.hasAdditionalIssues && panel.additionalIssuesLabel ? (
              <span className="inline-meta">{panel.additionalIssuesLabel}</span>
            ) : null}
          </div>
        ) : null}
        {panel.actions.length > 0 ? (
          <div className="proposal-actions">
            {panel.actions.map((action) => (
              <button
                className="mini-button"
                disabled={isDetailActionDisabled(action)}
                key={action.id}
                onClick={() => runDetailAction(action)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <aside className="panel agent-shell">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Agent</p>
          <h2>Shell</h2>
        </div>
        <span className="pill accent">Session-backed</span>
      </div>

      <section className="context-card">
        <p className="eyebrow">Session context</p>
        <h3>{session.summary.name}</h3>
        <dl className="key-value-grid compact">
          <dt>Status</dt>
          <dd>{session.summary.status}</dd>
          <dt>Source</dt>
          <dd>{session.sourcePath}</dd>
          <dt>Preview</dt>
          <dd>{session.previewPath ?? "none"}</dd>
        </dl>
      </section>

      <section className="context-card review-timeline-card">
        <div className="message-topline">
          <div>
            <p className="eyebrow">Review timeline</p>
            <h3>Source to proposal checkpoints</h3>
          </div>
        </div>
        <div className="timeline-list">
          {reviewTimeline.map((item) => (
            <article
              className={
                item.id === currentReviewStage
                  ? "timeline-item active"
                  : "timeline-item"
              }
              key={item.id}
            >
              <div className="message-topline">
                <div className="timeline-label-group">
                  <h4>{item.label}</h4>
                  <span className="inline-meta">
                    {item.timestamp
                      ? formatTimestampLabel(item.timestamp)
                      : "No event yet"}
                  </span>
                </div>
                <span className={`pill ${item.pillClassName}`}>
                  {item.statusLabel}
                </span>
              </div>
              <p className="timeline-summary">{item.summary}</p>
            </article>
          ))}
        </div>
      </section>

      {showCompareCard && activeComparison ? (
        <section className="context-card draft-compare-card">
          <div className="message-topline">
            <div>
              <p className="eyebrow">Draft compare</p>
              <h3>{comparisonLabels.cardTitle}</h3>
            </div>
            <div className="proposal-actions">
              <button
                className="mini-button"
                disabled={
                  activeView === "source" ||
                  isSavingSource ||
                  isRunningBuild ||
                  isRunningInspect ||
                  isDraftingProposal
                }
                onClick={() => void onOpenView("source")}
                type="button"
              >
                Open Source
              </button>
              {hasUnsavedSourceChanges ? (
                <button
                  className="mini-button"
                  disabled={
                    isSavingSource ||
                    isRunningBuild ||
                    isRunningInspect ||
                    isDraftingProposal
                  }
                  onClick={() => void onSaveDraft()}
                  type="button"
                >
                  {isSavingSource ? "Saving..." : "Save now"}
                </button>
              ) : null}
            </div>
          </div>
          {showComparisonModeSwitch ? (
            <div
              className="compare-mode-toggle"
              role="tablist"
              aria-label="Compare base"
            >
              <button
                aria-selected={comparisonMode === "saved"}
                className={
                  comparisonMode === "saved"
                    ? "mini-button compare-mode-button active"
                    : "mini-button compare-mode-button"
                }
                onClick={() => setComparisonMode("saved")}
                role="tab"
                type="button"
              >
                Saved source
              </button>
              <button
                aria-selected={comparisonMode === "proposal"}
                className={
                  comparisonMode === "proposal"
                    ? "mini-button compare-mode-button active"
                    : "mini-button compare-mode-button"
                }
                onClick={() => setComparisonMode("proposal")}
                role="tab"
                type="button"
              >
                Proposal snapshot
              </button>
            </div>
          ) : null}
          {proposalFocusOptions.length > 0 ? (
            <div className="compare-focus-strip">
              {proposalFocusOptions.map((option) => (
                <button
                  className={
                    focusedComparison?.targetId === option.id
                      ? "mini-button compare-focus-button active"
                      : "mini-button compare-focus-button"
                  }
                  key={option.id}
                  onClick={() =>
                    setFocusedComparison({
                      mode: comparisonMode,
                      targetId: option.id,
                      keys: option.groups.map((group) =>
                        getPreviewGroupKey(group),
                      ),
                      label: option.label,
                    })
                  }
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          <dl className="key-value-grid compact">
            <dt>Changed lines</dt>
            <dd>{activeComparison.changedLineCount}</dd>
            <dt>{comparisonLabels.baseLabel}</dt>
            <dd>{activeComparison.savedLineCount} lines</dd>
            <dt>{comparisonLabels.currentLabel}</dt>
            <dd>{activeComparison.draftLineCount} lines</dd>
            <dt>First change</dt>
            <dd>
              {activeComparison.firstChangedLine
                ? `Line ${activeComparison.firstChangedLine}`
                : "n/a"}
            </dd>
          </dl>
          {activeComparison.previewGroups.length > 0 ? (
            <div className="draft-preview-list">
              {visibleDraftPreviewGroups.map((group) => (
                <article
                  className="draft-preview-item"
                  key={getPreviewGroupKey(group)}
                >
                  <div className="message-topline">
                    <span className="pill">
                      {group.startLine === group.endLine
                        ? `Line ${group.startLine}`
                        : `Lines ${group.startLine}-${group.endLine}`}
                    </span>
                    <button
                      className="mini-button"
                      disabled={isProposalActionBusy}
                      onClick={() =>
                        void onOpenSourceFocus(
                          createSourceFocusTargetFromGroup({
                            label:
                              focusedComparison?.label ??
                              comparisonLabels.cardTitle,
                            group,
                            compareMode: comparisonMode,
                            reviewTarget:
                              getFocusedReviewTarget(focusedPreviewGroups),
                          }),
                        )
                      }
                      type="button"
                    >
                      Open in Source
                    </button>
                  </div>
                  <div className="draft-preview-code">
                    <p className="draft-preview-label">Saved</p>
                    <pre>{group.savedText || "(empty)"}</pre>
                  </div>
                  <div className="draft-preview-code draft-preview-code-next">
                    <p className="draft-preview-label">Draft</p>
                    <pre>{group.draftText || "(empty)"}</pre>
                  </div>
                </article>
              ))}
              <div className="draft-preview-footer">
                {focusedPreviewGroups && focusedPreviewGroups.length > 0 ? (
                  <>
                    <button
                      className="mini-button"
                      onClick={() => setFocusedComparison(undefined)}
                      type="button"
                    >
                      Show all compare groups
                    </button>
                    <span className="inline-meta">
                      Focused on{" "}
                      {focusedComparison?.label ?? "selected checklist item"}{" "}
                      with {focusedPreviewGroups.length} group(s).
                    </span>
                  </>
                ) : null}
                {activeComparison.previewGroups.length > 3 ||
                activeComparison.hasAdditionalChanges ? (
                  <>
                    <button
                      className="mini-button"
                      onClick={() =>
                        setIsDraftPreviewExpanded((current) => !current)
                      }
                      type="button"
                    >
                      {isDraftPreviewExpanded
                        ? "Show fewer changes"
                        : "Show more changes"}
                    </button>
                    <span className="inline-meta">
                      {isDraftPreviewExpanded
                        ? activeComparison.hasAdditionalChanges
                          ? `Showing the first ${activeComparison.previewGroups.length} changed groups.`
                          : `Showing all ${activeComparison.previewGroups.length} changed groups.`
                        : `Showing ${visibleDraftPreviewGroups.length} of ${activeComparison.previewGroups.length} changed groups.`}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <p className="proposal-starter-copy">{comparisonLabels.helper}</p>
        </section>
      ) : null}

      <section className="context-card proposal-starter-card">
        <div className="message-topline">
          <div>
            <p className="eyebrow">Proposal</p>
            <h3>Session-backed next step</h3>
          </div>
          <button
            className="primary-button"
            disabled={isProposalActionBusy}
            onClick={() => void onDraftProposal()}
            type="button"
          >
            {isDraftingProposal
              ? "Drafting..."
              : hasUnsavedSourceChanges
                ? "Save + draft proposal"
                : "Draft proposal"}
          </button>
        </div>
        <p className="proposal-starter-copy">
          {hasUnsavedSourceChanges
            ? "The current source draft will be saved first so the proposal reflects the latest session truth."
            : "Generate a proposal from the current source, latest build state, preview availability, and captured logs."}
        </p>
        {latestProposal ? (
          <div className="proposal-meta-row">
            <p className="inline-meta">
              Latest proposal {formatTimestampLabel(latestProposal.createdAt)}
            </p>
            {latestProposalIsStale ? (
              <span className="pill status-dirty">Stale context</span>
            ) : null}
          </div>
        ) : (
          <p className="inline-meta">
            No proposal drafted for this session yet.
          </p>
        )}
        <div className="proposal-snapshot-row">
          {snapshotEntries.map((entry) =>
            entry.chip.action ? (
              <button
                className={`proposal-snapshot-chip pill ${entry.chip.pillClassName}`}
                disabled={isDetailActionDisabled(entry.chip.action)}
                key={entry.id}
                onClick={() => runDetailAction(entry.chip.action!)}
                type="button"
              >
                {entry.chip.label}
              </button>
            ) : (
              <span
                className={`pill ${entry.chip.pillClassName}`}
                key={entry.id}
              >
                {entry.chip.label}
              </span>
            ),
          )}
        </div>
        {detailEntries.map((entry) => renderEntryPanel(entry))}
        <div className="proposal-readiness">
          <div className="message-topline">
            <p className="eyebrow">Proposal readiness</p>
            <span className={`pill ${proposalReadinessView.pillClassName}`}>
              {proposalReadinessView.label}
            </span>
          </div>
          <div
            className="proposal-stage-strip"
            role="list"
            aria-label="Review path"
          >
            {proposalReadinessView.stages.map((item) => (
              <button
                className={
                  item.isActive
                    ? "proposal-stage-chip active"
                    : "proposal-stage-chip"
                }
                disabled={!item.action || isDetailActionDisabled(item.action)}
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    runDetailAction(item.action)
                  }
                }}
                role="listitem"
                type="button"
              >
                <span className="proposal-stage-name">{item.label}</span>
                <span className={`pill ${item.pillClassName}`}>
                  {item.statusLabel}
                </span>
              </button>
            ))}
          </div>
          <p className="proposal-readiness-summary">
            {proposalReadinessView.summary}
          </p>
          {proposalReadinessView.items.length > 0 ? (
            <ul className="proposal-list proposal-readiness-list">
              {proposalReadinessView.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {proposalReadinessView.currentAction ? (
            <div className="proposal-readiness-action">
              <button
                className="mini-button"
                disabled={isDetailActionDisabled(
                  proposalReadinessView.currentAction.action,
                )}
                onClick={() =>
                  runDetailAction(proposalReadinessView.currentAction!.action)
                }
                type="button"
              >
                {proposalReadinessView.currentAction.action.label}
              </button>
              <span className="inline-meta">
                {proposalReadinessView.currentAction.description}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <div className="message-list">
        {messages.map((message) => (
          <AgentShellMessageCard
            activeView={activeView}
            build={build}
            hasUnsavedSourceChanges={hasUnsavedSourceChanges}
            inspect={inspect}
            isProposalActionBusy={isProposalActionBusy}
            key={message.id}
            latestDecision={
              latestProposal?.id === message.id &&
              latestProposalDecision?.proposalTitle ===
                (parseProposalMessage(message.text)?.title?.replace(
                  /^Proposal for\s+/,
                  "",
                ) ?? "")
                ? latestProposalDecision
                : undefined
            }
            message={message}
            onDecision={onDecision}
            onReviewDraftDiff={() => {
              focusChecklistOption(proposalFocusOptions[0])
            }}
            onBuild={onBuild}
            onFocusCompare={focusComparisonGroups}
            onInspect={onInspect}
            onOpenView={onOpenView}
            onOpenSourceFocus={onOpenSourceFocus}
            onSaveDraft={onSaveDraft}
            draftComparison={draftComparison}
            proposalComparison={
              latestProposal?.id === message.id && latestProposalHasDraftDelta
                ? proposalComparison
                : undefined
            }
            session={session}
            isStale={latestProposal?.id === message.id && latestProposalIsStale}
          />
        ))}
      </div>

      <form className="composer-shell" onSubmit={handleSubmit}>
        <label htmlFor="agent-input">Future prompt</label>
        <textarea
          id="agent-input"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Store a prompt draft or note in this session."
          value={draft}
        />
        <button
          className="primary-button"
          disabled={isSending || !draft.trim()}
          type="submit"
        >
          {isSending ? "Saving..." : "Store draft"}
        </button>
      </form>
    </aside>
  )
}

type AgentShellMessageCardProps = {
  message: AgentShellMessage
  session: SessionDetail
  activeView: WorkbenchView
  build: BuildRunSummary
  inspect: InspectSnapshot
  hasUnsavedSourceChanges: boolean
  isProposalActionBusy: boolean
  isStale: boolean
  latestDecision?: {
    proposalTitle: string
    status: "approved" | "needs-changes"
  }
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  onOpenView: (view: WorkbenchView) => Promise<void> | void
  onBuild: () => Promise<void> | void
  onDecision: (
    proposalText: string,
    status: "approved" | "needs changes",
  ) => Promise<void> | void
  onFocusCompare: (
    mode: ComparisonMode,
    targetId: string,
    label: string,
    groups: SourceComparisonSummary["previewGroups"],
  ) => void
  onInspect: () => Promise<void> | void
  onOpenSourceFocus: (target: SourceFocusTarget) => Promise<void> | void
  onSaveDraft: () => Promise<void> | void
  onReviewDraftDiff: () => void
}

function parseProposalMessage(text: string) {
  return parseProposalChecklist(text)
}

function AgentShellMessageCard({
  message,
  session,
  activeView,
  build,
  inspect,
  hasUnsavedSourceChanges,
  isProposalActionBusy,
  isStale,
  latestDecision,
  draftComparison,
  proposalComparison,
  onOpenView,
  onBuild,
  onDecision,
  onFocusCompare,
  onInspect,
  onOpenSourceFocus,
  onSaveDraft,
  onReviewDraftDiff,
}: AgentShellMessageCardProps) {
  const isProposal = message.kind === "proposal-placeholder"
  const isContextCard = message.kind === "context-card"
  const proposalView = isProposal
    ? getProposalMessageView({
        proposalText: message.text,
        activeView,
        build,
        draftComparison,
        hasUnsavedSourceChanges,
        inspect,
        isStale,
        latestDecision,
        proposalComparison,
        session,
      })
    : undefined
  const parsedContextCard = isContextCard
    ? parseStructuredMessageCard(message.text)
    : undefined

  function runProposalMessageAction(action: ProposalMessageActionConfig) {
    switch (action.handler) {
      case "save":
        void onSaveDraft()
        break
      case "build":
        void onBuild()
        break
      case "inspect":
        void onInspect()
        break
      case "openInspect":
        void onOpenView("inspect")
        break
      case "reviewDiff":
        onReviewDraftDiff()
        break
      case "openPreview":
        void onOpenView("preview")
        break
      case "openSource":
        void onOpenView("source")
        break
    }
  }

  return (
    <article
      className={
        isProposal
          ? "message-card proposal-card"
          : isContextCard
            ? "message-card context-message-card"
            : "message-card"
      }
    >
      <div className="message-topline">
        <span className={isProposal || isContextCard ? "pill accent" : "pill"}>
          {isProposal ? "proposal" : isContextCard ? "context" : message.role}
        </span>
        <span className="inline-meta">
          {formatTimestampLabel(message.createdAt)}
        </span>
      </div>
      {proposalView ? (
        <div className="proposal-body">
          <h4>{proposalView.title}</h4>
          {proposalView.decision ? (
            <div className="proposal-decision-row">
              <span className="pill accent">Decision</span>
              <span className={`pill ${proposalView.decision.pillClassName}`}>
                {proposalView.decision.label}
              </span>
            </div>
          ) : null}
          {proposalView.staleNote ? (
            <p className="proposal-stale-note">{proposalView.staleNote}</p>
          ) : null}
          {proposalView.compare ? (
            <div className="proposal-compare-panel">
              <div className="message-topline">
                <p className="eyebrow">Proposal Compare</p>
                <span className={`pill ${proposalView.compare.pillClassName}`}>
                  {proposalView.compare.changedLineCount} changed line(s)
                </span>
              </div>
              <p className="proposal-compare-summary">
                {proposalView.compare.summary}
              </p>
              <button
                className="mini-button"
                disabled={isProposalActionBusy || proposalView.compare.action.disabled}
                onClick={() =>
                  runProposalMessageAction(proposalView.compare!.action)
                }
                type="button"
              >
                {proposalView.compare.action.label}
              </button>
            </div>
          ) : null}
          {proposalView.checklistItems.length > 0 ? (
            <ul className="proposal-list">
              {proposalView.checklistItems.map((item) => (
                <li key={item.id} className="proposal-checklist-item">
                  <div className="proposal-checklist-main">
                    <span>{item.text}</span>
                    {item.context ? (
                      <div className="proposal-checklist-context">
                        <p className="inline-meta">{item.context.summary}</p>
                        {item.context.previewGroups.length > 0 ? (
                          <div className="proposal-checklist-diff-list">
                            {item.context.previewGroups.map((previewGroup) => (
                              <div
                                className="proposal-checklist-diff"
                                key={previewGroup.key}
                              >
                                <div className="message-topline">
                                  <span className="pill">
                                    {previewGroup.lineLabel}
                                  </span>
                                  <button
                                    className="mini-button"
                                    disabled={isProposalActionBusy}
                                    onClick={() =>
                                      void onOpenSourceFocus(
                                        createSourceFocusTargetFromGroup({
                                          label: item.text,
                                          group: previewGroup.group,
                                          compareMode:
                                            item.focusCompare?.mode ?? "saved",
                                          reviewTarget: item.focusCompare
                                            ? createReviewFocusTargetFromGroups(
                                                {
                                                  targetId:
                                                    item.focusCompare.targetId,
                                                  mode: item.focusCompare.mode,
                                                  label:
                                                    item.focusCompare.label,
                                                  groups:
                                                    item.focusCompare.groups,
                                                },
                                              )
                                            : undefined,
                                        }),
                                      )
                                    }
                                    type="button"
                                  >
                                    Open in Source
                                  </button>
                                </div>
                                <pre>
                                  {previewGroup.group.savedText || "(empty)"}
                                  {"\n"}
                                  {"->"}{" "}
                                  {previewGroup.group.draftText || "(empty)"}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <span className="proposal-checklist-actions">
                    {item.status ? (
                      <span className={`pill ${item.status.pillClassName}`}>
                        {item.status.label}
                      </span>
                    ) : null}
                    {item.focusCompare ? (
                      <button
                        className="mini-button"
                        disabled={isProposalActionBusy}
                        onClick={() =>
                          onFocusCompare(
                            item.focusCompare!.mode,
                            item.focusCompare!.targetId,
                            item.focusCompare!.label,
                            item.focusCompare!.groups,
                          )
                        }
                        type="button"
                      >
                        Focus diff
                      </button>
                    ) : null}
                    {item.action ? (
                      <button
                        className="mini-button"
                        disabled={isProposalActionBusy || item.action.disabled}
                        onClick={() => runProposalMessageAction(item.action!)}
                        type="button"
                      >
                        {item.action.label}
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{proposalView.fallbackBody}</p>
          )}
        </div>
      ) : parsedContextCard ? (
        <div className="proposal-body">
          <h4>{parsedContextCard.title}</h4>
          {parsedContextCard.items.length > 0 ? (
            <ul className="proposal-list">
              {parsedContextCard.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{parsedContextCard.fallbackBody}</p>
          )}
        </div>
      ) : (
        <p>{message.text}</p>
      )}
      {isProposal ? (
        <div className="proposal-actions">
          {proposalView?.footerActions.map((action) => (
            <button
              className="mini-button"
              disabled={isProposalActionBusy || action.disabled}
              key={action.label}
              onClick={() => runProposalMessageAction(action)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}
