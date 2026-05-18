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

export type DocumentStyleConfigReference =
  | "report-default"
  | "ops-compact"
  | "review-dense"

export type SemanticColorTokenSet = {
  readonly background: string
  readonly foreground: string
  readonly card: string
  readonly cardForeground: string
  readonly popover: string
  readonly popoverForeground: string
  readonly primary: string
  readonly primaryForeground: string
  readonly secondary: string
  readonly secondaryForeground: string
  readonly muted: string
  readonly mutedForeground: string
  readonly accent: string
  readonly accentForeground: string
  readonly destructive: string
  readonly border: string
  readonly input: string
  readonly ring: string
}

export type GlobalStyleTokenSets = {
  readonly light: SemanticColorTokenSet
  readonly dark: SemanticColorTokenSet
}

export type RadiusScale = {
  readonly base: string
  readonly sm: string
  readonly md: string
  readonly lg: string
  readonly xl: string
  readonly "2xl": string
  readonly "3xl": string
  readonly "4xl": string
}

export type TypographyProfile = {
  readonly fontSans: string
  readonly fontHeading: string
}

export type CssVariableMap = {
  readonly background: "--background"
  readonly foreground: "--foreground"
  readonly card: "--card"
  readonly cardForeground: "--card-foreground"
  readonly popover: "--popover"
  readonly popoverForeground: "--popover-foreground"
  readonly primary: "--primary"
  readonly primaryForeground: "--primary-foreground"
  readonly secondary: "--secondary"
  readonly secondaryForeground: "--secondary-foreground"
  readonly muted: "--muted"
  readonly mutedForeground: "--muted-foreground"
  readonly accent: "--accent"
  readonly accentForeground: "--accent-foreground"
  readonly destructive: "--destructive"
  readonly border: "--border"
  readonly input: "--input"
  readonly ring: "--ring"
  readonly radius: "--radius"
  readonly fontSans: "--font-sans"
  readonly fontHeading: "--font-heading"
}

export type LegacyGlobalStyleProjection = {
  readonly theme: RenderTheme
  readonly density: RenderDensity
  readonly tone: RenderTone
  readonly width: RenderWidth
}

export type GlobalStyleProfile = {
  readonly tokenSets: GlobalStyleTokenSets
  readonly radiusScale: RadiusScale
  readonly typography: TypographyProfile
  readonly cssVariableMap: CssVariableMap
  readonly legacyProjection: LegacyGlobalStyleProjection
}

export type ComponentStyleProfile = {
  readonly treatments: Readonly<Record<string, string>>
}

export type StyleProfile = {
  readonly id: DocumentStyleConfigReference
  readonly globalStyle: GlobalStyleProfile
  readonly componentStyle: ComponentStyleProfile
}

export type RenderConfig = {
  readonly documentStyleConfigReference: DocumentStyleConfigReference
  readonly styleProfile: StyleProfile
  readonly theme: RenderTheme
  readonly density: RenderDensity
  readonly tone: RenderTone
  readonly width: RenderWidth
}

export type PublicRenderConfigModel = "document-style-config-reference"

export type PublicRenderConfigContract = {
  readonly defaults: Readonly<Record<string, string>>
  readonly keys: readonly string[]
  readonly values: Readonly<Record<string, readonly string[]>>
  readonly model: PublicRenderConfigModel
}

export type PublicSafetyPolicy = {
  readonly blockedNames: readonly string[]
  readonly forbidden: string
}

export type PublicAgentContract = {
  readonly components: readonly ComponentSchema[]
  readonly renderConfig: PublicRenderConfigContract
  readonly safetyPolicy: PublicSafetyPolicy
  readonly forbidden: string
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
