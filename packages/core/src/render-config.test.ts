import { describe, expect, it } from "vitest"

import {
  DEFAULT_RENDER_CONFIG,
  parseRenderConfig,
  PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES,
  PUBLIC_RENDER_CONFIG_KEY,
  PUBLIC_RENDER_CONFIG_DEFAULTS,
  RENDER_CONFIG_KEYS,
  RENDER_CONFIG_VALUES,
  RenderConfigSchema,
} from "./render-config"

describe("document-style-config render config", () => {
  it("accepts approved document style config reference values", () => {
    expect(RenderConfigSchema.parse(DEFAULT_RENDER_CONFIG)).toEqual({
      documentStyleConfigReference: "report-default",
      theme: "neutral",
      density: "comfortable",
      tone: "report",
      width: "article",
    })

    expect(parseRenderConfig({ "style-ref": "ops-compact" })).toEqual({
      documentStyleConfigReference: "ops-compact",
      theme: "neutral",
      density: "compact",
      tone: "dashboard",
      width: "dashboard",
    })
  })

  it("rejects resolved token combinations that do not match the selected reference", () => {
    expect(() =>
      RenderConfigSchema.parse({
        documentStyleConfigReference: "ops-compact",
        theme: "neutral",
        density: "comfortable",
        tone: "dashboard",
        width: "dashboard",
      }),
    ).toThrow()
  })

  it("rejects unknown keys and CSS-like values", () => {
    expect(() =>
      parseRenderConfig({
        className: "text-red-500",
      }),
    ).toThrow("Invalid document-style-config render config.")

    expect(() =>
      parseRenderConfig({
        "style-ref": "color:red",
      }),
    ).toThrow("Invalid document-style-config render config.")

    expect(() =>
      parseRenderConfig({
        profile: "ops-compact",
      }),
    ).toThrow("Invalid document-style-config render config.")

    expect(() =>
      parseRenderConfig({
        theme: "neutral",
        density: "compact",
        tone: "dashboard",
        width: "dashboard",
      }),
    ).toThrow("Invalid document-style-config render config.")
  })

  it("exposes only the public render config keys", () => {
    expect(PUBLIC_RENDER_CONFIG_DEFAULTS).toEqual({
      "style-ref": "report-default",
    })
    expect(PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES).toEqual([
      "report-default",
      "ops-compact",
      "review-dense",
    ])
    expect(PUBLIC_RENDER_CONFIG_KEY).toBe("style-ref")
    expect(RENDER_CONFIG_KEYS).toEqual(["style-ref"])
    expect(Object.keys(RENDER_CONFIG_VALUES)).toEqual(RENDER_CONFIG_KEYS)
  })
})
