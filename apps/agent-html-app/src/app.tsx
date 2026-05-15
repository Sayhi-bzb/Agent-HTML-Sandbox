import { startTransition, useEffect, useState } from "react"

import { AgentShell } from "./components/agent-shell/agent-shell"
import { SessionsSidebar } from "./components/layout/sessions-sidebar"
import { Workbench } from "./components/workbench/workbench"
import { mockAppState } from "./lib/mock-data"
import {
  appendChatMessage,
  checkRuntime,
  createSession,
  deleteSession,
  isTauriRuntime,
  listSessions,
  openSession,
  renameSession,
  readChat,
  readPreviewHtml,
  readLogs,
  runBuild,
  runInspect,
  saveSource,
  setSessionPinned,
  setSessionView,
  validateSource,
} from "./lib/tauri"
import type {
  AppError,
  AppState,
  BuildRunSummary,
  InspectSnapshot,
  SourceValidationSnapshot,
  SessionDetail,
  SessionStatus,
  SessionSummary,
  RuntimeReport,
  WorkbenchView,
} from "./lib/types"

type CommandState = {
  loading: boolean
  savingSource: boolean
  sendingMessage: boolean
  runningBuild: boolean
  runningInspect: boolean
  runningDoctor: boolean
  error?: string
}

const initialCommandState: CommandState = {
  loading: true,
  savingSource: false,
  sendingMessage: false,
  runningBuild: false,
  runningInspect: false,
  runningDoctor: false,
}

type HydratedSessionState = {
  session: SessionDetail
  chat: AppState["chat"]
  logs: AppState["currentLogs"]
  previewHtml?: string
}

