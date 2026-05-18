import { z } from "zod"

import type {
  BuiltinDocumentStyleConfigReference,
  CssVariableMap,
  DocumentStyleConfigReference,
  GlobalStyleProfile,
  RadiusScale,
  RenderConfig,
  SemanticColorTokenSet,
  StyleProfile,
  TypographyProfile,
} from "./types"

export const PUBLIC_RENDER_CONFIG_MODEL = "document-style-config-reference"
export const STYLE_PROFILE_STORAGE_VERSION = 1

export const PUBLIC_RENDER_CONFIG_KEY = "style-ref" as const

export const PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES = [
  "report-default",
  "ops-compact",
  "review-dense",
] as const satisfies readonly BuiltinDocumentStyleConfigReference[]

const documentStyleConfigReferencePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
} as const satisfies Readonly<
  Record<
    BuiltinDocumentStyleConfigReference,
    Readonly<Record<string, string>>
  >
>

const DocumentStyleConfigReferenceSchema = z
  .string()
  .regex(
    documentStyleConfigReferencePattern,
    "document style config references must use lowercase kebab-case ids.",
  )

const SemanticColorTokenSetSchema = z
  .object({
    background: z.string(),
    foreground: z.string(),
    card: z.string(),
    cardForeground: z.string(),
    popover: z.string(),
    popoverForeground: z.string(),
    primary: z.string(),
    primaryForeground: z.string(),
    secondary: z.string(),
    secondaryForeground: z.string(),
    muted: z.string(),
    mutedForeground: z.string(),
    accent: z.string(),
    accentForeground: z.string(),
    destructive: z.string(),
    border: z.string(),
    input: z.string(),
    ring: z.string(),
  })
  .strict()

const RadiusScaleSchema = z
  .object({
    base: z.string(),
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
    "2xl": z.string(),
    "3xl": z.string(),
    "4xl": z.string(),
  })
  .strict()

const TypographyProfileSchema = z
  .object({
    fontSans: z.string(),
    fontHeading: z.string(),
  })
  .strict()

const CssVariableMapSchema = z
  .object({
    background: z.literal(defaultCssVariableMap.background),
    foreground: z.literal(defaultCssVariableMap.foreground),
    card: z.literal(defaultCssVariableMap.card),
    cardForeground: z.literal(defaultCssVariableMap.cardForeground),
    popover: z.literal(defaultCssVariableMap.popover),
    popoverForeground: z.literal(defaultCssVariableMap.popoverForeground),
    primary: z.literal(defaultCssVariableMap.primary),
    primaryForeground: z.literal(defaultCssVariableMap.primaryForeground),
    secondary: z.literal(defaultCssVariableMap.secondary),
    secondaryForeground: z.literal(defaultCssVariableMap.secondaryForeground),
    muted: z.literal(defaultCssVariableMap.muted),
    mutedForeground: z.literal(defaultCssVariableMap.mutedForeground),
    accent: z.literal(defaultCssVariableMap.accent),
    accentForeground: z.literal(defaultCssVariableMap.accentForeground),
    destructive: z.literal(defaultCssVariableMap.destructive),
    border: z.literal(defaultCssVariableMap.border),
    input: z.literal(defaultCssVariableMap.input),
    ring: z.literal(defaultCssVariableMap.ring),
    radius: z.literal(defaultCssVariableMap.radius),
    fontSans: z.literal(defaultCssVariableMap.fontSans),
    fontHeading: z.literal(defaultCssVariableMap.fontHeading),
  })
  .strict()

export const StyleProfileSchema = z
  .object({
    id: DocumentStyleConfigReferenceSchema,
    globalStyle: z
      .object({
        tokenSets: z
          .object({
            light: SemanticColorTokenSetSchema,
            dark: SemanticColorTokenSetSchema,
          })
          .strict(),
        radiusScale: RadiusScaleSchema,
        typography: TypographyProfileSchema,
        cssVariableMap: CssVariableMapSchema,
      })
      .strict(),
    componentStyle: z
      .object({
        treatments: z.record(z.string(), z.string()),
      })
      .strict(),
  })
  .strict()

export const BUILTIN_STYLE_PROFILES_BY_REFERENCE = {
  "report-default": createStyleProfile("report-default"),
  "ops-compact": createStyleProfile("ops-compact"),
  "review-dense": createStyleProfile("review-dense"),
} as const satisfies Readonly<
  Record<BuiltinDocumentStyleConfigReference, StyleProfile>
>

const RESOLVED_DOCUMENT_STYLE_CONFIGS_BY_REFERENCE = {
  "report-default": createRenderConfigFromStyleProfile(
    BUILTIN_STYLE_PROFILES_BY_REFERENCE["report-default"],
  ),
  "ops-compact": createRenderConfigFromStyleProfile(
    BUILTIN_STYLE_PROFILES_BY_REFERENCE["ops-compact"],
  ),
  "review-dense": createRenderConfigFromStyleProfile(
    BUILTIN_STYLE_PROFILES_BY_REFERENCE["review-dense"],
  ),
} as const satisfies Readonly<
  Record<BuiltinDocumentStyleConfigReference, RenderConfig>
