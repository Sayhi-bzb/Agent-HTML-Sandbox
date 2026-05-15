import { type FormEvent, useEffect, useState } from "react"

import { formatTimestampLabel } from "../../lib/time"
import type { AgentShellMessage, SessionDetail } from "../../lib/types"

type AgentShellProps = {
  session: SessionDetail
  messages: AgentShellMessage[]
  isSending: boolean
  onSend: (text: string) => Promise<void> | void
}

export function AgentShell({
  session,
  messages,
  isSending,
  onSend,
}: AgentShellProps) {
  const [draft, setDraft] = useState("")

  useEffect(() => {
    setDraft("")
  }, [session.summary.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) {
      return
    }

    await onSend(draft)
    setDraft("")
  }

  return (
    <aside className="panel agent-shell">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Agent</p>
          <h2>Shell</h2>
        </div>
        <span className="pill accent">Session-backed</span>
      </div>

      <section className="context-card">
        <p className="eyebrow">Session context</p>
        <h3>{session.summary.name}</h3>
        <dl className="key-value-grid compact">
          <dt>Status</dt>
          <dd>{session.summary.status}</dd>
          <dt>Source</dt>
          <dd>{session.sourcePath}</dd>
          <dt>Preview</dt>
          <dd>{session.previewPath ?? "none"}</dd>
        </dl>
      </section>

      <div className="message-list">
        {messages.map((message) => (
          <article className="message-card" key={message.id}>
            <div className="message-topline">
              <span className="pill">{message.role}</span>
              <span className="inline-meta">{formatTimestampLabel(message.createdAt)}</span>
            </div>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      <form className="composer-shell" onSubmit={handleSubmit}>
        <label htmlFor="agent-input">Future prompt</label>
        <textarea
          id="agent-input"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Store a prompt draft or note in this session."
          value={draft}
        />
        <button className="primary-button" disabled={isSending || !draft.trim()} type="submit">
          {isSending ? "Saving..." : "Store draft"}
        </button>
      </form>
    </aside>
  )
}
