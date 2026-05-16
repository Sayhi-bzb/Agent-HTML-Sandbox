import type {
  BuildRunSummary,
  InspectSnapshot,
  SessionDetail,
  SessionStatus,
  WorkbenchView,
} from "./types"

export function deriveBuildSummaryFromSession(
  session: SessionDetail,
): BuildRunSummary {
  if (session.lastBuild) {
    return session.lastBuild
  }

  const hasBuildHistory =
    session.summary.hasPreview ||
    Boolean(session.summary.lastBuildAt) ||
    session.summary.status === "error" ||
    session.summary.status === "building"
  const status = session.summary.hasPreview
    ? "succeeded"
    : session.summary.status === "error"
      ? "failed"
      : session.summary.status === "building"
        ? "running"
        : "idle"

  return {
    runId: hasBuildHistory
      ? `${session.summary.id}-last-build`
      : `${session.summary.id}-idle`,
    sessionId: session.summary.id,
    startedAt: session.summary.lastBuildAt ?? session.summary.updatedAt,
    finishedAt: session.summary.lastBuildAt,
    status,
    exitCode: session.summary.hasPreview ? 0 : undefined,
    previewPath: session.previewPath,
  }
}

export function deriveInspectSnapshotFromSession(
  session: SessionDetail,
): InspectSnapshot {
  return {
    sessionId: session.summary.id,
    generatedAt: session.summary.updatedAt,
    diagnostics: [],
    structureSummary:
      "Run Inspect to refresh the session analysis for this document.",
    lastBuild:
      session.lastBuild ||
      (session.summary.hasPreview || session.summary.lastBuildAt
        ? deriveBuildSummaryFromSession(session)
        : undefined),
  }
}

export function syncInspectSnapshotWithBuild(
  inspect: InspectSnapshot,
  build: BuildRunSummary,
): InspectSnapshot {
  return {
    ...inspect,
    lastBuild: build,
  }
}

export function applyBuildResultToSession(
  session: SessionDetail,
  build: BuildRunSummary,
): SessionDetail {
  const nextView: WorkbenchView =
    build.status === "succeeded" ? "preview" : "inspect"
  const nextPreviewPath = build.previewPath ?? session.previewPath
  const nextLastBuildAt =
    getMeaningfulBuildTimestamp(build) ?? session.summary.lastBuildAt

  return {
    ...session,
    currentView: nextView,
    previewPath: nextPreviewPath,
    lastBuild: build,
    summary: {
      ...session.summary,
      updatedAt: nextLastBuildAt ?? session.summary.updatedAt,
      status: build.status === "succeeded" ? "ready" : "error",
      hasPreview: Boolean(nextPreviewPath),
      lastBuildAt: nextLastBuildAt,
    },
  }
}

export function beginBuildRun(
  session: SessionDetail,
  startedAt: string,
  runId: string,
): { session: SessionDetail; build: BuildRunSummary } {
  const build: BuildRunSummary = {
    runId,
    sessionId: session.summary.id,
    startedAt,
    status: "running",
    previewPath: session.previewPath,
  }

  return {
    session: {
      ...session,
      lastBuild: build,
      summary: {
        ...session.summary,
        updatedAt: startedAt,
        status: "building",
      },
    },
    build,
  }
}

export function applySourceSaveToSession(
  session: SessionDetail,
  source: string,
  savedAt: string,
): SessionDetail {
  return {
    ...session,
    currentView: "source",
    source,
    summary: {
      ...session.summary,
      updatedAt: savedAt,
      status: "dirty",
    },
  }
}

export function applyInspectResultToSession(
  session: SessionDetail,
  inspect: InspectSnapshot,
  build: BuildRunSummary,
): SessionDetail {
  const nextPreviewPath = build.previewPath ?? session.previewPath
  const nextLastBuildAt =
    getMeaningfulBuildTimestamp(build) ?? session.summary.lastBuildAt

  return {
    ...session,
    currentView: "inspect",
    previewPath: nextPreviewPath,
    lastBuild: hasMeaningfulBuildState(build) ? build : session.lastBuild,
    summary: {
      ...session.summary,
      updatedAt: inspect.generatedAt,
      status: getSessionStatusAfterInspect(session.summary.status, inspect, build),
      hasPreview: Boolean(nextPreviewPath),
      lastBuildAt: nextLastBuildAt,
    },
  }
}

export function applyCommandFailureToSession(
  session: SessionDetail,
  failedAt: string,
  options?: {
    nextView?: WorkbenchView
    lastBuild?: BuildRunSummary
  },
): SessionDetail {
  return {
    ...session,
    currentView: options?.nextView ?? "inspect",
    lastBuild: options?.lastBuild ?? session.lastBuild,
    summary: {
      ...session.summary,
      updatedAt: failedAt,
      status: "error",
    },
  }
}

export function applyBuildCommandFailure(
  build: BuildRunSummary,
  failedAt: string,
): BuildRunSummary {
  return {
    ...build,
    status: "failed",
    startedAt: build.startedAt || failedAt,
    finishedAt: failedAt,
    exitCode: build.exitCode,
  }
}

function getSessionStatusAfterInspect(
  currentStatus: SessionStatus,
  inspect: InspectSnapshot,
  build: BuildRunSummary,
): SessionStatus {
  if (inspect.diagnostics.length > 0) {
    return "error"
  }

  switch (build.status) {
    case "succeeded":
      return "ready"
    case "failed":
      return "error"
    case "running":
      return "building"
    default:
      return currentStatus
  }
}

function getMeaningfulBuildTimestamp(build: BuildRunSummary) {
  if (build.status === "idle") {
    return undefined
  }

  return build.finishedAt ?? build.startedAt
}

function hasMeaningfulBuildState(build: BuildRunSummary) {
  return (
    build.status !== "idle" ||
    typeof build.exitCode === "number" ||
    Boolean(build.previewPath) ||
    Boolean(build.stdoutPath) ||
    Boolean(build.stderrPath)
  )
}
