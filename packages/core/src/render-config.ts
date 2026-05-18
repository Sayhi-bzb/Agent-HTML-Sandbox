import { z } from "zod"

import type {
  CssVariableMap,
  DocumentStyleConfigReference,
  GlobalStyleProfile,
  LegacyGlobalStyleProjection,
  RadiusScale,
  RenderConfig,
  SemanticColorTokenSet,
  StyleProfile,
  TypographyProfile,
} from "./types"

export const PUBLIC_RENDER_CONFIG_MODEL = "document-style-config-reference"

export const PUBLIC_RENDER_CONFIG_KEY = "style-ref" as const

export const PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES = [
  "report-default",
  "ops-compact",
  "review-dense",
] as const

const neutralLightSemanticTokens: SemanticColorTokenSet = {
  background: "#f7f7f4",
  foreground: "#26251e",
  card: "#ffffff",
  cardForeground: "#26251e",
  popover: "#ffffff",
  popoverForeground: "#26251e",
  primary: "#f54e00",
  primaryForeground: "#ffffff",
  secondary: "#fafaf7",
  secondaryForeground: "#26251e",
  muted: "#fafaf7",
  mutedForeground: "#807d72",
  accent: "#fafaf7",
  accentForeground: "#26251e",
  destructive: "#cf2d56",
  border: "#e6e5e0",
  input: "#cfcdc4",
  ring: "#f54e00",
}

const neutralDarkSemanticTokens: SemanticColorTokenSet = {
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  cardForeground: "oklch(0.985 0 0)",
  popover: "oklch(0.205 0 0)",
  popoverForeground: "oklch(0.985 0 0)",
  primary: "oklch(0.922 0 0)",
  primaryForeground: "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)",
  secondaryForeground: "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  mutedForeground: "oklch(0.708 0 0)",
  accent: "oklch(0.269 0 0)",
  accentForeground: "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.556 0 0)",
}

const defaultRadiusScale: RadiusScale = {
  base: "0.75rem",
  sm: "calc(var(--radius) * 0.6)",
  md: "calc(var(--radius) * 0.8)",
  lg: "var(--radius)",
  xl: "calc(var(--radius) * 1.4)",
  "2xl": "calc(var(--radius) * 1.8)",
  "3xl": "calc(var(--radius) * 2.2)",
  "4xl": "calc(var(--radius) * 2.6)",
}

const defaultTypographyProfile: TypographyProfile = {
  fontSans:
    '"Inter Variable", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif',
  fontHeading: "var(--font-sans)",
}

const defaultCssVariableMap: CssVariableMap = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
  radius: "--radius",
  fontSans: "--font-sans",
  fontHeading: "--font-heading",
}

const BUILTIN_COMPONENT_TREATMENTS_BY_REFERENCE = {
  "report-default": {
    alert: "report-alert",
    badge: "report-badge",
    card: "report-card",
    input: "report-field",
    table: "report-table",
    tabs: "report-tabs",
    textarea: "report-field",
  },
  "ops-compact": {
    alert: "ops-alert",
    badge: "ops-badge",
    card: "ops-card",
    input: "ops-field",
    table: "ops-table",
    tabs: "ops-tabs",
    textarea: "ops-field",
  },
  "review-dense": {
    alert: "review-alert",
    badge: "review-badge",
    card: "review-card",
    input: "review-field",
    table: "review-table",
    tabs: "review-tabs",
    textarea: "review-field",
  },
} as const

const BUILTIN_STYLE_PROFILES_BY_REFERENCE = {
  "report-default": createStyleProfile("report-default", {
    theme: "neutral",
    density: "comfortable",
    tone: "report",
    width: "article",
  }),
  "ops-compact": createStyleProfile("ops-compact", {
    theme: "neutral",
    density: "compact",
    tone: "dashboard",
    width: "dashboard",
  }),
  "review-dense": createStyleProfile("review-dense", {
    theme: "neutral",
    density: "compact",
    tone: "decision",
    width: "wide",
  }),
} as const

