"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { useTheme } from "next-themes"
import type { BundledLanguage, BundledTheme } from "shiki"

import { cn } from "@/lib/cn"

type LineStatus = "normal" | "add" | "remove"

type CodeToken = {
  content: string
  color?: string
  fontStyle?: number
}

type HighlightedLine = {
  tokens: CodeToken[]
  status: LineStatus
  focused: boolean
}

type HighlightedCode = {
  bg?: string
  fg?: string
  lines: HighlightedLine[]
}

type HighlightedComparison = {
  before: HighlightedCode
  after: HighlightedCode
}

type TokenizedCode = {
  tokens: CodeToken[][]
  bg?: string
  fg?: string
}

interface CodeComparisonProps {
  beforeCode: string
  afterCode: string
  language: BundledLanguage
  lightTheme: BundledTheme
  darkTheme: BundledTheme
  highlightColor?: string
  beforeLabel?: string
  afterLabel?: string
  beforeTokens: number
  afterTokens: number
}

export function CodeComparison({
  beforeCode,
  afterCode,
  language,
  lightTheme,
  darkTheme,
  highlightColor = "rgba(101, 117, 133, 0.16)",
  beforeLabel = "html",
  afterLabel = "agent-html",
  beforeTokens,
  afterTokens,
}: CodeComparisonProps) {
  const { theme, systemTheme } = useTheme()
  const [highlighted, setHighlighted] = useState<HighlightedComparison | null>(
    null,
  )

  const selectedTheme = useMemo(() => {
    const currentTheme = theme === "system" ? systemTheme : theme
    return currentTheme === "dark" ? darkTheme : lightTheme
  }, [theme, systemTheme, darkTheme, lightTheme])

  const hasLeftFocus =
    highlighted?.before.lines.some((line) => line.focused) ?? false
  const hasRightFocus =
    highlighted?.after.lines.some((line) => line.focused) ?? false

  useEffect(() => {
    let cancelled = false

    async function highlightCode() {
      const { beforeStatuses, afterStatuses } = buildLineStatuses(
        beforeCode,
        afterCode,
      )

      try {
        const { codeToTokens } = await import("shiki")
        const [beforeTokens, afterTokens] = await Promise.all([
          codeToTokens(beforeCode, {
            lang: language,
            theme: selectedTheme,
          }),
          codeToTokens(afterCode, {
            lang: language,
            theme: selectedTheme,
          }),
        ])

        if (cancelled) {
          return
        }

        setHighlighted({
          before: createHighlightedCode(beforeTokens, beforeStatuses),
          after: createHighlightedCode(afterTokens, afterStatuses),
        })
      } catch (error) {
        console.error("Error highlighting code:", error)

        if (cancelled) {
          return
        }

        setHighlighted({
          before: createPlainTextCode(beforeCode, beforeStatuses),
          after: createPlainTextCode(afterCode, afterStatuses),
        })
      }
    }

    highlightCode()

    return () => {
      cancelled = true
    }
  }, [beforeCode, afterCode, language, selectedTheme])

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="group border-border relative w-full overflow-hidden rounded-xl border">
        <div className="relative grid md:grid-cols-2">
          <div
            className={cn(
              "leftside group/left border-primary/20 md:border-r",
              hasLeftFocus &&
                "[&_.comparison-line:not(.focused)]:opacity-50 [&_.comparison-line:not(.focused)]:blur-[0.095rem]",
            )}
          >
            <div className="border-primary/20 bg-accent text-foreground flex items-center gap-2 border-b p-2 text-sm">
              <span className="font-medium text-foreground">{beforeLabel}</span>
              <span className="ml-auto text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {beforeTokens} tokens
              </span>
            </div>
            {renderCode(
              beforeCode,
              highlighted?.before ?? null,
              highlightColor,
            )}
          </div>

          <div
            className={cn(
              "rightside group/right border-primary/20 border-t md:border-t-0",
              hasRightFocus &&
                "[&_.comparison-line:not(.focused)]:opacity-50 [&_.comparison-line:not(.focused)]:blur-[0.095rem]",
            )}
          >
            <div className="border-primary/20 bg-accent text-foreground flex items-center gap-2 border-b p-2 text-sm">
              <span className="font-medium text-foreground">{afterLabel}</span>
              <span className="ml-auto text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {afterTokens} tokens
              </span>
            </div>
            {renderCode(afterCode, highlighted?.after ?? null, highlightColor)}
          </div>
        </div>

        <div className="border-primary/20 bg-accent text-foreground absolute top-1/2 left-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border text-xs md:flex">
          VS
        </div>
      </div>
    </div>
  )
}

