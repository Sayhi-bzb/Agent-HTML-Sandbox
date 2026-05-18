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
      "input",
      "textarea",
      "checkbox",
      "switch",
      "slider",
      "radio-group",
      "toggle-group",
      "select",
      "combobox",
      "option",
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
    expect(VALIDATED_STANDARD_COMPONENT_SCHEMAS).toHaveLength(25)
  })

  it("keeps schema components aligned with runtime verification data", async () => {
    const runtimeContractModule = (await import(
      pathToFileURL(
        path.join(
          process.cwd(),
          "packages",
          "ahtml",
          "src/config/runtime-contract.mjs",
        ),
      ).href
    )) as {
      readonly createRuntimeContract: (
        components: typeof STANDARD_COMPONENT_SCHEMAS,
      ) => {
        readonly renderableAgentComponents: readonly string[]
        readonly verificationData: {
          readonly components: readonly {
            readonly name: string
            readonly renderKind: string
            readonly slots: readonly { readonly name: string }[]
          }[]
        }
      }
    }
    const runtimeContract = runtimeContractModule.createRuntimeContract(
      STANDARD_COMPONENT_SCHEMAS,
    )

    expect([...STANDARD_COMPONENT_NAMES].sort()).toEqual(
      [...runtimeContract.renderableAgentComponents].sort(),
    )
    expect(
      Object.fromEntries(
        runtimeContract.verificationData.components.map((component) => [
          component.name,
          component.slots.map((slot) => slot.name),
        ]),
      ),
    ).toEqual({
      accordion: ["accordion-item"],
      alert: ["children"],
      badge: ["children"],
      card: ["children"],
      checkbox: ["children"],
      slider: ["children"],
      combobox: ["option"],
      input: ["children"],
      list: ["item"],
      page: ["children"],
      progress: ["children"],
      "radio-group": ["option"],
      separator: ["children"],
      select: ["option"],
      switch: ["children"],
      table: ["row", "cell"],
      textarea: ["children"],
      "toggle-group": ["option"],
      tabs: ["tabs-list", "tabs-trigger", "tabs-content"],
    })
    expect(
      Object.fromEntries(
        runtimeContract.verificationData.components.map((component) => [
          component.name,
          component.renderKind,
        ]),
      ),
    ).toEqual({
      accordion: "interactive-collection",
      alert: "compound",
      badge: "primitive",
      card: "compound",
      checkbox: "toggle-field",
      slider: "range-field",
      combobox: "choice-overlay",
      input: "text-field",
      list: "collection",
      page: "compound",
      progress: "primitive",
      "radio-group": "choice-group",
      separator: "primitive",
      select: "choice-overlay",
      switch: "toggle-field",
      table: "table",
      textarea: "text-field",
      "toggle-group": "choice-inline",
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
      "label",
      "value",
      "description",
      "label",
      "value",
      "description",
      "label",
      "checked",
      "description",
      "label",
      "checked",
      "description",
      "label",
      "value",
      "description",
      "label",
      "value",
      "description",
      "label",
      "value",
      "description",
      "label",
      "value",
      "description",
      "label",
      "value",
      "description",
      "value",
      "label",
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
      "checkbox",
      "combobox",
      "input",
      "progress",
      "radio-group",
      "separator",
      "select",
      "slider",
      "switch",
      "table",
      "textarea",
      "toggle-group",
      "list",
      "tabs",
      "accordion",
      TEXT_CHILD,
    ])
    expect(getComponentSchema("separator")?.allowedChildren).toEqual([])
    expect(getComponentSchema("badge")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("progress")?.allowedChildren).toEqual([])
    expect(getComponentSchema("input")?.allowedChildren).toEqual([])
    expect(getComponentSchema("textarea")?.allowedChildren).toEqual([])
    expect(getComponentSchema("checkbox")?.allowedChildren).toEqual([])
    expect(getComponentSchema("switch")?.allowedChildren).toEqual([])
    expect(getComponentSchema("slider")?.allowedChildren).toEqual([])
    expect(getComponentSchema("combobox")?.allowedChildren).toEqual(["option"])
    expect(getComponentSchema("radio-group")?.allowedChildren).toEqual([
      "option",
    ])
    expect(getComponentSchema("toggle-group")?.allowedChildren).toEqual([
      "option",
    ])
    expect(getComponentSchema("select")?.allowedChildren).toEqual(["option"])
    expect(getComponentSchema("option")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("table")?.allowedChildren).toEqual(["row"])
    expect(getComponentSchema("row")?.allowedChildren).toEqual(["cell"])
    expect(getComponentSchema("cell")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getComponentSchema("list")?.allowedChildren).toEqual(["item"])
    expect(getComponentSchema("tabs")?.allowedChildren).toEqual(["tab"])
    expect(getComponentSchema("tab")?.allowedChildren).toEqual([
      "alert",
      "card",
      "checkbox",
      "combobox",
      "input",
      "progress",
      "radio-group",
      "separator",
      "select",
      "slider",
      "switch",
      "table",
      "textarea",
      "toggle-group",
      "list",
      "accordion",
    ])
    expect(getComponentSchema("accordion")?.allowedChildren).toEqual([
      "accordion-item",
    ])
    expect(getComponentSchema("accordion-item")?.allowedChildren).toEqual([
      "alert",
      "badge",
      "checkbox",
      "combobox",
      "input",
      "progress",
      "radio-group",
      "select",
      "slider",
      "switch",
      "table",
      "textarea",
      "toggle-group",
      "list",
      TEXT_CHILD,
    ])
    expect(getComponentSchema("choice-group")).toBeUndefined()
  })

  it("looks up standard components and props", () => {
    const row = getComponentSchema("row")

    expect(isStandardComponentName("card")).toBe(true)
    expect(isStandardComponentName("script")).toBe(false)
    expect(isStandardComponentName("option")).toBe(true)
    expect(row).toBeDefined()
    expect(row ? getAllowedPropNames(row) : []).toEqual(["kind"])
    expect(row ? getComponentPropSchema(row, "kind")?.enumValues : []).toEqual([
      "header",
      "body",
    ])
    expect(getComponentSchema("slider-control")).toBeUndefined()
  })
})
