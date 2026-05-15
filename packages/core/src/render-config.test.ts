import { describe, expect, it } from "vitest"

import {
  DEFAULT_RENDER_CONFIG,
  parseRenderConfig,
  PUBLIC_RENDER_CONFIG_DEFAULTS,
  RENDER_CONFIG_KEYS,
  RENDER_CONFIG_VALUES,
  RenderConfigSchema,
} from "./render-config"

describe("profile-first render config", () => {
  it("accepts the public profile-first render config values", () => {
    expect(RenderConfigSchema.parse(DEFAULT_RENDER_CONFIG)).toEqual({
      profile: "report-default",
      theme: "neutral",
      density: "comfortable",
      tone: "report",
      width: "article",
    })

    expect(parseRenderConfig({ profile: "ops-compact" })).toEqual({
      profile: "ops-compact",
      theme: "neutral",
      density: "compact",
      tone: "dashboard",
      width: "dashboard",
    })
  })

  it("rejects unknown keys and CSS-like values", () => {
    expect(() =>
      parseRenderConfig({
        className: "text-red-500",
      }),
    ).toThrow("Invalid profile-based render config.")

    expect(() =>
      parseRenderConfig({
        profile: "color:red",
      }),
    ).toThrow("Invalid profile-based render config.")

    expect(() =>
      parseRenderConfig({
        theme: "neutral",
        density: "compact",
        tone: "dashboard",
        width: "dashboard",
      }),
    ).toThrow("Invalid profile-based render config.")
  })

  it("exposes only the public render config keys", () => {
    expect(PUBLIC_RENDER_CONFIG_DEFAULTS).toEqual({
      profile: "report-default",
    })
    expect(RENDER_CONFIG_KEYS).toEqual(["profile"])
    expect(Object.keys(RENDER_CONFIG_VALUES)).toEqual(RENDER_CONFIG_KEYS)
  })
})
