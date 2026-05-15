import type { BuildRunSummary } from "../../lib/types"
import { formatTimestampLabel } from "../../lib/time"

type PreviewPanelProps = {
  title: string
  build: BuildRunSummary
  previewPath?: string
  lastBuildAt?: string
  previewHtml?: string
}

export function PreviewPanel({
  title,
  build,
  previewPath,
  lastBuildAt,
  previewHtml,
}: PreviewPanelProps) {
  const isShowingStalePreview = build.status === "failed" && Boolean(previewHtml)
  const previewStatusLabel = previewHtml
    ? isShowingStalePreview
      ? "Stale preview"
      : build.status === "succeeded"
        ? "Latest build ready"
        : "Preview loaded"
    : "Preview unavailable"

  return (
    <section className="workbench-card preview-panel">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Preview</p>
          <h3>{title}</h3>
        </div>
        <span className="inline-meta">
          {lastBuildAt ? `Last build ${formatTimestampLabel(lastBuildAt)}` : "No successful build yet"}
        </span>
      </div>

      <div className="preview-surface">
        {previewHtml ? (
          <>
            {isShowingStalePreview ? (
              <div className="artifact-alert">
                Latest build failed. This panel is still showing the last successful artifact.
              </div>
            ) : null}
            <iframe className="preview-frame" srcDoc={previewHtml} title={`${title} preview`} />
          </>
        ) : (
          <div className="artifact-sheet">
            <div className="artifact-alert">
              {lastBuildAt
                ? "Preview metadata exists, but the rendered HTML is unavailable. Rebuild this session to refresh the artifact."
                : "Build this session to generate a live artifact preview."}
            </div>
            <div className="artifact-card">
              <h4>Preview surface</h4>
              <p>
                {lastBuildAt
                  ? "The session has build history, but the preview payload could not be loaded into the workbench."
                  : "The workbench is ready. Once a build succeeds, this panel will render the generated HTML artifact."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="preview-footer">
        <span className={previewStatusClassName(build.status, Boolean(previewHtml))}>
          {previewStatusLabel}
        </span>
        <span className="inline-meta">{previewPath ?? "Preview path unavailable"}</span>
      </div>
    </section>
  )
}

function previewStatusClassName(status: BuildRunSummary["status"], hasPreview: boolean) {
  if (!hasPreview) {
    return "pill status-error"
  }

  if (status === "failed") {
    return hasPreview ? "pill status-dirty" : "pill status-error"
  }

  if (status === "succeeded") {
    return "pill status-ready"
  }

  return "pill"
}
