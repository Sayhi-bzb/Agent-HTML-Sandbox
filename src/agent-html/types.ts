export type CatalogBlockKind = "base" | "custom"

export type CatalogPropValueKind =
  | "boolean"
  | "enum"
  | "number"
  | "string"
  | "text"

export type CatalogProp = {
  readonly name: string
  readonly valueKind: CatalogPropValueKind
  readonly required?: boolean
  readonly description?: string
  readonly enumValues?: readonly string[]
}

export type CatalogItem = {
  readonly name: string
  readonly kind: CatalogBlockKind
  readonly description: string
  readonly props: readonly CatalogProp[]
  readonly allowedChildren?: readonly string[]
}

export type RenderTheme = "neutral"

export type RenderDensity = "compact" | "comfortable"

export type RenderTone = "dashboard" | "decision" | "report"

export type RenderWidth = "article" | "dashboard" | "wide"

export type RenderConfig = {
  readonly theme: RenderTheme
  readonly density: RenderDensity
  readonly tone: RenderTone
  readonly width: RenderWidth
}

export type SanitizedTextNode = {
  readonly type: "text"
  readonly value: string
}

export type SanitizedBlockNode = {
  readonly type: "block"
  readonly name: string
  readonly attrs: Readonly<Record<string, string>>
  readonly children: readonly SanitizedNode[]
}

export type SanitizedNode = SanitizedBlockNode | SanitizedTextNode

export type SanitizedAgentHtml = {
  readonly meta: RenderConfig
  readonly blocks: readonly SanitizedBlockNode[]
}
