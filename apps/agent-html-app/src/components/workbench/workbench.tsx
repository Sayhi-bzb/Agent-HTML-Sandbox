import type { ReviewFocusTarget } from "../../lib/review-focus"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationSnapshot,
  WorkbenchView,
} from "../../lib/types"
import type { ReviewTimelineActionConfig } from "../../lib/review-flow"
import type { SourceComparisonSummary } from "../../lib/source-comparison"
import { InspectPanel } from "./inspect-panel"
import { PreviewPanel } from "./preview-panel"
import { SourcePanel } from "./source-panel"

type WorkbenchProps = {
  session: SessionDetail
  build: BuildRunSummary
  inspect: InspectSnapshot
  logs: LogSnapshot
  messages: AgentShellMessage[]
  activeReviewFocus?: ReviewFocusTarget
  availableReviewFocusTargets: ReviewFocusTarget[]
  draftSource: string
  draftComparison?: SourceComparisonSummary
  proposalComparison?: SourceComparisonSummary
  hasUnsavedSourceChanges: boolean
  isActionBusy: boolean
  previewHtml?: string
  activeView: WorkbenchView
  onViewChange: (view: WorkbenchView) => void
  onBuild: () => Promise<void> | void
  onInspect: () => Promise<void> | void
  onClearReviewFocus: () => void
  onRevisitReviewFocus: () => void
  onRunReviewAction: (
    handler: ReviewTimelineActionConfig["handler"],
  ) => Promise<void> | void
  onSelectReviewFocus: (target: ReviewFocusTarget) => void
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
  messages,
  activeReviewFocus,
  availableReviewFocusTargets,
  draftSource,
  draftComparison,
  proposalComparison,
  hasUnsavedSourceChanges,
  isActionBusy,
  previewHtml,
  activeView,
  onViewChange,
  onBuild,
  onClearReviewFocus,
  onInspect,
  onRevisitReviewFocus,
  onRunReviewAction,
  onSelectReviewFocus,
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
          <button
            className="ghost-button"
            disabled={isRunningBuild}
            onClick={onBuild}
            type="button"
          >
            {isRunningBuild ? "Building..." : "Build"}
          </button>
          <button
            className="primary-button"
            disabled={isRunningInspect}
            onClick={onInspect}
            type="button"
          >
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
      {activeView === "inspect" ? (
        <InspectPanel
          activeReviewFocus={activeReviewFocus}
          availableReviewFocusTargets={availableReviewFocusTargets}
          build={build}
          draftComparison={draftComparison}
          hasUnsavedSourceChanges={hasUnsavedSourceChanges}
          inspect={inspect}
          isActionBusy={isActionBusy}
          logs={logs}
          messages={messages}
          onClearReviewFocus={onClearReviewFocus}
          onRevisitReviewFocus={onRevisitReviewFocus}
          onRunReviewAction={onRunReviewAction}
          onSelectReviewFocus={onSelectReviewFocus}
          proposalComparison={proposalComparison}
          session={session}
        />
      ) : null}
    </main>
  )
}
