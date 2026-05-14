"use client"

import type { ReactNode } from "react"

type ComparisonCardProps = {
  title: string
  description: string
  source: string
  sourceLabel: string
  authoringTokens: number
  viewMode: "raw" | "rendered"
  children: ReactNode
}

export function ComparisonCard({
  title,
  description,
  source,
  sourceLabel,
  authoringTokens,
  viewMode,
  children,
}: ComparisonCardProps) {
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
        <div
          className="mt-5 overflow-hidden rounded-xl border bg-muted/20"
        >
          <div className="flex items-center justify-between border-b px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>{title}</span>
            <span>{sourceLabel}</span>
          </div>
          <pre className="max-h-[26rem] min-h-[26rem] overflow-auto p-4 text-[12px] leading-6 text-foreground">
            <code>{source}</code>
          </pre>
        </div>
      ) : (
        <div className="mt-5 min-h-[26rem] rounded-xl border bg-background p-4">
          {children}
        </div>
      )}
    </article>
  )
}
