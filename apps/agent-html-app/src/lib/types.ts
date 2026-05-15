export type SessionStatus = "draft" | "dirty" | "building" | "error" | "ready"

export type WorkbenchView = "preview" | "source" | "inspect"

export type SessionSummary = {
  id: string
  name: string
  directory: string
  status: SessionStatus
  pinned: boolean
  updatedAt: string
  lastBuildAt?: string
  hasPreview: boolean
}

export type SessionDetail = {
  summary: SessionSummary
  sourcePath: string
  previewPath?: string
  logDirectory: string
  chatPath: string
  currentView: WorkbenchView
  source: string
}

export type DiagnosticSeverity = "info" | "warning" | "error"

export type DiagnosticItem = {
  id: string
  severity: DiagnosticSeverity
  message: string
  source: string
  line?: number
  column?: number
  code?: string
}

export type BuildRunSummary = {
  runId: string
  sessionId: string
  startedAt: string
  finishedAt?: string
  status: "idle" | "running" | "failed" | "succeeded"
  exitCode?: number
  stdoutPath?: string
  stderrPath?: string
  previewPath?: string
}

export type InspectSnapshot = {
  sessionId: string
  generatedAt: string
  diagnostics: DiagnosticItem[]
  structureSummary: string
  lastBuild?: BuildRunSummary
}

export type SourceValidationSnapshot = {
  sessionId: string
  validatedAt: string
  status: "valid" | "invalid"
  diagnostics: DiagnosticItem[]
  structureSummary: string
}

export type LogSnapshot = {
  stdout?: string
  stderr?: string
}

export type RuntimeCheckCounts = {
  ok: number
  warn: number
  skip: number
  fail: number
}

export type RuntimeCheckItem = {
  category: string
  name: string
  status: "ok" | "warn" | "skip" | "fail"
  detail: string
}

export type RuntimeReport = {
  kind: "agent-html-doctor-report"
  version: number
  status: "ok" | "fail"
  packageVersion: string
  runtimeRoot: string
  outputDir: string
  counts: RuntimeCheckCounts
  checks: RuntimeCheckItem[]
}

export type AgentShellMessage = {
  id: string
  role: "system" | "user" | "placeholder"
  createdAt: string
  text: string
  kind: "message" | "context-card" | "proposal-placeholder"
}

export type AppErrorCode =
  | "ui-validation"
  | "session-io"
  | "cli-launch"
  | "build-failed"
  | "inspect-failed"
  | "preview-missing"

export type AppError = {
  code: AppErrorCode
  message: string
  details?: string
  sessionId?: string
  runId?: string
}

export type AppState = {
  sessions: SessionSummary[]
  currentSession: SessionDetail
  currentInspect: InspectSnapshot
  currentBuild: BuildRunSummary
  currentLogs: LogSnapshot
  runtimeReport?: RuntimeReport
  chat: AgentShellMessage[]
}
