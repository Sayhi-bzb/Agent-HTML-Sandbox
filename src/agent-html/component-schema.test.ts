import { describe, expect, it } from "vitest"

import {
  BLOCKED_AGENT_FACING_PROP_NAMES,
  GENERATED_COMPONENT_SCHEMA_FACTS,
  getAllowedPropNames,
  getComponentPropSchema,
  getComponentSchema,
  isStandardComponentName,
  STANDARD_COMPONENT_NAMES,
  STANDARD_COMPONENT_SCHEMAS,
  TEXT_CHILD,
  VALIDATED_STANDARD_COMPONENT_SCHEMAS,
} from "./component-schema"
import { getRendererComponentNames } from "./renderer/component-registry"

describe("standard component schema", () => {
  it("includes exactly the MVP standard components", () => {
    expect(STANDARD_COMPONENT_NAMES).toEqual([
      "page",
      "alert",
      "card",
      "separator",
      "badge",
      "table",
      "row",
      "cell",
      "list",
      "item",
      "tabs",
      "tab",
      "accordion",
      "accordion-item",
      "choice-group",
      "choice",
      "slider-control",
      "feedback-box",
      "progress-meter",
    ])
    expect(VALIDATED_STANDARD_COMPONENT_SCHEMAS).toHaveLength(19)
  })

  it("keeps the renderer registry synchronized with the schema registry", () => {
    expect(getRendererComponentNames()).toEqual(
      [...STANDARD_COMPONENT_NAMES].sort(),
    )
  })

  it("keeps generated shadcn introspection available as draft facts", () => {
    const buttonFacts = GENERATED_COMPONENT_SCHEMA_FACTS.find(
      (item) => item.registryName === "button",
    )
    const cardFacts = GENERATED_COMPONENT_SCHEMA_FACTS.find(
      (item) => item.registryName === "card",
    )

    expect(buttonFacts?.exports).toContain("Button")
    expect(buttonFacts?.slots).toContain("button")
    expect(buttonFacts?.variantProps?.variant).toContain("default")
    expect(buttonFacts?.blockedProps).toContain("className")
    expect(cardFacts?.slots).toContain("card-header")
  })

  it("describes agent-facing props without implementation leakage", () => {
    const allPropNames = STANDARD_COMPONENT_SCHEMAS.flatMap((item) =>
      item.props.map((prop) => prop.name),
    )

    expect(allPropNames).toEqual([
      "title",
      "title",
      "tone",
      "title",
      "tone",
      "kind",
      "variant",
      "default",
      "value",
      "label",
      "value",
      "title",
      "title",
      "mode",
      "default",
      "value",
      "label",
      "label",
      "value",
      "min",
      "max",
      "step",
      "unit",
      "title",
      "placeholder",
      "copy-label",
      "label",
      "value",
      "detail",
    ])

    for (const blockedName of BLOCKED_AGENT_FACING_PROP_NAMES) {
      expect(allPropNames).not.toContain(blockedName)
    }
  })

  it("defines the MVP component nesting constraints", () => {
    expect(getComponentSchema("page")?.allowedChildren).toEqual([
      "alert",
      "card",
      "separator",
      "table",
      "list",
      "tabs",
      "accordion",
      "choice-group",
      "slider-control",
      "feedback-box",
      "progress-meter",
    ])
    expect(getComponentSchema("alert")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("separator")?.allowedChildren).toEqual([])
    expect(getComponentSchema("badge")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("table")?.allowedChildren).toEqual(["row"])
    expect(getComponentSchema("row")?.allowedChildren).toEqual(["cell"])
    expect(getComponentSchema("cell")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("list")?.allowedChildren).toEqual(["item"])
    expect(getComponentSchema("tabs")?.allowedChildren).toEqual(["tab"])
    expect(getComponentSchema("tab")?.allowedChildren).toEqual([
      "alert",
      "card",
      "separator",
      "table",
      "list",
      "accordion",
      "choice-group",
      "slider-control",
      "feedback-box",
      "progress-meter",
    ])
    expect(getComponentSchema("accordion")?.allowedChildren).toEqual([
      "accordion-item",
    ])
    expect(getComponentSchema("choice-group")?.allowedChildren).toEqual([
      "choice",
    ])
  })

  it("looks up standard components and props", () => {
    const row = getComponentSchema("row")

    expect(isStandardComponentName("card")).toBe(true)
    expect(isStandardComponentName("script")).toBe(false)
    expect(row).toBeDefined()
    expect(row ? getAllowedPropNames(row) : []).toEqual(["kind"])
    expect(row ? getComponentPropSchema(row, "kind")?.enumValues : []).toEqual([
      "header",
      "body",
    ])
    expect(
      getComponentPropSchema(getComponentSchema("choice-group")!, "mode")
        ?.enumValues,
    ).toEqual(["single", "multiple"])
  })
})
