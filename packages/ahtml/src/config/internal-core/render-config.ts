import { z } from "zod"

import type { DocumentStyleConfigReference, RenderConfig } from "./types"

export const PUBLIC_RENDER_CONFIG_MODEL = "document-style-config-reference"

export const PUBLIC_RENDER_CONFIG_KEY = "style-ref" as const

export const PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES = [
  "report-default",
  "ops-compact",
  "review-dense",
] as const

const RESOLVED_DOCUMENT_STYLE_CONFIG_TOKENS_BY_REFERENCE = {
  "report-default": {
    documentStyleConfigReference: "report-default",
    theme: "neutral",
    density: "comfortable",
    tone: "report",
    width: "article",
  },
  "ops-compact": {
    documentStyleConfigReference: "ops-compact",
    theme: "neutral",
    density: "compact",
    tone: "dashboard",
    width: "dashboard",
  },
  "review-dense": {
    documentStyleConfigReference: "review-dense",
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

export const DEFAULT_RENDER_CONFIG = resolveResolvedDocumentStyleConfigTokens(
  PUBLIC_RENDER_CONFIG_DEFAULTS[PUBLIC_RENDER_CONFIG_KEY],
)

export const RENDER_CONFIG_KEYS = Object.keys(
  RENDER_CONFIG_VALUES,
) as readonly (keyof typeof RENDER_CONFIG_VALUES)[]

export function parseRenderConfig(input: unknown): RenderConfig {
  const styleRefInput = StyleRefRenderConfigInputSchema.safeParse(input)

  if (styleRefInput.success) {
    return resolveResolvedDocumentStyleConfigTokens(
      styleRefInput.data[PUBLIC_RENDER_CONFIG_KEY],
    )
  }

  throw new Error("Invalid document-style-config render config.")
}

function resolveResolvedDocumentStyleConfigTokens(
  documentStyleConfigReference: DocumentStyleConfigReference,
): RenderConfig {
  return RESOLVED_DOCUMENT_STYLE_CONFIG_TOKENS_BY_REFERENCE[
    documentStyleConfigReference
  ]
}

function createResolvedRenderConfigSchema(
  documentStyleConfigReference: DocumentStyleConfigReference,
) {
  const tokens =
    RESOLVED_DOCUMENT_STYLE_CONFIG_TOKENS_BY_REFERENCE[
      documentStyleConfigReference
    ]

  return z
    .object({
      documentStyleConfigReference: z.literal(
        tokens.documentStyleConfigReference,
      ),
      theme: z.literal(tokens.theme),
      density: z.literal(tokens.density),
      tone: z.literal(tokens.tone),
      width: z.literal(tokens.width),
    })
    .strict()
}
