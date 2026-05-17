import { useRef, useState } from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { SurfaceCard, SurfaceCardBody } from "@/components/ui/surface-card"
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
  const previewMenuRef = useRef<HTMLDivElement>(null)
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="panel-menu-shell" ref={previewMenuRef}>
          <SurfaceCard className="preview-panel" variant="workbench">
            <SurfaceCardBody className="preview-panel-body">
              <div className="preview-header-actions preview-toolbar">
                <span className="inline-meta">
                  {getPreviewHeaderMeta(build, lastBuildAt)}
                </span>
                <div className="preview-toolbar-actions">
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
                  <Button
                    aria-label="Preview actions"
                    className="panel-card-more"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openPreviewContextMenu(previewMenuRef.current)
                    }}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </div>
              </div>
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
                <span className="inline-meta preview-artifact-summary">
                  {previewPath ? "Artifact ready" : "No artifact"}
                </span>
              </div>
            </SurfaceCardBody>
          </SurfaceCard>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="session-context-menu" sideOffset={10}>
        <ContextMenuGroup>
          <ContextMenuItem
            disabled={!previewPath}
            onSelect={() => {
              void copyText(previewPath).then((copied) => {
                if (copied) {
                  setCopiedKey("preview-path")
                }
              })
            }}
          >
            {copiedKey === "preview-path"
              ? "Copied artifact path"
              : "Copy artifact path"}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!build.stdoutPath}
            onSelect={() => {
              void copyText(build.stdoutPath).then((copied) => {
                if (copied) {
                  setCopiedKey("stdout-path")
                }
              })
            }}
          >
            {copiedKey === "stdout-path"
              ? "Copied stdout path"
              : "Copy stdout path"}
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuLabel>Details</ContextMenuLabel>
        <ContextMenuItem className="session-context-detail" disabled>
          <span className="session-context-detail-label">Status</span>
          <span className="session-context-detail-value">{build.status}</span>
        </ContextMenuItem>
        <ContextMenuItem className="session-context-detail" disabled>
          <span className="session-context-detail-label">Run</span>
          <span className="session-context-detail-value">{build.runId}</span>
        </ContextMenuItem>
        <ContextMenuItem className="session-context-detail" disabled>
          <span className="session-context-detail-label">Exit</span>
          <span className="session-context-detail-value">
            {typeof build.exitCode === "number" ? build.exitCode : "n/a"}
          </span>
        </ContextMenuItem>
        <ContextMenuItem className="session-context-detail" disabled>
          <span className="session-context-detail-label">Artifact</span>
          <span className="session-context-detail-value">
            {previewPath ?? "missing"}
          </span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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

function openPreviewContextMenu(element: HTMLElement | null) {
  if (!element) {
    return
  }

  const rect = element.getBoundingClientRect()
  element.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: rect.right - 12,
      clientY: rect.top + 12,
      view: window,
    }),
  )
}
