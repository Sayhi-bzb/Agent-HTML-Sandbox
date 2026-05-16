import { startTransition, useEffect, useRef, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  SurfaceCard,
  SurfaceCardBody,
  SurfaceCardHeader,
} from "@/components/ui/surface-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { AgentShell } from "./components/agent-shell/agent-shell"
import { SessionsSidebar } from "./components/layout/sessions-sidebar"
import { Workbench } from "./components/workbench/workbench"
import {
  getAvailableReviewFocusTargets,
  isSameReviewFocusTarget,
  type ReviewFocusIntent,
  type ReviewFocusTarget,
} from "./lib/review-focus"
import type { ReviewTimelineActionConfig } from "./lib/review-flow"
import {
  createSourceFocusTargetFromDiagnostic,
  createSourceFocusTargetFromGroup,
  getSourceFocusReviewStatus,
  getSourceFocusRevealTarget,
  type SourceFocusTarget,
} from "./lib/source-focus"
import {
  getLatestProposalComparisonSummary,
  getSourceComparisonSummary,
} from "./lib/source-comparison"
import { mockAppState } from "./lib/mock-data"
import {
  appendChatMessage,
  checkRuntime,
  createSession,
  deleteSession,
  generateSessionProposal,
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
  AgentShellMessage,
  AppError,
  AppState,
  BuildRunSummary,
  InspectSnapshot,
  SourceValidationSnapshot,
  SourceValidationState,
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
  recordingDecision: boolean
  draftingProposal: boolean
  runningBuild: boolean
  runningInspect: boolean
  runningDoctor: boolean
  error?: string
}

const initialCommandState: CommandState = {
  loading: true,
  savingSource: false,
  sendingMessage: false,
  recordingDecision: false,
  draftingProposal: false,
  runningBuild: false,
  runningInspect: false,
  runningDoctor: false,
}

