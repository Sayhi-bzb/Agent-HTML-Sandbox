import { useRef, useState } from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { getInspectReviewSummary } from "../../lib/inspect-review"
import { Button } from "../ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "../ui/surface-card"
import { StatusBadge } from "../ui/status-badge"
import { getInspectDiagnosticsViewModel } from "../../lib/inspect-diagnostics-view"
import { type ReviewFocusTarget } from "../../lib/review-focus"
import type { ReviewTimelineActionConfig } from "../../lib/review-flow"
import type { SourceComparisonSummary } from "../../lib/source-comparison"
import {
  createSourceFocusTargetFromDiagnostic,
  type SourceFocusTarget,
} from "../../lib/source-focus"
import { getLogInsightViewModel } from "../../lib/log-insight"
import { formatTimestampLabel } from "../../lib/time"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationState,
} from "../../lib/types"
import { getSourceValidationViewModel } from "../../lib/source-validation-view"
import { copyText } from "../../lib/utils"

type InspectPanelProps = {
  activeReviewFocus?: ReviewFocusTarget
  availableReviewFocusTargets: ReviewFocusTarget[]
  build: BuildRunSummary
  session: SessionDetail
  inspect: InspectSnapshot
  sourceValidation: SourceValidationState
  logs: LogSnapshot
  messages: AgentShellMessage[]
  hasUnsavedSourceChanges: boolean
  isActionBusy: boolean
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  onClearReviewFocus: () => void
  onOpenSourceFocus: (target: SourceFocusTarget) => void
  onSelectReviewFocus: (target: ReviewFocusTarget) => void
  onRevisitReviewFocus: () => void
  onRunReviewAction: (
    handler: ReviewTimelineActionConfig["handler"],
  ) => Promise<void> | void
}

