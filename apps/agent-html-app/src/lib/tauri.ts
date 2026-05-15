import { invoke } from "@tauri-apps/api/core"

import type {
  AgentShellMessage,
  BuildRunSummary,
  InspectSnapshot,
  LogSnapshot,
  RuntimeReport,
  SessionDetail,
  SessionSummary,
  SourceValidationSnapshot,
} from "./types"

export type SessionCreateInput = {
  name: string
}

export type SessionRenameInput = {
  name: string
}

export type SessionPinInput = {
  pinned: boolean
}

export type SessionViewInput = {
  view: SessionDetail["currentView"]
}

export type AppendChatMessageInput = {
  role: AgentShellMessage["role"]
  text: string
  kind: AgentShellMessage["kind"]
}

export async function listSessions(): Promise<SessionSummary[]> {
  return invoke("list_sessions")
}

export async function createSession(input: SessionCreateInput): Promise<SessionDetail> {
  return invoke("create_session", { input })
}

export async function openSession(sessionId: string): Promise<SessionDetail> {
  return invoke("open_session", { sessionId })
}

export async function renameSession(sessionId: string, input: SessionRenameInput): Promise<SessionDetail> {
  return invoke("rename_session", { sessionId, input })
}

export async function setSessionPinned(sessionId: string, input: SessionPinInput): Promise<SessionDetail> {
  return invoke("set_session_pinned", { sessionId, input })
}

export async function deleteSession(sessionId: string): Promise<void> {
  return invoke("delete_session", { sessionId })
}

export async function setSessionView(sessionId: string, input: SessionViewInput): Promise<SessionDetail> {
  return invoke("set_session_view", { sessionId, input })
}

export async function saveSource(sessionId: string, source: string): Promise<SessionDetail> {
  return invoke("save_source", { sessionId, source })
}

export async function runBuild(sessionId: string): Promise<BuildRunSummary> {
  return invoke("run_build", { sessionId })
}

export async function runInspect(sessionId: string): Promise<InspectSnapshot> {
  return invoke("run_inspect", { sessionId })
}

export async function validateSource(
  sessionId: string,
  source: string,
): Promise<SourceValidationSnapshot> {
  return invoke("validate_source", { sessionId, source })
}

export async function checkRuntime(): Promise<RuntimeReport> {
  return invoke("check_runtime")
}

export async function readPreviewHtml(sessionId: string): Promise<string> {
  return invoke("read_preview_html", { sessionId })
}

export async function readLogs(sessionId: string): Promise<LogSnapshot> {
  return invoke("read_logs", { sessionId })
}

export async function readChat(sessionId: string): Promise<AgentShellMessage[]> {
  return invoke("read_chat", { sessionId })
}

export async function appendChatMessage(
  sessionId: string,
  input: AppendChatMessageInput,
): Promise<AgentShellMessage[]> {
  return invoke("append_chat_message", { sessionId, input })
}

export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  return "__TAURI_INTERNALS__" in (window as Window & { __TAURI_INTERNALS__?: unknown })
}
