import { describe, expect, it } from "vitest"

import {
  BASE_BLOCK_NAMES,
  FORBIDDEN_AGENT_FACING_PROP_NAMES,
  getAllowedPropNames,
  getBaseCatalogItem,
  getCatalogProp,
  isBaseBlockName,
  MVP_BASE_CATALOG,
  TEXT_CHILD,
  VALIDATED_MVP_BASE_CATALOG,
} from "./base-catalog"

describe("MVP base catalog", () => {
  it("includes exactly the MVP base blocks", () => {
    expect(BASE_BLOCK_NAMES).toEqual([
      "page",
      "card",
      "badge",
      "table",
      "row",
      "cell",
      "list",
      "item",
    ])
    expect(VALIDATED_MVP_BASE_CATALOG).toHaveLength(8)
  })

  it("describes agent-facing props without implementation leakage", () => {
    const allPropNames = MVP_BASE_CATALOG.flatMap((item) =>
      item.props.map((prop) => prop.name),
    )

    expect(allPropNames).toEqual(["title", "title", "tone", "kind", "variant"])

    for (const forbiddenName of FORBIDDEN_AGENT_FACING_PROP_NAMES) {
      expect(allPropNames).not.toContain(forbiddenName)
    }
  })

  it("defines the MVP nesting constraints", () => {
    expect(getBaseCatalogItem("page")?.allowedChildren).toEqual([
      "card",
      "table",
      "list",
    ])
    expect(getBaseCatalogItem("badge")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getBaseCatalogItem("table")?.allowedChildren).toEqual(["row"])
    expect(getBaseCatalogItem("row")?.allowedChildren).toEqual(["cell"])
    expect(getBaseCatalogItem("cell")?.allowedChildren).toEqual([TEXT_CHILD])
    expect(getBaseCatalogItem("list")?.allowedChildren).toEqual(["item"])
  })

  it("looks up base blocks and props", () => {
    const row = getBaseCatalogItem("row")

    expect(isBaseBlockName("card")).toBe(true)
    expect(isBaseBlockName("script")).toBe(false)
    expect(row).toBeDefined()
    expect(row ? getAllowedPropNames(row) : []).toEqual(["kind"])
    expect(row ? getCatalogProp(row, "kind")?.enumValues : []).toEqual([
      "header",
      "body",
    ])
  })
})