function renderCode(
  code: string,
  highlighted: HighlightedCode | null,
  highlightColor: string,
) {
  if (!highlighted) {
    return (
      <pre className="bg-background text-foreground h-full overflow-auto p-4 font-mono text-xs whitespace-pre">
        {code}
      </pre>
    )
  }

  return (
    <div
      style={
        {
          "--highlight-color": highlightColor,
          backgroundColor: highlighted.bg,
          color: highlighted.fg,
        } as CSSProperties
      }
      className={cn(
        "h-full w-full overflow-auto font-mono text-xs",
        "group-hover/left:[&_.comparison-line:not(.focused)]:opacity-100 group-hover/left:[&_.comparison-line:not(.focused)]:blur-none",
        "group-hover/right:[&_.comparison-line:not(.focused)]:opacity-100 group-hover/right:[&_.comparison-line:not(.focused)]:blur-none",
      )}
    >
      <pre className="m-0 h-full py-2">
        <code className="inline-block min-w-full">
          {highlighted.lines.map((line, index) => (
            <span
              key={`line-${index}`}
              className={cn(
                "comparison-line block min-w-full w-max px-4 py-0.5 transition-all duration-300",
                line.focused && "focused",
                line.status === "add" && "bg-[rgba(16,185,129,.16)]",
                line.status === "remove" && "bg-[rgba(244,63,94,.16)]",
              )}
              style={
                line.focused
                  ? { boxShadow: "inset 2px 0 0 var(--highlight-color)" }
                  : undefined
              }
            >
              {line.tokens.length > 0 ? (
                line.tokens.map((token, tokenIndex) => (
                  <span
                    key={`token-${index}-${tokenIndex}`}
                    style={getTokenStyle(token)}
                  >
                    {token.content}
                  </span>
                ))
              ) : (
                <span>&nbsp;</span>
              )}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function buildLineStatuses(beforeCode: string, afterCode: string) {
  const beforeLines = beforeCode.split("\n")
  const afterLines = afterCode.split("\n")
  const matrix = Array.from({ length: beforeLines.length + 1 }, () =>
    Array<number>(afterLines.length + 1).fill(0),
  )

  for (
    let beforeIndex = beforeLines.length - 1;
    beforeIndex >= 0;
    beforeIndex -= 1
  ) {
    for (
      let afterIndex = afterLines.length - 1;
      afterIndex >= 0;
      afterIndex -= 1
    ) {
      if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
        matrix[beforeIndex][afterIndex] =
          matrix[beforeIndex + 1][afterIndex + 1] + 1
      } else {
        matrix[beforeIndex][afterIndex] = Math.max(
          matrix[beforeIndex + 1][afterIndex],
          matrix[beforeIndex][afterIndex + 1],
        )
      }
    }
  }

  const beforeStatuses = Array<LineStatus>(beforeLines.length).fill("normal")
  const afterStatuses = Array<LineStatus>(afterLines.length).fill("normal")

  let beforeIndex = 0
  let afterIndex = 0

  while (beforeIndex < beforeLines.length && afterIndex < afterLines.length) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      beforeIndex += 1
      afterIndex += 1
      continue
    }

    if (
      matrix[beforeIndex + 1][afterIndex] >= matrix[beforeIndex][afterIndex + 1]
    ) {
      beforeStatuses[beforeIndex] = "remove"
      beforeIndex += 1
      continue
    }

    afterStatuses[afterIndex] = "add"
    afterIndex += 1
  }

  while (beforeIndex < beforeLines.length) {
    beforeStatuses[beforeIndex] = "remove"
    beforeIndex += 1
  }

  while (afterIndex < afterLines.length) {
    afterStatuses[afterIndex] = "add"
    afterIndex += 1
  }

  return { beforeStatuses, afterStatuses }
}

function createHighlightedCode(
  tokenizedCode: TokenizedCode,
  statuses: LineStatus[],
): HighlightedCode {
  const lineCount = Math.max(tokenizedCode.tokens.length, statuses.length)

  return {
    bg: tokenizedCode.bg,
    fg: tokenizedCode.fg,
    lines: Array.from({ length: lineCount }, (_, index) => {
      const status = statuses[index] ?? "normal"

      return {
        tokens: tokenizedCode.tokens[index] ?? [],
        status,
        focused: status !== "normal",
      }
    }),
  }
}

function createPlainTextCode(
  source: string,
  statuses: LineStatus[],
): HighlightedCode {
  const lines = source.split("\n")

  return {
    lines: lines.map((line, index) => {
      const status = statuses[index] ?? "normal"

      return {
        tokens: line.length > 0 ? [{ content: line }] : [],
        status,
        focused: status !== "normal",
      }
    }),
  }
}

function getTokenStyle(token: CodeToken): CSSProperties {
  const textDecorations: string[] = []

  if ((token.fontStyle ?? 0) & 4) {
    textDecorations.push("underline")
  }

  if ((token.fontStyle ?? 0) & 8) {
    textDecorations.push("line-through")
  }

  return {
    color: token.color,
    fontStyle: (token.fontStyle ?? 0) & 1 ? "italic" : undefined,
    fontWeight: (token.fontStyle ?? 0) & 2 ? 600 : undefined,
    textDecorationLine:
      textDecorations.length > 0 ? textDecorations.join(" ") : undefined,
  }
}
