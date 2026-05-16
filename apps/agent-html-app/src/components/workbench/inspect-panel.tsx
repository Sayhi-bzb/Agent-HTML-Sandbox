import { getInspectReviewSummary } from "../../lib/inspect-review"
import {
  getReviewFocusPreview,
  isSameReviewFocusTarget,
  type ReviewFocusTarget,
} from "../../lib/review-focus"
import type { ReviewTimelineActionConfig } from "../../lib/review-flow"
import type { SourceComparisonSummary } from "../../lib/source-comparison"
import {
  createSourceFocusTargetFromDiagnostic,
  createSourceFocusTargetFromGroup,
  getSourceFocusLineLabel,
  getSourceFocusStatusPill,
  type SourceFocusReviewStatus,
  type SourceFocusTarget,
} from "../../lib/source-focus"
import { formatTimestampLabel } from "../../lib/time"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
} from "../../lib/types"

type InspectPanelProps = {
  activeReviewFocus?: ReviewFocusTarget
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  availableReviewFocusTargets: ReviewFocusTarget[]
  build: BuildRunSummary
  session: SessionDetail
  inspect: InspectSnapshot
  logs: LogSnapshot
  messages: AgentShellMessage[]
  hasUnsavedSourceChanges: boolean
  isActionBusy: boolean
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  onClearReviewFocus: () => void
  onOpenSourceFocus: (target: SourceFocusTarget) => void
  onRefreshSourceFocus: () => void
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
  session,
  inspect,
  logs,
  messages,
  hasUnsavedSourceChanges,
  isActionBusy,
  draftComparison,
  proposalComparison,
  onClearReviewFocus,
  onOpenSourceFocus,
  onRefreshSourceFocus,
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
  const reviewAudit = getInspectReviewSummary({
    build,
    draftComparison,
    hasUnsavedSourceChanges,
    inspect,
    logs,
    messages,
    proposalComparison,
    session,
  })
  const activeReviewFocusPreview = getReviewFocusPreview({
    target: activeReviewFocus,
    draftComparison,
    proposalComparison,
  })
  const sourceFocusStatusPill = getSourceFocusStatusPill(
    activeSourceFocusReviewStatus,
  )

  return (
    <section className="workbench-card">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Inspect</p>
          <h3>Diagnostics and structure</h3>
        </div>
        <div className="inspect-header-meta">
          <span className={`pill ${buildStatusClassName}`}>
            {buildStatusLabel(inspectBuildStatus)}
          </span>
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
            <span className={`pill ${reviewAudit.stagePillClassName}`}>
              {reviewAudit.stageStatusLabel}
            </span>
            <span className={`pill ${reviewAudit.readiness.pillClassName}`}>
              {reviewAudit.readiness.label}
            </span>
          </div>
        </div>
        <p className="inspect-audit-summary">{reviewAudit.stageSummary}</p>
        {reviewAudit.currentAction ? (
          <div className="inspect-audit-actions">
            <button
              className="primary-button"
              disabled={isActionBusy}
              onClick={() =>
                void onRunReviewAction(reviewAudit.currentAction!.handler)
              }
              type="button"
            >
              {reviewAudit.currentAction.label}
            </button>
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
                    <button
                      className="mini-button"
                      disabled={isActionBusy}
                      onClick={onRevisitReviewFocus}
                      type="button"
                    >
                      Revisit compare
                    </button>
                    <button
                      className="mini-button"
                      disabled={isActionBusy}
                      onClick={onClearReviewFocus}
                      type="button"
                    >
                      Clear focus
                    </button>
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
                <span className="pill accent">
                  {activeReviewFocus.mode === "proposal"
                    ? "Proposal compare"
                    : "Saved compare"}
                </span>
                <span className="pill">{activeReviewFocus.lineLabel}</span>
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
                      <span className="pill">
                        {group.startLine === group.endLine
                          ? `Line ${group.startLine}`
                          : `Lines ${group.startLine}-${group.endLine}`}
                      </span>
                      <button
                        className="mini-button"
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
                        type="button"
                      >
                        Open in Source
                      </button>
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
              <div className="inspect-source-focus-status">
                <div className="message-topline">
                  <div>
                    <p className="eyebrow">Source focus</p>
                    <h5>{activeSourceFocus.label}</h5>
                  </div>
                  {sourceFocusStatusPill ? (
                    <span className={`pill ${sourceFocusStatusPill.className}`}>
                      {sourceFocusStatusPill.label}
                    </span>
                  ) : null}
                </div>
                <p className="inspect-linked-review-summary">
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
                <div className="inspect-linked-review-actions">
                  <button
                    className="mini-button"
                    disabled={isActionBusy}
                    onClick={() => onOpenSourceFocus(activeSourceFocus)}
                    type="button"
                  >
                    Open Source focus
                  </button>
                  {activeSourceFocusReviewStatus.kind === "moved" ? (
                    <button
                      className="mini-button"
                      disabled={isActionBusy}
                      onClick={onRefreshSourceFocus}
                      type="button"
                    >
                      Refresh focus
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {availableReviewFocusTargets.length > 0 ? (
              <div className="inspect-review-targets">
                {availableReviewFocusTargets.map((target) => {
                  const isActive = isSameReviewFocusTarget(
                    activeReviewFocus,
                    target,
                  )

                  return (
                    <button
                      className={
                        isActive
                          ? "inspect-review-target active"
                          : "inspect-review-target"
                      }
                      disabled={isActionBusy || isActive}
                      key={target.targetId}
                      onClick={() => onSelectReviewFocus(target)}
                      type="button"
                    >
                      <span className="inspect-review-target-label">
                        {target.label}
                      </span>
                      <span className="pill">{target.lineLabel}</span>
                      <span className="inline-meta">
                        {target.groupCount} group(s)
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="inspect-audit-chip-grid">
          <article className="inspect-audit-chip">
            <p className="eyebrow">Proposal state</p>
            <h5>{reviewAudit.proposalState.statusLabel}</h5>
            <p>{reviewAudit.proposalState.summary}</p>
          </article>
          <article className="inspect-audit-chip">
            <p className="eyebrow">Readiness</p>
            <h5>{reviewAudit.readiness.label}</h5>
            <p>{reviewAudit.readiness.summary}</p>
          </article>
          <article className="inspect-audit-chip">
            <p className="eyebrow">Signals</p>
            <h5>{reviewAudit.evidence.length} captured</h5>
            <p>
              Diagnostics, drift, and logs are condensed here so the next review
              move is obvious.
            </p>
          </article>
        </div>
        <div className="inspect-audit-grid">
          <section className="inspect-audit-block">
            <h4>Recovery path</h4>
            <ol className="inspect-step-list">
              {reviewAudit.nextSteps.map((step) => (
                <li className="inspect-step-item" key={step.id}>
                  <div className="inspect-step-topline">
                    <strong>{step.title}</strong>
                    {step.action ? (
                      <button
                        className="mini-button"
                        disabled={isActionBusy}
                        onClick={() =>
                          void onRunReviewAction(step.action!.handler)
                        }
                        type="button"
                      >
                        {step.action.label}
                      </button>
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
          </section>

          <section className="inspect-audit-block">
            <h4>Key evidence</h4>
            <ul className="inspect-evidence-list">
              {reviewAudit.evidence.map((item) => (
                <li className="inspect-evidence-item" key={item.id}>
                  <div className="message-topline">
                    <span className={`pill ${item.pillClassName}`}>
                      {item.label}
                    </span>
                  </div>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <div className="inspect-summary-grid">
        <section className="inspect-summary-card">
          <p className="eyebrow">Artifact state</p>
          <h4>{artifactHeadline(inspect)}</h4>
          <p>{artifactSummary(inspect)}</p>
        </section>

        <section className="inspect-summary-card">
          <p className="eyebrow">Diagnostics</p>
          <h4>{diagnosticHeadline(inspect)}</h4>
          <p>
            {diagnosticCounts.error} error, {diagnosticCounts.warning} warning,{" "}
            {diagnosticCounts.info} info.
          </p>
        </section>

        <section className="inspect-summary-card">
          <p className="eyebrow">Captured outputs</p>
          <h4>
            {stdoutAvailable || stderrAvailable
              ? "Logs ready for review"
              : "No logs captured yet"}
          </h4>
          <p>
            stdout {stdoutAvailable ? "available" : "missing"} · stderr{" "}
            {stderrAvailable ? "available" : "missing"}
          </p>
        </section>
      </div>

      <div className="inspect-grid">
        <div className="inspect-block">
          <h4>Review focus</h4>
          <ul className="inspect-focus-list">
            {reviewFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="inspect-block">
          <h4>Structure</h4>
          <p>{inspect.structureSummary}</p>
        </div>

        <div className="inspect-block">
          <h4>Diagnostics</h4>
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
                      <button
                        className="mini-button"
                        disabled={isActionBusy}
                        onClick={() => {
                          const target = createSourceFocusTargetFromDiagnostic({
                            diagnostic,
                          })
                          if (target) {
                            onOpenSourceFocus(target)
                          }
                        }}
                        type="button"
                      >
                        Open in Source
                      </button>
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
        </div>

        <div className="inspect-block">
          <h4>Last build</h4>
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
        </div>

        <div className="inspect-block">
          <h4>Logs</h4>
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
        </div>
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

function diagnosticHeadline(inspect: InspectSnapshot) {
  if (inspect.diagnostics.length === 0) {
    return "No structured diagnostics"
  }

  const errorCount = inspect.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  ).length
  return errorCount > 0 ? "Errors need attention" : "Review warnings and notes"
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
