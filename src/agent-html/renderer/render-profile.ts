import type { RenderConfig } from "../types"

export type RenderProfile = {
  readonly pageClassName: string
  readonly contentClassName: string
  readonly cardSize: "default" | "sm"
  readonly listClassName: string
}

export function getRenderProfile(config: RenderConfig): RenderProfile {
  return {
    pageClassName: [
      "mx-auto min-h-screen px-6 py-8",
      getWidthClassName(config.width),
      getToneClassName(config.tone),
    ].join(" "),
    contentClassName:
      config.density === "compact"
        ? "flex flex-col gap-3"
        : "flex flex-col gap-5",
    cardSize: config.density === "compact" ? "sm" : "default",
    listClassName:
      config.density === "compact"
        ? "list-inside space-y-1 text-sm"
        : "list-inside space-y-2 text-sm",
  }
}

function getWidthClassName(width: RenderConfig["width"]): string {
  switch (width) {
    case "article":
      return "max-w-3xl"
    case "dashboard":
      return "max-w-5xl"
    case "wide":
      return "max-w-7xl"
  }
}

function getToneClassName(tone: RenderConfig["tone"]): string {
  switch (tone) {
    case "dashboard":
      return "bg-background text-foreground"
    case "decision":
      return "bg-muted/30 text-foreground"
    case "report":
      return "bg-background text-foreground"
  }
}
