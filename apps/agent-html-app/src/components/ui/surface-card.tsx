import type { ComponentProps } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SurfaceCardVariant =
  | "workbench"
  | "context"
  | "validation"
  | "summary"
  | "artifact"
  | "session"
  | "message"
  | "banner"

type SurfaceCardProps = ComponentProps<typeof Card> & {
  variant?: SurfaceCardVariant
}

type SurfaceCardHeaderProps = ComponentProps<"div"> & {
  title?: string
  eyebrow?: string
}

const cardClassNameByVariant: Record<SurfaceCardVariant, string> = {
  workbench: "workbench-card gap-4 py-0",
  context: "context-card gap-4 py-0",
  validation: "validation-card gap-3 py-0",
  summary: "inspect-summary-card gap-3 py-0",
  artifact: "artifact-card gap-3 py-0",
  session: "session-card gap-3 px-[14px] py-[14px]",
  message: "message-card gap-3 px-[14px] py-[14px]",
  banner: "gap-3 py-0",
}

export function SurfaceCard({
  className,
  variant = "workbench",
  ...props
}: SurfaceCardProps) {
  return (
    <Card
      className={cn(cardClassNameByVariant[variant], className)}
      size="sm"
      {...props}
    />
  )
}

export function SurfaceCardHeader({
  children,
  className,
  eyebrow,
  title,
  ...props
}: SurfaceCardHeaderProps) {
  return (
    <CardHeader className={cn("workbench-card-header", className)} {...props}>
      {eyebrow || title ? (
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <CardTitle>{title}</CardTitle> : null}
        </div>
      ) : null}
      {children}
    </CardHeader>
  )
}

export function SurfaceCardBody({
  className,
  ...props
}: ComponentProps<typeof CardContent>) {
  return <CardContent className={cn("px-0", className)} {...props} />
}
