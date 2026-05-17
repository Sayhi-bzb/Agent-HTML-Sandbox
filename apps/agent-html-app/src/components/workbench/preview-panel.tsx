import { useState } from "react"

import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "@/components/ui/surface-card"
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group"
import type { BuildRunSummary } from "../../lib/types"
import { getPreviewHeaderMeta } from "../../lib/preview-state"
import { copyText } from "../../lib/utils"

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
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "focus">(
    "desktop",
  )
  const [copiedKey, setCopiedKey] = useState<string>()
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
        <div className="preview-header-actions">
          <span className="inline-meta">
            {getPreviewHeaderMeta(build, lastBuildAt)}
          </span>
          <ToggleGroup
            aria-label="Preview viewport"
            className="preview-viewport-toggle"
            onValueChange={(value) => {
              if (
                value === "desktop" ||
                value === "tablet" ||
                value === "focus"
              ) {
                setViewport(value)
              }
            }}
            type="single"
            value={viewport}
            variant="outline"
          >
            <ToggleGroupItem size="sm" value="desktop">
              Desktop
            </ToggleGroupItem>
            <ToggleGroupItem size="sm" value="tablet">
              Tablet
            </ToggleGroupItem>
            <ToggleGroupItem size="sm" value="focus">
              Focus
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </SurfaceCardHeader>

      <SurfaceCardBody className="preview-panel-body">
        <div className="preview-surface">
          {previewHtml ? (
            <div
              className={`preview-frame-shell preview-frame-shell-${viewport}`}
            >
              <iframe
                className="preview-frame"
                srcDoc={previewHtml}
                title={`${title} preview`}
              />
            </div>
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

        <SurfaceCard className="preview-provenance-card" variant="summary">
          <SurfaceCardHeader padding="compact" title="Artifact record" />
          <SurfaceCardBody className="grid gap-3" padding="compact">
            <dl className="key-value-grid compact">
              <dt>Status</dt>
              <dd>{build.status}</dd>
              <dt>Run</dt>
              <dd>{build.runId}</dd>
              <dt>Exit</dt>
              <dd>
                {typeof build.exitCode === "number" ? build.exitCode : "n/a"}
              </dd>
              <dt>Artifact</dt>
              <dd>{previewPath ?? "missing"}</dd>
            </dl>
            <div className="preview-provenance-actions">
              <Button
                disabled={!previewPath}
                onClick={() => {
                  void copyText(previewPath).then((copied) => {
                    if (copied) {
                      setCopiedKey("preview-path")
                    }
                  })
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {copiedKey === "preview-path" ? "Copied" : "Copy artifact path"}
              </Button>
              <Button
                disabled={!build.stdoutPath}
                onClick={() => {
                  void copyText(build.stdoutPath).then((copied) => {
                    if (copied) {
                      setCopiedKey("stdout-path")
                    }
                  })
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {copiedKey === "stdout-path" ? "Copied" : "Copy stdout path"}
              </Button>
            </div>
          </SurfaceCardBody>
        </SurfaceCard>
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