const RESOLVED_DOCUMENT_STYLE_CONFIGS_BY_REFERENCE = {
  "report-default": {
    documentStyleConfigReference: "report-default",
    styleProfile: BUILTIN_STYLE_PROFILES_BY_REFERENCE["report-default"],
    theme: "neutral",
    density: "comfortable",
    tone: "report",
    width: "article",
  },
  "ops-compact": {
    documentStyleConfigReference: "ops-compact",
    styleProfile: BUILTIN_STYLE_PROFILES_BY_REFERENCE["ops-compact"],
    theme: "neutral",
    density: "compact",
    tone: "dashboard",
    width: "dashboard",
  },
  "review-dense": {
    documentStyleConfigReference: "review-dense",
    styleProfile: BUILTIN_STYLE_PROFILES_BY_REFERENCE["review-dense"],
    theme: "neutral",
    density: "compact",
    tone: "decision",
    width: "wide",
  },
} as const satisfies Readonly<
  Record<
    (typeof PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES)[number],
    RenderConfig
  >
>

const StyleRefRenderConfigInputSchema = z
  .object({
    [PUBLIC_RENDER_CONFIG_KEY]: z.enum(
      PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES,
    ),
  })
  .strict()

export const RENDER_CONFIG_VALUES = {
  [PUBLIC_RENDER_CONFIG_KEY]: PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES,
} as const

export const PUBLIC_RENDER_CONFIG_DEFAULTS = {
  [PUBLIC_RENDER_CONFIG_KEY]: "report-default",
} as const

const resolvedRenderConfigSchemas = [
  createResolvedRenderConfigSchema("report-default"),
  createResolvedRenderConfigSchema("ops-compact"),
  createResolvedRenderConfigSchema("review-dense"),
] as const

export const RenderConfigSchema = z.discriminatedUnion(
  "documentStyleConfigReference",
  resolvedRenderConfigSchemas,
)

export const DEFAULT_RENDER_CONFIG = resolveResolvedDocumentStyleConfig(
  PUBLIC_RENDER_CONFIG_DEFAULTS[PUBLIC_RENDER_CONFIG_KEY],
)

export const RENDER_CONFIG_KEYS = Object.keys(
  RENDER_CONFIG_VALUES,
) as readonly (keyof typeof RENDER_CONFIG_VALUES)[]

export function parseRenderConfig(input: unknown): RenderConfig {
  const styleRefInput = StyleRefRenderConfigInputSchema.safeParse(input)

  if (styleRefInput.success) {
    return resolveResolvedDocumentStyleConfig(
      styleRefInput.data[PUBLIC_RENDER_CONFIG_KEY],
    )
  }

  throw new Error("Invalid document-style-config render config.")
}

export function getLegacyResolvedDocumentStyleTokens(renderConfig: RenderConfig) {
  return {
    theme: renderConfig.styleProfile.globalStyle.legacyProjection.theme,
    density: renderConfig.styleProfile.globalStyle.legacyProjection.density,
    tone: renderConfig.styleProfile.globalStyle.legacyProjection.tone,
    width: renderConfig.styleProfile.globalStyle.legacyProjection.width,
  } as const
}

function resolveResolvedDocumentStyleConfig(
  documentStyleConfigReference: DocumentStyleConfigReference,
): RenderConfig {
  return RESOLVED_DOCUMENT_STYLE_CONFIGS_BY_REFERENCE[documentStyleConfigReference]
}

function createResolvedRenderConfigSchema(
  documentStyleConfigReference: DocumentStyleConfigReference,
) {
  const config =
    RESOLVED_DOCUMENT_STYLE_CONFIGS_BY_REFERENCE[documentStyleConfigReference]

  return z
    .object({
      documentStyleConfigReference: z.literal(
        config.documentStyleConfigReference,
      ),
      styleProfile: z.object({
        id: z.literal(config.styleProfile.id),
        globalStyle: z.object({
          tokenSets: z.object({
            light: createSemanticColorTokenSetSchema(
              config.styleProfile.globalStyle.tokenSets.light,
            ),
            dark: createSemanticColorTokenSetSchema(
              config.styleProfile.globalStyle.tokenSets.dark,
            ),
          }),
          radiusScale: createRadiusScaleSchema(
            config.styleProfile.globalStyle.radiusScale,
          ),
          typography: createTypographyProfileSchema(
            config.styleProfile.globalStyle.typography,
          ),
          cssVariableMap: createCssVariableMapSchema(
            config.styleProfile.globalStyle.cssVariableMap,
          ),
          legacyProjection: z.object({
            theme: z.literal(
              config.styleProfile.globalStyle.legacyProjection.theme,
            ),
            density: z.literal(
              config.styleProfile.globalStyle.legacyProjection.density,
            ),
            tone: z.literal(
              config.styleProfile.globalStyle.legacyProjection.tone,
            ),
            width: z.literal(
              config.styleProfile.globalStyle.legacyProjection.width,
            ),
          }),
        }),
        componentStyle: z.object({
          treatments: z.record(z.string(), z.string()),
        }),
      }),
      theme: z.literal(config.theme),
      density: z.literal(config.density),
      tone: z.literal(config.tone),
      width: z.literal(config.width),
    })
    .strict()
}

