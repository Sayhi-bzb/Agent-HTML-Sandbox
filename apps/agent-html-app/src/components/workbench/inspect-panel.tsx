import { getInspectReviewSummary } from "../../lib/inspect-review"
import { Button } from "../ui/button"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "../ui/surface-card"
import { StatusBadge } from "../ui/status-badge"
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group"
import {
  formatInspectDiagnosticMeta,
  getInspectDiagnosticsViewModel,
} from "../../lib/inspect-diagnostics-view"
import {
  getReviewFocusPreview,
  type ReviewFocusTarget,
} from "../../lib/review-focus"
import type { ReviewTimelineActionConfig } from "../../lib/review-flow"
import type { SourceComparisonSummary } from "../../lib/source-comparison"
import {
  createSourceFocusTargetFromDiagnostic,
  createSourceFocusTargetFromGroup,
  type SourceFocusReviewStatus,
  type SourceFocusTarget,
} from "../../lib/source-focus"
import { getSourceFocusViewModel } from "../../lib/source-focus-view"
import { formatTimestampLabel } from "../../lib/time"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationState,
} from "../../lib/types"
import {
  formatSourceValidationDiagnosticMeta,
  getSourceValidationViewModel,
} from "../../lib/source-validation-view"

type InspectPanelProps = {
  activeReviewFocus?: ReviewFocusTarget
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  availableReviewFocusTargets: ReviewFocusTarget[]
  build: BuildRunSummary
  canRevealSourceOrigin: boolean
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
  onRefreshSourceFocus: () => void
  onRevealSourceReviewTarget: () => void
  onSelectReviewFocus: (target: ReviewFocusTarget) => void
  onRevisitReviewFocus: () => void
  onRunReviewAction: (
    handler: ReviewTimelineActionConfig["handler"],
  ) => Promise<void> | void
}

