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
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PanelShell, PanelShellHeader } from "../ui/panel-shell"
import {
  getProposalReadinessView,
} from "../../lib/agent-shell-review-entry-view"
import { ScrollArea } from "../ui/scroll-area"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "../ui/surface-card"
import { StatusBadge } from "../ui/status-badge"
import {
  createReviewFocusTargetFromGroups,
  type ReviewFocusIntent,
  type ReviewFocusTarget,
} from "../../lib/review-focus"
import {
  createSourceFocusTargetFromGroup,
  getSourceFocusReadinessWarning,
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

function statusToneForClassName(
  className?: string,
): "default" | "accent" | "ready" | "dirty" | "error" | "building" {
  switch (className) {
    case "status-ready":
      return "ready"
    case "status-dirty":
      return "dirty"
    case "status-error":
      return "error"
    case "status-building":
      return "building"
    case "accent":
      return "accent"
    default:
      return "default"
  }
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
  onBuild,
  onInspect,
  onSaveDraft,
}: AgentShellProps) {
  const [draft, setDraft] = useState("")
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
  const proposalReadinessView = getProposalReadinessView({
    proposalReadiness,
    currentStage: currentReviewStage,
    currentStageGuidance,
    secondaryReadinessItems,
    reviewTimeline,
    stageActions,
    currentStageAction,
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

  useEffect(() => {
    setDraft("")
  }, [session.summary.id])

  useEffect(() => {
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

  return (
    <PanelShell as="aside" variant="agent-shell">
      <PanelShellHeader eyebrow="Agent" title="Proposal desk">
        <StatusBadge tone="accent">Secondary lane</StatusBadge>
      </PanelShellHeader>

      <SurfaceCard className="proposal-starter-card" variant="context">
        <SurfaceCardHeader eyebrow="Proposal" title="Next review step">
          <Button
            disabled={isProposalActionBusy}
            onClick={() => void onDraftProposal()}
            type="button"
          >
            {isDraftingProposal
              ? "Drafting..."
              : hasUnsavedSourceChanges
                ? "Save + draft proposal"
                : "Draft proposal"}
          </Button>
        </SurfaceCardHeader>
        <SurfaceCardBody className="grid gap-4 px-[18px] pb-[18px]">
          <p className="proposal-starter-copy">
            {hasUnsavedSourceChanges
              ? "The current source draft will be saved first so the proposal reflects the latest session truth."
              : "Generate a proposal from the current source, latest build state, preview availability, and captured logs."}
          </p>
          <div className="proposal-meta-row">
            {latestProposal ? (
              <p className="inline-meta">
                Latest proposal {formatTimestampLabel(latestProposal.createdAt)}
              </p>
            ) : (
              <p className="inline-meta">
                No proposal drafted for this session yet.
              </p>
            )}
            {latestProposalIsStale ? (
              <StatusBadge tone="dirty">Stale context</StatusBadge>
            ) : null}
            {currentStageItem ? (
              <StatusBadge
                tone={statusToneForClassName(currentStageItem.pillClassName)}
              >
                {currentStageItem.statusLabel}
              </StatusBadge>
            ) : null}
            <StatusBadge
              tone={statusToneForClassName(proposalReadinessView.pillClassName)}
            >
              {proposalReadinessView.label}
            </StatusBadge>
          </div>

          <div className="proposal-entry-panel">
            <div className="message-topline">
              <div>
                <p className="eyebrow">Current gate</p>
                <h4>{currentStageItem?.label ?? "Proposal readiness"}</h4>
              </div>
              {currentStageAction ? (
                <Button
                  disabled={isProposalActionBusy}
                  onClick={() => runWorkflowAction(currentStageAction.handler)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {currentStageAction.label}
                </Button>
              ) : null}
            </div>
            <p className="proposal-starter-copy">{currentStageGuidance}</p>
            {currentStageAction ? (
              <span className="inline-meta">
                {currentStageAction.description}
              </span>
            ) : null}
          </div>

          {proposalReadinessView.items.length > 0 ? (
            <div className="proposal-readiness">
              <div className="message-topline">
                <p className="eyebrow">Open checks</p>
                <span className="inline-meta">
                  {proposalReadinessView.items.length} item(s)
                </span>
              </div>
              <ul className="proposal-list proposal-readiness-list">
                {proposalReadinessView.items.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {proposalReadinessView.items.length > 3 ? (
                <p className="inline-meta">
                  More checks remain in the session history below.
                </p>
              ) : null}
            </div>
          ) : null}

          {latestProposalHasDraftDelta && proposalComparison ? (
            <div className="proposal-compare-panel">
              <div className="message-topline">
                <p className="eyebrow">Proposal drift</p>
                <StatusBadge
                  tone={proposalComparison.changedLineCount ? "dirty" : "ready"}
                >
                  {proposalComparison.changedLineCount} changed line(s)
                </StatusBadge>
              </div>
              <p className="proposal-compare-summary">
                The current source differs from the latest proposal snapshot by{" "}
                {proposalComparison.changedLineCount} line(s).
              </p>
              <Button
                disabled={isProposalActionBusy}
                onClick={() =>
                  focusChecklistOption(getDefaultProposalFocusOption())
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Review diff
              </Button>
            </div>
          ) : null}
        </SurfaceCardBody>
      </SurfaceCard>

      {showCompareCard && activeComparison ? (
        <SurfaceCard className="draft-compare-card" variant="context">
          <SurfaceCardHeader
            eyebrow="Draft compare"
            title={comparisonLabels.cardTitle}
          >
            <div className="proposal-actions">
              <Button
                disabled={
                  activeView === "source" ||
                  isSavingSource ||
                  isRunningBuild ||
                  isRunningInspect ||
                  isDraftingProposal
                }
                onClick={() => void onOpenView("source")}
                size="sm"
                type="button"
                variant="outline"
              >
                Open Source
              </Button>
              {hasUnsavedSourceChanges ? (
                <Button
                  disabled={
                    isSavingSource ||
                    isRunningBuild ||
                    isRunningInspect ||
                    isDraftingProposal
                  }
                  onClick={() => void onSaveDraft()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isSavingSource ? "Saving..." : "Save now"}
                </Button>
              ) : null}
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="grid gap-4 px-[18px] pb-[18px]">
            {showComparisonModeSwitch ? (
              <ToggleGroup
                aria-label="Compare base"
                className="compare-mode-toggle"
                onValueChange={(value) => {
                  if (value === "saved" || value === "proposal") {
                    setComparisonMode(value)
                  }
                }}
                type="single"
                value={comparisonMode}
                variant="outline"
              >
                <ToggleGroupItem
                  className="compare-mode-button"
                  size="sm"
                  value="saved"
                >
                  Saved source
                </ToggleGroupItem>
                <ToggleGroupItem
                  className="compare-mode-button"
                  size="sm"
                  value="proposal"
                >
                  Proposal snapshot
                </ToggleGroupItem>
              </ToggleGroup>
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
              <div className="draft-preview-footer">
                <Button
                  disabled={isProposalActionBusy}
                  onClick={() => {
                    focusChecklistOption(getDefaultProposalFocusOption())
                    void onOpenView("source")
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Review in Source
                </Button>
                {focusedPreviewGroups && focusedPreviewGroups.length > 0 ? (
                  <>
                    <Button
                      onClick={() => setFocusedComparison(undefined)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Clear diff focus
                    </Button>
                    <span className="inline-meta">
                      Focused on{" "}
                      {focusedComparison?.label ?? "selected compare target"}{" "}
                      with {focusedPreviewGroups.length} group(s).
                    </span>
                  </>
                ) : (
                  <span className="inline-meta">
                    Review the diff in Source instead of reading inline snippets
                    here.
                  </span>
                )}
              </div>
            ) : null}
            <p className="proposal-starter-copy">{comparisonLabels.helper}</p>
          </SurfaceCardBody>
        </SurfaceCard>
      ) : null}

      <ScrollArea className="message-list-scroll">
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
              isStale={
                latestProposal?.id === message.id && latestProposalIsStale
              }
            />
          ))}
        </div>
      </ScrollArea>

      <form className="composer-shell" onSubmit={handleSubmit}>
        <label htmlFor="agent-input">Future prompt</label>
        <Textarea
          id="agent-input"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Store a prompt draft or note in this session."
          value={draft}
        />
        <Button disabled={isSending || !draft.trim()} type="submit">
          {isSending ? "Saving..." : "Store draft"}
        </Button>
      </form>
    </PanelShell>
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
    <SurfaceCard
      className={
        isProposal
          ? "message-card proposal-card"
          : isContextCard
            ? "message-card context-message-card"
            : "message-card"
      }
      variant="message"
    >
      <div className="message-topline">
        <StatusBadge tone={isProposal || isContextCard ? "accent" : "default"}>
          {isProposal ? "proposal" : isContextCard ? "context" : message.role}
        </StatusBadge>
        <span className="inline-meta">
          {formatTimestampLabel(message.createdAt)}
        </span>
      </div>
      {proposalView ? (
        <div className="proposal-body">
          <h4>{proposalView.title}</h4>
          {proposalView.decision ? (
            <div className="proposal-decision-row">
              <StatusBadge tone="accent">Decision</StatusBadge>
              <StatusBadge
                tone={statusToneForClassName(
                  proposalView.decision.pillClassName,
                )}
              >
                {proposalView.decision.label}
              </StatusBadge>
            </div>
          ) : null}
          {proposalView.staleNote ? (
            <p className="proposal-stale-note">{proposalView.staleNote}</p>
          ) : null}
          {proposalView.compare ? (
            <div className="proposal-compare-panel">
              <div className="message-topline">
                <p className="eyebrow">Proposal Compare</p>
                <StatusBadge
                  tone={statusToneForClassName(
                    proposalView.compare.pillClassName,
                  )}
                >
                  {proposalView.compare.changedLineCount} changed line(s)
                </StatusBadge>
              </div>
              <p className="proposal-compare-summary">
                {proposalView.compare.summary}
              </p>
              <Button
                disabled={
                  isProposalActionBusy || proposalView.compare.action.disabled
                }
                onClick={() =>
                  runProposalMessageAction(proposalView.compare!.action)
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {proposalView.compare.action.label}
              </Button>
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
                                  <StatusBadge>
                                    {previewGroup.lineLabel}
                                  </StatusBadge>
                                  <Button
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
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Open in Source
                                  </Button>
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
                      <StatusBadge
                        tone={statusToneForClassName(item.status.pillClassName)}
                      >
                        {item.status.label}
                      </StatusBadge>
                    ) : null}
                    {item.focusCompare ? (
                      <Button
                        disabled={isProposalActionBusy}
                        onClick={() =>
                          onFocusCompare(
                            item.focusCompare!.mode,
                            item.focusCompare!.targetId,
                            item.focusCompare!.label,
                            item.focusCompare!.groups,
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Focus diff
                      </Button>
                    ) : null}
                    {item.action ? (
                      <Button
                        disabled={isProposalActionBusy || item.action.disabled}
                        onClick={() => runProposalMessageAction(item.action!)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {item.action.label}
                      </Button>
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
            <Button
              disabled={isProposalActionBusy || action.disabled}
              key={action.label}
              onClick={() => runProposalMessageAction(action)}
              size="sm"
              type="button"
              variant="outline"
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  )
}