export function App() {
  const [appState, setAppState] = useState<AppState>(mockAppState)
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, string>>({})
  const [activeView, setActiveView] = useState<WorkbenchView>(mockAppState.currentSession.currentView)
  const [previewHtml, setPreviewHtml] = useState<string | undefined>(undefined)
  const [commandState, setCommandState] = useState<CommandState>(initialCommandState)
  const currentDraftSource =
    sessionDrafts[appState.currentSession.summary.id] ?? appState.currentSession.source
  const isSidebarBusy =
    commandState.loading ||
    commandState.savingSource ||
    commandState.sendingMessage ||
    commandState.runningBuild ||
    commandState.runningInspect ||
    commandState.runningDoctor

  useEffect(() => {
    void bootstrap()
  }, [])

  async function bootstrap() {
    if (!isTauriRuntime()) {
      setCommandState({ ...initialCommandState, loading: false })
      return
    }

    try {
      const sessions = await listSessions()
      if (sessions.length === 0) {
        const nextState = await hydrateSessionState(await createSession({ name: "First Session" }))
        startTransition(() => {
          setAppState((current) => ({
            ...current,
            sessions: [nextState.session.summary],
            chat: nextState.chat,
            currentBuild: deriveBuildSummary(nextState.session),
            currentInspect: deriveInspectSnapshot(nextState.session),
            currentSession: nextState.session,
            currentLogs: nextState.logs,
          }))
          setPreviewHtml(nextState.previewHtml)
          setActiveView(nextState.session.currentView as WorkbenchView)
          setCommandState({ ...initialCommandState, loading: false })
        })
        return
      }

      const nextState = await loadSessionState(sessions[0].id)
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          sessions,
          chat: nextState.chat,
          currentBuild: deriveBuildSummary(nextState.session),
          currentInspect: deriveInspectSnapshot(nextState.session),
          currentSession: nextState.session,
          currentLogs: nextState.logs,
        }))
        setPreviewHtml(nextState.previewHtml)
        setActiveView(nextState.session.currentView as WorkbenchView)
        setCommandState({ ...initialCommandState, loading: false })
      })
    } catch (error) {
      setCommandState({
        ...initialCommandState,
        loading: false,
        error: formatError(error),
      })
    }
  }

  async function handleCreateSession() {
    if (!isTauriRuntime()) {
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, loading: true }))
    try {
      const nextState = await hydrateSessionState(
        await createSession({ name: `Session ${appState.sessions.length + 1}` }),
      )
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          sessions: [nextState.session.summary, ...current.sessions],
          chat: nextState.chat,
          currentBuild: deriveBuildSummary(nextState.session),
          currentInspect: deriveInspectSnapshot(nextState.session),
          currentSession: nextState.session,
          currentLogs: nextState.logs,
        }))
        setPreviewHtml(nextState.previewHtml)
        setActiveView(nextState.session.currentView as WorkbenchView)
        setCommandState((current) => ({ ...current, loading: false }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        loading: false,
        error: formatError(error),
      }))
    }
  }

  async function handleOpenSession(sessionId: string) {
    if (!isTauriRuntime()) {
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, loading: true }))
    try {
      const nextState = await loadSessionState(sessionId)
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: nextState.chat,
          currentBuild: deriveBuildSummary(nextState.session),
          currentInspect: deriveInspectSnapshot(nextState.session),
          currentSession: nextState.session,
          currentLogs: nextState.logs,
        }))
        setPreviewHtml(nextState.previewHtml)
        setActiveView(nextState.session.currentView as WorkbenchView)
        setCommandState((current) => ({ ...current, loading: false }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        loading: false,
        error: formatError(error),
      }))
    }
  }

  async function handleRenameSession(sessionId: string, name: string) {
    if (!isTauriRuntime()) {
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, loading: true }))
    try {
      const updatedSession = await renameSession(sessionId, { name })
      const sessions = await listSessions()

      startTransition(() => {
        setAppState((current) => ({
          ...current,
          sessions,
          currentSession:
            current.currentSession.summary.id === sessionId ? updatedSession : current.currentSession,
        }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        loading: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, loading: false }))
  }

  async function handleToggleSessionPin(sessionId: string, pinned: boolean) {
    if (!isTauriRuntime()) {
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, loading: true }))
    try {
      const updatedSession = await setSessionPinned(sessionId, { pinned })
      const sessions = await listSessions()

      startTransition(() => {
        setAppState((current) => ({
          ...current,
          sessions,
          currentSession:
            current.currentSession.summary.id === sessionId ? updatedSession : current.currentSession,
        }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        loading: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, loading: false }))
  }

  async function handleDeleteSession(sessionId: string) {
    if (!isTauriRuntime()) {
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, loading: true }))
    try {
      await deleteSession(sessionId)
      const sessions = await listSessions()

      if (sessions.length === 0) {
        const nextState = await hydrateSessionState(await createSession({ name: "First Session" }))
        startTransition(() => {
          setAppState((current) => ({
            ...current,
            sessions: [nextState.session.summary],
            chat: nextState.chat,
            currentBuild: deriveBuildSummary(nextState.session),
            currentInspect: deriveInspectSnapshot(nextState.session),
            currentSession: nextState.session,
            currentLogs: nextState.logs,
          }))
          setPreviewHtml(nextState.previewHtml)
          setActiveView(nextState.session.currentView as WorkbenchView)
        })
        setSessionDrafts((current) => removeSessionDraft(current, sessionId))
      } else if (sessionId === appState.currentSession.summary.id) {
        const nextState = await loadSessionState(sessions[0].id)
        startTransition(() => {
          setAppState((current) => ({
            ...current,
            sessions,
            chat: nextState.chat,
            currentBuild: deriveBuildSummary(nextState.session),
            currentInspect: deriveInspectSnapshot(nextState.session),
            currentSession: nextState.session,
            currentLogs: nextState.logs,
          }))
          setPreviewHtml(nextState.previewHtml)
          setActiveView(nextState.session.currentView as WorkbenchView)
        })
        setSessionDrafts((current) => removeSessionDraft(current, sessionId))
      } else {
        startTransition(() => {
          setAppState((current) => ({
            ...current,
            sessions,
          }))
        })
        setSessionDrafts((current) => removeSessionDraft(current, sessionId))
      }
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        loading: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, loading: false }))
  }

  async function handleSaveSource(nextSource: string) {
    const sessionId = appState.currentSession.summary.id

    if (!isTauriRuntime()) {
      setAppState((current) => ({
        ...current,
        currentSession: {
          ...current.currentSession,
          summary: {
            ...current.currentSession.summary,
            status: "dirty",
          },
          source: nextSource,
        },
      }))
      setSessionDrafts((current) => removeSessionDraft(current, sessionId))
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, savingSource: true }))
    try {
      const session = await saveSource(sessionId, nextSource)
      replaceCurrentSession(session)
      setSessionDrafts((current) => removeSessionDraft(current, sessionId))
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        savingSource: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, savingSource: false }))
  }

  function handleDraftSourceChange(nextSource: string) {
    const sessionId = appState.currentSession.summary.id
    const savedSource = appState.currentSession.source

    setSessionDrafts((current) => {
      if (nextSource === savedSource) {
        return removeSessionDraft(current, sessionId)
      }

      return {
        ...current,
        [sessionId]: nextSource,
      }
    })
  }

  async function handleValidateSource(nextSource: string): Promise<SourceValidationSnapshot> {
    if (!isTauriRuntime()) {
      return createMockValidationSnapshot(appState.currentSession.summary.id, nextSource)
    }

    return validateSource(appState.currentSession.summary.id, nextSource)
  }

  async function persistCurrentDraftIfNeeded() {
    const sessionId = appState.currentSession.summary.id

    if (currentDraftSource === appState.currentSession.source) {
      return
    }

    if (!isTauriRuntime()) {
      setAppState((current) => ({
        ...current,
        currentSession: {
          ...current.currentSession,
          summary: {
            ...current.currentSession.summary,
            status: "dirty",
          },
          source: currentDraftSource,
        },
      }))
      setSessionDrafts((current) => removeSessionDraft(current, sessionId))
      return
    }

    setCommandState((current) => ({ ...current, savingSource: true }))
    try {
      const session = await saveSource(sessionId, currentDraftSource)
      replaceCurrentSession(session)
      setSessionDrafts((current) => removeSessionDraft(current, sessionId))
    } finally {
      setCommandState((current) => ({ ...current, savingSource: false }))
    }
  }

  async function handleViewChange(nextView: WorkbenchView) {
    const previousView = appState.currentSession.currentView

    startTransition(() => {
      setActiveView(nextView)
      setAppState((current) => ({
        ...current,
        currentSession: {
          ...current.currentSession,
          currentView: nextView,
        },
      }))
    })

    if (!isTauriRuntime()) {
      return
    }

    try {
      const session = await setSessionView(appState.currentSession.summary.id, {
        view: nextView,
      })
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          currentSession: session,
        }))
      })
    } catch (error) {
      startTransition(() => {
        setActiveView(previousView)
        setAppState((current) => ({
          ...current,
          currentSession: {
            ...current.currentSession,
            currentView: previousView,
          },
        }))
      })
      setCommandState((current) => ({
        ...current,
        error: formatError(error),
      }))
    }
  }

  async function handleBuild() {
    if (!isTauriRuntime()) {
      await persistCurrentDraftIfNeeded()
      setActiveView("preview")
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, runningBuild: true }))
    try {
      await persistCurrentDraftIfNeeded()
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        runningBuild: false,
        error: formatError(error),
      }))
      return
    }
    startTransition(() => {
      setAppState((current) => {
        const nextSession = {
          ...current.currentSession,
          summary: {
            ...current.currentSession.summary,
            status: "building" as const,
          },
        }

        return {
          ...current,
          currentBuild: {
            ...current.currentBuild,
            status: "running",
            startedAt: new Date().toISOString(),
            finishedAt: undefined,
            exitCode: undefined,
          },
          currentSession: nextSession,
          sessions: replaceSessionSummary(current.sessions, nextSession.summary),
        }
      })
    })
    try {
      const build = await runBuild(appState.currentSession.summary.id)
      const nextPreviewHtml = await safeReadPreviewHtml(appState.currentSession.summary.id)
      const nextLogs = await safeReadLogs(appState.currentSession.summary.id)
      startTransition(() => {
        setAppState((current) => {
          const status: SessionStatus = build.status === "succeeded" ? "ready" : "error"
          const nextView: WorkbenchView = build.status === "succeeded" ? "preview" : "inspect"
          const nextSession = {
            ...current.currentSession,
            currentView: nextView,
            previewPath: build.previewPath ?? current.currentSession.previewPath,
            summary: {
              ...current.currentSession.summary,
              status,
              hasPreview: Boolean(build.previewPath),
              lastBuildAt: build.finishedAt ?? build.startedAt,
            },
          }

          return {
            ...current,
            currentBuild: build,
            currentLogs: nextLogs,
            currentSession: nextSession,
            sessions: replaceSessionSummary(current.sessions, nextSession.summary),
          }
        })
        setPreviewHtml(nextPreviewHtml)
        setActiveView(build.status === "succeeded" ? "preview" : "inspect")
      })
    } catch (error) {
      startTransition(() => {
        setAppState((current) => {
          const nextSession = {
            ...current.currentSession,
            summary: {
              ...current.currentSession.summary,
              status: "error" as const,
            },
          }

          return {
            ...current,
            currentBuild: {
              ...current.currentBuild,
              status: "failed",
              finishedAt: new Date().toISOString(),
            },
            currentSession: nextSession,
            sessions: replaceSessionSummary(current.sessions, nextSession.summary),
          }
        })
      })
      setCommandState((current) => ({
        ...current,
        runningBuild: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, runningBuild: false }))
  }

  async function handleInspect() {
    if (!isTauriRuntime()) {
      await persistCurrentDraftIfNeeded()
      setActiveView("inspect")
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, runningInspect: true }))
    try {
      await persistCurrentDraftIfNeeded()
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        runningInspect: false,
        error: formatError(error),
      }))
      return
    }
    try {
      const inspect = await runInspect(appState.currentSession.summary.id)
      const nextPreviewHtml = await safeReadPreviewHtml(appState.currentSession.summary.id)
      const nextLogs = await safeReadLogs(appState.currentSession.summary.id)
      startTransition(() => {
        setAppState((current) => {
          const build = inspect.lastBuild ?? current.currentBuild
          const status: SessionStatus = build.status === "succeeded" ? "ready" : "error"
          const nextSession = {
            ...current.currentSession,
            currentView: "inspect" as const,
            previewPath: build.previewPath ?? current.currentSession.previewPath,
            summary: {
              ...current.currentSession.summary,
              status,
              hasPreview: Boolean(build.previewPath),
              lastBuildAt: build.finishedAt ?? build.startedAt,
            },
          }

          return {
            ...current,
            currentBuild: build,
            currentInspect: inspect,
            currentLogs: nextLogs,
            currentSession: nextSession,
            sessions: replaceSessionSummary(current.sessions, nextSession.summary),
          }
        })
        setPreviewHtml(nextPreviewHtml)
        setActiveView("inspect")
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        runningInspect: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, runningInspect: false }))
  }

  async function handleDoctor() {
    if (!isTauriRuntime()) {
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, runningDoctor: true }))
    try {
      const report = await checkRuntime()
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          runtimeReport: report,
        }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        runningDoctor: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, runningDoctor: false }))
  }

  async function handleSendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }

    if (!isTauriRuntime()) {
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: [
            ...current.chat,
            createLocalChatMessage("user", trimmed, "message"),
            createLocalChatMessage(
              "placeholder",
              "Agent integration is disabled in v1. This draft was stored only in the in-memory mock session.",
              "proposal-placeholder",
            ),
          ],
        }))
      })
      return
    }

    setCommandState((current) => ({ ...current, error: undefined, sendingMessage: true }))
    try {
      await appendChatMessage(appState.currentSession.summary.id, {
        role: "user",
        text: trimmed,
        kind: "message",
      })
      const updated = await appendChatMessage(appState.currentSession.summary.id, {
        role: "placeholder",
        text: "Agent integration is disabled in v1. This draft was persisted to chat.jsonl for the current session.",
        kind: "proposal-placeholder",
      })
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: updated,
        }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        sendingMessage: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, sendingMessage: false }))
  }

  function replaceCurrentSession(session: SessionDetail) {
    startTransition(() => {
      setAppState((current) => ({
        ...current,
        currentSession: session,
        sessions: replaceSessionSummary(current.sessions, session.summary),
      }))
    })
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div>
          <p className="eyebrow">agent-html app</p>
          <h1>Local-first workbench</h1>
        </div>
        <div className="topbar-meta">
          <button className="ghost-button" disabled={commandState.runningDoctor} onClick={handleDoctor} type="button">
            {commandState.runningDoctor ? "Checking runtime..." : "Doctor"}
          </button>
          <span className="pill">{isTauriRuntime() ? "Tauri runtime" : "Mock runtime"}</span>
          {commandState.error ? <span className="pill status-error">Needs attention</span> : null}
        </div>
      </header>

      {commandState.error ? <div className="error-banner">{commandState.error}</div> : null}
      {appState.runtimeReport ? <RuntimeBanner report={appState.runtimeReport} /> : null}

      <div className="app-shell">
        <SessionsSidebar
          activeSessionId={appState.currentSession.summary.id}
          isBusy={isSidebarBusy}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onOpenSession={handleOpenSession}
          onRenameSession={handleRenameSession}
          onTogglePinSession={handleToggleSessionPin}
          sessions={appState.sessions}
        />
        <Workbench
          activeView={activeView}
          build={appState.currentBuild}
          draftSource={currentDraftSource}
          inspect={appState.currentInspect}
          isRunningBuild={commandState.runningBuild}
          isRunningInspect={commandState.runningInspect}
          isSavingSource={commandState.savingSource}
          logs={appState.currentLogs}
          onBuild={handleBuild}
          onDraftSourceChange={handleDraftSourceChange}
          onInspect={handleInspect}
          onSaveSource={handleSaveSource}
          onValidateSource={handleValidateSource}
          onViewChange={handleViewChange}
          previewHtml={previewHtml}
          session={appState.currentSession}
        />
        <AgentShell
          isSending={commandState.sendingMessage}
          messages={appState.chat}
          onSend={handleSendMessage}
          session={appState.currentSession}
        />
      </div>
    </div>
  )
}