const initialSourceValidationState: SourceValidationState = {
  status: "idle",
  diagnostics: [],
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
  const [agentShellReviewIntent, setAgentShellReviewIntent] =
    useState<ReviewFocusIntent>()
  const [agentShellClearReviewFocusKey, setAgentShellClearReviewFocusKey] =
    useState<string>()
  const [agentShellReviewFocus, setAgentShellReviewFocus] =
    useState<ReviewFocusTarget>()
  const [activeSourceFocus, setActiveSourceFocus] =
    useState<SourceFocusTarget>()
  const [currentSourceValidation, setCurrentSourceValidation] =
    useState<SourceValidationState>(initialSourceValidationState)
  const sourceValidationRequestId = useRef(0)
  const [activeView, setActiveView] = useState<WorkbenchView>(
    mockAppState.currentSession.currentView,
  )
  const [previewHtml, setPreviewHtml] = useState<string | undefined>(undefined)
  const [commandState, setCommandState] =
    useState<CommandState>(initialCommandState)
  const currentDraftSource =
    sessionDrafts[appState.currentSession.summary.id] ??
    appState.currentSession.source
  const hasUnsavedSourceChanges =
    currentDraftSource !== appState.currentSession.source
  const draftComparison = getSourceComparisonSummary(
    appState.currentSession.source,
    currentDraftSource,
  )
  const proposalComparison = getLatestProposalComparisonSummary(
    appState.chat,
    currentDraftSource,
  )
  const latestProposalText = [...appState.chat]
    .reverse()
    .find((message) => message.kind === "proposal-placeholder")?.text
  const availableReviewFocusTargets = getAvailableReviewFocusTargets({
    proposalText: latestProposalText,
    build: appState.currentBuild,
    hasUnsavedSourceChanges,
    inspect: appState.currentInspect,
    draftComparison,
    proposalComparison,
  })
  const sourceFocusRevealTarget = getSourceFocusRevealTarget({
    sourceFocus: activeSourceFocus,
    availableReviewFocusTargets,
    draftComparison,
    proposalComparison,
  })
  const canRevealSourceOrigin = Boolean(sourceFocusRevealTarget)
  const sourceFocusReviewStatus = getSourceFocusReviewStatus({
    sourceFocus: activeSourceFocus,
    availableReviewFocusTargets,
    draftComparison,
    inspectDiagnostics: appState.currentInspect.diagnostics,
    proposalComparison,
    validationDiagnostics: currentSourceValidation.diagnostics,
  })
  const isWorkbenchActionBusy =
    commandState.savingSource ||
    commandState.runningBuild ||
    commandState.runningInspect ||
    commandState.draftingProposal
  const isSidebarBusy =
    commandState.loading ||
    commandState.savingSource ||
    commandState.sendingMessage ||
    commandState.recordingDecision ||
    commandState.draftingProposal ||
    commandState.runningBuild ||
    commandState.runningInspect ||
    commandState.runningDoctor

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    setAgentShellReviewIntent(undefined)
    setAgentShellClearReviewFocusKey(undefined)
    setAgentShellReviewFocus(undefined)
    setActiveSourceFocus(undefined)
    setCurrentSourceValidation(initialSourceValidationState)
  }, [appState.currentSession.summary.id])

  useEffect(() => {
    if (commandState.loading) {
      return
    }

    const requestId = sourceValidationRequestId.current + 1
    sourceValidationRequestId.current = requestId
    let cancelled = false

    setCurrentSourceValidation((current) => ({
      ...current,
      status: "running",
    }))

    const timeout = window.setTimeout(() => {
      void handleValidateSource(currentDraftSource)
        .then((result) => {
          if (cancelled || sourceValidationRequestId.current !== requestId) {
            return
          }

          setCurrentSourceValidation({
            status: result.status,
            validatedAt: result.validatedAt,
            diagnostics: result.diagnostics,
            structureSummary: result.structureSummary,
          })
        })
        .catch((error: unknown) => {
          if (cancelled || sourceValidationRequestId.current !== requestId) {
            return
          }

          setCurrentSourceValidation({
            status: "invalid",
            validatedAt: new Date().toISOString(),
            diagnostics: [
              {
                id: `validation-error-${requestId}`,
                severity: "error",
                message: formatError(error),
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
  }, [
    appState.currentSession.summary.id,
    commandState.loading,
    currentDraftSource,
  ])

  async function bootstrap() {
    if (!isTauriRuntime()) {
      setCommandState({ ...initialCommandState, loading: false })
      return
    }

    try {
      const sessions = await listSessions()
      if (sessions.length === 0) {
        const nextState = await hydrateSessionState(
          await createSession({ name: "First Session" }),
        )
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }))
    try {
      const nextState = await hydrateSessionState(
        await createSession({
          name: `Session ${appState.sessions.length + 1}`,
        }),
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }))
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }))
    try {
      const updatedSession = await renameSession(sessionId, { name })
      const sessions = await listSessions()

      startTransition(() => {
        setAppState((current) => ({
          ...current,
          sessions,
          currentSession:
            current.currentSession.summary.id === sessionId
              ? updatedSession
              : current.currentSession,
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }))
    try {
      const updatedSession = await setSessionPinned(sessionId, { pinned })
      const sessions = await listSessions()

      startTransition(() => {
        setAppState((current) => ({
          ...current,
          sessions,
          currentSession:
            current.currentSession.summary.id === sessionId
              ? updatedSession
              : current.currentSession,
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      loading: true,
    }))
    try {
      await deleteSession(sessionId)
      const sessions = await listSessions()

      if (sessions.length === 0) {
        const nextState = await hydrateSessionState(
          await createSession({ name: "First Session" }),
        )
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
    const comparison = getSourceComparisonSummary(
      appState.currentSession.source,
      nextSource,
    )

    if (!isTauriRuntime()) {
      setAppState((current) => ({
        ...current,
        chat: [
          ...current.chat,
          createLocalChatMessage(
            "system",
            buildSourceSavedEventMessage(nextSource, comparison),
            "context-card",
          ),
        ],
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      savingSource: true,
    }))
    try {
      const session = await saveSource(sessionId, nextSource)
      let nextChat = appState.chat
      try {
        nextChat = await appendChatMessage(sessionId, {
          role: "system",
          text: buildSourceSavedEventMessage(nextSource, comparison),
          kind: "context-card",
        })
      } catch (chatError) {
        setCommandState((current) => ({
          ...current,
          error: `Source was saved, but the session event note could not be saved. ${formatError(chatError)}`,
        }))
      }
      replaceCurrentSession(session, nextChat)
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

  async function handleValidateSource(
    nextSource: string,
  ): Promise<SourceValidationSnapshot> {
    if (!isTauriRuntime()) {
      return createMockValidationSnapshot(
        appState.currentSession.summary.id,
        nextSource,
      )
    }

    return validateSource(appState.currentSession.summary.id, nextSource)
  }

  async function persistCurrentDraftIfNeeded() {
    const sessionId = appState.currentSession.summary.id

    if (currentDraftSource === appState.currentSession.source) {
      return
    }

    const comparison = getSourceComparisonSummary(
      appState.currentSession.source,
      currentDraftSource,
    )

    if (!isTauriRuntime()) {
      setAppState((current) => ({
        ...current,
        chat: [
          ...current.chat,
          createLocalChatMessage(
            "system",
            buildSourceSavedEventMessage(currentDraftSource, comparison),
            "context-card",
          ),
        ],
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
      let nextChat = appState.chat
      try {
        nextChat = await appendChatMessage(sessionId, {
          role: "system",
          text: buildSourceSavedEventMessage(currentDraftSource, comparison),
          kind: "context-card",
        })
      } catch (chatError) {
        setCommandState((current) => ({
          ...current,
          error: `Source was saved, but the session event note could not be saved. ${formatError(chatError)}`,
        }))
      }
      replaceCurrentSession(session, nextChat)
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
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: [
            ...current.chat,
            createLocalChatMessage(
              "system",
              [
                "Build update",
                "- Mock runtime switched Preview without a real artifact rebuild.",
              ].join("\n"),
              "context-card",
            ),
          ],
        }))
      })
      setActiveView("preview")
      return
    }

    setCommandState((current) => ({
      ...current,
      error: undefined,
      runningBuild: true,
    }))
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
          sessions: replaceSessionSummary(
            current.sessions,
            nextSession.summary,
          ),
        }
      })
    })
    try {
      const build = await runBuild(appState.currentSession.summary.id)
      const nextPreviewHtml = await safeReadPreviewHtml(
        appState.currentSession.summary.id,
      )
      const nextLogs = await safeReadLogs(appState.currentSession.summary.id)
      let nextChat = appState.chat
      try {
        nextChat = await appendChatMessage(appState.currentSession.summary.id, {
          role: "system",
          text: buildEventMessage(build),
          kind: "context-card",
        })
      } catch (chatError) {
        setCommandState((current) => ({
          ...current,
          error: `Build completed, but the session event note could not be saved. ${formatError(chatError)}`,
        }))
      }
      startTransition(() => {
        setAppState((current) => {
          const status: SessionStatus =
            build.status === "succeeded" ? "ready" : "error"
          const nextView: WorkbenchView =
            build.status === "succeeded" ? "preview" : "inspect"
          const nextSession = {
            ...current.currentSession,
            currentView: nextView,
            previewPath:
              build.previewPath ?? current.currentSession.previewPath,
            summary: {
              ...current.currentSession.summary,
              status,
              hasPreview: Boolean(build.previewPath),
              lastBuildAt: build.finishedAt ?? build.startedAt,
            },
          }

          return {
            ...current,
            chat: nextChat,
            currentBuild: build,
            currentLogs: nextLogs,
            currentSession: nextSession,
            sessions: replaceSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
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
            sessions: replaceSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
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
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: [
            ...current.chat,
            createLocalChatMessage(
              "system",
              [
                "Inspect update",
                "- Mock runtime switched Inspect without a real CLI inspect run.",
              ].join("\n"),
              "context-card",
            ),
          ],
        }))
      })
      setActiveView("inspect")
      return
    }

    setCommandState((current) => ({
      ...current,
      error: undefined,
      runningInspect: true,
    }))
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
      const nextPreviewHtml = await safeReadPreviewHtml(
        appState.currentSession.summary.id,
      )
      const nextLogs = await safeReadLogs(appState.currentSession.summary.id)
      let nextChat = appState.chat
      try {
        nextChat = await appendChatMessage(appState.currentSession.summary.id, {
          role: "system",
          text: inspectEventMessage(inspect),
          kind: "context-card",
        })
      } catch (chatError) {
        setCommandState((current) => ({
          ...current,
          error: `Inspect completed, but the session event note could not be saved. ${formatError(chatError)}`,
        }))
      }
      startTransition(() => {
        setAppState((current) => {
          const build = inspect.lastBuild ?? current.currentBuild
          const status: SessionStatus =
            build.status === "succeeded" ? "ready" : "error"
          const nextSession = {
            ...current.currentSession,
            currentView: "inspect" as const,
            previewPath:
              build.previewPath ?? current.currentSession.previewPath,
            summary: {
              ...current.currentSession.summary,
              status,
              hasPreview: Boolean(build.previewPath),
              lastBuildAt: build.finishedAt ?? build.startedAt,
            },
          }

          return {
            ...current,
            chat: nextChat,
            currentBuild: build,
            currentInspect: inspect,
            currentLogs: nextLogs,
            currentSession: nextSession,
            sessions: replaceSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
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

    setCommandState((current) => ({
      ...current,
      error: undefined,
      runningDoctor: true,
    }))
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
          ],
        }))
      })
      return
    }

    setCommandState((current) => ({
      ...current,
      error: undefined,
      sendingMessage: true,
    }))
    try {
      const updated = await appendChatMessage(
        appState.currentSession.summary.id,
        {
          role: "user",
          text: trimmed,
          kind: "message",
        },
      )
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

  async function handleDraftProposal() {
    if (isTauriRuntime()) {
      try {
        await persistCurrentDraftIfNeeded()
      } catch (error) {
        setCommandState((current) => ({
          ...current,
          draftingProposal: false,
          error: formatError(error),
        }))
        return
      }
    }

    if (!isTauriRuntime()) {
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: [
            ...current.chat,
            createLocalChatMessage(
              "placeholder",
              buildLocalProposalText(
                current.currentSession,
                current.currentBuild,
                current.currentInspect,
                current.currentLogs,
                currentDraftSource,
              ),
              "proposal-placeholder",
              {
                lineCount: currentDraftSource.split(/\r?\n/).length,
                source: currentDraftSource,
              },
            ),
          ],
        }))
      })
      return
    }

    setCommandState((current) => ({
      ...current,
      error: undefined,
      draftingProposal: true,
    }))
    try {
      const updated = await generateSessionProposal(
        appState.currentSession.summary.id,
      )
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: updated,
        }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        draftingProposal: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, draftingProposal: false }))
  }

  async function handleRecordProposalDecision(
    proposalText: string,
    status: "approved" | "needs changes",
  ) {
    const decisionMessage = buildProposalDecisionMessage(proposalText, status)

    if (!isTauriRuntime()) {
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: [
            ...current.chat,
            createLocalChatMessage("system", decisionMessage, "context-card"),
          ],
        }))
      })
      return
    }

    setCommandState((current) => ({
      ...current,
      error: undefined,
      recordingDecision: true,
    }))
    try {
      const updated = await appendChatMessage(
        appState.currentSession.summary.id,
        {
          role: "system",
          text: decisionMessage,
          kind: "context-card",
        },
      )
      startTransition(() => {
        setAppState((current) => ({
          ...current,
          chat: updated,
        }))
      })
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        recordingDecision: false,
        error: formatError(error),
      }))
      return
    }

    setCommandState((current) => ({ ...current, recordingDecision: false }))
  }

  async function handleSaveDraftForWorkflow() {
    try {
      await persistCurrentDraftIfNeeded()
    } catch (error) {
      setCommandState((current) => ({
        ...current,
        error: formatError(error),
      }))
    }
  }

  function queueAgentShellReviewIntent(target: ReviewFocusTarget) {
    setAgentShellReviewIntent({
      ...target,
      requestKey: `${target.mode}-${Date.now()}`,
    })
  }

  async function handleRunReviewAction(
    handler: ReviewTimelineActionConfig["handler"],
  ) {
    switch (handler) {
      case "save":
        await handleSaveDraftForWorkflow()
        break
      case "build":
        await handleBuild()
        break
      case "inspect":
        await handleInspect()
        break
      case "openSource":
        await handleViewChange("source")
        break
      case "openInspect":
        await handleViewChange("inspect")
        break
      case "openPreview":
        await handleViewChange("preview")
        break
      case "draftProposal":
        await handleDraftProposal()
        break
      case "reviewDiff": {
        const defaultTarget = availableReviewFocusTargets[0]
        if (defaultTarget) {
          queueAgentShellReviewIntent(defaultTarget)
        }
        break
      }
    }
  }

  function handleSelectReviewFocus(target: ReviewFocusTarget) {
    queueAgentShellReviewIntent(target)
  }

  function handleRevisitReviewFocus() {
    if (!agentShellReviewFocus) {
      return
    }

    queueAgentShellReviewIntent(agentShellReviewFocus)
  }

  function handleClearReviewFocus() {
    setAgentShellReviewIntent(undefined)
    setAgentShellClearReviewFocusKey(`clear-${Date.now()}`)
    setAgentShellReviewFocus(undefined)
  }

  function handleOpenSourceFocus(target: SourceFocusTarget) {
    setActiveSourceFocus(target)
    void handleViewChange("source")
  }

  function handleClearSourceFocus() {
    setActiveSourceFocus(undefined)
  }

  function handleRevealSourceReviewTarget() {
    if (sourceFocusRevealTarget) {
      queueAgentShellReviewIntent(sourceFocusRevealTarget)
    }
  }

  function handleRefreshSourceFocus() {
    if (
      sourceFocusReviewStatus?.currentGroup &&
      sourceFocusReviewStatus.currentReviewTarget
    ) {
      setActiveSourceFocus(
        createSourceFocusTargetFromGroup({
          label: sourceFocusReviewStatus.currentReviewTarget.label,
          group: sourceFocusReviewStatus.currentGroup,
          reviewTarget: sourceFocusReviewStatus.currentReviewTarget,
        }),
      )
      return
    }

    if (sourceFocusReviewStatus?.currentDiagnostic) {
      const nextTarget = createSourceFocusTargetFromDiagnostic({
        diagnostic: sourceFocusReviewStatus.currentDiagnostic,
      })
      if (nextTarget) {
        setActiveSourceFocus(nextTarget)
      }
    }
  }

  function handleReviewFocusChange(focus?: ReviewFocusTarget) {
    setAgentShellReviewFocus((current) => {
      if (!current && !focus) {
        return current
      }

      if (isSameReviewFocusTarget(current, focus)) {
        return current
      }

      return focus
    })
  }

  function replaceCurrentSession(
    session: SessionDetail,
    nextChat?: AppState["chat"],
  ) {
    startTransition(() => {
      setAppState((current) => ({
        ...current,
        ...(nextChat !== undefined ? { chat: nextChat } : {}),
        currentSession: session,
        sessions: replaceSessionSummary(current.sessions, session.summary),
      }))
    })
  }

  return (
    <div className="app-root">
      <SurfaceCard className="topbar" variant="banner">
        <SurfaceCardHeader
          eyebrow="agent-html app"
          title="Local-first workbench"
        >
          <div className="topbar-meta">
            <Button
              disabled={commandState.runningDoctor}
              onClick={handleDoctor}
              size="sm"
              type="button"
              variant="outline"
            >
              {commandState.runningDoctor ? "Checking runtime..." : "Doctor"}
            </Button>
            <StatusBadge>
              {isTauriRuntime() ? "Tauri runtime" : "Mock runtime"}
            </StatusBadge>
            {commandState.error ? (
              <StatusBadge tone="error">Needs attention</StatusBadge>
            ) : null}
          </div>
        </SurfaceCardHeader>
      </SurfaceCard>

      {commandState.error ? (
        <SurfaceCard className="error-banner" variant="banner">
          <SurfaceCardBody className="px-[16px] py-[14px]">
            <Alert
              className="border-none bg-transparent p-0 shadow-none"
              variant="destructive"
            >
              <AlertTitle>Command error</AlertTitle>
              <AlertDescription>{commandState.error}</AlertDescription>
            </Alert>
          </SurfaceCardBody>
        </SurfaceCard>
      ) : null}
      {appState.runtimeReport ? (
        <RuntimeBanner report={appState.runtimeReport} />
      ) : null}

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
          activeReviewFocus={agentShellReviewFocus}
          activeSourceFocus={activeSourceFocus}
          activeSourceFocusReviewStatus={sourceFocusReviewStatus}
          availableReviewFocusTargets={availableReviewFocusTargets}
          build={appState.currentBuild}
          draftComparison={draftComparison}
          draftSource={currentDraftSource}
          hasUnsavedSourceChanges={hasUnsavedSourceChanges}
          inspect={appState.currentInspect}
          isActionBusy={isWorkbenchActionBusy}
          isRunningBuild={commandState.runningBuild}
          isRunningInspect={commandState.runningInspect}
          isSavingSource={commandState.savingSource}
          logs={appState.currentLogs}
          messages={appState.chat}
          sourceValidation={currentSourceValidation}
          onBuild={handleBuild}
          canRevealSourceOrigin={canRevealSourceOrigin}
          onClearReviewFocus={handleClearReviewFocus}
          onClearSourceFocus={handleClearSourceFocus}
          onDraftSourceChange={handleDraftSourceChange}
          onInspect={handleInspect}
          onOpenSourceFocus={handleOpenSourceFocus}
          onRefreshSourceFocus={handleRefreshSourceFocus}
          onRevealSourceReviewTarget={handleRevealSourceReviewTarget}
          onRevisitReviewFocus={handleRevisitReviewFocus}
          onRunReviewAction={handleRunReviewAction}
          onSelectReviewFocus={handleSelectReviewFocus}
          onSaveSource={handleSaveSource}
          onViewChange={handleViewChange}
          previewHtml={previewHtml}
          proposalComparison={proposalComparison}
          session={appState.currentSession}
        />
        <AgentShell
          activeView={activeView}
          activeSourceFocus={activeSourceFocus}
          activeSourceFocusReviewStatus={sourceFocusReviewStatus}
          build={appState.currentBuild}
          sourceValidation={currentSourceValidation}
          canRevealSourceOrigin={canRevealSourceOrigin}
          draftComparison={draftComparison}
          hasUnsavedSourceChanges={hasUnsavedSourceChanges}
          inspect={appState.currentInspect}
          isRunningBuild={commandState.runningBuild}
          isRunningInspect={commandState.runningInspect}
          isSavingSource={commandState.savingSource}
          onBuild={handleBuild}
          onDecision={handleRecordProposalDecision}
          onInspect={handleInspect}
          onOpenView={handleViewChange}
          onOpenSourceFocus={handleOpenSourceFocus}
          onRefreshSourceFocus={handleRefreshSourceFocus}
          onRevealSourceReviewTarget={handleRevealSourceReviewTarget}
          onSaveDraft={handleSaveDraftForWorkflow}
          isDraftingProposal={commandState.draftingProposal}
          isSending={commandState.sendingMessage}
          messages={appState.chat}
          onDraftProposal={handleDraftProposal}
          clearReviewFocusKey={agentShellClearReviewFocusKey}
          proposalComparison={proposalComparison}
          onReviewFocusChange={handleReviewFocusChange}
          reviewIntent={agentShellReviewIntent}
          onSend={handleSendMessage}
          session={appState.currentSession}
        />
      </div>
    </div>
  )
}

