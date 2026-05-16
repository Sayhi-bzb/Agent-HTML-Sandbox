import { useEffect, useRef } from "react"

import type {
  SourceFocusReviewStatus,
  SourceFocusTarget,
} from "../../lib/source-focus"
import {
  createSourceFocusTargetFromDiagnostic,
  getSourceSelectionRange,
  type SourceFocusPrimaryAction,
} from "../../lib/source-focus"
import { getSourceFocusViewModel } from "../../lib/source-focus-view"
import type { SourceValidationState } from "../../lib/types"
import {
  formatSourceValidationDiagnosticMeta,
  getSourceValidationViewModel,
} from "../../lib/source-validation-view"
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const sourceFocusView = getSourceFocusViewModel({
    sourceFocus: activeSourceFocus,
    reviewStatus: activeSourceFocusReviewStatus,
    canRevealSourceOrigin,
  })
  const sourceValidationView = getSourceValidationViewModel(sourceValidation)
  const primaryValidationDiagnostic = sourceValidationView.primaryDiagnostic

  useEffect(() => {
    if (!activeSourceFocus || !textareaRef.current) {
      return
    }

    const textarea = textareaRef.current
    const selection = getSourceSelectionRange(draftSource, activeSourceFocus)
    const lineHeight =
      Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 20

    textarea.focus()
    textarea.setSelectionRange(selection.selectionStart, selection.selectionEnd)
    textarea.scrollTop = Math.max(selection.startLine - 2, 0) * lineHeight
  }, [activeSourceFocus?.requestKey, draftSource])

  const hasUnsavedChanges = draftSource !== source

  return (
    <section className="workbench-card">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Source</p>
          <h3>source.agent.html</h3>
        </div>
        <div className="header-actions">
          {hasUnsavedChanges ? (
            <span className="pill status-dirty">Unsaved changes</span>
          ) : null}
          <span className="inline-meta">{sourcePath}</span>
          <button
            className="primary-button"
            disabled={isSaving || draftSource === source}
            onClick={() => onSave(draftSource)}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <section className="validation-card">
        <div className="validation-topline">
          <div>
            <p className="eyebrow">Validation</p>
            <h4>{sourceValidationView.headline}</h4>
          </div>
          <div className="validation-topline-actions">
            <span className={`pill ${sourceValidationView.pill.className}`}>
              {sourceValidationView.pill.label}
            </span>
            {sourceValidationView.primaryAction === "focus-first-issue" &&
            primaryValidationDiagnostic ? (
              <button
                className="mini-button"
                onClick={() => {
                  const target = createSourceFocusTargetFromDiagnostic({
                    diagnostic: primaryValidationDiagnostic,
                  })
                  if (target) {
                    onOpenSourceFocus(target)
                  }
                }}
                type="button"
              >
                Focus first issue
              </button>
            ) : null}
          </div>
        </div>
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
                    <button
                      className="mini-button"
                      onClick={() => {
                        const target = createSourceFocusTargetFromDiagnostic({
                          diagnostic,
                        })
                        if (target) {
                          onOpenSourceFocus(target)
                        }
                      }}
                      type="button"
                    >
                      Open in Source
                    </button>
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
      </section>
      {activeSourceFocus ? (
        <div className="source-focus-banner">
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
                  <span className="pill accent">
                    {sourceFocusView.originLabel}
                  </span>
                ) : null}
                <span className="pill">{sourceFocusView?.selectionLabel}</span>
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
                  <span
                    className={`pill ${sourceFocusView.statusPill.className}`}
                  >
                    {sourceFocusView.statusPill.label}
                  </span>
                ) : null}
                <span className="inline-meta">{sourceFocusView.summary}</span>
              </div>
            ) : null}
          </div>
          <div className="source-focus-actions">
            {sourceFocusView?.actions.canRevealSourceOrigin ? (
              <button
                className="mini-button"
                onClick={onRevealReviewTarget}
                type="button"
              >
                Reveal source origin
              </button>
            ) : null}
            {sourceFocusView?.actions.canRefreshFocus ? (
              <button
                className="mini-button"
                onClick={onRefreshSourceFocus}
                type="button"
              >
                Refresh focus
              </button>
            ) : null}
            <button
              className="mini-button"
              onClick={onClearSourceFocus}
              type="button"
            >
              Clear focus
            </button>
          </div>
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        className="source-editor"
        onChange={(event) => onDraftChange(event.target.value)}
        spellCheck={false}
        value={draftSource}
      />
    </section>
  )
}
