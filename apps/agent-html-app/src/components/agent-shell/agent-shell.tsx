import { type FormEvent, useEffect, useState } from "react"

import {
  findLatestProposalDecision,
  findRecentProposalDecisions,
  getProposalDecisionTrend,
  getCurrentReviewStage,
  getSecondaryReadinessItems,
  getProposalChecklistFocusOptions,
  getProposalChecklistProgress,
  getProposalReadiness,
  getReviewTimelineActionConfig,
  getReviewTimeline,
  isProposalStale,
  parseProposalDecision,
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
import { getProposalReadinessView } from "../../lib/agent-shell-review-entry-view"
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
  onDraftProposal: () => Promise<void> | void
  onOpenView: (view: WorkbenchView) => Promise<void> | void
  onOpenSourceFocus: (target: SourceFocusTarget) => Promise<void> | void
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
  onDraftProposal,
  onOpenView,
  onOpenSourceFocus,
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
  const latestStoredNote = [...messages]
    .reverse()
    .find((message) => message.role === "user" && message.kind === "message")
  const visibleMessages = messages.filter((message) => {
    if (
      message.kind === "proposal-placeholder" ||
      message.kind === "context-card"
    ) {
      return true
    }

    return Boolean(parseProposalDecision(message.text))
  })
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
  const currentStageGuidance = ""
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
          cardTitle: "Proposal delta",
          baseLabel: "Proposal",
          currentLabel: hasUnsavedSourceChanges ? "Draft" : "Source",
        }
      : {
          cardTitle: "Draft delta",
          baseLabel: "Saved",
          currentLabel: "Draft",
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
      <PanelShellHeader title="Shell" />

      <SurfaceCard className="proposal-starter-card" variant="context">
        <SurfaceCardHeader title="Proposal">
          <Button
            disabled={isProposalActionBusy}
            onClick={() => void onDraftProposal()}
            type="button"
          >
            {isDraftingProposal
              ? "Drafting..."
              : hasUnsavedSourceChanges
                ? "Save + draft"
                : "Draft"}
          </Button>
        </SurfaceCardHeader>
        <SurfaceCardBody className="grid gap-4">
          <div className="proposal-meta-row">
            {latestProposal ? (
              <p className="inline-meta">
                Latest proposal {formatTimestampLabel(latestProposal.createdAt)}
              </p>
            ) : (
              <p className="inline-meta">No proposal</p>
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

          <SurfaceCard className="proposal-entry-panel" variant="inset">
            <SurfaceCardBody className="grid gap-3" padding="compact">
              <div className="message-topline">
                <div>
                  <h4>{currentStageItem?.label ?? "Proposal readiness"}</h4>
                </div>
                {currentStageAction ? (
                  <Button
                    disabled={isProposalActionBusy}
                    onClick={() =>
                      runWorkflowAction(currentStageAction.handler)
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {currentStageAction.label}
                  </Button>
                ) : null}
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          {proposalReadinessView.items.length > 0 ? (
            <SurfaceCard className="proposal-readiness" variant="inset">
              <SurfaceCardBody className="grid gap-3" padding="compact">
                <div className="message-topline">
                  <h4>Open</h4>
                </div>
                <ul className="proposal-list proposal-readiness-list">
                  {proposalReadinessView.items.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SurfaceCardBody>
            </SurfaceCard>
          ) : null}

          {latestProposalHasDraftDelta && proposalComparison ? (
            <SurfaceCard className="proposal-compare-panel" variant="inset">
              <SurfaceCardBody className="grid gap-3" padding="compact">
                <div className="message-topline">
                  <h4>Drift</h4>
                  <StatusBadge
                    tone={
                      proposalComparison.changedLineCount ? "dirty" : "ready"
                    }
                  >
                    {proposalComparison.changedLineCount} changed line(s)
                  </StatusBadge>
                </div>
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
              </SurfaceCardBody>
            </SurfaceCard>
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
          <SurfaceCardBody className="grid gap-4">
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
                      {focusedComparison?.label ?? "selected compare target"}{" "}
                      with {focusedPreviewGroups.length} group(s).
                    </span>
                  </>
                ) : (
                  <span className="inline-meta">No focus</span>
                )}
              </div>
            ) : null}
          </SurfaceCardBody>
        </SurfaceCard>
      ) : null}

      {latestStoredNote ? (
        <SurfaceCard className="proposal-starter-card" variant="inset">
          <SurfaceCardHeader padding="compact" title="Latest note" />
          <SurfaceCardBody className="grid gap-2" padding="compact">
            <p>{latestStoredNote.text}</p>
            <span className="inline-meta">
              {formatTimestampLabel(latestStoredNote.createdAt)}
            </span>
          </SurfaceCardBody>
        </SurfaceCard>
      ) : null}

      <ScrollArea className="message-list-scroll">
        <div className="message-list review-log-list">
          {visibleMessages.map((message) => (
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

      <form
        className="composer-shell"
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
      >
        <label className="sr-only" htmlFor="agent-input">
          Future prompt
        </label>
        <Textarea
          id="agent-input"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Note"
          value={draft}
        />
        <Button disabled={isSending || !draft.trim()} type="submit">
          {isSending ? "Saving..." : "Store"}
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
            <SurfaceCard className="proposal-compare-panel" variant="inset">
              <SurfaceCardBody className="grid gap-3" padding="compact">
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
              </SurfaceCardBody>
            </SurfaceCard>
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
                              <SurfaceCard
                                className="proposal-checklist-diff"
                                key={previewGroup.key}
                                variant="inset"
                              >
                                <SurfaceCardBody
                                  className="grid gap-2"
                                  padding="tight"
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
                                              item.focusCompare?.mode ??
                                              "saved",
                                            reviewTarget: item.focusCompare
                                              ? createReviewFocusTargetFromGroups(
                                                  {
                                                    targetId:
                                                      item.focusCompare
                                                        .targetId,
                                                    mode: item.focusCompare
                                                      .mode,
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
                                </SurfaceCardBody>
                              </SurfaceCard>
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
