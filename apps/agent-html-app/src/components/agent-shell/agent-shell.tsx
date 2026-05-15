import { type FormEvent, useEffect, useState } from "react"

import {
  getCurrentReviewStage,
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
import { formatTimestampLabel } from "../../lib/time"
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
  isSavingSource: boolean
  isRunningBuild: boolean
  isRunningInspect: boolean
  isSending: boolean
  isDraftingProposal: boolean
  onSend: (text: string) => Promise<void> | void
  onDraftProposal: () => Promise<void> | void
  onOpenView: (view: WorkbenchView) => Promise<void> | void
  onBuild: () => Promise<void> | void
  onInspect: () => Promise<void> | void
  onSaveDraft: () => Promise<void> | void
}

type ComparisonMode = "saved" | "proposal"
type FocusedComparison = {
  mode: ComparisonMode
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
  isSavingSource,
  isRunningBuild,
  isRunningInspect,
  isSending,
  isDraftingProposal,
  onSend,
  onDraftProposal,
  onOpenView,
  onBuild,
  onInspect,
  onSaveDraft,
}: AgentShellProps) {
  const [draft, setDraft] = useState("")
  const [isDraftPreviewExpanded, setIsDraftPreviewExpanded] = useState(false)
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("saved")
  const [focusedComparison, setFocusedComparison] = useState<FocusedComparison | undefined>(undefined)
  const latestProposal = [...messages].reverse().find((message) => message.kind === "proposal-placeholder")
  const latestProposalIsStale = latestProposal ? isProposalStale(latestProposal.createdAt, session) : false
  const latestProposalHasDraftDelta = Boolean(latestProposal && proposalComparison)
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
    isDraftingProposal || isSending || isSavingSource || isRunningBuild || isRunningInspect
  const proposalReadiness = getProposalReadiness({
    build,
    inspect,
    session,
    latestProposalExists: Boolean(latestProposal),
    latestProposalIsStale,
    hasUnsavedSourceChanges,
    draftComparison,
    proposalComparison,
    proposalProgress,
  })
  const proposalNextAction = getProposalNextAction({
    activeView,
    build,
    hasUnsavedSourceChanges,
    inspect,
    isActionBusy: isProposalActionBusy,
    latestProposalExists: Boolean(latestProposal),
    latestProposalIsStale,
    onBuild,
    onDraftProposal,
    onInspect,
    onOpenView,
    onReviewProposalDiff: () => {
      setComparisonMode("proposal")
      setIsDraftPreviewExpanded(true)
    },
    onSaveDraft,
    proposalComparison,
    session,
  })
  const activeComparison =
    comparisonMode === "proposal" && proposalComparison ? proposalComparison : draftComparison
  const proposalFocusOptions = getProposalChecklistFocusOptions({
    proposalText: latestProposal?.text,
    comparisonMode,
    build,
    hasUnsavedSourceChanges,
    inspect,
    draftComparison,
    proposalComparison,
  })
  const showComparisonModeSwitch = Boolean(draftComparison && proposalComparison)
  const showCompareCard = Boolean(activeComparison)
  const comparisonLabels =
    comparisonMode === "proposal"
      ? {
          cardTitle: "Proposal snapshot delta",
          baseLabel: "Proposal snapshot",
          currentLabel: hasUnsavedSourceChanges ? "Current draft" : "Current source",
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
      ? activeComparison.previewGroups.filter((group) =>
          focusedComparison.keys.includes(getPreviewGroupKey(group)),
        )
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
  }, [session.summary.id, draftComparison?.changedLineCount, proposalComparison?.changedLineCount])

  useEffect(() => {
    if (comparisonMode === "proposal" && !proposalComparison) {
      setComparisonMode("saved")
    }
  }, [comparisonMode, proposalComparison])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) {
      return
    }

    await onSend(draft)
    setDraft("")
  }

  function focusComparisonGroups(
    mode: ComparisonMode,
    label: string,
    groups?: SourceComparisonSummary["previewGroups"],
  ) {
    setComparisonMode(mode)
    setFocusedComparison(
      groups && groups.length > 0
        ? {
            mode,
            keys: groups.map((group) => getPreviewGroupKey(group)),
            label,
          }
        : undefined,
    )
    setIsDraftPreviewExpanded(true)
  }

  function runWorkflowAction(
    handler: "save" | "build" | "inspect" | "openInspect" | "reviewDiff" | "openPreview" | "draftProposal",
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
        focusComparisonGroups("proposal", "Current proposal drift", proposalComparison?.previewGroups)
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
          {reviewTimeline.map((item) => {
            const timelineAction = getReviewTimelineActionConfig({
              stage: item.id,
              activeView,
              build,
              hasUnsavedSourceChanges,
              inspect,
              latestProposalExists: Boolean(latestProposal),
              latestProposalIsStale,
              proposalComparison,
              sessionHasPreview: session.summary.hasPreview,
            })

            return (
              <article className={item.id === currentReviewStage ? "timeline-item active" : "timeline-item"} key={item.id}>
                <div className="message-topline">
                  <div className="timeline-label-group">
                    <h4>{item.label}</h4>
                    <span className="inline-meta">
                      {item.timestamp ? formatTimestampLabel(item.timestamp) : "No event yet"}
                    </span>
                  </div>
                  <span className={`pill ${item.pillClassName}`}>{item.statusLabel}</span>
                </div>
                <p className="timeline-summary">{item.summary}</p>
                {timelineAction ? (
                  <div className="timeline-action-row">
                    <button
                      className="mini-button"
                      disabled={isProposalActionBusy}
                      onClick={() => runWorkflowAction(timelineAction.handler)}
                      type="button"
                    >
                      {timelineAction.label}
                    </button>
                    <span className="inline-meta">{timelineAction.description}</span>
                  </div>
                ) : null}
              </article>
            )
          })}
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
                disabled={activeView === "source" || isSavingSource || isRunningBuild || isRunningInspect || isDraftingProposal}
                onClick={() => void onOpenView("source")}
                type="button"
              >
                Open Source
              </button>
              {hasUnsavedSourceChanges ? (
                <button
                  className="mini-button"
                  disabled={isSavingSource || isRunningBuild || isRunningInspect || isDraftingProposal}
                  onClick={() => void onSaveDraft()}
                  type="button"
                >
                  {isSavingSource ? "Saving..." : "Save now"}
                </button>
              ) : null}
            </div>
          </div>
          {showComparisonModeSwitch ? (
            <div className="compare-mode-toggle" role="tablist" aria-label="Compare base">
              <button
                aria-selected={comparisonMode === "saved"}
                className={comparisonMode === "saved" ? "mini-button compare-mode-button active" : "mini-button compare-mode-button"}
                onClick={() => setComparisonMode("saved")}
                role="tab"
                type="button"
              >
                Saved source
              </button>
              <button
                aria-selected={comparisonMode === "proposal"}
                className={comparisonMode === "proposal" ? "mini-button compare-mode-button active" : "mini-button compare-mode-button"}
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
                    focusedComparison?.label === option.label
                      ? "mini-button compare-focus-button active"
                      : "mini-button compare-focus-button"
                  }
                  key={option.id}
                  onClick={() =>
                    setFocusedComparison({
                      mode: comparisonMode,
                      keys: option.groups.map((group) => getPreviewGroupKey(group)),
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
            <dd>{activeComparison.firstChangedLine ? `Line ${activeComparison.firstChangedLine}` : "n/a"}</dd>
          </dl>
          {activeComparison.previewGroups.length > 0 ? (
            <div className="draft-preview-list">
              {visibleDraftPreviewGroups.map((group) => (
                <article className="draft-preview-item" key={getPreviewGroupKey(group)}>
                  <div className="message-topline">
                    <span className="pill">
                      {group.startLine === group.endLine
                        ? `Line ${group.startLine}`
                        : `Lines ${group.startLine}-${group.endLine}`}
                    </span>
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
                      Focused on {focusedComparison?.label ?? "selected checklist item"} with {focusedPreviewGroups.length} group(s).
                    </span>
                  </>
                ) : null}
                {activeComparison.previewGroups.length > 3 || activeComparison.hasAdditionalChanges ? (
                  <>
                    <button
                      className="mini-button"
                      onClick={() => setIsDraftPreviewExpanded((current) => !current)}
                      type="button"
                    >
                      {isDraftPreviewExpanded ? "Show fewer changes" : "Show more changes"}
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
            {latestProposalIsStale ? <span className="pill status-dirty">Stale context</span> : null}
            {proposalProgress?.totalTaggedItems ? (
              <span className="pill">
                Checklist {proposalProgress.doneCount}/{proposalProgress.totalTaggedItems}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="inline-meta">No proposal drafted for this session yet.</p>
        )}
        <div className="proposal-readiness">
          <div className="message-topline">
            <p className="eyebrow">Proposal readiness</p>
            <span className={`pill ${proposalReadiness.pillClassName}`}>{proposalReadiness.label}</span>
          </div>
          <p className="proposal-readiness-summary">{proposalReadiness.summary}</p>
          {proposalReadiness.items.length > 0 ? (
            <ul className="proposal-list proposal-readiness-list">
              {proposalReadiness.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {proposalNextAction ? (
            <div className="proposal-readiness-action">
              <button
                className="mini-button"
                disabled={proposalNextAction.disabled}
                onClick={() => void proposalNextAction.run()}
                type="button"
              >
                {proposalNextAction.label}
              </button>
              <span className="inline-meta">{proposalNextAction.description}</span>
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
            message={message}
            onReviewDraftDiff={() => {
              focusComparisonGroups("proposal", "Current proposal drift", proposalComparison?.previewGroups)
            }}
            onBuild={onBuild}
            onFocusCompare={focusComparisonGroups}
            onInspect={onInspect}
            onOpenView={onOpenView}
            onSaveDraft={onSaveDraft}
            draftComparison={draftComparison}
            proposalComparison={latestProposal?.id === message.id && latestProposalHasDraftDelta ? proposalComparison : undefined}
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
        <button className="primary-button" disabled={isSending || !draft.trim()} type="submit">
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
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  onOpenView: (view: WorkbenchView) => Promise<void> | void
  onBuild: () => Promise<void> | void
  onFocusCompare: (
    mode: ComparisonMode,
    label: string,
    groups: SourceComparisonSummary["previewGroups"],
  ) => void
  onInspect: () => Promise<void> | void
  onSaveDraft: () => Promise<void> | void
  onReviewDraftDiff: () => void
}

function parseProposalMessage(text: string) {
  return parseProposalChecklist(text)
}

function getPreviewGroupKey(group: SourceComparisonSummary["previewGroups"][number]) {
  return `${group.startLine}:${group.endLine}`
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
  draftComparison,
  proposalComparison,
  onOpenView,
  onBuild,
  onFocusCompare,
  onInspect,
  onSaveDraft,
  onReviewDraftDiff,
}: AgentShellMessageCardProps) {
  const isProposal = message.kind === "proposal-placeholder"
  const isContextCard = message.kind === "context-card"
  const parsedProposal = isProposal ? parseProposalMessage(message.text) : undefined
  const parsedContextCard = isContextCard ? parseStructuredMessageCard(message.text) : undefined

  return (
    <article
      className={
        isProposal ? "message-card proposal-card" : isContextCard ? "message-card context-message-card" : "message-card"
      }
    >
      <div className="message-topline">
        <span className={isProposal || isContextCard ? "pill accent" : "pill"}>
          {isProposal ? "proposal" : isContextCard ? "context" : message.role}
        </span>
        <span className="inline-meta">{formatTimestampLabel(message.createdAt)}</span>
      </div>
      {parsedProposal ? (
        <div className="proposal-body">
          <h4>{parsedProposal.title}</h4>
          {isStale ? (
            <p className="proposal-stale-note">
              This proposal is based on older session state. Rebuild, reinspect, or redraft before applying it.
            </p>
          ) : null}
          {proposalComparison ? (
            <div className="proposal-compare-panel">
              <div className="message-topline">
                <p className="eyebrow">Proposal Compare</p>
                <span className="pill status-dirty">{proposalComparison.changedLineCount} changed line(s)</span>
              </div>
              <p className="proposal-compare-summary">
                The current unsaved draft has diverged from the proposal snapshot.
                {proposalComparison.firstChangedLine ? ` First change around line ${proposalComparison.firstChangedLine}.` : ""}
              </p>
              <button className="mini-button" onClick={onReviewDraftDiff} type="button">
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
                  <li key={`${item.action ?? "free"}-${item.text}`} className="proposal-checklist-item">
                    <div className="proposal-checklist-main">
                      <span>{item.text}</span>
                      {checklistContext ? (
                        <div className="proposal-checklist-context">
                          <p className="inline-meta">{checklistContext.summary}</p>
                          {checklistContext.previewGroups?.length ? (
                            <div className="proposal-checklist-diff-list">
                              {checklistContext.previewGroups.map((previewGroup) => (
                                <div
                                  className="proposal-checklist-diff"
                                  key={`${previewGroup.startLine}-${previewGroup.endLine}-${previewGroup.savedText}-${previewGroup.draftText}`}
                                >
                                  <span className="pill">
                                    {previewGroup.startLine === previewGroup.endLine
                                      ? `Line ${previewGroup.startLine}`
                                      : `Lines ${previewGroup.startLine}-${previewGroup.endLine}`}
                                  </span>
                                  <pre>
                                    {previewGroup.savedText || "(empty)"}{"\n"}{"->"}{" "}
                                    {previewGroup.draftText || "(empty)"}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className="proposal-checklist-actions">
                      {checklistStatus ? (
                        <span className={`pill ${checklistStatus.pillClassName}`}>{checklistStatus.label}</span>
                      ) : null}
                      {checklistContext?.previewGroups?.length ? (
                        <button
                          className="mini-button"
                          disabled={isProposalActionBusy}
                          onClick={() =>
                            onFocusCompare(
                              item.action === "review" ? "proposal" : "saved",
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
            disabled={!session.summary.hasPreview || activeView === "preview" || isProposalActionBusy}
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

function getProposalNextAction({
  activeView,
  build,
  hasUnsavedSourceChanges,
  inspect,
  isActionBusy,
  latestProposalExists,
  latestProposalIsStale,
  onBuild,
  onDraftProposal,
  onInspect,
  onOpenView,
  onReviewProposalDiff,
  onSaveDraft,
  proposalComparison,
  session,
}: {
  activeView: WorkbenchView
  build: BuildRunSummary
  hasUnsavedSourceChanges: boolean
  inspect: InspectSnapshot
  isActionBusy: boolean
  latestProposalExists: boolean
  latestProposalIsStale: boolean
  onBuild: () => Promise<void> | void
  onDraftProposal: () => Promise<void> | void
  onInspect: () => Promise<void> | void
  onOpenView: (view: WorkbenchView) => Promise<void> | void
  onReviewProposalDiff: () => void
  onSaveDraft: () => Promise<void> | void
  proposalComparison?: SourceComparisonSummary
  session: SessionDetail
}) {
  if (hasUnsavedSourceChanges) {
    return {
      label: "Save draft",
      description: "Update session truth before build, inspect, or proposal review.",
      disabled: isActionBusy,
      run: () => onSaveDraft(),
    }
  }

  if (inspect.diagnostics.length > 0) {
    if (activeView !== "inspect") {
      return {
        label: "Open Inspect",
        description: "Review diagnostics before trusting the next proposal.",
        disabled: isActionBusy,
        run: () => onOpenView("inspect"),
      }
    }

    return {
      label: "Refresh Inspect",
      description: "Re-check diagnostics and structure after the latest changes.",
      disabled: isActionBusy,
      run: () => onInspect(),
    }
  }

  if (build.status === "failed" || !session.summary.hasPreview || session.summary.status === "dirty") {
    return {
      label: "Run Build",
      description: "Refresh Preview so proposal review has a current artifact baseline.",
      disabled: isActionBusy,
      run: () => onBuild(),
    }
  }

  if (!latestProposalExists || latestProposalIsStale) {
    return {
      label: "Draft proposal",
      description: "Generate a fresh proposal from the current session state.",
      disabled: isActionBusy,
      run: () => onDraftProposal(),
    }
  }

  if (proposalComparison?.changedLineCount) {
    return {
      label: "Review proposal diff",
      description: "Compare the current source against the latest proposal snapshot before deciding.",
      disabled: isActionBusy,
      run: () => onReviewProposalDiff(),
    }
  }

  if (session.summary.hasPreview && activeView !== "preview") {
    return {
      label: "Open Preview",
      description: "Compare the current artifact against the proposal before deciding.",
      disabled: isActionBusy,
      run: () => onOpenView("preview"),
    }
  }

  return undefined
}
