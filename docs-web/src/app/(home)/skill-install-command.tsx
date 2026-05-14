"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"

const installCommand = "npx skills add Sayhi-bzb/Agent-HTML --skill ahtml"

export function SkillInstallCommand() {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(installCommand)
      setCopied(true)

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }

      resetTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        resetTimerRef.current = null
      }, 1600)
    } catch (error) {
      console.error("Failed to copy install command:", error)
    }
  }

  return (
    <div className="mt-6 max-w-2xl">
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <code className="block w-max text-sm text-foreground">
            {installCommand}
          </code>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied install command" : "Copy install command"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  )
}
