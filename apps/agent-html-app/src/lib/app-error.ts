import type { AppError } from "./types"

export function formatAppError(error: unknown) {
  if (typeof error === "string") {
    return error
  }

  const value = error as Partial<AppError> & { message?: string }
  const message =
    typeof value.message === "string" && value.message.length > 0
      ? value.message
      : "Unknown command failure."
  const metadata = [
    typeof value.sessionId === "string" && value.sessionId.length > 0
      ? `session ${value.sessionId}`
      : undefined,
    typeof value.runId === "string" && value.runId.length > 0
      ? `run ${value.runId}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ")

  const suffix = [
    metadata || undefined,
    typeof value.details === "string" && value.details.length > 0
      ? value.details
      : undefined,
  ]
    .filter(Boolean)
    .join(" | ")

  return suffix ? `${message} (${suffix})` : message
}
