"use client"

import type { ReactNode } from "react"

type SingleSourceCardProps = {
  title: string
  description: string
  source: string
  sourceLabel: string
  authoringTokens: number
  viewMode: "raw" | "rendered"
  children: ReactNode
}

type CompareSourceCardProps = {
  title: string
  description: string
  viewMode: "raw" | "rendered"
  children: ReactNode
}

export function SingleSourceCard({
  title,
  description,
  source,
  sourceLabel,
  authoringTokens,
  viewMode,
  children,
}: SingleSourceCardProps) {
  return (
    <article className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {authoringTokens} tokens
        </span>
      </div>

      {viewMode === "raw" ? (
        <SourcePanel
          title={title}
          source={source}
          sourceLabel={sourceLabel}
          authoringTokens={authoringTokens}
          className="mt-5"
        />
      ) : (
        <div className="mt-5 min-h-[30rem] rounded-xl border bg-background p-4">
          {children}
        </div>
      )}
    </article>
  )
}

export function CompareSourceCard({
  title,
  description,
  viewMode,
  children,
}: CompareSourceCardProps) {
  return (
    <article className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {viewMode === "rendered" ? (
        <div className="mt-5 min-h-[30rem] rounded-xl border bg-background p-4">
          {children}
        </div>
      ) : (
        <div className="mt-5">{children}</div>
      )}
    </article>
  )
}

function SourcePanel({
  title,
  source,
  sourceLabel,
  authoringTokens,
  className = "",
}: {
  title: string
  source: string
  sourceLabel: string
  authoringTokens: number
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border bg-muted/20 ${className}`.trim()}
    >
      <div className="flex items-center justify-between border-b px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium">
            {authoringTokens} tokens
          </span>
        </div>
        <span>{sourceLabel}</span>
      </div>
      <pre className="max-h-[30rem] min-h-[30rem] overflow-auto p-4 text-[12px] leading-6 text-foreground">
        <code>{source}</code>
      </pre>
    </div>
  )
}
