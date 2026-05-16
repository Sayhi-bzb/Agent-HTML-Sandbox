import type { BuildRunSummary, SessionSummary } from "./types"
import { formatTimestampLabel } from "./time"

export function getPreviewHeaderMeta(
  build: BuildRunSummary,
  lastBuildAt?: string,
) {
  switch (build.status) {
    case "running":
      return `Build started ${formatTimestampLabel(build.startedAt)}`
    case "failed": {
      const timestamp = build.finishedAt ?? build.startedAt ?? lastBuildAt
      return timestamp
        ? `Latest attempt ${formatTimestampLabel(timestamp)}`
        : "Latest build attempt failed"
    }
    case "succeeded": {
      const timestamp = build.finishedAt ?? build.startedAt ?? lastBuildAt
      return timestamp
        ? `Last build ${formatTimestampLabel(timestamp)}`
        : "Latest build ready"
    }
    default:
      return lastBuildAt
        ? `Last build ${formatTimestampLabel(lastBuildAt)}`
        : "No successful build yet"
  }
}

export function getSessionPreviewStatusText(session: SessionSummary) {
  if (session.status === "building") {
    return "Build running"
  }

  if (session.hasPreview) {
    return session.status === "error" ? "Stale preview" : "Has preview"
  }

  if (session.status === "error" || session.lastBuildAt) {
    return "Preview missing"
  }

  return "No build yet"
}
