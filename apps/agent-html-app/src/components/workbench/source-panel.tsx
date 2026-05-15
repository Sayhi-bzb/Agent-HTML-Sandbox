import { useEffect, useRef, useState } from "react"

import type { DiagnosticItem, SourceValidationSnapshot } from "../../lib/types"
import { formatTimestampLabel } from "../../lib/time"

type SourcePanelProps = {
  source: string
  draftSource: string
  sourcePath: string
  onDraftChange: (nextSource: string) => void
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
  onDraftChange,
  onSave,
  onValidate,
  isSaving,
}: SourcePanelProps) {
  const [validation, setValidation] = useState<ValidationState>(initialValidationState)
  const validationRequestId = useRef(0)

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

  const hasUnsavedChanges = draftSource !== source

  return (
    <section className="workbench-card">
      <div className="workbench-card-header">
        <div>
          <p className="eyebrow">Source</p>
          <h3>source.agent.html</h3>
        </div>
        <div className="header-actions">
          {hasUnsavedChanges ? <span className="pill status-dirty">Unsaved changes</span> : null}
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
            : validation.structureSummary ?? "Validation summary unavailable."}
        </p>
        <div className="validation-meta">
          <span className="inline-meta">
            {validation.validatedAt
              ? `Last checked ${formatTimestampLabel(validation.validatedAt)}`
              : "No validation run yet"}
          </span>
          <span className="inline-meta">{validation.diagnostics.length} diagnostic(s)</span>
        </div>
        {validation.diagnostics.length > 0 ? (
          <ul className="diagnostic-list">
            {validation.diagnostics.map((diagnostic) => (
              <li className={`diagnostic-item severity-${diagnostic.severity}`} key={diagnostic.id}>
                <strong>{diagnostic.severity.toUpperCase()}</strong>
                <span>{diagnostic.message}</span>
                {diagnostic.code || diagnostic.source ? (
                  <span className="inline-meta">
                    {[diagnostic.code, diagnostic.source].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="validation-empty">No validation diagnostics.</p>
        )}
      </section>
      <textarea
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