async function loadSessionState(
  sessionId: string,
): Promise<HydratedSessionState> {
  return hydrateSessionState(await openSession(sessionId))
}

async function hydrateSessionState(
  session: SessionDetail,
): Promise<HydratedSessionState> {
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

function replaceSessionSummary(
  summaries: SessionSummary[],
  nextSummary: SessionSummary,
) {
  const withoutCurrent = summaries.filter(
    (summary) => summary.id !== nextSummary.id,
  )
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
    runId: session.summary.lastBuildAt
      ? `${session.summary.id}-last-build`
      : `${session.summary.id}-idle`,
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
    structureSummary:
      "Run Inspect to refresh the session analysis for this document.",
    lastBuild: session.summary.hasPreview
      ? deriveBuildSummary(session)
      : undefined,
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
  proposalSnapshot?: AgentShellMessage["proposalSnapshot"],
) {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    createdAt: new Date().toISOString(),
    text,
    kind,
    proposalSnapshot,
  }
}

function buildLocalProposalText(
  session: SessionDetail,
  build: BuildRunSummary,
  inspect: InspectSnapshot,
  logs: AppState["currentLogs"],
  draftSource: string,
) {
  const items: string[] = []

  if (draftSource !== session.source) {
    items.push(
      "[save] Save the current source changes before trusting the next build or proposal review.",
    )
  }

  if (!draftSource.includes("<page")) {
    items.push(
      "[build] Add a <page> root before the next build. The current draft is missing the required top-level structure.",
    )
  }

  if (draftSource.includes("className=")) {
    items.push(
      '[inspect] Remove "className" from the draft. agent-html documents should stay schema-level and not carry raw UI props.',
    )
  }

  if (inspect.diagnostics.length > 0) {
    items.push(
      `[inspect] Resolve ${inspect.diagnostics.length} inspect diagnostic(s) before sharing the next artifact.`,
    )
  }

  if (build.status === "failed") {
    items.push(
      "[build] Read stderr first, then rebuild once the source issues or runtime failure are understood.",
    )
  } else if (!session.summary.hasPreview) {
    items.push(
      "[build] Run Build to generate the first preview artifact for this session.",
    )
  } else if (session.summary.status === "dirty") {
    items.push(
      "[build] Rebuild the session so Preview and Inspect reflect the latest saved source.",
    )
  } else {
    items.push(
      "[review] Compare the current preview artifact against the source intent and confirm the recommendation still holds.",
    )
  }

  if (logs.stderr?.trim()) {
    items.push(
      "[inspect] Keep the latest stderr log open while editing. It contains the fastest explanation path for build or inspect failures.",
    )
  } else if (logs.stdout?.trim()) {
    items.push(
      "[review] Use the captured stdout summary as the artifact baseline, then return to Source only if the preview diverges from the expected structure.",
    )
  }

  if (items.length === 0) {
    items.push(
      "[review] Keep the source, preview, and inspect summary aligned before making the next artifact decision.",
    )
  }

  return [
    `Proposal for ${session.summary.name}`,
    ...items.map((item) => `- ${item}`),
  ].join("\n")
}

