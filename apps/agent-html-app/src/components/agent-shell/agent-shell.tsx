import { type FormEvent, useEffect, useState } from "react"

import {
  findLatestProposalDecision,
  findRecentProposalDecisions,
  getProposalDecisionTrend,
  getCurrentReviewStageGuidance,
  getCurrentReviewStage,
  getSecondaryReadinessItems,
  getProposalChecklistActionConfig,
  getProposalChecklistContext,
  getProposalChecklistFocusOptions,
  getProposalChecklistProgress,
  getProposalChecklistStatus,
  getProposalReadiness,
  getReviewTimelineActionConfig,
  getReviewTimeline,
  isProposalStale,
  parseProposalChecklist,
  parseStructuredMessageCard,
} from "../../lib/review-flow"
import {
  createReviewFocusTargetFromGroups,
  type ReviewFocusIntent,
  type ReviewFocusTarget,
} from "../../lib/review-focus"
import {
  createSourceFocusTargetFromGroup,
  getSourceFocusLineLabel,
  getSourceFocusPrimaryAction,
  getSourceFocusReadinessWarning,
  getSourceFocusStatusPill,
  type SourceFocusReviewStatus,
  type SourceFocusTarget,
} from "../../lib/source-focus"
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
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  isSavingSource: boolean
  isRunningBuild: boolean
  isRunningInspect: boolean
  isSending: boolean
  isDraftingProposal: boolean
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
  activeSourceFocus,
  activeSourceFocusReviewStatus,
  isSavingSource,
  isRunningBuild,
  isRunningInspect,
  isSending,
  isDraftingProposal,
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
  const [isDecisionHistoryExpanded, setIsDecisionHistoryExpanded] =
    useState(false)
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
  })
  const currentReviewStage = getCurrentReviewStage({
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposalExists: Boolean(latestProposal),
    latestProposalIsStale,
    proposalComparison,
    session,
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
  const sourceFocusStatusPill = getSourceFocusStatusPill(
    activeSourceFocusReviewStatus,
  )
  const sourceFocusPrimaryAction = getSourceFocusPrimaryAction(
    activeSourceFocusReviewStatus,
  )
  const currentStageAction = getReviewTimelineActionConfig({
    stage: currentReviewStage,
    activeView,
    build,
    hasUnsavedSourceChanges,
    inspect,
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    latestProposalIsStale,
    proposalComparison,
    sessionHasPreview: session.summary.hasPreview,
  })
  const currentStageGuidance = getCurrentReviewStageGuidance({
    stage: currentReviewStage,
    latestProposalExists: Boolean(latestProposal),
    latestProposalDecision,
    proposalDecisionTrend,
    latestProposalIsStale,
    proposalComparison,
  })
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
    setIsDecisionHistoryExpanded(false)
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
        {recentProposalDecisions.length > 0 ? (
          <div className="proposal-decision-history">
            {proposalDecisionTrend ? (
              <div className="proposal-decision-history-item">
                <span className={`pill ${proposalDecisionTrend.pillClassName}`}>
                  {proposalDecisionTrend.label}
                </span>
                <span className="inline-meta">
                  {proposalDecisionTrend.summary}
                </span>
                {recentProposalDecisions.length > 1 ? (
                  <button
                    className="mini-button"
                    onClick={() =>
                      setIsDecisionHistoryExpanded((current) => !current)
                    }
                    type="button"
                  >
                    {isDecisionHistoryExpanded
                      ? "Hide history"
                      : "Show history"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {isDecisionHistoryExpanded || recentProposalDecisions.length === 1
              ? recentProposalDecisions.map((decision, index) => (
                  <div
                    className="proposal-decision-history-item"
                    key={`${decision.createdAt}-${decision.status}-${index}`}
                  >
                    <span
                      className={
                        decision.status === "approved"
                          ? "pill status-ready"
                          : "pill status-dirty"
                      }
                    >
                      {decision.status === "approved"
                        ? "Approved"
                        : "Needs changes"}
                    </span>
                    <span className="inline-meta">
                      {decision.proposalTitle}
                    </span>
                    <span className="inline-meta">
                      {formatTimestampLabel(decision.createdAt)}
                    </span>
                  </div>
                ))
              : null}
          </div>
        ) : null}
        <div className="proposal-snapshot-row">
          <span className="pill accent">Stage {currentReviewStage}</span>
          {proposalDecisionTrend ? (
            <span className={`pill ${proposalDecisionTrend.pillClassName}`}>
              Trend {proposalDecisionTrend.label}
            </span>
          ) : null}
          {proposalProgress?.totalTaggedItems ? (
            <span className="pill">
              Checklist {proposalProgress.doneCount}/
              {proposalProgress.totalTaggedItems}
            </span>
          ) : null}
          {activeSourceFocus && sourceFocusStatusPill ? (
            <button
              className={`proposal-snapshot-chip pill ${sourceFocusStatusPill.className}`}
              disabled={isProposalActionBusy}
              onClick={() => {
                switch (sourceFocusPrimaryAction) {
                  case "refresh-source-focus":
                    void onRefreshSourceFocus()
                    break
                  case "reveal-review-target":
                    void onRevealSourceReviewTarget()
                    break
                  default:
                    void onOpenSourceFocus(activeSourceFocus)
                    break
                }
              }}
              type="button"
            >
              Source {sourceFocusStatusPill.label}
            </button>
          ) : null}
          <button
            className={`proposal-snapshot-chip pill ${inspect.diagnostics.length > 0 ? "status-dirty" : "status-ready"}`}
            disabled={isProposalActionBusy}
            onClick={() =>
              runWorkflowAction(
                activeView === "inspect" ? "inspect" : "openInspect",
              )
            }
            type="button"
          >
            Diagnostics {inspect.diagnostics.length}
          </button>
          {proposalComparison?.changedLineCount ? (
            <button
              className="proposal-snapshot-chip pill status-dirty"
              disabled={isProposalActionBusy}
              onClick={() => runWorkflowAction("reviewDiff")}
              type="button"
            >
              Drift {proposalComparison.changedLineCount}
            </button>
          ) : (
            <span className="pill status-ready">Drift 0</span>
          )}
          <button
            className={`proposal-snapshot-chip pill ${session.summary.hasPreview ? "status-ready" : "status-dirty"}`}
            disabled={
              isProposalActionBusy ||
              (session.summary.hasPreview
                ? activeView === "preview"
                : build.status === "running")
            }
            onClick={() =>
              runWorkflowAction(
                session.summary.hasPreview ? "openPreview" : "build",
              )
            }
            type="button"
          >
            Preview {session.summary.hasPreview ? "ready" : "missing"}
          </button>
          {latestProposal ? (
            <>
              <button
                className="proposal-snapshot-chip mini-button"
                disabled={
                  isProposalActionBusy ||
                  latestProposalDecision?.status === "approved"
                }
                onClick={() => void onDecision(latestProposal.text, "approved")}
                type="button"
              >
                Approve
              </button>
              <button
                className="proposal-snapshot-chip mini-button"
                disabled={
                  isProposalActionBusy ||
                  latestProposalDecision?.status === "needs-changes"
                }
                onClick={() =>
                  void onDecision(latestProposal.text, "needs changes")
                }
                type="button"
              >
                Needs changes
              </button>
            </>
          ) : null}
        </div>
        {activeSourceFocus && activeSourceFocusReviewStatus ? (
          <div className="proposal-source-focus-panel">
            <div className="message-topline">
              <div>
                <p className="eyebrow">Source focus</p>
                <h4>{activeSourceFocus.label}</h4>
              </div>
              {sourceFocusStatusPill ? (
                <span className={`pill ${sourceFocusStatusPill.className}`}>
                  {sourceFocusStatusPill.label}
                </span>
              ) : null}
            </div>
            <p className="proposal-starter-copy">
              {activeSourceFocusReviewStatus.summary}
            </p>
            <div className="proposal-meta-row">
              <span className="pill">
                {getSourceFocusLineLabel(activeSourceFocus)}
              </span>
              {activeSourceFocus.reviewOrigin ? (
                <span className="inline-meta">
                  From {activeSourceFocus.reviewOrigin.label}
                </span>
              ) : null}
            </div>
            <div className="proposal-actions">
              <button
                className="mini-button"
                disabled={isProposalActionBusy}
                onClick={() => void onOpenSourceFocus(activeSourceFocus)}
                type="button"
              >
                Open Source focus
              </button>
              {activeSourceFocusReviewStatus.currentReviewTarget ? (
                <button
                  className="mini-button"
                  disabled={isProposalActionBusy}
                  onClick={() => void onRevealSourceReviewTarget()}
                  type="button"
                >
                  Reveal review target
                </button>
              ) : null}
              {activeSourceFocusReviewStatus.kind === "moved" ? (
                <button
                  className="mini-button"
                  disabled={isProposalActionBusy}
                  onClick={() => void onRefreshSourceFocus()}
                  type="button"
                >
                  Refresh focus
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="proposal-readiness">
          <div className="message-topline">
            <p className="eyebrow">Proposal readiness</p>
            <span className={`pill ${proposalReadiness.pillClassName}`}>
              {proposalReadiness.label}
            </span>
          </div>
          <div
            className="proposal-stage-strip"
            role="list"
            aria-label="Review path"
          >
            {reviewTimeline.map((item) => {
              const stageAction = getReviewTimelineActionConfig({
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
              })

              return (
                <button
                  className={
                    item.id === currentReviewStage
                      ? "proposal-stage-chip active"
                      : "proposal-stage-chip"
                  }
                  disabled={!stageAction || isProposalActionBusy}
                  key={item.id}
                  onClick={() => {
                    if (stageAction) {
                      runWorkflowAction(stageAction.handler)
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
              )
            })}
          </div>
          <p className="proposal-readiness-summary">{currentStageGuidance}</p>
          {secondaryReadinessItems.length > 0 ? (
            <ul className="proposal-list proposal-readiness-list">
              {secondaryReadinessItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {currentStageAction ? (
            <div className="proposal-readiness-action">
              <button
                className="mini-button"
                disabled={isProposalActionBusy}
                onClick={() => runWorkflowAction(currentStageAction.handler)}
                type="button"
              >
                {currentStageAction.label}
              </button>
              <span className="inline-meta">
                {currentStageAction.description}
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
  const parsedProposal = isProposal
    ? parseProposalMessage(message.text)
    : undefined
  const parsedContextCard = isContextCard
    ? parseStructuredMessageCard(message.text)
    : undefined

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
      {parsedProposal ? (
        <div className="proposal-body">
          <h4>{parsedProposal.title}</h4>
          {latestDecision ? (
            <div className="proposal-decision-row">
              <span className="pill accent">Decision</span>
              <span
                className={
                  latestDecision.status === "approved"
                    ? "pill status-ready"
                    : "pill status-dirty"
                }
              >
                {latestDecision.status === "approved"
                  ? "Approved"
                  : "Needs changes"}
              </span>
            </div>
          ) : null}
          {isStale ? (
            <p className="proposal-stale-note">
              This proposal is based on older session state. Rebuild, reinspect,
              or redraft before applying it.
            </p>
          ) : null}
          {proposalComparison ? (
            <div className="proposal-compare-panel">
              <div className="message-topline">
                <p className="eyebrow">Proposal Compare</p>
                <span className="pill status-dirty">
                  {proposalComparison.changedLineCount} changed line(s)
                </span>
              </div>
              <p className="proposal-compare-summary">
                The current unsaved draft has diverged from the proposal
                snapshot.
                {proposalComparison.firstChangedLine
                  ? ` First change around line ${proposalComparison.firstChangedLine}.`
                  : ""}
              </p>
              <button
                className="mini-button"
                onClick={onReviewDraftDiff}
                type="button"
              >
                Review draft diff
              </button>
            </div>
          ) : null}
          {parsedProposal.items.length > 0 ? (
            <ul className="proposal-list">
              {parsedProposal.items.map((item) => {
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

                return (
                  <li
                    key={`${item.action ?? "free"}-${item.text}`}
                    className="proposal-checklist-item"
                  >
                    <div className="proposal-checklist-main">
                      <span>{item.text}</span>
                      {checklistContext ? (
                        <div className="proposal-checklist-context">
                          <p className="inline-meta">
                            {checklistContext.summary}
                          </p>
                          {checklistContext.previewGroups?.length ? (
                            <div className="proposal-checklist-diff-list">
                              {checklistContext.previewGroups.map(
                                (previewGroup) => (
                                  <div
                                    className="proposal-checklist-diff"
                                    key={`${previewGroup.startLine}-${previewGroup.endLine}-${previewGroup.savedText}-${previewGroup.draftText}`}
                                  >
                                    <div className="message-topline">
                                      <span className="pill">
                                        {previewGroup.startLine ===
                                        previewGroup.endLine
                                          ? `Line ${previewGroup.startLine}`
                                          : `Lines ${previewGroup.startLine}-${previewGroup.endLine}`}
                                      </span>
                                      <button
                                        className="mini-button"
                                        disabled={isProposalActionBusy}
                                        onClick={() =>
                                          void onOpenSourceFocus(
                                            createSourceFocusTargetFromGroup({
                                              label: item.text,
                                              group: previewGroup,
                                              reviewTarget:
                                                createReviewFocusTargetFromGroups(
                                                  {
                                                    targetId: `${item.action ?? "free"}-${item.text}`,
                                                    mode:
                                                      item.action === "review"
                                                        ? "proposal"
                                                        : "saved",
                                                    label: item.text,
                                                    groups:
                                                      checklistContext.previewGroups,
                                                  },
                                                ),
                                            }),
                                          )
                                        }
                                        type="button"
                                      >
                                        Open in Source
                                      </button>
                                    </div>
                                    <pre>
                                      {previewGroup.savedText || "(empty)"}
                                      {"\n"}
                                      {"->"}{" "}
                                      {previewGroup.draftText || "(empty)"}
                                    </pre>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className="proposal-checklist-actions">
                      {checklistStatus ? (
                        <span
                          className={`pill ${checklistStatus.pillClassName}`}
                        >
                          {checklistStatus.label}
                        </span>
                      ) : null}
                      {checklistContext?.previewGroups?.length ? (
                        <button
                          className="mini-button"
                          disabled={isProposalActionBusy}
                          onClick={() =>
                            onFocusCompare(
                              item.action === "review" ? "proposal" : "saved",
                              `${item.action ?? "free"}-${item.text}`,
                              item.text,
                              checklistContext.previewGroups!,
                            )
                          }
                          type="button"
                        >
                          Focus diff
                        </button>
                      ) : null}
                      {checklistAction ? (
                        <button
                          className="mini-button"
                          disabled={isProposalActionBusy}
                          onClick={() => {
                            switch (checklistAction.handler) {
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
                            }
                          }}
                          type="button"
                        >
                          {checklistAction.label}
                        </button>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p>{parsedProposal.fallbackBody}</p>
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
          <button
            className="mini-button"
            disabled={activeView === "source" || isProposalActionBusy}
            onClick={() => void onOpenView("source")}
            type="button"
          >
            Open Source
          </button>
          <button
            className="mini-button"
            disabled={activeView === "inspect" || isProposalActionBusy}
            onClick={() => void onInspect()}
            type="button"
          >
            Run Inspect
          </button>
          <button
            className="mini-button"
            disabled={isProposalActionBusy}
            onClick={() => void onBuild()}
            type="button"
          >
            Build
          </button>
          <button
            className="mini-button"
            disabled={
              !session.summary.hasPreview ||
              activeView === "preview" ||
              isProposalActionBusy
            }
            onClick={() => void onOpenView("preview")}
            type="button"
          >
            Open Preview
          </button>
        </div>
      ) : null}
    </article>
  )
}
