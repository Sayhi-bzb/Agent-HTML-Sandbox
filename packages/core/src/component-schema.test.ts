import { describe, expect, it } from "vitest"
import path from "node:path"
import { pathToFileURL } from "node:url"

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

describe("standard component schema", () => {
  it("includes exactly the MVP standard components", () => {
    expect(STANDARD_COMPONENT_NAMES).toEqual([
      "page",
      "alert",
      "card",
      "separator",
      "badge",
      "progress",
      "table",
      "row",
      "cell",
      "list",
      "item",
      "tabs",
      "tab",
      "accordion",
      "accordion-item",
    ])
    expect(VALIDATED_STANDARD_COMPONENT_SCHEMAS).toHaveLength(15)
  })

  it("keeps schema components aligned with render capability state", async () => {
    const capabilities = (await import(
      pathToFileURL(
        path.join(
          process.cwd(),
          "packages",
          "ahtml",
          "src",
          "config",
          "render-capabilities.mjs",
        ),
      ).href
    )) as {
      readonly createUiCapabilities: (
        components: typeof STANDARD_COMPONENT_SCHEMAS,
      ) => {
        readonly components: readonly {
          readonly name: string
          readonly renderKind: string
          readonly slots: readonly { readonly name: string }[]
        }[]
      }
      readonly schemaRenderableComponents: readonly string[]
    }

    expect([...STANDARD_COMPONENT_NAMES].sort()).toEqual(
      [...capabilities.schemaRenderableComponents].sort(),
    )
    expect(
      Object.fromEntries(
        capabilities
          .createUiCapabilities(STANDARD_COMPONENT_SCHEMAS)
          .components.map((component) => [
            component.name,
            component.slots.map((slot) => slot.name),
          ]),
      ),
    ).toEqual({
      accordion: ["accordion-item"],
      alert: ["children"],
      badge: ["children"],
      card: ["children"],
      list: ["item"],
      page: ["children"],
      progress: ["children"],
      separator: ["children"],
      table: ["row", "cell"],
      tabs: ["tabs-list", "tabs-trigger", "tabs-content"],
    })
    expect(
      Object.fromEntries(
        capabilities
          .createUiCapabilities(STANDARD_COMPONENT_SCHEMAS)
          .components.map((component) => [
            component.name,
            component.renderKind,
          ]),
      ),
    ).toEqual({
      accordion: "interactive-collection",
      alert: "compound",
      badge: "primitive",
      card: "compound",
      list: "collection",
      page: "compound",
      progress: "primitive",
      separator: "primitive",
      table: "table",
      tabs: "tabs",
    })
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
      "value",
      "kind",
      "variant",
      "default",
      "value",
      "label",
      "value",
      "title",
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
    ])
    expect(getComponentSchema("alert")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("card")?.allowedChildren).toEqual([
      "alert",
      "badge",
      "progress",
      "separator",
      "table",
      "list",
      "tabs",
      "accordion",
      TEXT_CHILD,
    ])
    expect(getComponentSchema("separator")?.allowedChildren).toEqual([])
    expect(getComponentSchema("badge")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("progress")?.allowedChildren).toEqual([])
    expect(getComponentSchema("table")?.allowedChildren).toEqual(["row"])
    expect(getComponentSchema("row")?.allowedChildren).toEqual(["cell"])
    expect(getComponentSchema("cell")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("list")?.allowedChildren).toEqual(["item"])
    expect(getComponentSchema("tabs")?.allowedChildren).toEqual(["tab"])
    expect(getComponentSchema("tab")?.allowedChildren).toEqual([
      "alert",
      "card",
      "progress",
      "separator",
      "table",
      "list",
      "accordion",
    ])
    expect(getComponentSchema("accordion")?.allowedChildren).toEqual([
      "accordion-item",
    ])
    expect(getComponentSchema("accordion-item")?.allowedChildren).toEqual([
      "alert",
      "badge",
      "progress",
      "table",
      "list",
      TEXT_CHILD,
    ])
    expect(getComponentSchema("choice-group")).toBeUndefined()
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
    expect(getComponentSchema("slider-control")).toBeUndefined()
  })
})
