export type ComponentPropValueKind =
  | "boolean"
  | "enum"
  | "number"
  | "string"
  | "text"

export type ComponentPropSchema = {
  readonly name: string
  readonly valueKind: ComponentPropValueKind
  readonly required?: boolean
  readonly description?: string
  readonly enumValues?: readonly string[]
}

export type ComponentSchema = {
  readonly name: string
  readonly description: string
  readonly props: readonly ComponentPropSchema[]
  readonly allowedChildren?: readonly string[]
}

export type ComponentSchemaOverlay = {
  readonly name: string
  readonly description: string
  readonly expose: boolean
  readonly sourceComponents: readonly string[]
  readonly props?: readonly ComponentPropSchema[]
  readonly allowedChildren?: readonly string[]
  readonly hiddenProps?: readonly string[]
}

export type GeneratedShadcnIntrospection = {
  readonly registryName: string
  readonly componentName: string
  readonly exports: readonly string[]
  readonly slots: readonly string[]
  readonly variantProps?: Readonly<Record<string, readonly string[]>>
  readonly unionProps?: Readonly<Record<string, readonly string[]>>
  readonly blockedProps: readonly string[]
  readonly dependencies?: readonly string[]
  readonly registryDependencies?: readonly string[]
}

export type RenderTheme = "neutral"

export type RenderDensity = "compact" | "comfortable"

export type RenderTone = "dashboard" | "decision" | "report"

export type RenderWidth = "article" | "dashboard" | "wide"

export type RenderProfile = string

export type RenderConfig = {
  readonly profile: RenderProfile
  readonly theme: RenderTheme
  readonly density: RenderDensity
  readonly tone: RenderTone
  readonly width: RenderWidth
}

export type SanitizedTextNode = {
  readonly type: "text"
  readonly value: string
}

export type StandardAgentNode = {
  readonly type: "component"
  readonly name: string
  readonly props: Readonly<Record<string, string>>
  readonly children: readonly SanitizedNode[]
}

export type SanitizedNode = StandardAgentNode | SanitizedTextNode

export type SanitizedAgentHtml = {
  readonly meta: RenderConfig
  readonly components: readonly StandardAgentNode[]
}
