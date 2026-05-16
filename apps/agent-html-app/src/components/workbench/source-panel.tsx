import type {
  SourceFocusReviewStatus,
  SourceFocusTarget,
} from "../../lib/source-focus"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
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

  return (
    <SurfaceCard variant="workbench">
      <SurfaceCardHeader eyebrow="Source" title="source.agent.html">
        <div className="header-actions">
          {hasUnsavedChanges ? (
            <Badge variant="destructive">Unsaved changes</Badge>
          ) : null}
          <span className="inline-meta">{sourcePath}</span>
          <Button
            disabled={isSaving || draftSource === source}
            onClick={() => onSave(draftSource)}
            size="sm"
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </SurfaceCardHeader>
      <SurfaceCardBody className="grid gap-4 px-[18px] pb-[18px]">
        <SurfaceCard variant="validation">
          <SurfaceCardHeader
            className="validation-topline"
            eyebrow="Validation"
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
              {sourceValidationView.primaryAction === "focus-first-issue" &&
              primaryValidationDiagnostic ? (
                <Button
                  onClick={() => {
                    const target = createSourceFocusTargetFromDiagnostic({
                      diagnostic: primaryValidationDiagnostic,
                    })
                    if (target) {
                      onOpenSourceFocus(target)
                    }
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Focus first issue
                </Button>
              ) : null}
            </div>
          </SurfaceCardHeader>
          <SurfaceCardBody className="grid gap-3 px-[16px] pb-[16px]">
            <p className="validation-summary">{sourceValidationView.summary}</p>
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
                  <li
                    className={`diagnostic-item severity-${diagnostic.severity}`}
                    key={diagnostic.id}
                  >
                    <div className="message-topline">
                      <strong>{diagnostic.severity.toUpperCase()}</strong>
                      {typeof diagnostic.line === "number" ? (
                        <Button
                          onClick={() => {
                            const target =
                              createSourceFocusTargetFromDiagnostic({
                                diagnostic,
                              })
                            if (target) {
                              onOpenSourceFocus(target)
                            }
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Open in Source
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
                ))}
              </ul>
            ) : (
              <p className="validation-empty">No validation diagnostics.</p>
            )}
          </SurfaceCardBody>
        </SurfaceCard>
        {activeSourceFocus ? (
          <SurfaceCard className="source-focus-banner" variant="summary">
            <div>
              <p className="eyebrow">Source focus</p>
              <h4>{sourceFocusView?.label ?? activeSourceFocus.label}</h4>
              <p className="validation-empty">
                {sourceFocusView?.selectionLabel ?? "Current selection"} is
                selected in the current draft.
              </p>
              {sourceFocusView?.originLabel ||
              sourceFocusView?.reviewOriginLabel ? (
                <div className="proposal-meta-row">
                  {sourceFocusView?.originLabel ? (
                    <StatusBadge tone="accent">
                      {sourceFocusView.originLabel}
                    </StatusBadge>
                  ) : null}
                  <StatusBadge>{sourceFocusView?.selectionLabel}</StatusBadge>
                  {sourceFocusView?.reviewOriginLabel ? (
                    <span className="inline-meta">
                      From {sourceFocusView.reviewOriginLabel}
                    </span>
                  ) : null}
                  {sourceFocusView?.originReference ? (
                    <span className="inline-meta">
                      {sourceFocusView.originReference}
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
                  <span className="inline-meta">{sourceFocusView.summary}</span>
                </div>
              ) : null}
            </div>
            <div className="source-focus-actions">
              {sourceFocusView?.actions.canRevealSourceOrigin ? (
                <Button
                  onClick={onRevealReviewTarget}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Reveal source origin
                </Button>
              ) : null}
              {sourceFocusView?.actions.canRefreshFocus ? (
                <Button
                  onClick={onRefreshSourceFocus}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Refresh focus
                </Button>
              ) : null}
              <Button
                onClick={onClearSourceFocus}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear focus
              </Button>
            </div>
          </SurfaceCard>
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
