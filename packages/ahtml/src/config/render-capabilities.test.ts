// @ts-nocheck

import { describe, expect, it } from "vitest"

import {
  collectRendererSpecComponentIssues,
  createRendererMapping,
  createRuntimeElementRegistrySpec,
  createRuntimeRendererKindSpec,
} from "./render-capabilities.mjs"
import { runtimeRendererKinds } from "../cli/runtime-template/src/renderer/kinds"

describe("createRuntimeElementRegistrySpec", () => {
  it("derives native tags and shadcn exports from renderer mapping", () => {
    const registrySpec = createRuntimeElementRegistrySpec({
      components: [
        {
          name: "page",
          kind: "compound",
          root: "article",
          title: "h1",
        },
        {
          name: "card",
          kind: "compound",
          requiredRegistryItem: "card",
          requiredExports: ["Card", "CardContent", "CardHeader", "CardTitle"],
          root: "Card",
          title: "CardTitle",
          titleContainer: "CardHeader",
          content: "CardContent",
        },
        {
          name: "list",
          kind: "collection",
          rootByProp: {
            prop: "variant",
            target: "tag",
            map: { ordered: "ol", unordered: "ul" },
            default: "ul",
          },
          item: "li",
        },
        {
          name: "tabs",
          kind: "tabs",
          requiredRegistryItem: "tabs",
          requiredExports: ["Tabs", "TabsContent", "TabsList", "TabsTrigger"],
          root: "Tabs",
          list: "TabsList",
          trigger: "TabsTrigger",
          content: "TabsContent",
        },
      ],
    })

    expect(registrySpec).toEqual({
      version: 1,
      nativeElements: ["article", "h1", "li", "ol", "ul"],
      modules: [
        {
          registryItem: "card",
          exports: ["Card", "CardContent", "CardHeader", "CardTitle"],
        },
        {
          registryItem: "tabs",
          exports: ["Tabs", "TabsContent", "TabsList", "TabsTrigger"],
        },
      ],
    })
  })

  it("fails when renderer mapping references an unbacked shadcn export", () => {
    expect(() =>
      createRuntimeElementRegistrySpec({
        components: [
          {
            name: "card",
            kind: "compound",
            requiredRegistryItem: "card",
            requiredExports: ["Card", "CardContent", "CardTitle"],
            root: "Card",
            title: "CardTitle",
            titleContainer: "CardHeader",
            content: "CardContent",
          },
        ],
      }),
    ).toThrow(
      'Renderer element "CardHeader" is not backed by a requiredRegistryItem export.',
    )
  })

  it("adds explicit childNames for renderer slot selection", () => {
    const rendererMapping = createRendererMapping([
      {
        name: "list",
        props: [
          { name: "variant", valueKind: "enum", enumValues: ["ordered"] },
        ],
        allowedChildren: ["item"],
      },
      {
        name: "item",
        props: [],
        allowedChildren: ["#text"],
      },
      {
        name: "tabs",
        props: [{ name: "default", valueKind: "string" }],
        allowedChildren: ["tab"],
      },
      {
        name: "table",
        props: [],
        allowedChildren: ["row"],
      },
      {
        name: "row",
        props: [{ name: "kind", valueKind: "enum", enumValues: ["header"] }],
        allowedChildren: ["cell"],
      },
      {
        name: "cell",
        props: [],
        allowedChildren: ["#text"],
      },
      {
        name: "tab",
        props: [
          { name: "value", valueKind: "string", required: true },
          { name: "label", valueKind: "string", required: true },
        ],
        allowedChildren: ["card"],
      },
      {
        name: "card",
        props: [{ name: "title", valueKind: "string" }],
        allowedChildren: ["#text"],
      },
    ])

    const list = rendererMapping.components.find(
      (component) => component.name === "list",
    )
    const itemSlot = list?.slots.find((slot) => slot.name === "item")
    expect(itemSlot?.childNames).toEqual(["item"])
    expect(itemSlot?.children).toEqual(["text"])

    const tabs = rendererMapping.components.find(
      (component) => component.name === "tabs",
    )
    const tabSlot = tabs?.slots.find((slot) => slot.name === "tab")
    expect(tabSlot?.childNames).toEqual(["tab"])
    expect(tabSlot?.children).toEqual(["card"])
    expect(tabs?.itemValueProp).toBe("value")
    expect(tabs?.itemHeadingProp).toBe("label")

    const table = rendererMapping.components.find(
      (component) => component.name === "table",
    )
    expect(table?.kindProp).toBe("kind")

    for (const component of rendererMapping.components) {
      expect(collectRendererSpecComponentIssues(component)).toEqual([])
    }
  })

  it("keeps runtime renderer kind template in sync with shared kind definitions", () => {
    expect(createRuntimeRendererKindSpec().kinds).toEqual([
      ...runtimeRendererKinds,
    ])
  })
})
