import { startTransition, useEffect, useRef, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
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
import { formatAppError } from "./lib/app-error"
import { hydrateDiagnosticPositions } from "./lib/diagnostic-position"
import {
  createMockBuildArtifacts,
  createMockInspectArtifacts,
  createMockValidationSnapshot,
} from "./lib/mock-runtime"
import {
  sortSessionSummaries,
  upsertSessionSummary,
} from "./lib/session-summary"
import {
  buildEventMessage,
  buildLocalProposalText,
  buildSourceSavedEventMessage,
  inspectEventMessage,
} from "./lib/session-messages"
import {
  beginBuildRun,
  applyBuildCommandFailure,
  applyCommandFailureToSession,
  applyBuildResultToSession,
  applyInspectResultToSession,
  applySourceSaveToSession,
  deriveBuildSummaryFromSession,
  deriveInspectSnapshotFromSession,
  syncInspectSnapshotWithBuild,
} from "./lib/session-build"
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
  AppState,
  BuildRunSummary,
  InspectSnapshot,
  SourceValidationSnapshot,
  SourceValidationState,
  SessionDetail,
  RuntimeReport,
  WorkbenchView,
} from "./lib/types"

type CommandState = {
  loading: boolean
  savingSource: boolean
  sendingMessage: boolean
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
    commandState.draftingProposal ||
    commandState.runningBuild ||
    commandState.runningInspect ||
    commandState.runningDoctor

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const syncTheme = () => {
      document.documentElement.classList.toggle("dark", mediaQuery.matches)
    }

    syncTheme()
    mediaQuery.addEventListener("change", syncTheme)

    return () => {
      mediaQuery.removeEventListener("change", syncTheme)
    }
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
            diagnostics: hydrateDiagnosticPositions(
              result.diagnostics,
              currentDraftSource,
            ),
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
          setActiveView(nextState.session.currentView)
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
        setActiveView(nextState.session.currentView)
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
          sessions: sortSessionSummaries([
            nextState.session.summary,
            ...current.sessions,
          ]),
          chat: nextState.chat,
          currentBuild: deriveBuildSummary(nextState.session),
          currentInspect: deriveInspectSnapshot(nextState.session),
          currentSession: nextState.session,
          currentLogs: nextState.logs,
        }))
        setPreviewHtml(nextState.previewHtml)
        setActiveView(nextState.session.currentView)
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
        setActiveView(nextState.session.currentView)
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
          setActiveView(nextState.session.currentView)
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
          setActiveView(nextState.session.currentView)
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
      startTransition(() => {
        setAppState((current) => {
          const savedAt = new Date().toISOString()
          const nextSession = applySourceSaveToSession(
            current.currentSession,
            nextSource,
            savedAt,
          )

          return {
            ...current,
            chat: [
              ...current.chat,
              createLocalChatMessage(
                "system",
                buildSourceSavedEventMessage(nextSource, comparison),
                "context-card",
              ),
            ],
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
      })
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
      startTransition(() => {
        setAppState((current) => {
          const savedAt = new Date().toISOString()
          const nextSession = applySourceSaveToSession(
            current.currentSession,
            currentDraftSource,
            savedAt,
          )

          return {
            ...current,
            chat: [
              ...current.chat,
              createLocalChatMessage(
                "system",
                buildSourceSavedEventMessage(currentDraftSource, comparison),
                "context-card",
              ),
            ],
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
      })
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
      const sourceForRun = currentDraftSource
      await persistCurrentDraftIfNeeded()
      const {
        build,
        logs,
        previewHtml: nextPreviewHtml,
      } = createMockBuildArtifacts({
        session: {
          ...appState.currentSession,
          source: sourceForRun,
        },
        source: sourceForRun,
      })

      startTransition(() => {
        setAppState((current) => {
          const nextSession = applyBuildResultToSession(
            {
              ...current.currentSession,
              source: sourceForRun,
            },
            build,
          )

          return {
            ...current,
            chat: [
              ...current.chat,
              createLocalChatMessage(
                "system",
                buildEventMessage(build),
                "context-card",
              ),
            ],
            currentBuild: build,
            currentLogs: logs,
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
        setPreviewHtml(
          build.status === "succeeded" ? nextPreviewHtml : previewHtml,
        )
      })
      setActiveView(build.status === "succeeded" ? "preview" : "inspect")
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
        const startedAt = new Date().toISOString()
        const nextRun = beginBuildRun(
          current.currentSession,
          startedAt,
          `build-pending-${Date.now()}`,
        )

        return {
          ...current,
          currentBuild: nextRun.build,
          currentInspect: syncInspectSnapshotWithBuild(
            current.currentInspect,
            nextRun.build,
          ),
          currentSession: nextRun.session,
          sessions: upsertSessionSummary(
            current.sessions,
            nextRun.session.summary,
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
          const nextSession = applyBuildResultToSession(
            current.currentSession,
            build,
          )

          return {
            ...current,
            chat: nextChat,
            currentBuild: build,
            currentInspect: syncInspectSnapshotWithBuild(
              current.currentInspect,
              build,
            ),
            currentLogs: nextLogs,
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
        setPreviewHtml(nextPreviewHtml)
        setActiveView(build.status === "succeeded" ? "preview" : "inspect")
      })
    } catch (error) {
      const failedAt = new Date().toISOString()
      startTransition(() => {
        setAppState((current) => {
          const nextBuild = applyBuildCommandFailure(
            current.currentBuild,
            failedAt,
          )
          const nextSession = applyCommandFailureToSession(
            current.currentSession,
            failedAt,
            {
              lastBuild: nextBuild,
            },
          )

          return {
            ...current,
            currentBuild: nextBuild,
            currentInspect: syncInspectSnapshotWithBuild(
              current.currentInspect,
              nextBuild,
            ),
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
        setActiveView("inspect")
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
      const sourceForRun = currentDraftSource
      await persistCurrentDraftIfNeeded()
      const { inspect, logs } = createMockInspectArtifacts({
        build: appState.currentBuild,
        session: {
          ...appState.currentSession,
          source: sourceForRun,
        },
        source: sourceForRun,
      })

      startTransition(() => {
        setAppState((current) => {
          const nextSession = applyInspectResultToSession(
            {
              ...current.currentSession,
              source: sourceForRun,
            },
            inspect,
            inspect.lastBuild ?? current.currentBuild,
          )

          return {
            ...current,
            chat: [
              ...current.chat,
              createLocalChatMessage(
                "system",
                inspectEventMessage(inspect),
                "context-card",
              ),
            ],
            currentInspect: inspect,
            currentLogs: logs,
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
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
      const hydratedInspect = {
        ...inspect,
        diagnostics: hydrateDiagnosticPositions(
          inspect.diagnostics,
          appState.currentSession.source,
        ),
      }
      const nextPreviewHtml = await safeReadPreviewHtml(
        appState.currentSession.summary.id,
      )
      const nextLogs = await safeReadLogs(appState.currentSession.summary.id)
      let nextChat = appState.chat
      try {
        nextChat = await appendChatMessage(appState.currentSession.summary.id, {
          role: "system",
          text: inspectEventMessage(hydratedInspect),
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
          const build = hydratedInspect.lastBuild ?? current.currentBuild
          const nextSession = applyInspectResultToSession(
            current.currentSession,
            hydratedInspect,
            build,
          )

          return {
            ...current,
            chat: nextChat,
            currentBuild: build,
            currentInspect: hydratedInspect,
            currentLogs: nextLogs,
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
        setPreviewHtml(nextPreviewHtml)
        setActiveView("inspect")
      })
    } catch (error) {
      const failedAt = new Date().toISOString()
      startTransition(() => {
        setAppState((current) => {
          const nextSession = applyCommandFailureToSession(
            current.currentSession,
            failedAt,
          )

          return {
            ...current,
            currentSession: nextSession,
            sessions: upsertSessionSummary(
              current.sessions,
              nextSession.summary,
            ),
          }
        })
        setActiveView("inspect")
      })
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
        sessions: upsertSessionSummary(current.sessions, session.summary),
      }))
    })
  }

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-brand">
          <strong>agent-html</strong>
        </div>
        <div className="topbar-meta">
          <Button
            disabled={commandState.runningDoctor}
            onClick={() => {
              void handleDoctor()
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {commandState.runningDoctor ? "Checking..." : "Doctor"}
          </Button>
          <StatusBadge>{isTauriRuntime() ? "Tauri" : "Mock"}</StatusBadge>
          {commandState.error ? (
            <StatusBadge tone="error">Error</StatusBadge>
          ) : null}
        </div>
      </header>

      {commandState.error ? (
        <SurfaceCard className="error-banner" variant="banner">
          <SurfaceCardBody className="py-4" padding="compact">
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

      <ResizablePanelGroup className="app-shell" orientation="horizontal">
        <ResizablePanel className="app-pane" defaultSize={18} minSize={14}>
          <SessionsSidebar
            activeSessionId={appState.currentSession.summary.id}
            isBusy={isSidebarBusy}
            onCreateSession={() => {
              void handleCreateSession()
            }}
            onDeleteSession={(sessionId) => {
              void handleDeleteSession(sessionId)
            }}
            onOpenSession={(sessionId) => {
              void handleOpenSession(sessionId)
            }}
            onRenameSession={(sessionId, name) => {
              void handleRenameSession(sessionId, name)
            }}
            onTogglePinSession={(sessionId, pinned) => {
              void handleToggleSessionPin(sessionId, pinned)
            }}
            sessions={appState.sessions}
          />
        </ResizablePanel>
        <ResizableHandle className="app-shell-handle" withHandle />
        <ResizablePanel className="app-pane" defaultSize={52} minSize={34}>
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
            onViewChange={(view) => {
              void handleViewChange(view)
            }}
            previewHtml={previewHtml}
            proposalComparison={proposalComparison}
            session={appState.currentSession}
          />
        </ResizablePanel>
        <ResizableHandle className="app-shell-handle" withHandle />
        <ResizablePanel className="app-pane" defaultSize={30} minSize={20}>
          <AgentShell
            activeView={activeView}
            activeSourceFocusReviewStatus={sourceFocusReviewStatus}
            build={appState.currentBuild}
            sourceValidation={currentSourceValidation}
            draftComparison={draftComparison}
            hasUnsavedSourceChanges={hasUnsavedSourceChanges}
            inspect={appState.currentInspect}
            isRunningBuild={commandState.runningBuild}
            isRunningInspect={commandState.runningInspect}
            isSavingSource={commandState.savingSource}
            onBuild={handleBuild}
            onInspect={handleInspect}
            onOpenView={handleViewChange}
            onOpenSourceFocus={handleOpenSourceFocus}
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
        </ResizablePanel>
      </ResizablePanelGroup>
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

function formatError(error: unknown) {
  return formatAppError(error)
}

function deriveBuildSummary(session: SessionDetail): BuildRunSummary {
  return deriveBuildSummaryFromSession(session)
}

function deriveInspectSnapshot(session: SessionDetail): InspectSnapshot {
  return deriveInspectSnapshotFromSession(session)
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

function RuntimeBanner({ report }: { report: RuntimeReport }) {
  return (
    <SurfaceCard className="runtime-banner" variant="banner">
      <SurfaceCardHeader title="Runtime">
        <div className="runtime-banner-meta">
          <StatusBadge>ok {report.counts.ok}</StatusBadge>
          <StatusBadge tone="dirty">warn {report.counts.warn}</StatusBadge>
          <StatusBadge tone="error">fail {report.counts.fail}</StatusBadge>
        </div>
      </SurfaceCardHeader>
      <SurfaceCardBody className="sr-only" padding="none">
        Runtime health summary
      </SurfaceCardBody>
    </SurfaceCard>
  )
}
