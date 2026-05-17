import { useEffect, useMemo, useRef, useState } from "react"
import { MoreHorizontalIcon, PinIcon } from "lucide-react"

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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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

type SessionSidebarItemProps = {
  session: SessionSummary
  active: boolean
  isBusy: boolean
  onOpenSession: (sessionId: string) => void
  onRequestRename: (session: SessionSummary) => void
  onTogglePinSession: (sessionId: string, pinned: boolean) => void
  onRequestDelete: (session: SessionSummary) => void
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
      <PanelShellHeader className="panel-header-compact">
        <div className="session-toolbar session-toolbar-inline">
          <label className="search-shell session-search session-search-inline">
            <span className="sr-only">Search sessions</span>
            <Input
              ref={searchInputRef}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              value={query}
            />
          </label>
          <Button
            disabled={isBusy}
            onClick={onCreateSession}
            size="sm"
            type="button"
            variant="outline"
          >
            New
          </Button>
        </div>
      </PanelShellHeader>

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
                  <SessionSidebarItem
                    active={session.id === activeSessionId}
                    isBusy={isBusy}
                    key={session.id}
                    onOpenSession={onOpenSession}
                    onRequestDelete={handleDeleteSession}
                    onRequestRename={handleRenameSession}
                    onTogglePinSession={onTogglePinSession}
                    session={session}
                  />
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

function SessionSidebarItem({
  session,
  active,
  isBusy,
  onOpenSession,
  onRequestRename,
  onTogglePinSession,
  onRequestDelete,
}: SessionSidebarItemProps) {
  const triggerRef = useRef<HTMLDivElement>(null)

  function openContextMenuAtButton() {
    const trigger = triggerRef.current
    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    trigger.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: rect.right - 12,
        clientY: rect.top + 12,
        view: window,
      }),
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          aria-current={active ? "true" : undefined}
          className="session-card-shell"
          onClick={() => onOpenSession(session.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onOpenSession(session.id)
            }
          }}
          ref={triggerRef}
          role="button"
          tabIndex={0}
        >
          <SurfaceCard
            className={
              active
                ? "session-card active session-card-compact"
                : "session-card session-card-compact"
            }
            variant="session"
          >
            <div className="session-card-topline session-card-topline-compact">
              <div className="session-card-title-row">
                <h3>{session.name}</h3>
                {session.pinned ? (
                  <span
                    aria-label="Pinned session"
                    className="session-pin-indicator"
                    title="Pinned"
                  >
                    <PinIcon />
                  </span>
                ) : null}
              </div>
              <Button
                aria-label={`More actions for ${session.name}`}
                className="session-card-more"
                disabled={isBusy}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  openContextMenuAtButton()
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <MoreHorizontalIcon />
              </Button>
            </div>
            <div className="session-meta-row session-meta-row-compact">
              <StatusBadge tone={statusTone(session.status)}>
                {statusLabel[session.status]}
              </StatusBadge>
              <span className="session-preview-meta">
                {getSessionPreviewStatusText(session)}
              </span>
            </div>
          </SurfaceCard>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="session-context-menu" sideOffset={10}>
        <ContextMenuItem onSelect={() => onOpenSession(session.id)}>
          Open
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isBusy}
          onSelect={() => onTogglePinSession(session.id, !session.pinned)}
        >
          {session.pinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isBusy}
          onSelect={() => onRequestRename(session)}
        >
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          disabled={isBusy}
          onSelect={() => onRequestDelete(session)}
        >
          Delete
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Details</ContextMenuLabel>
        <ContextMenuItem className="session-context-detail" disabled>
          <span className="session-context-detail-label">Path</span>
          <span className="session-context-detail-value">
            {session.directory}
          </span>
        </ContextMenuItem>
        <ContextMenuItem className="session-context-detail" disabled>
          <span className="session-context-detail-label">Updated</span>
          <span className="session-context-detail-value">
            {formatTimestampLabel(session.updatedAt)}
          </span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
