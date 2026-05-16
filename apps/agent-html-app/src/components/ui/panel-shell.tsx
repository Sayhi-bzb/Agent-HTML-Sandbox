import type { ElementType, ReactNode } from "react"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PanelShellVariant = "sidebar" | "workbench" | "agent-shell"

type PanelShellProps<T extends ElementType> = {
  as?: T
  children: ReactNode
  className?: string
  variant?: PanelShellVariant
}

type PanelShellHeaderProps = {
  title: string
  eyebrow?: string
  children?: ReactNode
  className?: string
}

const panelClassNameByVariant: Record<PanelShellVariant, string> = {
  sidebar: "sidebar",
  workbench: "workbench-shell",
  "agent-shell": "agent-shell",
}

export function PanelShell<T extends ElementType = "div">({
  as,
  children,
  className,
  variant = "workbench",
}: PanelShellProps<T>) {
  const Comp = (as ?? "div") as ElementType

  return (
    <Card
      asChild
      className={cn("panel", panelClassNameByVariant[variant], className)}
    >
      <Comp>{children}</Comp>
    </Card>
  )
}

export function PanelShellHeader({
  title,
  eyebrow,
  children,
  className,
}: PanelShellHeaderProps) {
  return (
    <CardHeader className={cn("panel-header", className)}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <CardTitle>{title}</CardTitle>
      </div>
      {children}
    </CardHeader>
  )
}