export function InspectPanel({
  activeReviewFocus,
  activeSourceFocus,
  activeSourceFocusReviewStatus,
  availableReviewFocusTargets,
  build,
  canRevealSourceOrigin,
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
  onRefreshSourceFocus,
  onRevealSourceReviewTarget,
  onSelectReviewFocus,
  onRevisitReviewFocus,
  onRunReviewAction,
}: InspectPanelProps) {
  const diagnosticCounts = countDiagnosticsBySeverity(inspect)
  const inspectBuildStatus = inspect.lastBuild?.status ?? "idle"
  const buildStatusClassName = statusClassNameForBuild(inspectBuildStatus)
  const stdoutAvailable = Boolean(logs.stdout?.trim())
  const stderrAvailable = Boolean(logs.stderr?.trim())
  const reviewFocus = deriveReviewFocus(inspect, logs)
  const inspectDiagnosticsView = getInspectDiagnosticsViewModel(inspect)
  const sourceValidationView = getSourceValidationViewModel(sourceValidation)
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
  const activeReviewFocusPreview = getReviewFocusPreview({
    target: activeReviewFocus,
    draftComparison,
    proposalComparison,
  })
  const sourceFocusView = getSourceFocusViewModel({
    sourceFocus: activeSourceFocus,
    reviewStatus: activeSourceFocusReviewStatus,
    canRevealSourceOrigin,
  })

  return (
    <section className="workbench-card">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Inspect</p>
          <h3>Diagnostics and structure</h3>
        </div>
        <div className="inspect-header-meta">
          <StatusBadge tone={statusToneForClassName(buildStatusClassName)}>
            {buildStatusLabel(inspectBuildStatus)}
          </StatusBadge>
          <span className="inline-meta">
            Generated {formatTimestampLabel(inspect.generatedAt)}
          </span>
        </div>
      </div>

      <section className="inspect-audit-card">
        <div className="message-topline">
          <div>
            <p className="eyebrow">Review audit</p>
            <h4>{reviewAudit.stageLabel} is the current gate</h4>
          </div>
          <div className="inspect-audit-meta">
            <StatusBadge
              tone={statusToneForClassName(reviewAudit.stagePillClassName)}
            >
              {reviewAudit.stageStatusLabel}
            </StatusBadge>
            <StatusBadge
              tone={statusToneForClassName(reviewAudit.readiness.pillClassName)}
            >
              {reviewAudit.readiness.label}
            </StatusBadge>
          </div>
        </div>
        <p className="inspect-audit-summary">{reviewAudit.stageSummary}</p>
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
            <span className="inline-meta">
              {reviewAudit.currentAction.description}
            </span>
          </div>
        ) : null}
        {activeReviewFocus || availableReviewFocusTargets.length > 0 ? (
          <div className="inspect-linked-review">
            <div className="message-topline">
              <div>
                <p className="eyebrow">Review focus</p>
                <h5>
                  {activeReviewFocus
                    ? activeReviewFocus.label
                    : "No compare pinned yet"}
                </h5>
              </div>
              <div className="inspect-linked-review-actions">
                {activeReviewFocus ? (
                  <>
                    <Button
                      disabled={isActionBusy}
                      onClick={onRevisitReviewFocus}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Revisit compare
                    </Button>
                    <Button
                      disabled={isActionBusy}
                      onClick={onClearReviewFocus}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Clear focus
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <p className="inspect-linked-review-summary">
              {activeReviewFocus
                ? `Agent Shell is currently focused on the ${
                    activeReviewFocus.mode === "proposal"
                      ? "proposal snapshot"
                      : "saved source"
                  } compare for this review target.`
                : "Pick a compare target to keep Inspect and Agent Shell aligned on the same diff groups."}
            </p>
            {activeReviewFocus ? (
              <div className="proposal-meta-row">
                <StatusBadge tone="accent">
                  {activeReviewFocus.mode === "proposal"
                    ? "Proposal compare"
                    : "Saved compare"}
                </StatusBadge>
                <StatusBadge>{activeReviewFocus.lineLabel}</StatusBadge>
                <span className="inline-meta">
                  {activeReviewFocus.groupCount} focused group(s)
                </span>
              </div>
            ) : null}
            {activeReviewFocusPreview?.groups.length ? (
              <div className="inspect-focus-preview-list">
                {activeReviewFocusPreview.groups.slice(0, 2).map((group) => (
                  <article
                    className="inspect-focus-preview-item"
                    key={`${group.startLine}-${group.endLine}-${group.savedText}-${group.draftText}`}
                  >
                    <div className="message-topline">
                      <StatusBadge>
                        {group.startLine === group.endLine
                          ? `Line ${group.startLine}`
                          : `Lines ${group.startLine}-${group.endLine}`}
                      </StatusBadge>
                      <Button
                        disabled={isActionBusy}
                        onClick={() =>
                          onOpenSourceFocus(
                            createSourceFocusTargetFromGroup({
                              label: activeReviewFocus?.label ?? "Review focus",
                              group,
                              reviewTarget: activeReviewFocus,
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
                    <div className="inspect-focus-preview-code">
                      <p className="draft-preview-label">Before</p>
                      <pre>{group.savedText || "(empty)"}</pre>
                    </div>
                    <div className="inspect-focus-preview-code inspect-focus-preview-code-next">
                      <p className="draft-preview-label">After</p>
                      <pre>{group.draftText || "(empty)"}</pre>
                    </div>
                  </article>
                ))}
                {activeReviewFocusPreview.groups.length > 2 ? (
                  <span className="inline-meta">
                    Showing 2 of {activeReviewFocusPreview.groups.length}{" "}
                    focused group(s) for this review target.
                  </span>
                ) : null}
              </div>
            ) : null}
            {activeSourceFocus && activeSourceFocusReviewStatus ? (
              <SurfaceCard
                className="inspect-source-focus-status"
                variant="summary"
              >
                <SurfaceCardHeader
                  eyebrow="Source focus"
                  title={sourceFocusView?.label ?? activeSourceFocus.label}
                >
                  {sourceFocusView?.statusPill ? (
                    <StatusBadge
                      tone={statusToneForClassName(
                        sourceFocusView.statusPill.className,
                      )}
                    >
                      {sourceFocusView.statusPill.label}
                    </StatusBadge>
                  ) : null}
                </SurfaceCardHeader>
                <SurfaceCardBody className="grid gap-3 px-[14px] pb-[14px]">
                  <p className="inspect-linked-review-summary">
                    {sourceFocusView?.summary}
                  </p>
                  <div className="proposal-meta-row">
                    {sourceFocusView?.originLabel ? (
                      <StatusBadge tone="accent">
                        {sourceFocusView.originLabel}
                      </StatusBadge>
                    ) : null}
                    <StatusBadge>{sourceFocusView?.selectionLabel}</StatusBadge>
                    {sourceFocusView?.reviewOriginLabel ? (
                      <span className="inline-meta">
                        From {sourceFocusView.reviewOriginLabel}
                      </span>
                    ) : null}
                    {sourceFocusView?.originReference ? (
                      <span className="inline-meta">
                        {sourceFocusView.originReference}
                      </span>
                    ) : null}
                  </div>
                  <div className="inspect-linked-review-actions">
                    <Button
                      disabled={isActionBusy}
                      onClick={() => onOpenSourceFocus(activeSourceFocus)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {sourceFocusView?.actions.primaryLabel ??
                        "Open Source focus"}
                    </Button>
                    {sourceFocusView?.actions.canRevealSourceOrigin ? (
                      <Button
                        disabled={isActionBusy}
                        onClick={onRevealSourceReviewTarget}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Reveal source origin
                      </Button>
                    ) : null}
                    {sourceFocusView?.actions.canRefreshFocus ? (
                      <Button
                        disabled={isActionBusy}
                        onClick={onRefreshSourceFocus}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Refresh focus
                      </Button>
                    ) : null}
                  </div>
                </SurfaceCardBody>
              </SurfaceCard>
            ) : null}
            {availableReviewFocusTargets.length > 0 ? (
              <ToggleGroup
                className="inspect-review-targets"
                onValueChange={(value) => {
                  const target = availableReviewFocusTargets.find(
                    (candidate) => candidate.targetId === value,
                  )
                  if (target) {
                    onSelectReviewFocus(target)
                  }
                }}
                type="single"
                value={activeReviewFocus?.targetId}
                variant="outline"
              >
                {availableReviewFocusTargets.map((target) => (
                  <ToggleGroupItem
                    className="inspect-review-target"
                    disabled={isActionBusy}
                    key={target.targetId}
                    size="sm"
                    value={target.targetId}
                  >
                    <span className="inspect-review-target-label">
                      {target.label}
                    </span>
                    <StatusBadge>{target.lineLabel}</StatusBadge>
                    <span className="inline-meta">
                      {target.groupCount} group(s)
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : null}
          </div>
        ) : null}
        <div className="inspect-audit-chip-grid">
          <SurfaceCard className="inspect-audit-chip" variant="summary">
            <SurfaceCardHeader eyebrow="Proposal state" />
            <SurfaceCardBody className="grid gap-2 px-[14px] pb-[14px]">
              <h5>{reviewAudit.proposalState.statusLabel}</h5>
              <p>{reviewAudit.proposalState.summary}</p>
            </SurfaceCardBody>
          </SurfaceCard>
          <SurfaceCard className="inspect-audit-chip" variant="summary">
            <SurfaceCardHeader eyebrow="Readiness" />
            <SurfaceCardBody className="grid gap-2 px-[14px] pb-[14px]">
              <h5>{reviewAudit.readiness.label}</h5>
              <p>{reviewAudit.readiness.summary}</p>
            </SurfaceCardBody>
          </SurfaceCard>
          <SurfaceCard className="inspect-audit-chip" variant="summary">
            <SurfaceCardHeader eyebrow="Signals" />
            <SurfaceCardBody className="grid gap-2 px-[14px] pb-[14px]">
              <h5>{reviewAudit.evidence.length} captured</h5>
              <p>
                Diagnostics, drift, and logs are condensed here so the next
                review move is obvious.
              </p>
            </SurfaceCardBody>
          </SurfaceCard>
        </div>
        <div className="inspect-audit-grid">
          <SurfaceCard className="inspect-audit-block" variant="summary">
            <SurfaceCardHeader title="Recovery path" />
            <SurfaceCardBody className="grid gap-3 px-[14px] pb-[14px]">
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
                  <p className="eyebrow">Open checks</p>
                  <ul className="inspect-focus-list">
                    {reviewAudit.readiness.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SurfaceCardBody>
          </SurfaceCard>

          <SurfaceCard className="inspect-audit-block" variant="summary">
            <SurfaceCardHeader title="Key evidence" />
            <SurfaceCardBody className="px-[14px] pb-[14px]">
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
      </section>

      <div className="inspect-summary-grid">
        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Source validation">
            <StatusBadge
              tone={statusToneForClassName(sourceValidationView.pill.className)}
            >
              {sourceValidationView.pill.label}
            </StatusBadge>
          </SurfaceCardHeader>
          <SurfaceCardBody className="grid gap-3 px-[16px] pb-[16px]">
            <h4>{sourceValidationView.headline}</h4>
            <p>{sourceValidationView.summary}</p>
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
            {sourceValidationView.issues.length > 0 ? (
              <div className="inspect-summary-issue-list">
                {sourceValidationView.issues.map((issue) => (
                  <div
                    className="proposal-meta-row"
                    key={`${issue.diagnostic.id}-${issue.diagnostic.message}`}
                  >
                    <span className="inline-meta">
                      {issue.diagnostic.message}
                    </span>
                    <span className="inline-meta">{issue.meta}</span>
                    {issue.canOpenInSource ? (
                      <Button
                        disabled={isActionBusy}
                        onClick={() => {
                          const target = createSourceFocusTargetFromDiagnostic({
                            diagnostic: issue.diagnostic,
                          })
                          if (target) {
                            onOpenSourceFocus(target)
                          }
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Open in Source
                      </Button>
                    ) : null}
                  </div>
                ))}
                {sourceValidationView.hasAdditionalIssues ? (
                  <span className="inline-meta inspect-summary-detail">
                    More validation issues are available in the Source panel.
                  </span>
                ) : null}
              </div>
            ) : null}
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
                {sourceValidationView.primaryActionLabel}
              </Button>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>
        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Artifact state" />
          <SurfaceCardBody className="grid gap-3 px-[16px] pb-[16px]">
            <h4>{artifactHeadline(inspect)}</h4>
            <p>{artifactSummary(inspect)}</p>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Diagnostics">
            <StatusBadge
              tone={statusToneForClassName(
                inspectDiagnosticsView.pill.className,
              )}
            >
              {inspectDiagnosticsView.pill.label}
            </StatusBadge>
          </SurfaceCardHeader>
          <SurfaceCardBody className="grid gap-3 px-[16px] pb-[16px]">
            <h4>{inspectDiagnosticsView.headline}</h4>
            <p>
              {diagnosticCounts.error} error, {diagnosticCounts.warning}{" "}
              warning, {diagnosticCounts.info} info.
            </p>
            {inspectDiagnosticsView.issues.length > 0 ? (
              <div className="inspect-summary-issue-list">
                {inspectDiagnosticsView.issues.map((issue) => (
                  <div
                    className="proposal-meta-row"
                    key={`${issue.diagnostic.id}-${issue.diagnostic.message}`}
                  >
                    <span className="inline-meta">
                      {issue.diagnostic.message}
                    </span>
                    <span className="inline-meta">{issue.meta}</span>
                    {issue.canOpenInSource ? (
                      <Button
                        disabled={isActionBusy}
                        onClick={() => {
                          const target = createSourceFocusTargetFromDiagnostic({
                            diagnostic: issue.diagnostic,
                          })
                          if (target) {
                            onOpenSourceFocus(target)
                          }
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Open in Source
                      </Button>
                    ) : null}
                  </div>
                ))}
                {inspectDiagnosticsView.hasAdditionalIssues ? (
                  <span className="inline-meta inspect-summary-detail">
                    More inspect diagnostics are available below.
                  </span>
                ) : null}
              </div>
            ) : null}
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
                {inspectDiagnosticsView.primaryActionLabel}
              </Button>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Captured outputs" />
          <SurfaceCardBody className="grid gap-3 px-[16px] pb-[16px]">
            <h4>
              {stdoutAvailable || stderrAvailable
                ? "Logs ready for review"
                : "No logs captured yet"}
            </h4>
            <p>
              stdout {stdoutAvailable ? "available" : "missing"} · stderr{" "}
              {stderrAvailable ? "available" : "missing"}
            </p>
          </SurfaceCardBody>
        </SurfaceCard>
      </div>

      <div className="inspect-grid">
        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Review focus" />
          <SurfaceCardBody className="px-[16px] pb-[16px]">
            <ul className="inspect-focus-list">
              {reviewFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Structure" />
          <SurfaceCardBody className="px-[16px] pb-[16px]">
            <p>{inspect.structureSummary}</p>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Diagnostics" />
          <SurfaceCardBody className="px-[16px] pb-[16px]">
            {inspect.diagnostics.length > 0 ? (
              <ul className="diagnostic-list">
                {inspect.diagnostics.map((diagnostic) => (
                  <li
                    className={`diagnostic-item severity-${diagnostic.severity}`}
                    key={diagnostic.id}
                  >
                    <div className="message-topline">
                      <strong>{diagnostic.severity.toUpperCase()}</strong>
                      {typeof diagnostic.line === "number" ? (
                        <Button
                          disabled={isActionBusy}
                          onClick={() => {
                            const target =
                              createSourceFocusTargetFromDiagnostic({
                                diagnostic,
                              })
                            if (target) {
                              onOpenSourceFocus(target)
                            }
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Open in Source
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
                ))}
              </ul>
            ) : (
              <p className="validation-empty">
                No structured diagnostics from the latest inspect run.
              </p>
            )}
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Last build" />
          <SurfaceCardBody className="px-[16px] pb-[16px]">
            <dl className="key-value-grid">
              <dt>Run ID</dt>
              <dd>{inspect.lastBuild?.runId ?? "n/a"}</dd>
              <dt>Status</dt>
              <dd>{inspect.lastBuild?.status ?? "n/a"}</dd>
              <dt>Started</dt>
              <dd>{formatTimestampLabel(inspect.lastBuild?.startedAt)}</dd>
              <dt>Finished</dt>
              <dd>{formatTimestampLabel(inspect.lastBuild?.finishedAt)}</dd>
              <dt>Exit code</dt>
              <dd>{inspect.lastBuild?.exitCode ?? "n/a"}</dd>
              <dt>Preview</dt>
              <dd>{inspect.lastBuild?.previewPath ?? "No preview artifact"}</dd>
              <dt>stdout log</dt>
              <dd>
                {inspect.lastBuild?.stdoutPath ??
                  (stdoutAvailable ? "Captured for this session" : "n/a")}
              </dd>
              <dt>stderr log</dt>
              <dd>
                {inspect.lastBuild?.stderrPath ??
                  (stderrAvailable ? "Captured for this session" : "n/a")}
              </dd>
            </dl>
          </SurfaceCardBody>
        </SurfaceCard>

        <SurfaceCard variant="summary">
          <SurfaceCardHeader eyebrow="Logs" />
          <SurfaceCardBody className="px-[16px] pb-[16px]">
            <div className="log-grid">
              <div>
                <p className="eyebrow">stdout</p>
                <pre className="log-surface">
                  {logs.stdout ?? "No stdout log yet."}
                </pre>
              </div>
              <div>
                <p className="eyebrow">stderr</p>
                <pre className="log-surface">
                  {logs.stderr?.length ? logs.stderr : "No stderr log yet."}
                </pre>
              </div>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>
      </div>
    </section>
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

function buildStatusLabel(status: BuildRunSummary["status"]) {
  switch (status) {
    case "running":
      return "Build in progress"
    case "failed":
      return "Build failed"
    case "succeeded":
      return "Build succeeded"
    default:
      return "No build yet"
  }
}

function statusClassNameForBuild(status: BuildRunSummary["status"]) {
  switch (status) {
    case "running":
      return "status-building"
    case "failed":
      return "status-error"
    case "succeeded":
      return "status-ready"
    default:
      return ""
  }
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
    return "Preview artifact available"
  }

  if (inspect.lastBuild?.status === "failed") {
    return "Artifact needs a successful rebuild"
  }

  return "Artifact not generated yet"
}

function artifactSummary(inspect: InspectSnapshot) {
  if (
    inspect.lastBuild?.status === "succeeded" &&
    inspect.lastBuild.previewPath
  ) {
    return "The latest build produced a preview artifact that the workbench can review."
  }

  if (inspect.lastBuild?.status === "failed" && inspect.lastBuild.previewPath) {
    return "The latest build failed, but an earlier preview artifact still exists for comparison."
  }

  if (inspect.lastBuild?.status === "failed") {
    return "Inspect the logs and diagnostics before reviewing the next artifact build."
  }

  return "Run Build once the draft is ready to generate a shareable artifact."
}

function deriveReviewFocus(inspect: InspectSnapshot, logs: LogSnapshot) {
  const items: string[] = []

  if (inspect.diagnostics.length > 0) {
    items.push(
      "Resolve the listed diagnostics before trusting the next artifact build.",
    )
  } else {
    items.push("The latest inspect run did not report structured diagnostics.")
  }

  if (inspect.lastBuild?.status === "failed") {
    items.push(
      "Check stderr first. A failed build usually explains preview gaps more directly than the source summary.",
    )
  } else if (inspect.lastBuild?.status === "succeeded") {
    items.push(
      "Compare the structure summary with the preview artifact to confirm the rendered output matches the source intent.",
    )
  } else {
    items.push(
      "Run Build to create the first artifact, then return here for artifact and log review.",
    )
  }

  if (!logs.stdout?.trim() && !logs.stderr?.trim()) {
    items.push(
      "No session logs are available yet, so this review is currently limited to source-derived summaries.",
    )
  } else if (!logs.stderr?.trim()) {
    items.push(
      "stderr is empty, which usually means failures are more likely to be source-validation or preview-state issues than runtime crashes.",
    )
  } else {
    items.push(
      "Use the captured logs to separate validation, runtime, and preview-loading failures before editing the source.",
    )
  }

  return items
}