function buildProposalDecisionMessage(
  proposalText: string,
  status: "approved" | "needs changes",
) {
  const [titleLine] = proposalText.split(/\r?\n/).filter(Boolean)
  const proposalTitle =
    titleLine?.replace(/^Proposal for\s+/, "").trim() || "Unknown proposal"

  return [
    "Proposal decision",
    `- Proposal: ${proposalTitle}`,
    `- Status: ${status}`,
  ].join("\n")
}

function buildEventMessage(build: BuildRunSummary) {
  const details: string[] = [`- Status: ${build.status}`]

  if (build.previewPath) {
    details.push(`- Preview: ${build.previewPath}`)
  }

  if (typeof build.exitCode === "number") {
    details.push(`- Exit code: ${build.exitCode}`)
  }

  return ["Build update", ...details].join("\n")
}

function buildSourceSavedEventMessage(
  source: string,
  comparison?: ReturnType<typeof getSourceComparisonSummary>,
) {
  const details = [`- Lines: ${source.split(/\r?\n/).length}`]

  if (comparison) {
    details.push(`- Changed lines: ${comparison.changedLineCount}`)
    if (comparison.firstChangedLine) {
      details.push(`- First change: line ${comparison.firstChangedLine}`)
    }
  }

  return ["Source saved", ...details].join("\n")
}

function inspectEventMessage(inspect: InspectSnapshot) {
  const diagnosticsCount = inspect.diagnostics.length
  const summary =
    diagnosticsCount > 0
      ? `${diagnosticsCount} diagnostic(s)`
      : "no structured diagnostics"
  return [
    "Inspect update",
    `- Diagnostics: ${summary}`,
    `- Structure: ${inspect.structureSummary}`,
  ].join("\n")
}

function RuntimeBanner({ report }: { report: RuntimeReport }) {
  return (
    <SurfaceCard className="runtime-banner" variant="banner">
      <SurfaceCardHeader
        eyebrow="Runtime health"
        title={
          report.status === "ok"
            ? "Managed runtime ready"
            : "Managed runtime has failures"
        }
      >
        <div className="runtime-banner-meta">
          <StatusBadge>ok {report.counts.ok}</StatusBadge>
          <StatusBadge tone="dirty">warn {report.counts.warn}</StatusBadge>
          <StatusBadge tone="error">fail {report.counts.fail}</StatusBadge>
        </div>
      </SurfaceCardHeader>
      <SurfaceCardBody className="sr-only">
        Runtime health summary
      </SurfaceCardBody>
    </SurfaceCard>
  )
}
