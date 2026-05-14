// @ts-nocheck

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("./elements", () => ({
  resolveElement(name) {
    return name ?? React.Fragment
  },
}))

import { createRendererNode } from "./render-node"

describe("createRendererNode", () => {
  it("uses shared slot childNames metadata when selecting structured children", () => {
    const rendererSpecByName = new Map([
      [
        "list",
        {
          name: "list",
          kind: "collection",
          renderKind: "collection",
          slots: [
            {
              name: "items",
              childNames: ["entry"],
              children: ["entry"],
            },
          ],
          root: "ul",
          item: "li",
          itemSlot: "items",
          childMode: "inline",
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "list",
          props: {},
          children: [
            {
              type: "component",
              name: "entry",
              props: {},
              children: [{ type: "text", value: "First" }],
            },
            {
              type: "component",
              name: "entry",
              props: {},
              children: [{ type: "text", value: "Second" }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain("<ul")
    expect(markup).toContain("<li>First</li>")
    expect(markup).toContain("<li>Second</li>")
  })

  it("uses renderer spec prop names for tabs content and labels", () => {
    const rendererSpecByName = new Map([
      [
        "tabs",
        {
          name: "tabs",
          kind: "tabs",
          renderKind: "tabs",
          slots: [
            {
              name: "entry",
              childNames: ["entry"],
              children: ["text"],
            },
          ],
          root: "Tabs",
          list: "TabsList",
          trigger: "TabsTrigger",
          content: "TabsContent",
          itemSlot: "entry",
          defaultProp: "default",
          itemValueProp: "slug",
          itemHeadingProp: "heading",
          fallback: true,
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "tabs",
          props: {},
          children: [
            {
              type: "component",
              name: "entry",
              props: { slug: "alpha", heading: "Alpha" },
              children: [{ type: "text", value: "First" }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain('value="alpha"')
    expect(markup).toContain(">Alpha</TabsTrigger>")
    expect(markup).toContain('<h2 class="ahtml-section-title">Alpha</h2>')
  })

  it("renders a no-script fallback for accordion items when configured", () => {
    const rendererSpecByName = new Map([
      [
        "accordion",
        {
          name: "accordion",
          kind: "interactive-collection",
          renderKind: "interactive-collection",
          slots: [
            {
              name: "accordion-item",
              childNames: ["accordion-item"],
              children: ["text"],
            },
          ],
          root: "Accordion",
          item: "AccordionItem",
          trigger: "AccordionTrigger",
          content: "AccordionContent",
          itemSlot: "accordion-item",
          itemValueProp: "slug",
          itemHeadingProp: "heading",
          mode: "multiple",
          fallback: true,
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "accordion",
          props: {},
          children: [
            {
              type: "component",
              name: "accordion-item",
              props: { slug: "details", heading: "Details" },
              children: [{ type: "text", value: "Accordion content" }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain(">Details</AccordionTrigger>")
    expect(markup).toContain('<h2 class="ahtml-section-title">Details</h2>')
    expect(markup).toContain("<noscript>")
  })
})