async function loadSessionState(sessionId: string): Promise<HydratedSessionState> {
  return hydrateSessionState(await openSession(sessionId))
}

async function hydrateSessionState(session: SessionDetail): Promise<HydratedSessionState> {
  const [chat, previewHtml, logs] = await Promise.all([
    safeReadChat(session.summary.id),
    safeReadPreviewHtml(session.summary.id),
    safeReadLogs(session.summary.id),
  ])

  return {
    session,
    chat,
    logs,
    previewHtml,
  }
}

async function safeReadPreviewHtml(sessionId: string) {
  if (!isTauriRuntime()) {
    return undefined
  }

  try {
    return await readPreviewHtml(sessionId)
  } catch {
    return undefined
  }
}

async function safeReadLogs(sessionId: string) {
  if (!isTauriRuntime()) {
    return { stdout: "", stderr: "" }
  }

  try {
    return await readLogs(sessionId)
  } catch {
    return { stdout: "", stderr: "" }
  }
}

async function safeReadChat(sessionId: string) {
  if (!isTauriRuntime()) {
    return mockAppState.chat
  }

  try {
    return await readChat(sessionId)
  } catch {
    return []
  }
}

function replaceSessionSummary(summaries: SessionSummary[], nextSummary: SessionSummary) {
  const withoutCurrent = summaries.filter((summary) => summary.id !== nextSummary.id)
  return [nextSummary, ...withoutCurrent]
}