export function InspectPanel({
  activeReviewFocus,
  availableReviewFocusTargets,
  build,
  session,
  inspect,
  sourceValidation,
  logs,
  messages,
  hasUnsavedSourceChanges,
  isActionBusy,
  draftComparison,
  proposalComparison,
  onClearReviewFocus,
  onOpenSourceFocus,
  onSelectReviewFocus,
  onRevisitReviewFocus,
  onRunReviewAction,
}: InspectPanelProps) {
  const [copiedKey, setCopiedKey] = useState<string>()
  const linkedReviewRef = useRef<HTMLDivElement>(null)
  const sessionFilesRef = useRef<HTMLDivElement>(null)
  const diagnosticCounts = countDiagnosticsBySeverity(inspect)
  const inspectDiagnosticsView = getInspectDiagnosticsViewModel(inspect)
  const sourceValidationView = getSourceValidationViewModel(sourceValidation)
  const logInsight = getLogInsightViewModel({
    build: inspect.lastBuild ?? build,
    logs,
  })
  const reviewAudit = getInspectReviewSummary({
    build,
    draftComparison,
    hasUnsavedSourceChanges,
    inspect,
    logs,
    messages,
    proposalComparison,
    session,
    sourceValidation,
  })

  return (
    <SurfaceCard className="inspect-panel" variant="workbench">
      <SurfaceCardBody className="inspect-panel-body">
        <SurfaceCard className="inspect-audit-card" variant="context">
          <SurfaceCardBody className="grid gap-4">
            <div className="message-topline">
              <div>
                <h4>{reviewAudit.stageLabel}</h4>
              </div>
              <div className="inspect-audit-meta">
                <span className="inline-meta">
                  Generated {formatTimestampLabel(inspect.generatedAt)}
                </span>
                <StatusBadge
                  tone={statusToneForClassName(reviewAudit.stagePillClassName)}
                >
                  {reviewAudit.stageStatusLabel}
                </StatusBadge>
                <StatusBadge
                  tone={statusToneForClassName(
                    reviewAudit.readiness.pillClassName,
                  )}
                >
                  {reviewAudit.readiness.label}
                </StatusBadge>
              </div>
            </div>
            {reviewAudit.currentAction ? (
              <div className="inspect-audit-actions">
                <Button
                  disabled={isActionBusy}
                  onClick={() =>
                    void onRunReviewAction(reviewAudit.currentAction!.handler)
                  }
                  size="sm"
                  type="button"
                >
                  {reviewAudit.currentAction.label}
                </Button>
              </div>
            ) : null}
            {activeReviewFocus || availableReviewFocusTargets.length > 0 ? (
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="panel-menu-shell" ref={linkedReviewRef}>
                    <SurfaceCard
                      className="inspect-linked-review"
                      variant="inset"
                    >
                      <SurfaceCardBody className="grid gap-3" padding="compact">
                        <div className="message-topline">
                          <div>
                            <h5>
                              {activeReviewFocus
                                ? activeReviewFocus.label
                                : "No compare pinned yet"}
                            </h5>
                          </div>
                          <div className="inspect-linked-review-actions">
                            {activeReviewFocus ? (
                              <Button
                                disabled={isActionBusy}
                                onClick={onRevisitReviewFocus}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Revisit compare
                              </Button>
                            ) : null}
                            <Button
                              aria-label="Review focus actions"
                              className="panel-card-more"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                openInspectContextMenu(linkedReviewRef.current)
                              }}
                              size="icon-xs"
                              type="button"
                              variant="ghost"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </div>
                        </div>
                        {activeReviewFocus ? (
                          <div className="proposal-meta-row">
                            <StatusBadge tone="accent">
                              {activeReviewFocus.mode === "proposal"
                                ? "Proposal compare"
                                : "Saved compare"}
                            </StatusBadge>
                            <StatusBadge>
                              {activeReviewFocus.lineLabel}
                            </StatusBadge>
                            <span className="inline-meta">
                              {activeReviewFocus.groupCount} focused group(s)
                            </span>
                          </div>
                        ) : null}
                        {availableReviewFocusTargets.length > 0 ? (
                          <span className="inline-meta">
                            {availableReviewFocusTargets.length} compare
                            target(s)
                          </span>
                        ) : null}
                      </SurfaceCardBody>
                    </SurfaceCard>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent
                  className="session-context-menu"
                  sideOffset={10}
                >
                  <ContextMenuGroup>
                    {activeReviewFocus ? (
                      <ContextMenuItem
                        disabled={isActionBusy}
                        onSelect={onRevisitReviewFocus}
                      >
                        Revisit compare
                      </ContextMenuItem>
                    ) : null}
                    <ContextMenuItem
                      disabled={!activeReviewFocus || isActionBusy}
                      onSelect={onClearReviewFocus}
                    >
                      Clear
                    </ContextMenuItem>
                  </ContextMenuGroup>
                  {availableReviewFocusTargets.length > 0 ? (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuLabel>Compare targets</ContextMenuLabel>
                      <ContextMenuGroup>
                        {availableReviewFocusTargets.map((target) => (
                          <ContextMenuItem
                            disabled={isActionBusy}
                            key={target.targetId}
                            onSelect={() => onSelectReviewFocus(target)}
                          >
                            {target.label}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuGroup>
                    </>
                  ) : null}
                </ContextMenuContent>
              </ContextMenu>
            ) : null}
            <div className="inspect-audit-grid">
              <SurfaceCard className="inspect-audit-block" variant="inset">
                <SurfaceCardHeader padding="compact" title="Next" />
                <SurfaceCardBody className="grid gap-3" padding="compact">
                  <ol className="inspect-step-list">
                    {reviewAudit.nextSteps.map((step) => (
                      <li className="inspect-step-item" key={step.id}>
                        <div className="inspect-step-topline">
                          <strong>{step.title}</strong>
                          {step.action ? (
                            <Button
                              disabled={isActionBusy}
                              onClick={() =>
                                void onRunReviewAction(step.action!.handler)
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {step.action.label}
                            </Button>
                          ) : null}
                        </div>
                        <p>{step.detail}</p>
                      </li>
                    ))}
                  </ol>
                  {reviewAudit.readiness.items.length > 0 ? (
                    <div className="inspect-open-checks">
                      <p className="eyebrow">Blockers</p>
                      <ul className="inspect-focus-list">
                        {reviewAudit.readiness.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </SurfaceCardBody>
              </SurfaceCard>

              <SurfaceCard className="inspect-audit-block" variant="inset">
                <SurfaceCardHeader padding="compact" title="Key evidence" />
                <SurfaceCardBody padding="compact">
                  <ul className="inspect-evidence-list">
                    {reviewAudit.evidence.map((item) => (
                      <li className="inspect-evidence-item" key={item.id}>
                        <div className="message-topline">
                          <StatusBadge
                            tone={statusToneForClassName(item.pillClassName)}
                          >
                            {item.label}
                          </StatusBadge>
                        </div>
                        <p>{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                </SurfaceCardBody>
              </SurfaceCard>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <div className="inspect-summary-grid">
          <SurfaceCard variant="summary">
            <SurfaceCardHeader eyebrow="Validation" padding="compact">
              <StatusBadge
                tone={statusToneForClassName(
                  sourceValidationView.pill.className,
                )}
              >
                {sourceValidationView.pill.label}
              </StatusBadge>
            </SurfaceCardHeader>
            <SurfaceCardBody className="grid gap-3" padding="compact">
              <div className="inspect-summary-meta">
                <span className="inline-meta">
                  {sourceValidationView.diagnosticsCount} diagnostic(s)
                </span>
                <span className="inline-meta">
                  {sourceValidationView.validatedAt
                    ? formatTimestampLabel(sourceValidationView.validatedAt)
                    : "No validation run yet"}
                </span>
              </div>
              <div className="inspect-summary-actions">
                <Button
                  disabled={isActionBusy}
                  onClick={() => {
                    if (
                      sourceValidationView.primaryAction ===
                        "focus-first-issue" &&
                      sourceValidationView.primaryDiagnostic
                    ) {
                      const target = createSourceFocusTargetFromDiagnostic({
                        diagnostic: sourceValidationView.primaryDiagnostic,
                      })
                      if (target) {
                        onOpenSourceFocus(target)
                      }
                      return
                    }

                    void onRunReviewAction("openSource")
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {sourceValidationView.primaryActionLabel === "Open Source"
                    ? "Source"
                    : sourceValidationView.primaryActionLabel}
                </Button>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>
          <SurfaceCard variant="summary">
            <SurfaceCardHeader eyebrow="Artifact" padding="compact" />
            <SurfaceCardBody className="grid gap-3" padding="compact">
              <h4>{artifactHeadline(inspect)}</h4>
              <p className="inspect-summary-detail">
                {build.status === "failed"
                  ? "Return to Source or rerun Build before approving the artifact."
                  : build.status === "running"
                    ? "Wait for the current build before trusting preview review."
                    : session.summary.hasPreview
                      ? "The latest artifact is ready for review."
                      : "Build once to produce a stable artifact review surface."}
              </p>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard variant="summary">
            <SurfaceCardHeader eyebrow="Diagnostics" padding="compact">
              <StatusBadge
                tone={statusToneForClassName(
                  inspectDiagnosticsView.pill.className,
                )}
              >
                {inspectDiagnosticsView.pill.label}
              </StatusBadge>
            </SurfaceCardHeader>
            <SurfaceCardBody className="grid gap-3" padding="compact">
              <p>
                {diagnosticCounts.error} error, {diagnosticCounts.warning}{" "}
                warning, {diagnosticCounts.info} info.
              </p>
              <div className="inspect-summary-actions">
                <Button
                  disabled={isActionBusy}
                  onClick={() => {
                    if (
                      inspectDiagnosticsView.primaryAction ===
                        "focus-first-issue" &&
                      inspectDiagnosticsView.primaryDiagnostic
                    ) {
                      const target = createSourceFocusTargetFromDiagnostic({
                        diagnostic: inspectDiagnosticsView.primaryDiagnostic,
                      })
                      if (target) {
                        onOpenSourceFocus(target)
                      }
                      return
                    }

                    void onRunReviewAction("openInspect")
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {inspectDiagnosticsView.primaryActionLabel === "Open Inspect"
                    ? "Inspect"
                    : inspectDiagnosticsView.primaryActionLabel}
                </Button>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>
        </div>

        <div className="inspect-grid">
          <SurfaceCard variant="summary">
            <SurfaceCardHeader eyebrow="Structure" padding="compact" />
            <SurfaceCardBody padding="compact">
              <p>{inspect.structureSummary}</p>
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard variant="summary">
            <SurfaceCardHeader eyebrow="Diagnostics" padding="compact" />
            <SurfaceCardBody padding="compact">
              {inspect.diagnostics.length > 0 ? (
                <ul className="diagnostic-list">
                  {inspect.diagnostics.map((diagnostic) => (
                    <InspectDiagnosticRow
                      diagnostic={diagnostic}
                      isActionBusy={isActionBusy}
                      key={diagnostic.id}
                      onOpenSourceFocus={onOpenSourceFocus}
                    />
                  ))}
                </ul>
              ) : (
                <p className="validation-empty">Clear</p>
              )}
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard variant="summary">
            <SurfaceCardHeader eyebrow="Logs" padding="compact" />
            <SurfaceCardBody className="grid gap-4" padding="compact">
              <div className="inspect-summary-issue-list">
                {logInsight.streams.map((stream) => (
                  <div className="inspect-step-item" key={stream.id}>
                    <div className="message-topline">
                      <StatusBadge tone={stream.tone}>
                        {stream.label}
                      </StatusBadge>
                      <span className="inline-meta">{stream.headline}</span>
                    </div>
                    <p className="inspect-summary-detail">{stream.detail}</p>
                  </div>
                ))}
              </div>
              <div className="log-grid">
                <div>
                  <p className="eyebrow">stdout</p>
                  <pre className="log-surface">
                    {logInsight.streams.find((stream) => stream.id === "stdout")
                      ?.preview ?? "No stdout log yet."}
                  </pre>
                </div>
                <div>
                  <p className="eyebrow">stderr</p>
                  <pre className="log-surface">
                    {logInsight.streams.find((stream) => stream.id === "stderr")
                      ?.preview ?? "No stderr log yet."}
                  </pre>
                </div>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="panel-menu-shell" ref={sessionFilesRef}>
                <SurfaceCard variant="summary">
                  <SurfaceCardHeader eyebrow="Session files" padding="compact">
                    <Button
                      aria-label="Session file actions"
                      className="panel-card-more"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        openInspectContextMenu(sessionFilesRef.current)
                      }}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </SurfaceCardHeader>
                  <SurfaceCardBody className="grid gap-3" padding="compact">
                    <h4>{session.previewPath ? "Tracked" : "Partial"}</h4>
                    <p className="inspect-summary-detail">
                      Source, logs, and chat paths are available.
                      {session.previewPath
                        ? " Artifact path is ready."
                        : " Artifact path is still missing."}
                    </p>
                    <div className="inspect-summary-meta">
                      <span className="inline-meta">4 file roots</span>
                      <span className="inline-meta">
                        {session.previewPath ? "Artifact ready" : "No artifact"}
                      </span>
                    </div>
                  </SurfaceCardBody>
                </SurfaceCard>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent
              className="session-context-menu"
              sideOffset={10}
            >
              <ContextMenuGroup>
                <ContextMenuItem
                  onSelect={() => {
                    void copyText(session.sourcePath).then((copied) => {
                      if (copied) {
                        setCopiedKey("source-path")
                      }
                    })
                  }}
                >
                  {copiedKey === "source-path"
                    ? "Copied source path"
                    : "Copy source path"}
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={!session.previewPath}
                  onSelect={() => {
                    void copyText(session.previewPath).then((copied) => {
                      if (copied) {
                        setCopiedKey("artifact-path")
                      }
                    })
                  }}
                >
                  {copiedKey === "artifact-path"
                    ? "Copied artifact path"
                    : "Copy artifact path"}
                </ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuLabel>Details</ContextMenuLabel>
              <ContextMenuItem className="session-context-detail" disabled>
                <span className="session-context-detail-label">Source</span>
                <span className="session-context-detail-value">
                  {session.sourcePath}
                </span>
              </ContextMenuItem>
              <ContextMenuItem className="session-context-detail" disabled>
                <span className="session-context-detail-label">Artifact</span>
                <span className="session-context-detail-value">
                  {session.previewPath ?? "missing"}
                </span>
              </ContextMenuItem>
              <ContextMenuItem className="session-context-detail" disabled>
                <span className="session-context-detail-label">Logs</span>
                <span className="session-context-detail-value">
                  {session.logDirectory}
                </span>
              </ContextMenuItem>
              <ContextMenuItem className="session-context-detail" disabled>
                <span className="session-context-detail-label">Chat</span>
                <span className="session-context-detail-value">
                  {session.chatPath}
                </span>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  )
}

function countDiagnosticsBySeverity(inspect: InspectSnapshot) {
  return inspect.diagnostics.reduce(
    (counts, diagnostic) => {
      counts[diagnostic.severity] += 1
      return counts
    },
    { error: 0, warning: 0, info: 0 },
  )
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

function artifactHeadline(inspect: InspectSnapshot) {
  if (
    inspect.lastBuild?.status === "succeeded" &&
    inspect.lastBuild.previewPath
  ) {
    return "Ready"
  }

  if (inspect.lastBuild?.status === "failed") {
    return "Retry needed"
  }

  return "Empty"
}

function InspectDiagnosticRow({
  diagnostic,
  isActionBusy,
  onOpenSourceFocus,
}: {
  diagnostic: InspectSnapshot["diagnostics"][number]
  isActionBusy: boolean
  onOpenSourceFocus: (target: SourceFocusTarget) => void
}) {
  const triggerRef = useRef<HTMLLIElement>(null)
  const sourceTarget = createSourceFocusTargetFromDiagnostic({ diagnostic })

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          className={`diagnostic-item diagnostic-item-compact severity-${diagnostic.severity}`}
          ref={triggerRef}
        >
          <div className="message-topline">
            <strong>{diagnostic.severity.toUpperCase()}</strong>
            {sourceTarget ? (
              <Button
                aria-label={`${diagnostic.severity} diagnostic actions`}
                className="panel-card-more"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openInspectContextMenu(triggerRef.current)
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <MoreHorizontalIcon />
              </Button>
            ) : null}
          </div>
          <span>{diagnostic.message}</span>
          {diagnostic.code ||
          diagnostic.source ||
          typeof diagnostic.line === "number" ? (
            <span className="inline-meta">
              {[
                typeof diagnostic.line === "number"
                  ? `line ${diagnostic.line}${
                      typeof diagnostic.column === "number"
                        ? `:${diagnostic.column}`
                        : ""
                    }`
                  : undefined,
                diagnostic.code,
                diagnostic.source,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </li>
      </ContextMenuTrigger>
      {sourceTarget ? (
        <ContextMenuContent className="session-context-menu" sideOffset={10}>
          <ContextMenuGroup>
            <ContextMenuItem
              disabled={isActionBusy}
              onSelect={() => onOpenSourceFocus(sourceTarget)}
            >
              Focus in Source
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  )
}

function openInspectContextMenu(element: HTMLElement | null) {
  if (!element) {
    return
  }

  const rect = element.getBoundingClientRect()
  element.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: rect.right - 12,
      clientY: rect.top + 12,
      view: window,
    }),
  )
}
