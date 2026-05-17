import { useRef, useState } from "react"
import { MoreHorizontalIcon } from "lucide-react"

import type {
  SourceFocusReviewStatus,
  SourceFocusTarget,
} from "../../lib/source-focus"
import { Button } from "../ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "../ui/surface-card"
import { StatusBadge } from "../ui/status-badge"
import {
  createSourceFocusTargetFromDiagnostic,
  getSourceSelectionRange,
} from "../../lib/source-focus"
import { getSourceFocusViewModel } from "../../lib/source-focus-view"
import { SourceEditor } from "../ui/source-editor"
import type { SourceValidationState } from "../../lib/types"
import { getSourceValidationViewModel } from "../../lib/source-validation-view"
import { formatTimestampLabel } from "../../lib/time"
import { copyText } from "../../lib/utils"

type SourcePanelProps = {
  source: string
  draftSource: string
  sourcePath: string
  sourceValidation: SourceValidationState
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  canRevealSourceOrigin: boolean
  onOpenSourceFocus: (target: SourceFocusTarget) => void
  onDraftChange: (nextSource: string) => void
  onClearSourceFocus: () => void
  onRefreshSourceFocus: () => void
  onRevealReviewTarget: () => void
  onSave: (nextSource: string) => Promise<void> | void
  isSaving: boolean
}

