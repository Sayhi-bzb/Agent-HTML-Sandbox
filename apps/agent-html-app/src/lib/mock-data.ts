import type {
  AgentShellMessage,
  AppState,
  BuildRunSummary,
  DiagnosticItem,
  InspectSnapshot,
  LogSnapshot,
  RuntimeReport,
  SessionDetail,
  SessionSummary,
} from "./types"

const now = "2026-05-15T12:45:00.000Z"

const sessions: SessionSummary[] = [
  {
    id: "session-vendor-decision",
    name: "Vendor Decision",
    directory: "D:/Users/demo/.agent-html-app/sessions/vendor-decision",
    status: "dirty",
    pinned: true,
    updatedAt: now,
    lastBuildAt: "2026-05-15T12:30:00.000Z",
    hasPreview: true,
  },
  {
    id: "session-stream-review",
    name: "Streaming Review",
    directory: "D:/Users/demo/.agent-html-app/sessions/streaming-review",
    status: "ready",
    pinned: false,
    updatedAt: "2026-05-15T11:50:00.000Z",
    lastBuildAt: "2026-05-15T11:48:00.000Z",
    hasPreview: true,
  },
]

const currentSession: SessionDetail = {
  summary: sessions[0],
  sourcePath: "D:/Users/demo/.agent-html-app/sessions/vendor-decision/source.agent.html",
  previewPath: "D:/Users/demo/.agent-html-app/sessions/vendor-decision/build/index.html",
  logDirectory: "D:/Users/demo/.agent-html-app/sessions/vendor-decision/logs",
  chatPath: "D:/Users/demo/.agent-html-app/sessions/vendor-decision/chat.jsonl",
  currentView: "preview",
  source: `<meta-agent profile="review-dense" />\n\n<page title="Vendor Decision">\n  <alert title="Recommendation" tone="neutral">\n    Choose Vendor A for the initial rollout.\n  </alert>\n\n  <card title="Decision Notes">\n    <list variant="unordered">\n      <item>Lower migration risk.</item>\n      <item>Faster initial rollout.</item>\n      <item>Needs stricter post-launch monitoring.</item>\n    </list>\n  </card>\n</page>`,
}

const diagnostics: DiagnosticItem[] = [
  {
    id: "diag-1",
    severity: "warning",
    message: "Build preview is older than source changes.",
    source: "build",
    code: "preview-stale",
  },
  {
    id: "diag-2",
    severity: "info",
    message: "No schema violations detected in the latest source snapshot.",
    source: "source",
  },
]

const currentBuild: BuildRunSummary = {
  runId: "build-20260515-1230",
  sessionId: currentSession.summary.id,
  startedAt: "2026-05-15T12:30:00.000Z",
  finishedAt: "2026-05-15T12:30:04.000Z",
  status: "succeeded",
  exitCode: 0,
  stdoutPath: `${currentSession.logDirectory}/build-20260515-1230.stdout.log`,
  stderrPath: `${currentSession.logDirectory}/build-20260515-1230.stderr.log`,
  previewPath: currentSession.previewPath,
}

const currentInspect: InspectSnapshot = {
  sessionId: currentSession.summary.id,
  generatedAt: now,
  diagnostics,
  structureSummary: "1 page, 1 alert, 1 card, 1 list, 3 items",
  lastBuild: currentBuild,
}

const chat: AgentShellMessage[] = [
  {
    id: "msg-1",
    role: "system",
    createdAt: now,
    text: "Agent shell is scaffolded. Live provider integration is intentionally disabled in v1.",
    kind: "message",
  },
  {
    id: "msg-2",
    role: "placeholder",
    createdAt: now,
    text: [
      "Proposal for Vendor Decision",
      "- [build] Rebuild after updating the decision notes so Preview matches the latest source.",
      "- [review] Compare the refreshed preview against the current recommendation card before sharing the artifact.",
      "- [inspect] Clear the stale-preview warning in Inspect before treating this session as ready.",
    ].join("\n"),
    kind: "proposal-placeholder",
    proposalSnapshot: {
      lineCount: currentSession.source.split(/\r?\n/).length,
      source: currentSession.source,
    },
  },
]

const currentLogs: LogSnapshot = {
  stdout: "{\n  \"kind\": \"agent-html-build-result\",\n  \"ok\": true\n}",
  stderr: "",
}

const runtimeReport: RuntimeReport = {
  kind: "agent-html-doctor-report",
  version: 1,
  status: "ok",
  packageVersion: "0.1.0",
  runtimeRoot: "D:/Users/demo/.agent-html-app/ahtml-home/runtime",
  outputDir: "D:/Users/demo/.agent-html-app/sessions/vendor-decision/build",
  counts: {
    ok: 18,
    warn: 1,
    skip: 0,
    fail: 0,
  },
  checks: [
    {
      category: "runtime",
      name: "root",
      status: "ok",
      detail: "Isolated runtime available.",
    },
  ],
}

export const mockAppState: AppState = {
  sessions,
  currentSession,
  currentInspect,
  currentBuild,
  currentLogs,
  runtimeReport,
  chat,
}
