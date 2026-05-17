import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusBadgeTone =
  | "default"
  | "accent"
  | "ready"
  | "dirty"
  | "error"
  | "building"

type StatusBadgeProps = {
  children: ReactNode
  className?: string
  tone?: StatusBadgeTone
}

const toneClassName: Record<StatusBadgeTone, string> = {
  default: "border-border bg-secondary text-foreground hover:bg-secondary",
  accent: "border-border bg-secondary text-foreground hover:bg-secondary",
  ready: "border-border bg-secondary text-foreground hover:bg-secondary",
  dirty: "border-border bg-secondary text-foreground hover:bg-secondary",
  error:
    "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/10",
  building: "border-border bg-secondary text-foreground hover:bg-secondary",
}

export function StatusBadge({
  children,
  className,
  tone = "default",
}: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-[0.78rem] font-medium",
        toneClassName[tone],
        className,
      )}
      variant="secondary"
    >
      {children}
    </Badge>
  )
}