export function SourcePanel({
  source,
  draftSource,
  sourcePath,
  sourceValidation,
  activeSourceFocus,
  activeSourceFocusReviewStatus,
  canRevealSourceOrigin,
  onOpenSourceFocus,
  onDraftChange,
  onClearSourceFocus,
  onRefreshSourceFocus,
  onRevealReviewTarget,
  onSave,
  isSaving,
}: SourcePanelProps) {
  const [copiedKey, setCopiedKey] = useState<string>()
  const toolbarMenuRef = useRef<HTMLDivElement>(null)
  const validationMenuRef = useRef<HTMLDivElement>(null)
  const focusMenuRef = useRef<HTMLDivElement>(null)
  const sourceFocusView = getSourceFocusViewModel({
    sourceFocus: activeSourceFocus,
    reviewStatus: activeSourceFocusReviewStatus,
    canRevealSourceOrigin,
  })
  const sourceValidationView = getSourceValidationViewModel(sourceValidation)
  const primaryValidationDiagnostic = sourceValidationView.primaryDiagnostic
  const hasUnsavedChanges = draftSource !== source
  const sourceFocusSelection = activeSourceFocus
    ? {
        requestKey: activeSourceFocus.requestKey,
        ...getSourceSelectionRange(draftSource, activeSourceFocus),
      }
    : undefined
  const primaryFocusAction = sourceFocusView?.actions.canRevealSourceOrigin
    ? {
        label: "Origin",
        onSelect: onRevealReviewTarget,
      }
    : sourceFocusView?.actions.canRefreshFocus
      ? {
          label: "Refresh",
          onSelect: onRefreshSourceFocus,
        }
      : undefined

  return (
    <SurfaceCard className="source-panel" variant="workbench">
      <SurfaceCardBody className="source-panel-body">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="source-toolbar panel-menu-shell"
              ref={toolbarMenuRef}
            >
              <div className="header-actions">
                {hasUnsavedChanges ? (
                  <StatusBadge tone="dirty">Unsaved</StatusBadge>
                ) : (
                  <StatusBadge>Saved</StatusBadge>
                )}
              </div>
              <div className="source-toolbar-actions">
                <Button
                  aria-label="Source file actions"
                  className="panel-card-more"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    openSourceContextMenu(toolbarMenuRef.current)
                  }}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <MoreHorizontalIcon />
                </Button>
                <Button
                  disabled={isSaving || draftSource === source}
                  onClick={() => onSave(draftSource)}
                  size="sm"
                  type="button"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="session-context-menu" sideOffset={10}>
            <ContextMenuGroup>
              <ContextMenuItem
                onSelect={() => {
                  void copyText(sourcePath).then((copied) => {
                    if (copied) {
                      setCopiedKey("source-path")
                    }
                  })
                }}
              >
                {copiedKey === "source-path"
                  ? "Copied source path"
                  : "Copy source path"}
              </ContextMenuItem>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuItem className="session-context-detail" disabled>
              <span className="session-context-detail-label">File</span>
              <span className="session-context-detail-value">
                source.agent.html
              </span>
            </ContextMenuItem>
            <ContextMenuItem className="session-context-detail" disabled>
              <span className="session-context-detail-label">Path</span>
              <span className="session-context-detail-value">{sourcePath}</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="panel-menu-shell" ref={validationMenuRef}>
              <SurfaceCard variant="validation">
                <SurfaceCardHeader
                  className="validation-topline"
                  eyebrow="Validation"
                  padding="compact"
                  title={sourceValidationView.headline}
                >
                  <div className="validation-topline-actions">
                    <StatusBadge
                      tone={statusToneForClassName(
                        sourceValidationView.pill.className,
                      )}
                    >
                      {sourceValidationView.pill.label}
                    </StatusBadge>
                    {sourceValidationView.primaryAction ===
                      "focus-first-issue" && primaryValidationDiagnostic ? (
                      <Button
                        aria-label="Validation actions"
                        className="panel-card-more"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openSourceContextMenu(validationMenuRef.current)
                        }}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    ) : null}
                  </div>
                </SurfaceCardHeader>
                <SurfaceCardBody className="grid gap-3" padding="compact">
                  <div className="validation-meta">
                    <span className="inline-meta">
                      {sourceValidationView.validatedAt
                        ? `Last checked ${formatTimestampLabel(sourceValidationView.validatedAt)}`
                        : "No validation run yet"}
                    </span>
                    <span className="inline-meta">
                      {sourceValidationView.diagnosticsCount} diagnostic(s)
                    </span>
                  </div>
                  {sourceValidation.diagnostics.length > 0 ? (
                    <ul className="diagnostic-list">
                      {sourceValidation.diagnostics.map((diagnostic) => (
                        <SourceDiagnosticRow
                          diagnostic={diagnostic}
                          key={diagnostic.id}
                          onOpenSourceFocus={onOpenSourceFocus}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="validation-empty">Clear</p>
                  )}
                </SurfaceCardBody>
              </SurfaceCard>
            </div>
          </ContextMenuTrigger>
          {sourceValidationView.primaryAction === "focus-first-issue" &&
          primaryValidationDiagnostic ? (
            <ContextMenuContent
              className="session-context-menu"
              sideOffset={10}
            >
              <ContextMenuGroup>
                <ContextMenuItem
                  onSelect={() => {
                    const target = createSourceFocusTargetFromDiagnostic({
                      diagnostic: primaryValidationDiagnostic,
                    })
                    if (target) {
                      onOpenSourceFocus(target)
                    }
                  }}
                >
                  Focus first issue
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuContent>
          ) : null}
        </ContextMenu>

        {activeSourceFocus ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="panel-menu-shell" ref={focusMenuRef}>
                <SurfaceCard className="source-focus-banner" variant="inset">
                  <SurfaceCardBody
                    className="source-focus-banner-body"
                    padding="compact"
                  >
                    <div>
                      <h4>
                        {sourceFocusView?.label ?? activeSourceFocus.label}
                      </h4>
                      {sourceFocusView?.originLabel ||
                      sourceFocusView?.reviewOriginLabel ? (
                        <div className="proposal-meta-row">
                          {sourceFocusView?.originLabel ? (
                            <StatusBadge tone="accent">
                              {sourceFocusView.originLabel}
                            </StatusBadge>
                          ) : null}
                          <StatusBadge>
                            {sourceFocusView?.selectionLabel}
                          </StatusBadge>
                          {sourceFocusView?.reviewOriginLabel ? (
                            <span className="inline-meta">
                              From {sourceFocusView.reviewOriginLabel}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {sourceFocusView?.summary ? (
                        <div className="proposal-meta-row">
                          {sourceFocusView.statusPill ? (
                            <StatusBadge
                              tone={statusToneForClassName(
                                sourceFocusView.statusPill.className,
                              )}
                            >
                              {sourceFocusView.statusPill.label}
                            </StatusBadge>
                          ) : null}
                          <span className="inline-meta">
                            {sourceFocusView.summary}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="source-focus-actions">
                      {primaryFocusAction ? (
                        <Button
                          onClick={primaryFocusAction.onSelect}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {primaryFocusAction.label}
                        </Button>
                      ) : null}
                      <Button
                        aria-label="Source focus actions"
                        className="panel-card-more"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openSourceContextMenu(focusMenuRef.current)
                        }}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </div>
                  </SurfaceCardBody>
                </SurfaceCard>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent
              className="session-context-menu"
              sideOffset={10}
            >
              <ContextMenuGroup>
                {sourceFocusView?.actions.canRevealSourceOrigin &&
                primaryFocusAction?.label !== "Origin" ? (
                  <ContextMenuItem onSelect={onRevealReviewTarget}>
                    Origin
                  </ContextMenuItem>
                ) : null}
                {sourceFocusView?.actions.canRefreshFocus &&
                primaryFocusAction?.label !== "Refresh" ? (
                  <ContextMenuItem onSelect={onRefreshSourceFocus}>
                    Refresh
                  </ContextMenuItem>
                ) : null}
                <ContextMenuItem onSelect={onClearSourceFocus}>
                  Clear
                </ContextMenuItem>
              </ContextMenuGroup>
              {sourceFocusView?.originReference ? (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="session-context-detail" disabled>
                    <span className="session-context-detail-label">
                      Reference
                    </span>
                    <span className="session-context-detail-value">
                      {sourceFocusView.originReference}
                    </span>
                  </ContextMenuItem>
                </>
              ) : null}
            </ContextMenuContent>
          </ContextMenu>
        ) : null}

        <SourceEditor
          focusSelection={sourceFocusSelection}
          onChange={onDraftChange}
          value={draftSource}
        />
      </SurfaceCardBody>
    </SurfaceCard>
  )
}

function statusToneForClassName(
  className?: string,
): "default" | "accent" | "ready" | "dirty" | "error" | "building" {
  switch (className) {
    case "status-ready":
      return "ready"
    case "status-dirty":
      return "dirty"
    case "status-error":
      return "error"
    case "status-building":
      return "building"
    case "accent":
      return "accent"
    default:
      return "default"
  }
}

function SourceDiagnosticRow({
  diagnostic,
  onOpenSourceFocus,
}: {
  diagnostic: SourceValidationState["diagnostics"][number]
  onOpenSourceFocus: (target: SourceFocusTarget) => void
}) {
  const triggerRef = useRef<HTMLLIElement>(null)
  const sourceTarget = createSourceFocusTargetFromDiagnostic({ diagnostic })

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <li
          className={`diagnostic-item diagnostic-item-compact severity-${diagnostic.severity}`}
          ref={triggerRef}
        >
          <div className="message-topline">
            <strong>{diagnostic.severity.toUpperCase()}</strong>
            {sourceTarget ? (
              <Button
                aria-label={`${diagnostic.severity} diagnostic actions`}
                className="panel-card-more"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openSourceContextMenu(triggerRef.current)
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <MoreHorizontalIcon />
              </Button>
            ) : null}
          </div>
          <span>{diagnostic.message}</span>
          {diagnostic.code ||
          diagnostic.source ||
          typeof diagnostic.line === "number" ? (
            <span className="inline-meta">
              {[
                typeof diagnostic.line === "number"
                  ? `line ${diagnostic.line}${
                      typeof diagnostic.column === "number"
                        ? `:${diagnostic.column}`
                        : ""
                    }`
                  : undefined,
                diagnostic.code,
                diagnostic.source,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </li>
      </ContextMenuTrigger>
      {sourceTarget ? (
        <ContextMenuContent className="session-context-menu" sideOffset={10}>
          <ContextMenuGroup>
            <ContextMenuItem onSelect={() => onOpenSourceFocus(sourceTarget)}>
              Focus in Source
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  )
}

function openSourceContextMenu(element: HTMLElement | null) {
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
