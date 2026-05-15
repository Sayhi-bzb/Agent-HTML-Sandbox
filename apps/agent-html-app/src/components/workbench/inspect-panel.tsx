import type { InspectSnapshot, LogSnapshot } from "../../lib/types"
import { formatTimestampLabel } from "../../lib/time"

type InspectPanelProps = {
  inspect: InspectSnapshot
  logs: LogSnapshot
}

export function InspectPanel({ inspect, logs }: InspectPanelProps) {
  return (
    <section className="workbench-card">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Inspect</p>
          <h3>Diagnostics and structure</h3>
        </div>
        <span className="inline-meta">Generated {formatTimestampLabel(inspect.generatedAt)}</span>
      </div>

      <div className="inspect-grid">
        <div className="inspect-block">
          <h4>Structure</h4>
          <p>{inspect.structureSummary}</p>
        </div>

        <div className="inspect-block">
          <h4>Diagnostics</h4>
          <ul className="diagnostic-list">
            {inspect.diagnostics.map((diagnostic) => (
              <li className={`diagnostic-item severity-${diagnostic.severity}`} key={diagnostic.id}>
                <strong>{diagnostic.severity.toUpperCase()}</strong>
                <span>{diagnostic.message}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="inspect-block">
          <h4>Last build</h4>
          <dl className="key-value-grid">
            <dt>Run ID</dt>
            <dd>{inspect.lastBuild?.runId ?? "n/a"}</dd>
            <dt>Status</dt>
            <dd>{inspect.lastBuild?.status ?? "n/a"}</dd>
            <dt>Exit code</dt>
            <dd>{inspect.lastBuild?.exitCode ?? "n/a"}</dd>
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
