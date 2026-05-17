import type { ComponentProps } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SurfaceCardVariant =
  | "workbench"
  | "context"
  | "validation"
  | "summary"
  | "artifact"
  | "inset"
  | "session"
  | "message"
  | "banner"

type SurfaceCardProps = ComponentProps<typeof Card> & {
  variant?: SurfaceCardVariant
}

type SurfaceCardHeaderProps = ComponentProps<"div"> & {
  title?: string
  eyebrow?: string
  padding?: "comfortable" | "compact" | "tight"
}

type SurfaceCardBodyProps = ComponentProps<typeof CardContent> & {
  padding?: "comfortable" | "compact" | "tight" | "none"
}

const cardClassNameByVariant: Record<SurfaceCardVariant, string> = {
  workbench: "workbench-card",
  context: "context-card",
  validation: "validation-card",
  summary: "inspect-summary-card",
  artifact: "artifact-card",
  inset: "inset-card",
  session: "session-card",
  message: "message-card",
  banner: "banner-card",
}

const headerPaddingClassName = {
  comfortable: "px-5",
  compact: "px-4",
  tight: "px-3.5",
}

const bodyPaddingClassName = {
  comfortable: "px-5 pb-5",
  compact: "px-4 pb-4",
  tight: "px-3.5 pb-3.5",
  none: "px-0 pb-0",
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
  padding = "comfortable",
  title,
  ...props
}: SurfaceCardHeaderProps) {
  return (
    <CardHeader
      className={cn(
        "surface-card-header",
        headerPaddingClassName[padding],
        className,
      )}
      {...props}
    >
      {eyebrow || title ? (
        <div className="surface-card-header-copy">
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
  padding = "comfortable",
  ...props
}: SurfaceCardBodyProps) {
  return (
    <CardContent
      className={cn(bodyPaddingClassName[padding], className)}
      {...props}
    />
  )
}
