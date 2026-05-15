import { useState } from "react"

import type { SessionSummary } from "../../lib/types"
import { formatTimestampLabel } from "../../lib/time"

type SessionsSidebarProps = {
  sessions: SessionSummary[]
  activeSessionId: string
  isBusy: boolean
  onCreateSession: () => void
  onOpenSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, name: string) => void
  onTogglePinSession: (sessionId: string, pinned: boolean) => void
  onDeleteSession: (sessionId: string) => void
}

const statusLabel: Record<SessionSummary["status"], string> = {
  draft: "Draft",
  dirty: "Dirty",
  building: "Building",
  error: "Error",
  ready: "Ready",
}

export function SessionsSidebar({
  sessions,
  activeSessionId,
  isBusy,
  onCreateSession,
  onOpenSession,
  onRenameSession,
  onTogglePinSession,
  onDeleteSession,
}: SessionsSidebarProps) {
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredSessions = sessions.filter((session) => {
    if (!normalizedQuery) {
      return true
    }

    return (
      session.name.toLowerCase().includes(normalizedQuery) ||
      session.directory.toLowerCase().includes(normalizedQuery)
    )
  })

  function handleRenameSession(session: SessionSummary) {
    const nextName = window.prompt("Rename session", session.name)
    if (typeof nextName !== "string") {
      return
    }

    const trimmed = nextName.trim()
    if (!trimmed || trimmed === session.name) {
      return
    }

    onRenameSession(session.id, trimmed)
  }

  function handleDeleteSession(session: SessionSummary) {
    const confirmed = window.confirm(`Delete session "${session.name}"? This removes the local folder.`)
    if (!confirmed) {
      return
    }

    onDeleteSession(session.id)
  }

  return (
    <aside className="panel sidebar">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Sessions</h2>
        </div>
        <button className="ghost-button" disabled={isBusy} onClick={onCreateSession} type="button">
          New
        </button>
      </div>

      <label className="search-shell">
        <span>Search</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find sessions"
          value={query}
        />
      </label>

      <div className="session-list">
        {filteredSessions.map((session) => (
          <article
            className={session.id === activeSessionId ? "session-card active" : "session-card"}
            key={session.id}
            onClick={() => onOpenSession(session.id)}
          >
            <div className="session-card-topline">
              <h3>{session.name}</h3>
              {session.pinned ? <span className="pill accent">Pinned</span> : null}
            </div>
            <p className="session-path">{session.directory}</p>
            <div className="session-meta-row">
              <span className={`pill status-${session.status}`}>{statusLabel[session.status]}</span>
              <span>{session.hasPreview ? "Has preview" : "No build yet"}</span>
            </div>
            <p className="session-updated-at">Updated {formatTimestampLabel(session.updatedAt)}</p>
            <div className="session-actions">
              <button
                className="mini-button"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenSession(session.id)
                }}
                type="button"
              >
                Open
              </button>
              <button
                className="mini-button"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  onTogglePinSession(session.id, !session.pinned)
                }}
                type="button"
              >
                {session.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                className="mini-button"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  handleRenameSession(session)
                }}
                type="button"
              >
                Rename
              </button>
              <button
                className="mini-button danger-button"
                disabled={isBusy}
                onClick={(event) => {
                  event.stopPropagation()
                  handleDeleteSession(session)
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {filteredSessions.length === 0 ? (
          <div className="session-card session-empty">
            <p>No sessions match the current filter.</p>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
