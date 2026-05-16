// @ts-nocheck

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("./elements", () => ({
  resolveElement(name) {
    if (name === "ComboboxInput") {
      return ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(
          "div",
          null,
          React.createElement("input", props),
          children,
        )
    }

    if (name === "Input") {
      return "input"
    }

    if (name === "Switch") {
      return "input"
    }

    if (name === "Slider") {
      return "input"
    }

    if (name === "Field") {
      return "div"
    }

    if (name === "FieldContent") {
      return "div"
    }

    if (name === "FieldLabel") {
      return "label"
    }

    if (name === "FieldDescription") {
      return "p"
    }

    if (name === "Combobox") {
      return "div"
    }

    if (name === "ComboboxContent") {
      return "section"
    }

    if (name === "ComboboxEmpty") {
      return "div"
    }

    if (name === "ComboboxList") {
      return "div"
    }

    if (name === "ComboboxCollection") {
      return "div"
    }

    if (name === "ComboboxItem") {
      return "div"
    }

    if (name === "SelectGroup") {
      return "div"
    }

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
    expect(markup).toContain(
      '<h2 class="m-0 text-lg font-medium leading-7">Alpha</h2>',
    )
  })

  it("passes through primitive props without enum mapping and keeps zero values", () => {
    const rendererSpecByName = new Map([
      [
        "progress",
        {
          name: "progress",
          kind: "primitive",
          renderKind: "primitive",
          slots: [{ name: "children", children: [] }],
          component: "Progress",
          childMode: "none",
          propMappings: [{ prop: "value", target: "value" }],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "progress",
          props: { value: "0" },
          children: [],
        },
      }),
    )

    expect(markup).toContain("<Progress")
    expect(markup).toContain('value="0"')
  })

  it("renders field-control components with visible labels and default values", () => {
    const rendererSpecByName = new Map([
      [
        "textarea",
        {
          name: "textarea",
          kind: "field-control",
          renderKind: "field-control",
          slots: [{ name: "children", children: [] }],
          root: "Field",
          label: "FieldLabel",
          control: "textarea",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          propMappings: [
            { prop: "value", target: "defaultValue" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "textarea",
          props: {
            label: "Notes",
            value: "Ship after the guard lands.",
            description: "Long-form field.",
          },
          children: [],
        },
      }),
    )

    expect(markup).toContain('data-agent-html-component="textarea"')
    expect(markup).toContain("<label>Notes</label>")
    expect(markup).toContain(
      '<textarea aria-label="Notes">Ship after the guard lands.</textarea>',
    )
    expect(markup).toContain('aria-label="Notes"')
    expect(markup).toContain("<p>Long-form field.</p>")
  })

  it("renders checkbox field-control components with boolean prop coercion", () => {
    const rendererSpecByName = new Map([
      [
        "checkbox",
        {
          name: "checkbox",
          kind: "field-control",
          renderKind: "field-control",
          slots: [{ name: "children", children: [] }],
          root: "Field",
          label: "FieldLabel",
          control: "input",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          propMappings: [
            { prop: "checked", target: "defaultChecked", coerce: "boolean" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "checkbox",
          props: {
            label: "Ship now",
            checked: "true",
            description: "Boolean field.",
          },
          children: [],
        },
      }),
    )

    expect(markup).toContain("<label>Ship now</label>")
    expect(markup).toContain("<input")
    expect(markup).toContain('aria-label="Ship now"')
    expect(markup).toContain("checked")
    expect(markup).toContain("<p>Boolean field.</p>")
  })

  it("renders switch field-control components with boolean prop coercion", () => {
    const rendererSpecByName = new Map([
      [
        "switch",
        {
          name: "switch",
          kind: "field-control",
          renderKind: "field-control",
          slots: [{ name: "children", children: [] }],
          root: "Field",
          label: "FieldLabel",
          control: "Switch",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          propMappings: [
            { prop: "checked", target: "defaultChecked", coerce: "boolean" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "switch",
          props: {
            label: "Live Sync",
            checked: "true",
            description: "Immediate preference toggle.",
          },
          children: [],
        },
      }),
    )

    expect(markup).toContain("<label>Live Sync</label>")
    expect(markup).toContain("<input")
    expect(markup).toContain('aria-label="Live Sync"')
    expect(markup).toContain("checked")
    expect(markup).toContain("<p>Immediate preference toggle.</p>")
  })

  it("renders slider field-control components with numeric coercion and fallback", () => {
    const rendererSpecByName = new Map([
      [
        "slider",
        {
          name: "slider",
          kind: "field-control",
          renderKind: "field-control",
          slots: [{ name: "children", children: [] }],
          root: "Field",
          label: "FieldLabel",
          control: "Slider",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          valueProp: "value",
          fallback: true,
          propMappings: [
            { prop: "value", target: "defaultValue", coerce: "number-array" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "slider",
          props: {
            label: "Review strictness",
            value: "70",
            description: "Read-only numeric field.",
          },
          children: [],
        },
      }),
    )

    expect(markup).toContain("<label>Review strictness</label>")
    expect(markup).toContain("<input")
    expect(markup).toContain('aria-label="Review strictness"')
    expect(markup).toContain('value="70"')
    expect(markup).toContain("<noscript>")
    expect(markup).toContain(">70</p>")
  })

  it("renders radio-group field-control components with option children", () => {
    const rendererSpecByName = new Map([
      [
        "radio-group",
        {
          name: "radio-group",
          kind: "field-control",
          renderKind: "field-control",
          slots: [
            {
              name: "option",
              childNames: ["option"],
              children: ["text"],
            },
          ],
          root: "Field",
          label: "FieldLabel",
          control: "RadioGroup",
          item: "RadioGroupItem",
          itemSlot: "option",
          itemValueProp: "value",
          itemHeadingProp: "label",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          propMappings: [
            { prop: "value", target: "defaultValue" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "radio-group",
          props: {
            label: "Direction",
            value: "ship",
            description: "Single-select field.",
          },
          children: [
            {
              type: "component",
              name: "option",
              props: { value: "ship", label: "Ship" },
              children: [{ type: "text", value: "Use the current direction." }],
            },
            {
              type: "component",
              name: "option",
              props: { value: "hold", label: "Hold" },
              children: [{ type: "text", value: "Wait for the guard." }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain("<label>Direction</label>")
    expect(markup).toContain("<RadioGroup")
    expect(markup).toContain('aria-label="Direction"')
    expect(markup).toContain("<RadioGroupItem")
    expect(markup).toContain("<label>Ship</label>")
    expect(markup).toContain("Use the current direction.")
    expect(markup).toContain("<p>Single-select field.</p>")
  })

  it("renders toggle-group option-set components with static props and option children", () => {
    const rendererSpecByName = new Map([
      [
        "toggle-group",
        {
          name: "toggle-group",
          kind: "option-set",
          renderKind: "option-set",
          slots: [
            {
              name: "option",
              childNames: ["option"],
              children: ["text"],
            },
          ],
          root: "Field",
          label: "FieldLabel",
          control: "ToggleGroup",
          item: "ToggleGroupItem",
          itemSlot: "option",
          itemValueProp: "value",
          itemHeadingProp: "label",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          staticProps: {
            type: "single",
          },
          propMappings: [
            { prop: "value", target: "defaultValue" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "toggle-group",
          props: {
            label: "Rollout Mode",
            value: "fast",
            description: "Inline option set.",
          },
          children: [
            {
              type: "component",
              name: "option",
              props: { value: "fast", label: "Fast" },
              children: [{ type: "text", value: "Prefer speed." }],
            },
            {
              type: "component",
              name: "option",
              props: { value: "safe", label: "Safe" },
              children: [{ type: "text", value: "Prefer guardrails." }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain("<label>Rollout Mode</label>")
    expect(markup).toContain("<ToggleGroup")
    expect(markup).toContain('type="single"')
    expect(markup).toContain('aria-label="Rollout Mode"')
    expect(markup).toContain("<ToggleGroupItem")
    expect(markup).toContain('value="fast"')
    expect(markup).toContain("Prefer speed.")
    expect(markup).toContain("<p>Inline option set.</p>")
  })

  it("renders select option-set components with trigger/content structure and fallback", () => {
    const rendererSpecByName = new Map([
      [
        "select",
        {
          name: "select",
          kind: "option-set",
          renderKind: "option-set",
          slots: [
            {
              name: "option",
              childNames: ["option"],
              children: ["text"],
            },
          ],
          root: "Field",
          label: "FieldLabel",
          control: "Select",
          controlTrigger: "SelectTrigger",
          controlValue: "SelectValue",
          controlContent: "SelectContent",
          itemContainer: "SelectGroup",
          item: "SelectItem",
          itemSlot: "option",
          itemValueProp: "value",
          itemHeadingProp: "label",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          fallback: true,
          propMappings: [
            { prop: "value", target: "defaultValue" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "select",
          props: {
            label: "Deployment Window",
            value: "today",
            description: "Choose a release window.",
          },
          children: [
            {
              type: "component",
              name: "option",
              props: { value: "today", label: "Today" },
              children: [
                { type: "text", value: "Ship in the current window." },
              ],
            },
            {
              type: "component",
              name: "option",
              props: { value: "tomorrow", label: "Tomorrow" },
              children: [{ type: "text", value: "Wait for the next window." }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain("<label>Deployment Window</label>")
    expect(markup).toContain("<Select")
    expect(markup).toContain("<SelectTrigger>")
    expect(markup).toContain("<SelectValue")
    expect(markup).toContain("<SelectContent>")
    expect(markup).toContain("<div><SelectItem")
    expect(markup).toContain("<SelectItem")
    expect(markup).toContain('aria-label="Deployment Window"')
    expect(markup).toContain("Ship in the current window.")
    expect(markup).toContain("<p>Choose a release window.</p>")
    expect(markup).toContain("<noscript>")
    expect(markup).toContain("Today (selected)")
  })

  it("renders combobox option-set components with collection and empty-state composition", () => {
    const rendererSpecByName = new Map([
      [
        "combobox",
        {
          name: "combobox",
          kind: "option-set",
          renderKind: "option-set",
          slots: [
            {
              name: "option",
              childNames: ["option"],
              children: ["text"],
            },
          ],
          root: "Field",
          label: "FieldLabel",
          controlRoot: "Combobox",
          control: "ComboboxInput",
          controlContent: "ComboboxContent",
          controlEmpty: "ComboboxEmpty",
          controlList: "ComboboxList",
          itemContainer: "ComboboxCollection",
          item: "ComboboxItem",
          itemSlot: "option",
          itemValueProp: "value",
          itemHeadingProp: "label",
          description: "FieldDescription",
          labelProp: "label",
          descriptionProp: "description",
          emptyText: "No results found.",
          fallback: true,
          propMappings: [
            { prop: "value", target: "defaultValue" },
            { prop: "label", target: "aria-label" },
          ],
        },
      ],
    ])

    const RendererNode = createRendererNode(rendererSpecByName)
    const markup = renderToStaticMarkup(
      React.createElement(RendererNode, {
        node: {
          type: "component",
          name: "combobox",
          props: {
            label: "Owner",
            value: "Ops reviewer",
            description: "Searchable single-select field.",
          },
          children: [
            {
              type: "component",
              name: "option",
              props: { value: "Ops reviewer", label: "Ops reviewer" },
              children: [{ type: "text", value: "Current reviewer." }],
            },
            {
              type: "component",
              name: "option",
              props: {
                value: "Security reviewer",
                label: "Security reviewer",
              },
              children: [{ type: "text", value: "Escalation reviewer." }],
            },
          ],
        },
      }),
    )

    expect(markup).toContain("<label>Owner</label>")
    expect(markup).toContain("<input")
    expect(markup).toContain('aria-label="Owner"')
    expect(markup).toContain('value="Ops reviewer"')
    expect(markup).toContain("<section")
    expect(markup).toContain("<div")
    expect(markup).toContain("No results found.")
    expect(markup).toContain("Ops reviewer")
    expect(markup).toContain("<noscript>")
    expect(markup).toContain("Ops reviewer (selected)")
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
    expect(markup).toContain(
      '<h2 class="m-0 text-lg font-medium leading-7">Details</h2>',
    )
    expect(markup).toContain("<noscript>")
  })
})