function formatError(error: unknown) {
  if (typeof error === "string") {
    return error
  }

  const value = error as Partial<AppError> & { message?: string }
  if (typeof value.message === "string" && value.message.length > 0) {
    return value.message
  }

  return "Unknown command failure."
}

function deriveBuildSummary(session: SessionDetail): BuildRunSummary {
  return {
    runId: session.summary.lastBuildAt ? `${session.summary.id}-last-build` : `${session.summary.id}-idle`,
    sessionId: session.summary.id,
    startedAt: session.summary.lastBuildAt ?? session.summary.updatedAt,
    finishedAt: session.summary.lastBuildAt,
    status: session.summary.hasPreview ? "succeeded" : "idle",
    exitCode: session.summary.hasPreview ? 0 : undefined,
    previewPath: session.previewPath,
  }
}

function deriveInspectSnapshot(session: SessionDetail): InspectSnapshot {
  return {
    sessionId: session.summary.id,
    generatedAt: session.summary.updatedAt,
    diagnostics: [],
    structureSummary: "Run Inspect to refresh the session analysis for this document.",
    lastBuild: session.summary.hasPreview ? deriveBuildSummary(session) : undefined,
  }
}

function createMockValidationSnapshot(
  sessionId: string,
  source: string,
): SourceValidationSnapshot {
  const diagnostics = []

  if (!source.includes("<page")) {
    diagnostics.push({
      id: "mock-validation-page",
      severity: "error" as const,
      message: "The draft should include a <page> root component.",
      source: "validation",
      code: "missing-page",
    })
  }

  if (source.includes("className=")) {
    diagnostics.push({
      id: "mock-validation-classname",
      severity: "error" as const,
      message: '"className" is not an allowed agent-facing attribute.',
      source: "validation",
      code: "unknown-attr",
    })
  }

  const componentCount = (source.match(/<([a-z-]+)(\s|>)/g) ?? []).length

  return {
    sessionId,
    validatedAt: new Date().toISOString(),
    status: diagnostics.length > 0 ? "invalid" : "valid",
    diagnostics,
    structureSummary:
      diagnostics.length > 0
        ? "Mock validation found source issues."
        : `${componentCount} component tag(s) detected in the current draft.`,
  }
}

function removeSessionDraft(drafts: Record<string, string>, sessionId: string) {
  if (!(sessionId in drafts)) {
    return drafts
  }

  const nextDrafts = { ...drafts }
  delete nextDrafts[sessionId]
  return nextDrafts
}

function createLocalChatMessage(
  role: "system" | "user" | "placeholder",
  text: string,
  kind: "message" | "context-card" | "proposal-placeholder",
) {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    createdAt: new Date().toISOString(),
    text,
    kind,
  }
}

function RuntimeBanner({ report }: { report: RuntimeReport }) {
  return (
    <div className="runtime-banner">
      <div>
        <p className="eyebrow">Runtime health</p>
        <h2>{report.status === "ok" ? "Managed runtime ready" : "Managed runtime has failures"}</h2>
      </div>
      <div className="runtime-banner-meta">
        <span className="pill">ok {report.counts.ok}</span>
        <span className="pill">warn {report.counts.warn}</span>
        <span className="pill">fail {report.counts.fail}</span>
      </div>
    </div>
  )
}
