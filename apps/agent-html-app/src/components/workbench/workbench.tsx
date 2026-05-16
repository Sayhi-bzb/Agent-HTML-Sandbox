import { Suspense, lazy } from "react"

import { Button } from "@/components/ui/button"
import { PanelShell, PanelShellHeader } from "../ui/panel-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReviewFocusTarget } from "../../lib/review-focus"
import type {
  SourceFocusReviewStatus,
  SourceFocusTarget,
} from "../../lib/source-focus"
import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  SessionDetail,
  SourceValidationState,
  WorkbenchView,
} from "../../lib/types"
import type { ReviewTimelineActionConfig } from "../../lib/review-flow"
import type { SourceComparisonSummary } from "../../lib/source-comparison"
import { InspectPanel } from "./inspect-panel"
import { PreviewPanel } from "./preview-panel"

const SourcePanel = lazy(() =>
  import("./source-panel").then((module) => ({
    default: module.SourcePanel,
  })),
)

type WorkbenchProps = {
  session: SessionDetail
  build: BuildRunSummary
  inspect: InspectSnapshot
  logs: LogSnapshot
  messages: AgentShellMessage[]
  sourceValidation: SourceValidationState
  activeReviewFocus?: ReviewFocusTarget
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
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
  canRevealSourceOrigin: boolean
  onInspect: () => Promise<void> | void
  onClearReviewFocus: () => void
  onClearSourceFocus: () => void
  onOpenSourceFocus: (target: SourceFocusTarget) => void
  onRefreshSourceFocus: () => void
  onRevealSourceReviewTarget: () => void
  onRevisitReviewFocus: () => void
  onRunReviewAction: (
    handler: ReviewTimelineActionConfig["handler"],
  ) => Promise<void> | void
  onSelectReviewFocus: (target: ReviewFocusTarget) => void
  onDraftSourceChange: (source: string) => void
  onSaveSource: (source: string) => Promise<void> | void
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
  sourceValidation,
  activeReviewFocus,
  activeSourceFocus,
  activeSourceFocusReviewStatus,
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
  canRevealSourceOrigin,
  onClearReviewFocus,
  onClearSourceFocus,
  onInspect,
  onOpenSourceFocus,
  onRefreshSourceFocus,
  onRevealSourceReviewTarget,
  onRevisitReviewFocus,
  onRunReviewAction,
  onSelectReviewFocus,
  onDraftSourceChange,
  onSaveSource,
  isSavingSource,
  isRunningBuild,
  isRunningInspect,
}: WorkbenchProps) {
  return (
    <PanelShell as="main" variant="workbench">
      <PanelShellHeader
        className="workbench-header"
        eyebrow="Workbench"
        title={session.summary.name}
      >
        <div className="header-actions">
          <Button
            disabled={isRunningBuild}
            onClick={onBuild}
            size="sm"
            type="button"
            variant="outline"
          >
            {isRunningBuild ? "Building..." : "Build"}
          </Button>
          <Button
            disabled={isRunningInspect}
            onClick={onInspect}
            size="sm"
            type="button"
          >
            {isRunningInspect ? "Inspecting..." : "Inspect"}
          </Button>
        </div>
      </PanelShellHeader>

      <Tabs
        className="workbench-tabs"
        onValueChange={(value) => onViewChange(value as WorkbenchView)}
        value={activeView}
      >
        <TabsList className="tab-strip" variant="line">
          {views.map((view) => (
            <TabsTrigger key={view} value={view}>
              {view}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="preview">
          <PreviewPanel
            build={build}
            title={session.summary.name}
            previewPath={session.previewPath}
            lastBuildAt={session.summary.lastBuildAt}
            previewHtml={previewHtml}
          />
        </TabsContent>
        <TabsContent value="source">
          <Suspense
            fallback={
              <section className="workbench-card">
                <div className="workbench-card-header">
                  <div>
                    <p className="eyebrow">Source</p>
                    <h3>Loading editor</h3>
                  </div>
                </div>
                <p className="validation-empty">
                  Preparing the CodeMirror editor for this session.
                </p>
              </section>
            }
          >
            <SourcePanel
              activeSourceFocus={activeSourceFocus}
              activeSourceFocusReviewStatus={activeSourceFocusReviewStatus}
              canRevealSourceOrigin={canRevealSourceOrigin}
              draftSource={draftSource}
              isSaving={isSavingSource}
              sourceValidation={sourceValidation}
              onClearSourceFocus={onClearSourceFocus}
              onDraftChange={onDraftSourceChange}
              onOpenSourceFocus={onOpenSourceFocus}
              onRefreshSourceFocus={onRefreshSourceFocus}
              onRevealReviewTarget={onRevealSourceReviewTarget}
              onSave={onSaveSource}
              source={session.source}
              sourcePath={session.sourcePath}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="inspect">
          <InspectPanel
            activeReviewFocus={activeReviewFocus}
            activeSourceFocus={activeSourceFocus}
            activeSourceFocusReviewStatus={activeSourceFocusReviewStatus}
            availableReviewFocusTargets={availableReviewFocusTargets}
            build={build}
            canRevealSourceOrigin={canRevealSourceOrigin}
            draftComparison={draftComparison}
            hasUnsavedSourceChanges={hasUnsavedSourceChanges}
            inspect={inspect}
            isActionBusy={isActionBusy}
            logs={logs}
            messages={messages}
            sourceValidation={sourceValidation}
            onClearReviewFocus={onClearReviewFocus}
            onOpenSourceFocus={onOpenSourceFocus}
            onRefreshSourceFocus={onRefreshSourceFocus}
            onRevealSourceReviewTarget={onRevealSourceReviewTarget}
            onRevisitReviewFocus={onRevisitReviewFocus}
            onRunReviewAction={onRunReviewAction}
            onSelectReviewFocus={onSelectReviewFocus}
            proposalComparison={proposalComparison}
            session={session}
          />
        </TabsContent>
      </Tabs>
    </PanelShell>
  )
}
