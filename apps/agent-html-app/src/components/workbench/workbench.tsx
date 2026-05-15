import type {
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationSnapshot,
  WorkbenchView,
} from "../../lib/types"
import { InspectPanel } from "./inspect-panel"
import { PreviewPanel } from "./preview-panel"
import { SourcePanel } from "./source-panel"

type WorkbenchProps = {
  session: SessionDetail
  build: BuildRunSummary
  inspect: InspectSnapshot
  logs: LogSnapshot
  draftSource: string
  previewHtml?: string
  activeView: WorkbenchView
  onViewChange: (view: WorkbenchView) => void
  onBuild: () => Promise<void> | void
  onInspect: () => Promise<void> | void
  onDraftSourceChange: (source: string) => void
  onSaveSource: (source: string) => Promise<void> | void
  onValidateSource: (source: string) => Promise<SourceValidationSnapshot>
  isSavingSource: boolean
  isRunningBuild: boolean
  isRunningInspect: boolean
}

const views: WorkbenchView[] = ["preview", "source", "inspect"]

export function Workbench({
  session,
  build,
  inspect,
  logs,
  draftSource,
  previewHtml,
  activeView,
  onViewChange,
  onBuild,
  onInspect,
  onDraftSourceChange,
  onSaveSource,
  onValidateSource,
  isSavingSource,
  isRunningBuild,
  isRunningInspect,
}: WorkbenchProps) {
  return (
    <main className="panel workbench-shell">
      <div className="panel-header workbench-header">
        <div>
          <p className="eyebrow">Workbench</p>
          <h1>{session.summary.name}</h1>
        </div>
        <div className="header-actions">
          <button className="ghost-button" disabled={isRunningBuild} onClick={onBuild} type="button">
            {isRunningBuild ? "Building..." : "Build"}
          </button>
          <button className="primary-button" disabled={isRunningInspect} onClick={onInspect} type="button">
            {isRunningInspect ? "Inspecting..." : "Inspect"}
          </button>
        </div>
      </div>

      <div className="tab-strip" role="tablist" aria-label="Workbench views">
        {views.map((view) => (
          <button
            aria-selected={activeView === view}
            className={activeView === view ? "tab active" : "tab"}
            key={view}
            onClick={() => onViewChange(view)}
            role="tab"
            type="button"
          >
            {view}
          </button>
        ))}
      </div>

      {activeView === "preview" ? (
        <PreviewPanel
          build={build}
          title={session.summary.name}
          previewPath={session.previewPath}
          lastBuildAt={session.summary.lastBuildAt}
          previewHtml={previewHtml}
        />
      ) : null}
      {activeView === "source" ? (
        <SourcePanel
          draftSource={draftSource}
          isSaving={isSavingSource}
          onDraftChange={onDraftSourceChange}
          onSave={onSaveSource}
          onValidate={onValidateSource}
          source={session.source}
          sourcePath={session.sourcePath}
        />
      ) : null}
      {activeView === "inspect" ? <InspectPanel inspect={inspect} logs={logs} /> : null}
    </main>
  )
}
