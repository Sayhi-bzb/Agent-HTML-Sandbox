import { z } from "zod"

import type { RenderConfig } from "./types"

const RENDER_THEME_VALUES = ["neutral"] as const

const RENDER_DENSITY_VALUES = ["compact", "comfortable"] as const

const RENDER_TONE_VALUES = ["report", "dashboard", "decision"] as const

const RENDER_WIDTH_VALUES = ["article", "dashboard", "wide"] as const

export const RenderConfigSchema = z
  .object({
    theme: z.enum(RENDER_THEME_VALUES),
    density: z.enum(RENDER_DENSITY_VALUES),
    tone: z.enum(RENDER_TONE_VALUES),
    width: z.enum(RENDER_WIDTH_VALUES),
  })
  .strict()

export const DEFAULT_RENDER_CONFIG = {
  theme: "neutral",
  density: "comfortable",
  tone: "report",
  width: "article",
} satisfies RenderConfig

export const RENDER_CONFIG_KEYS = RenderConfigSchema.keyof().options

export function parseRenderConfig(input: unknown): RenderConfig {
  return RenderConfigSchema.parse(input)
}
