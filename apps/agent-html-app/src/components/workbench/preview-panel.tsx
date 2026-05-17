import { StatusBadge } from "@/components/ui/status-badge"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "@/components/ui/surface-card"
import type { BuildRunSummary } from "../../lib/types"
import { getPreviewHeaderMeta } from "../../lib/preview-state"

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
      ? "Stale"
      : build.status === "succeeded"
        ? "Ready"
        : "Loaded"
    : "Empty"

  return (
    <SurfaceCard className="preview-panel" variant="workbench">
      <SurfaceCardHeader title="Preview">
        <span className="inline-meta">
          {getPreviewHeaderMeta(build, lastBuildAt)}
        </span>
      </SurfaceCardHeader>

      <SurfaceCardBody className="preview-panel-body">
        <div className="preview-surface">
          {previewHtml ? (
            <iframe
              className="preview-frame"
              srcDoc={previewHtml}
              title={`${title} preview`}
            />
          ) : (
            <div className="artifact-sheet preview-empty-state">
              <StatusBadge>No preview</StatusBadge>
              {lastBuildAt ? (
                <span className="inline-meta">Build output missing</span>
              ) : null}
            </div>
          )}
        </div>

        <div className="preview-footer">
          <StatusBadge
            tone={previewStatusTone(build.status, Boolean(previewHtml))}
          >
            {previewStatusLabel}
          </StatusBadge>
          <span className="inline-meta">{previewPath ?? "No artifact"}</span>
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
