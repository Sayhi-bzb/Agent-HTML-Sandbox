import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "@/components/ui/surface-card"
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
  const isShowingStalePreview =
    build.status === "failed" && Boolean(previewHtml)
  const previewStatusLabel = previewHtml
    ? isShowingStalePreview
      ? "Stale preview"
      : build.status === "succeeded"
        ? "Latest build ready"
        : "Preview loaded"
    : "Preview unavailable"

  return (
    <SurfaceCard className="preview-panel" variant="workbench">
      <SurfaceCardHeader eyebrow="Preview" title={title}>
        <span className="inline-meta">
          {lastBuildAt
            ? `Last build ${formatTimestampLabel(lastBuildAt)}`
            : "No successful build yet"}
        </span>
      </SurfaceCardHeader>

      <SurfaceCardBody className="grid gap-[18px] px-[18px] pb-[18px]">
        <div className="preview-surface">
          {previewHtml ? (
            <>
              {isShowingStalePreview ? (
                <Alert className="artifact-alert">
                  <AlertTitle>Latest build failed</AlertTitle>
                  <AlertDescription>
                    This panel is still showing the last successful artifact.
                  </AlertDescription>
                </Alert>
              ) : null}
              <iframe
                className="preview-frame"
                srcDoc={previewHtml}
                title={`${title} preview`}
              />
            </>
          ) : (
            <div className="artifact-sheet">
              <Alert className="artifact-alert">
                <AlertTitle>Preview unavailable</AlertTitle>
                <AlertDescription>
                  {lastBuildAt
                    ? "Preview metadata exists, but the rendered HTML is unavailable. Rebuild this session to refresh the artifact."
                    : "Build this session to generate a live artifact preview."}
                </AlertDescription>
              </Alert>
              <SurfaceCard variant="artifact">
                <SurfaceCardHeader title="Preview surface" />
                <SurfaceCardBody className="px-4 pb-4">
                  <p>
                    {lastBuildAt
                      ? "The session has build history, but the preview payload could not be loaded into the workbench."
                      : "The workbench is ready. Once a build succeeds, this panel will render the generated HTML artifact."}
                  </p>
                </SurfaceCardBody>
              </SurfaceCard>
            </div>
          )}
        </div>

        <div className="preview-footer">
          <StatusBadge
            tone={previewStatusTone(build.status, Boolean(previewHtml))}
          >
            {previewStatusLabel}
          </StatusBadge>
          <span className="inline-meta">
            {previewPath ?? "Preview path unavailable"}
          </span>
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  )
}

function previewStatusTone(
  status: BuildRunSummary["status"],
  hasPreview: boolean,
): "default" | "ready" | "dirty" | "error" {
  if (!hasPreview) {
    return "error"
  }

  if (status === "failed") {
    return hasPreview ? "dirty" : "error"
  }

  if (status === "succeeded") {
    return "ready"
  }

  return "default"
}
