import { useEffect, useMemo, useRef, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PanelShell, PanelShellHeader } from "../ui/panel-shell"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusBadge } from "@/components/ui/status-badge"
import { SurfaceCard } from "../ui/surface-card"
import type { SessionSummary } from "../../lib/types"
import { getSessionPreviewStatusText } from "../../lib/preview-state"
import { formatTimestampLabel } from "../../lib/time"

type SessionsSidebarProps = {
  sessions: SessionSummary[]
  activeSessionId: string
  isBusy: boolean
  focusSearchKey?: string
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
  focusSearchKey,
  onCreateSession,
  onOpenSession,
  onRenameSession,
  onTogglePinSession,
  onDeleteSession,
}: SessionsSidebarProps) {
  const [query, setQuery] = useState("")
  const [renameSessionTarget, setRenameSessionTarget] =
    useState<SessionSummary>()
  const [renameDraft, setRenameDraft] = useState("")
  const [deleteSessionTarget, setDeleteSessionTarget] =
    useState<SessionSummary>()
  const searchInputRef = useRef<HTMLInputElement>(null)
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
  const groupedSessions = useMemo(() => {
    const current = filteredSessions.filter(
      (session) => session.id === activeSessionId,
    )
    const remaining = filteredSessions.filter(
      (session) => session.id !== activeSessionId,
    )
    const pinned = remaining.filter((session) => session.pinned)
    const active = remaining.filter((session) =>
      ["dirty", "building", "error"].includes(session.status),
    )
    const recent = remaining.filter(
      (session) =>
        !session.pinned &&
        !["dirty", "building", "error"].includes(session.status),
    )

    return [
      { id: "current", label: "Current", items: current },
      { id: "pinned", label: "Pinned", items: pinned },
      { id: "active", label: "Needs attention", items: active },
      { id: "recent", label: "Recent", items: recent },
    ].filter((group) => group.items.length > 0)
  }, [activeSessionId, filteredSessions])

  useEffect(() => {
    if (!focusSearchKey) {
      return
    }

    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [focusSearchKey])

  function handleRenameSession(session: SessionSummary) {
    setRenameSessionTarget(session)
    setRenameDraft(session.name)
  }

  function submitRenameSession() {
    if (!renameSessionTarget) {
      return
    }

    const trimmed = renameDraft.trim()
    if (!trimmed || trimmed === renameSessionTarget.name) {
      return
    }

    onRenameSession(renameSessionTarget.id, trimmed)
    setRenameSessionTarget(undefined)
    setRenameDraft("")
  }

  function handleDeleteSession(session: SessionSummary) {
    setDeleteSessionTarget(session)
  }

  return (
    <PanelShell as="aside" variant="sidebar">
      <PanelShellHeader title="Sessions">
        <Button
          disabled={isBusy}
          onClick={onCreateSession}
          size="sm"
          type="button"
          variant="outline"
        >
          New
        </Button>
      </PanelShellHeader>

      <label className="search-shell">
        <span className="sr-only">Search sessions</span>
        <Input
          ref={searchInputRef}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          value={query}
        />
      </label>

      <ScrollArea className="session-list-scroll">
        <div className="session-groups">
          {groupedSessions.map((group) => (
            <section className="session-group" key={group.id}>
              <div className="session-group-header">
                <span>{group.label}</span>
                <span className="inline-meta">{group.items.length}</span>
              </div>
              <div className="session-list">
                {group.items.map((session) => (
                  <SurfaceCard
                    className={
                      session.id === activeSessionId
                        ? "session-card active"
                        : "session-card"
                    }
                    key={session.id}
                    onClick={() => onOpenSession(session.id)}
                    variant="session"
                  >
                    <div className="session-card-topline">
                      <h3>{session.name}</h3>
                      {session.pinned ? (
                        <StatusBadge tone="accent">Pinned</StatusBadge>
                      ) : null}
                    </div>
                    <p className="session-path">{session.directory}</p>
                    <div className="session-meta-row">
                      <StatusBadge tone={statusTone(session.status)}>
                        {statusLabel[session.status]}
                      </StatusBadge>
                      <span>{getSessionPreviewStatusText(session)}</span>
                    </div>
                    <p className="session-updated-at">
                      {formatTimestampLabel(session.updatedAt)}
                    </p>
                    <div className="session-actions">
                      <Button
                        disabled={isBusy}
                        onClick={(event) => {
                          event.stopPropagation()
                          onTogglePinSession(session.id, !session.pinned)
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {session.pinned ? "Unpin" : "Pin"}
                      </Button>
                      <Button
                        disabled={isBusy}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRenameSession(session)
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Rename
                      </Button>
                      <Button
                        disabled={isBusy}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteSession(session)
                        }}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            </section>
          ))}
          {filteredSessions.length === 0 ? (
            <SurfaceCard
              className="session-card session-empty"
              variant="session"
            >
              <p>No matches</p>
            </SurfaceCard>
          ) : null}
        </div>
      </ScrollArea>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRenameSessionTarget(undefined)
            setRenameDraft("")
          }
        }}
        open={Boolean(renameSessionTarget)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            onChange={(event) => setRenameDraft(event.target.value)}
            value={renameDraft}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                setRenameSessionTarget(undefined)
                setRenameDraft("")
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!renameDraft.trim()}
              onClick={submitRenameSession}
              type="button"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSessionTarget(undefined)
          }
        }}
        open={Boolean(deleteSessionTarget)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSessionTarget
                ? `Delete "${deleteSessionTarget.name}"?`
                : "Delete this session?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => {
                  if (deleteSessionTarget) {
                    onDeleteSession(deleteSessionTarget.id)
                  }
                  setDeleteSessionTarget(undefined)
                }}
                type="button"
                variant="destructive"
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelShell>
  )
}

function statusTone(
  status: SessionSummary["status"],
): "dirty" | "building" | "error" | "ready" | "default" {
  switch (status) {
    case "dirty":
      return "dirty"
    case "building":
      return "building"
    case "error":
      return "error"
    case "ready":
      return "ready"
    default:
      return "default"
  }
}