>

const StyleRefRenderConfigInputSchema = z
  .object({
    [PUBLIC_RENDER_CONFIG_KEY]: DocumentStyleConfigReferenceSchema,
  })
  .strict()

export const RENDER_CONFIG_VALUES = {
  [PUBLIC_RENDER_CONFIG_KEY]: PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES,
} as const

export const PUBLIC_RENDER_CONFIG_DEFAULTS = {
  [PUBLIC_RENDER_CONFIG_KEY]: "report-default",
} as const

export const DEFAULT_STYLE_PROFILE_REFERENCE =
  PUBLIC_RENDER_CONFIG_DEFAULTS[PUBLIC_RENDER_CONFIG_KEY]

export const RenderConfigSchema = z
  .object({
    documentStyleConfigReference: DocumentStyleConfigReferenceSchema,
    styleProfile: StyleProfileSchema,
  })
  .strict()
  .superRefine((config, ctx) => {
    if (config.documentStyleConfigReference !== config.styleProfile.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "document style config reference must match style profile id.",
        path: ["documentStyleConfigReference"],
      })
    }
  })

export const DEFAULT_RENDER_CONFIG = resolveResolvedDocumentStyleConfig(
  PUBLIC_RENDER_CONFIG_DEFAULTS[PUBLIC_RENDER_CONFIG_KEY],
)

export const RENDER_CONFIG_KEYS = Object.keys(
  RENDER_CONFIG_VALUES,
) as readonly (keyof typeof RENDER_CONFIG_VALUES)[]

export type ParseRenderConfigOptions = {
  readonly resolveStyleProfileReference?: (
    documentStyleConfigReference: DocumentStyleConfigReference,
  ) => StyleProfile | undefined
  readonly resolveDefaultStyleProfileReference?: () => StyleProfile | undefined
}

export function parseRenderConfig(
  input: unknown,
  options: ParseRenderConfigOptions = {},
): RenderConfig {
  const styleRefInput = StyleRefRenderConfigInputSchema.safeParse(input)

  if (!styleRefInput.success) {
    const defaultStyleProfile = options.resolveDefaultStyleProfileReference?.()

    if (defaultStyleProfile) {
      return createRenderConfigFromStyleProfile(defaultStyleProfile)
    }

    return DEFAULT_RENDER_CONFIG
  }

  const documentStyleConfigReference =
    styleRefInput.data[PUBLIC_RENDER_CONFIG_KEY]
  const builtinConfig = resolveBuiltinRenderConfig(documentStyleConfigReference)

  if (builtinConfig) {
    return builtinConfig
  }

  const styleProfile = options.resolveStyleProfileReference?.(
    documentStyleConfigReference,
  )

  if (styleProfile) {
    return createRenderConfigFromStyleProfile(styleProfile)
  }

  return DEFAULT_RENDER_CONFIG
}

export function createRenderConfigFromStyleProfile(
  styleProfile: StyleProfile,
): RenderConfig {
  const parsedStyleProfile = StyleProfileSchema.parse(styleProfile)

  return {
    documentStyleConfigReference: parsedStyleProfile.id,
    styleProfile: parsedStyleProfile,
  }
}

function resolveBuiltinRenderConfig(
  documentStyleConfigReference: DocumentStyleConfigReference,
) {
  if (!isBuiltinDocumentStyleConfigReference(documentStyleConfigReference)) {
    return undefined
  }

  return resolveResolvedDocumentStyleConfig(documentStyleConfigReference)
}

function isBuiltinDocumentStyleConfigReference(
  documentStyleConfigReference: DocumentStyleConfigReference,
): documentStyleConfigReference is BuiltinDocumentStyleConfigReference {
  return PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES.includes(
    documentStyleConfigReference as BuiltinDocumentStyleConfigReference,
  )
}

function resolveResolvedDocumentStyleConfig(
  documentStyleConfigReference: BuiltinDocumentStyleConfigReference,
): RenderConfig {
  return RESOLVED_DOCUMENT_STYLE_CONFIGS_BY_REFERENCE[documentStyleConfigReference]
}

function createStyleProfile(
  id: BuiltinDocumentStyleConfigReference,
): StyleProfile {
  return {
    id,
    globalStyle: createGlobalStyleProfile(),
    componentStyle: createComponentStyleProfile(id),
  }
}

function createComponentStyleProfile(id: BuiltinDocumentStyleConfigReference) {
  return {
    treatments: { ...BUILTIN_COMPONENT_TREATMENTS_BY_REFERENCE[id] },
  }
}

function createGlobalStyleProfile(): GlobalStyleProfile {
  return {
    tokenSets: {
      light: { ...neutralLightSemanticTokens },
      dark: { ...neutralDarkSemanticTokens },
    },
    radiusScale: { ...defaultRadiusScale },
    typography: { ...defaultTypographyProfile },
    cssVariableMap: { ...defaultCssVariableMap },
  }
}
