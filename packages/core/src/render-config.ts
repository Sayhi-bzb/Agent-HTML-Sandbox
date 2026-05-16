import { z } from "zod"

import type { RenderConfig } from "./types"

export const PUBLIC_RENDER_CONFIG_MODEL = "document-style-config-reference"

export const PUBLIC_RENDER_CONFIG_COMPATIBILITY_SYNTAX = {
  key: "profile",
  kind: "presentation-profile-alias",
} as const

export const PUBLIC_PROFILE_VALUES = [
  "report-default",
  "ops-compact",
  "review-dense",
] as const

const RESOLVED_PROFILE_TOKENS_BY_PROFILE = {
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
    (typeof PUBLIC_PROFILE_VALUES)[number],
    Omit<RenderConfig, "profile">
  >
>

const ProfileRenderConfigInputSchema = z
  .object({
    profile: z.enum(PUBLIC_PROFILE_VALUES),
  })
  .strict()

export const RENDER_CONFIG_VALUES = {
  profile: PUBLIC_PROFILE_VALUES,
} as const

export const PUBLIC_RENDER_CONFIG_DEFAULTS = {
  profile: "report-default",
} as const

const resolvedRenderConfigSchemas = [
  createResolvedRenderConfigSchema("report-default"),
  createResolvedRenderConfigSchema("ops-compact"),
  createResolvedRenderConfigSchema("review-dense"),
] as const

export const RenderConfigSchema = z.discriminatedUnion(
  "profile",
  resolvedRenderConfigSchemas,
)

export const DEFAULT_RENDER_CONFIG = resolveResolvedProfileTokens(
  PUBLIC_RENDER_CONFIG_DEFAULTS.profile,
)

export const RENDER_CONFIG_KEYS = Object.keys(
  RENDER_CONFIG_VALUES,
) as readonly (keyof typeof RENDER_CONFIG_VALUES)[]

export function parseRenderConfig(input: unknown): RenderConfig {
  const profileInput = ProfileRenderConfigInputSchema.safeParse(input)

  if (profileInput.success) {
    return resolveResolvedProfileTokens(profileInput.data.profile)
  }

  throw new Error("Invalid document-style-config render config.")
}

function resolveResolvedProfileTokens(
  profile: (typeof PUBLIC_PROFILE_VALUES)[number],
): RenderConfig {
  return {
    profile,
    ...RESOLVED_PROFILE_TOKENS_BY_PROFILE[profile],
  }
}

function createResolvedRenderConfigSchema(
  profile: (typeof PUBLIC_PROFILE_VALUES)[number],
) {
  const tokens = RESOLVED_PROFILE_TOKENS_BY_PROFILE[profile]

  return z
    .object({
      documentStyleConfigReference: z.literal(tokens.documentStyleConfigReference),
      profile: z.literal(profile),
      theme: z.literal(tokens.theme),
      density: z.literal(tokens.density),
      tone: z.literal(tokens.tone),
      width: z.literal(tokens.width),
    })
    .strict()
}
