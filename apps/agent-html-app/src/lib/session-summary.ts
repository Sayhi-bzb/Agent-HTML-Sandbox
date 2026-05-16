import type { SessionSummary } from "./types"

export function sortSessionSummaries(
  sessions: readonly SessionSummary[],
): SessionSummary[] {
  return [...sessions].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1
    }

    if (left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt)
    }

    return left.name.localeCompare(right.name)
  })
}

export function upsertSessionSummary(
  sessions: readonly SessionSummary[],
  nextSummary: SessionSummary,
): SessionSummary[] {
  return sortSessionSummaries([
    ...sessions.filter((summary) => summary.id !== nextSummary.id),
    nextSummary,
  ])
}
