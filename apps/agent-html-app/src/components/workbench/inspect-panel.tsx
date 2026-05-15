import type { BuildRunSummary, InspectSnapshot, LogSnapshot } from "../../lib/types"
import { formatTimestampLabel } from "../../lib/time"

type InspectPanelProps = {
  inspect: InspectSnapshot
  logs: LogSnapshot
}

export function InspectPanel({ inspect, logs }: InspectPanelProps) {
  const diagnosticCounts = countDiagnosticsBySeverity(inspect)
  const buildStatus = inspect.lastBuild?.status ?? "idle"
  const buildStatusClassName = statusClassNameForBuild(buildStatus)
  const stdoutAvailable = Boolean(logs.stdout?.trim())
  const stderrAvailable = Boolean(logs.stderr?.trim())
  const reviewFocus = deriveReviewFocus(inspect, logs)

  return (
    <section className="workbench-card">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Inspect</p>
          <h3>Diagnostics and structure</h3>
        </div>
        <div className="inspect-header-meta">
          <span className={`pill ${buildStatusClassName}`}>{buildStatusLabel(buildStatus)}</span>
          <span className="inline-meta">Generated {formatTimestampLabel(inspect.generatedAt)}</span>
        </div>
      </div>

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
            {diagnosticCounts.error} error, {diagnosticCounts.warning} warning, {diagnosticCounts.info} info.
          </p>
        </section>

        <section className="inspect-summary-card">
          <p className="eyebrow">Captured outputs</p>
          <h4>{stdoutAvailable || stderrAvailable ? "Logs ready for review" : "No logs captured yet"}</h4>
          <p>
            stdout {stdoutAvailable ? "available" : "missing"} · stderr {stderrAvailable ? "available" : "missing"}
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
                <li className={`diagnostic-item severity-${diagnostic.severity}`} key={diagnostic.id}>
                  <strong>{diagnostic.severity.toUpperCase()}</strong>
                  <span>{diagnostic.message}</span>
                  {diagnostic.code || diagnostic.source ? (
                    <span className="inline-meta">
                      {[diagnostic.code, diagnostic.source].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="validation-empty">No structured diagnostics from the latest inspect run.</p>
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
            <dd>{inspect.lastBuild?.stdoutPath ?? (stdoutAvailable ? "Captured for this session" : "n/a")}</dd>
            <dt>stderr log</dt>
            <dd>{inspect.lastBuild?.stderrPath ?? (stderrAvailable ? "Captured for this session" : "n/a")}</dd>
          </dl>
        </div>

        <div className="inspect-block">
          <h4>Logs</h4>
          <div className="log-grid">
            <div>
              <p className="eyebrow">stdout</p>
              <pre className="log-surface">{logs.stdout ?? "No stdout log yet."}</pre>
            </div>
            <div>
              <p className="eyebrow">stderr</p>
              <pre className="log-surface">{logs.stderr?.length ? logs.stderr : "No stderr log yet."}</pre>
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
  if (inspect.lastBuild?.status === "succeeded" && inspect.lastBuild.previewPath) {
    return "Preview artifact available"
  }

  if (inspect.lastBuild?.status === "failed") {
    return "Artifact needs a successful rebuild"
  }

  return "Artifact not generated yet"
}

function artifactSummary(inspect: InspectSnapshot) {
  if (inspect.lastBuild?.status === "succeeded" && inspect.lastBuild.previewPath) {
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

  const errorCount = inspect.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length
  return errorCount > 0 ? "Errors need attention" : "Review warnings and notes"
}

function deriveReviewFocus(inspect: InspectSnapshot, logs: LogSnapshot) {
  const items: string[] = []

  if (inspect.diagnostics.length > 0) {
    items.push("Resolve the listed diagnostics before trusting the next artifact build.")
  } else {
    items.push("The latest inspect run did not report structured diagnostics.")
  }

  if (inspect.lastBuild?.status === "failed") {
    items.push("Check stderr first. A failed build usually explains preview gaps more directly than the source summary.")
  } else if (inspect.lastBuild?.status === "succeeded") {
    items.push("Compare the structure summary with the preview artifact to confirm the rendered output matches the source intent.")
  } else {
    items.push("Run Build to create the first artifact, then return here for artifact and log review.")
  }

  if (!logs.stdout?.trim() && !logs.stderr?.trim()) {
    items.push("No session logs are available yet, so this review is currently limited to source-derived summaries.")
  } else if (!logs.stderr?.trim()) {
    items.push("stderr is empty, which usually means failures are more likely to be source-validation or preview-state issues than runtime crashes.")
  } else {
    items.push("Use the captured logs to separate validation, runtime, and preview-loading failures before editing the source.")
  }

  return items
}
