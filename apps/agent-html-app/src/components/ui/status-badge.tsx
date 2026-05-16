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
  default: "bg-[#edf2fb] text-[#30415f] hover:bg-[#edf2fb]",
  accent: "bg-[#dbeafe] text-[#1d4ed8] hover:bg-[#dbeafe]",
  ready: "bg-[#ddf8e8] text-[#116436] hover:bg-[#ddf8e8]",
  dirty: "bg-[#fff4d8] text-[#8a5a00] hover:bg-[#fff4d8]",
  error: "bg-[#ffe2e2] text-[#a42323] hover:bg-[#ffe2e2]",
  building: "bg-[#e4ebff] text-[#2649a7] hover:bg-[#e4ebff]",
}

export function StatusBadge({
  children,
  className,
  tone = "default",
}: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        "rounded-full border-transparent px-2.5 py-1 text-[0.78rem] font-medium",
        toneClassName[tone],
        className,
      )}
      variant="secondary"
    >
      {children}
    </Badge>
  )
}
