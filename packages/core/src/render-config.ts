import { z } from "zod"

import type { RenderConfig } from "./types"

const PUBLIC_PROFILE_VALUES = [
  "report-default",
  "ops-compact",
  "review-dense",
] as const

const RESOLVED_PROFILE_TOKENS_BY_PROFILE = {
  "report-default": {
    theme: "neutral",
    density: "comfortable",
    tone: "report",
    width: "article",
  },
  "ops-compact": {
    theme: "neutral",
    density: "compact",
    tone: "dashboard",
    width: "dashboard",
  },
  "review-dense": {
    theme: "neutral",
    density: "compact",
    tone: "decision",
    width: "wide",
  },
} as const satisfies Readonly<
  Record<(typeof PUBLIC_PROFILE_VALUES)[number], Omit<RenderConfig, "profile">>
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

export const RenderConfigSchema = z
  .object({
    profile: z.string(),
    theme: z.string(),
    density: z.string(),
    tone: z.string(),
    width: z.string(),
  })
  .strict()

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

  throw new Error("Invalid profile-based render config.")
}

function resolveResolvedProfileTokens(
  profile: (typeof PUBLIC_PROFILE_VALUES)[number],
): RenderConfig {
  return {
    profile,
    ...RESOLVED_PROFILE_TOKENS_BY_PROFILE[profile],
  }
}
