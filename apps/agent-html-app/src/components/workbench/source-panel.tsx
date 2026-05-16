import { useEffect, useRef, useState } from "react"

import type {
  SourceFocusReviewStatus,
  SourceFocusTarget,
} from "../../lib/source-focus"
import {
  getSourceFocusLineLabel,
  getSourceFocusStatusPill,
  getSourceSelectionRange,
} from "../../lib/source-focus"
import type { DiagnosticItem, SourceValidationSnapshot } from "../../lib/types"
import { formatTimestampLabel } from "../../lib/time"

type SourcePanelProps = {
  source: string
  draftSource: string
  sourcePath: string
  activeSourceFocus?: SourceFocusTarget
  activeSourceFocusReviewStatus?: SourceFocusReviewStatus
  onDraftChange: (nextSource: string) => void
  onClearSourceFocus: () => void
  onRefreshSourceFocus: () => void
  onRevealReviewTarget: () => void
  onSave: (nextSource: string) => Promise<void> | void
  onValidate: (nextSource: string) => Promise<SourceValidationSnapshot>
  isSaving: boolean
}

type ValidationState = {
  status: "idle" | "running" | "valid" | "invalid"
  validatedAt?: string
  diagnostics: DiagnosticItem[]
  structureSummary?: string
}

const initialValidationState: ValidationState = {
  status: "idle",
  diagnostics: [],
}

export function SourcePanel({
  source,
  draftSource,
  sourcePath,
  activeSourceFocus,
  activeSourceFocusReviewStatus,
  onDraftChange,
  onClearSourceFocus,
  onRefreshSourceFocus,
  onRevealReviewTarget,
  onSave,
  onValidate,
  isSaving,
}: SourcePanelProps) {
  const [validation, setValidation] = useState<ValidationState>(
    initialValidationState,
  )
  const validationRequestId = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const sourceFocusStatusPill = getSourceFocusStatusPill(
    activeSourceFocusReviewStatus,
  )

  useEffect(() => {
    setValidation(initialValidationState)
  }, [source, sourcePath])

  useEffect(() => {
    const requestId = validationRequestId.current + 1
    validationRequestId.current = requestId
    let cancelled = false

    const timeout = window.setTimeout(() => {
      setValidation((current) => ({
        ...current,
        status: "running",
      }))

      void onValidate(draftSource)
        .then((result) => {
          if (cancelled || validationRequestId.current !== requestId) {
            return
          }

          setValidation({
            status: result.status,
            validatedAt: result.validatedAt,
            diagnostics: result.diagnostics,
            structureSummary: result.structureSummary,
          })
        })
        .catch((error: unknown) => {
          if (cancelled || validationRequestId.current !== requestId) {
            return
          }

          setValidation({
            status: "invalid",
            validatedAt: new Date().toISOString(),
            diagnostics: [
              {
                id: `validation-error-${requestId}`,
                severity: "error",
                message: formatValidationError(error),
                source: "validation",
              },
            ],
            structureSummary: "Validation could not complete.",
          })
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [draftSource, onValidate, sourcePath])

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
            <h4>{validationHeadline(validation.status)}</h4>
          </div>
          <span className={validationPillClassName(validation.status)}>
            {validationPillLabel(validation.status)}
          </span>
        </div>
        <p className="validation-summary">
          {validation.status === "idle"
            ? "Lightweight validation will run automatically after you pause typing."
            : (validation.structureSummary ??
              "Validation summary unavailable.")}
        </p>
        <div className="validation-meta">
          <span className="inline-meta">
            {validation.validatedAt
              ? `Last checked ${formatTimestampLabel(validation.validatedAt)}`
              : "No validation run yet"}
          </span>
          <span className="inline-meta">
            {validation.diagnostics.length} diagnostic(s)
          </span>
        </div>
        {validation.diagnostics.length > 0 ? (
          <ul className="diagnostic-list">
            {validation.diagnostics.map((diagnostic) => (
              <li
                className={`diagnostic-item severity-${diagnostic.severity}`}
                key={diagnostic.id}
              >
                <strong>{diagnostic.severity.toUpperCase()}</strong>
                <span>{diagnostic.message}</span>
                {diagnostic.code || diagnostic.source ? (
                  <span className="inline-meta">
                    {[diagnostic.code, diagnostic.source]
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
            <h4>{activeSourceFocus.label}</h4>
            <p className="validation-empty">
              {getSourceFocusLineLabel(activeSourceFocus)} is selected in the
              current draft.
            </p>
            {activeSourceFocus.reviewOrigin ? (
              <div className="proposal-meta-row">
                <span className="pill accent">
                  {activeSourceFocus.reviewOrigin.mode === "proposal"
                    ? "Proposal compare"
                    : "Saved compare"}
                </span>
                <span className="pill">
                  {activeSourceFocus.reviewOrigin.lineLabel}
                </span>
                <span className="inline-meta">
                  From {activeSourceFocus.reviewOrigin.label}
                </span>
              </div>
            ) : null}
            {activeSourceFocusReviewStatus ? (
              <div className="proposal-meta-row">
                {sourceFocusStatusPill ? (
                  <span className={`pill ${sourceFocusStatusPill.className}`}>
                    {sourceFocusStatusPill.label}
                  </span>
                ) : null}
                <span className="inline-meta">
                  {activeSourceFocusReviewStatus.summary}
                </span>
              </div>
            ) : null}
          </div>
          <div className="source-focus-actions">
            {activeSourceFocusReviewStatus?.currentReviewTarget ? (
              <button
                className="mini-button"
                onClick={onRevealReviewTarget}
                type="button"
              >
                Reveal review target
              </button>
            ) : null}
            {activeSourceFocusReviewStatus?.kind === "moved" ? (
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

function validationHeadline(status: ValidationState["status"]) {
  switch (status) {
    case "running":
      return "Analyzing draft"
    case "valid":
      return "Draft is structurally valid"
    case "invalid":
      return "Draft needs attention"
    default:
      return "Validation is standing by"
  }
}

function validationPillClassName(status: ValidationState["status"]) {
  switch (status) {
    case "running":
      return "pill status-building"
    case "valid":
      return "pill status-ready"
    case "invalid":
      return "pill status-error"
    default:
      return "pill"
  }
}

function validationPillLabel(status: ValidationState["status"]) {
  switch (status) {
    case "running":
      return "Validating"
    case "valid":
      return "Valid"
    case "invalid":
      return "Invalid"
    default:
      return "Idle"
  }
}

function formatValidationError(error: unknown) {
  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return "Validation command failed."
}