function createStyleProfile(
  id: DocumentStyleConfigReference,
  legacyProjection: LegacyGlobalStyleProjection,
): StyleProfile {
  return {
    id,
    globalStyle: createGlobalStyleProfile(legacyProjection),
    componentStyle: createComponentStyleProfile(id),
  }
}

function createComponentStyleProfile(id: DocumentStyleConfigReference) {
  return {
    treatments: { ...BUILTIN_COMPONENT_TREATMENTS_BY_REFERENCE[id] },
  }
}

function createGlobalStyleProfile(
  legacyProjection: LegacyGlobalStyleProjection,
): GlobalStyleProfile {
  return {
    tokenSets: {
      light: neutralLightSemanticTokens,
      dark: neutralDarkSemanticTokens,
    },
    radiusScale: defaultRadiusScale,
    typography: defaultTypographyProfile,
    cssVariableMap: defaultCssVariableMap,
    legacyProjection,
  }
}

function createSemanticColorTokenSetSchema(tokens: SemanticColorTokenSet) {
  return z.object({
    background: z.literal(tokens.background),
    foreground: z.literal(tokens.foreground),
    card: z.literal(tokens.card),
    cardForeground: z.literal(tokens.cardForeground),
    popover: z.literal(tokens.popover),
    popoverForeground: z.literal(tokens.popoverForeground),
    primary: z.literal(tokens.primary),
    primaryForeground: z.literal(tokens.primaryForeground),
    secondary: z.literal(tokens.secondary),
    secondaryForeground: z.literal(tokens.secondaryForeground),
    muted: z.literal(tokens.muted),
    mutedForeground: z.literal(tokens.mutedForeground),
    accent: z.literal(tokens.accent),
    accentForeground: z.literal(tokens.accentForeground),
    destructive: z.literal(tokens.destructive),
    border: z.literal(tokens.border),
    input: z.literal(tokens.input),
    ring: z.literal(tokens.ring),
  })
}

function createRadiusScaleSchema(radiusScale: RadiusScale) {
  return z.object({
    base: z.literal(radiusScale.base),
    sm: z.literal(radiusScale.sm),
    md: z.literal(radiusScale.md),
    lg: z.literal(radiusScale.lg),
    xl: z.literal(radiusScale.xl),
    "2xl": z.literal(radiusScale["2xl"]),
    "3xl": z.literal(radiusScale["3xl"]),
    "4xl": z.literal(radiusScale["4xl"]),
  })
}

function createTypographyProfileSchema(typography: TypographyProfile) {
  return z.object({
    fontSans: z.literal(typography.fontSans),
    fontHeading: z.literal(typography.fontHeading),
  })
}

function createCssVariableMapSchema(cssVariableMap: CssVariableMap) {
  return z.object({
    background: z.literal(cssVariableMap.background),
    foreground: z.literal(cssVariableMap.foreground),
    card: z.literal(cssVariableMap.card),
    cardForeground: z.literal(cssVariableMap.cardForeground),
    popover: z.literal(cssVariableMap.popover),
    popoverForeground: z.literal(cssVariableMap.popoverForeground),
    primary: z.literal(cssVariableMap.primary),
    primaryForeground: z.literal(cssVariableMap.primaryForeground),
    secondary: z.literal(cssVariableMap.secondary),
    secondaryForeground: z.literal(cssVariableMap.secondaryForeground),
    muted: z.literal(cssVariableMap.muted),
    mutedForeground: z.literal(cssVariableMap.mutedForeground),
    accent: z.literal(cssVariableMap.accent),
    accentForeground: z.literal(cssVariableMap.accentForeground),
    destructive: z.literal(cssVariableMap.destructive),
    border: z.literal(cssVariableMap.border),
    input: z.literal(cssVariableMap.input),
    ring: z.literal(cssVariableMap.ring),
    radius: z.literal(cssVariableMap.radius),
    fontSans: z.literal(cssVariableMap.fontSans),
    fontHeading: z.literal(cssVariableMap.fontHeading),
  })
}
