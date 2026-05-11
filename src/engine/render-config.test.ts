import { describe, expect, it } from "vitest"

import {
  DEFAULT_RENDER_CONFIG,
  parseRenderConfig,
  RENDER_CONFIG_KEYS,
  RENDER_CONFIG_VALUES,
  RenderConfigSchema,
} from "./render-config"

describe("render config schema", () => {
  it("accepts the MVP finite render profile values", () => {
    expect(RenderConfigSchema.parse(DEFAULT_RENDER_CONFIG)).toEqual({
      theme: "neutral",
      density: "comfortable",
      tone: "report",
      width: "article",
    })

    expect(
      parseRenderConfig({
        theme: "neutral",
        density: "compact",
        tone: "dashboard",
        width: "wide",
      }),
    ).toEqual({
      theme: "neutral",
      density: "compact",
      tone: "dashboard",
      width: "wide",
    })
  })

  it("rejects unknown keys and CSS-like profile values", () => {
    expect(() =>
      parseRenderConfig({
        theme: "neutral",
        density: "compact",
        tone: "report",
        width: "article",
        className: "text-red-500",
      }),
    ).toThrow()

    expect(() =>
      parseRenderConfig({
        theme: "neutral",
        density: "compact",
        tone: "color:red",
        width: "article",
      }),
    ).toThrow()
  })

  it("exposes only the public render config keys", () => {
    expect(RENDER_CONFIG_KEYS).toEqual(["theme", "density", "tone", "width"])
    expect(Object.keys(RENDER_CONFIG_VALUES)).toEqual(RENDER_CONFIG_KEYS)
  })
})
