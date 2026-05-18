// @ts-nocheck

import { describe, expect, it } from "vitest"

import { createRuntimeRenderDiagnostics } from "./runtime-renderability.mjs"

describe("createRuntimeRenderDiagnostics", () => {
  it("returns structured diagnostics for runtime renderer drift before SSR", () => {
    const diagnostics = createRuntimeRenderDiagnostics({
      document: {
        meta: {
          documentStyleConfigReference: "report-default",
        },
        components: [
          {
            type: "component",
            name: "card",
            props: { title: "Summary" },
            children: [{ type: "text", value: "Body" }],
          },
        ],
      },
      runtimeVerificationState: {
        verificationData: {
          components: [
            {
              name: "card",
              renderKind: "compound",
              props: ["title"],
              slots: [{ name: "children", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          version: 1,
          components: [
            {
              name: "card",
              kind: "primitive",
              renderKind: "compound",
              component: "Card",
              root: "Card",
              slots: [{ name: "children", children: ["text"] }],
            },
          ],
        },
      },
      schema: {
        verificationData: {
          components: [
            {
              name: "card",
              renderKind: "compound",
              props: ["title"],
              slots: [{ name: "children", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          components: [
            {
              name: "card",
              kind: "compound",
              renderKind: "compound",
              root: "Card",
              slots: [{ name: "children", children: ["text"] }],
            },
          ],
        },
      },
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "runtime-renderer-mapping-parity",
        path: "/runtime",
        severity: "error",
        message: expect.stringContaining("card kind"),
      }),
      expect.objectContaining({
        code: "runtime-renderer-parity",
        path: "/runtime",
        severity: "error",
        message: expect.stringContaining(
          "Kind mismatch: card kind: primitive expected compound",
        ),
      }),
    ])
  })

  it("returns structured diagnostics for renderer mapping field drift", () => {
    const diagnostics = createRuntimeRenderDiagnostics({
      document: {
        meta: {
          documentStyleConfigReference: "report-default",
        },
        components: [],
      },
      runtimeVerificationState: {
        verificationData: {
          components: [
            {
              name: "tabs",
              renderKind: "tabs",
              props: ["default"],
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          version: 1,
          components: [
            {
              name: "tabs",
              kind: "tabs",
              renderKind: "tabs",
              root: "Tabs",
              list: "TabsList",
              trigger: "TabsTrigger",
              content: "TabsContent",
              itemSlot: "tab",
              itemValueProp: "slug",
              itemHeadingProp: "heading",
              defaultProp: "default",
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
      },
      schema: {
        verificationData: {
          components: [
            {
              name: "tabs",
              renderKind: "tabs",
              props: ["default"],
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          components: [
            {
              name: "tabs",
              kind: "tabs",
              renderKind: "tabs",
              root: "Tabs",
              list: "TabsList",
              trigger: "TabsTrigger",
              content: "TabsContent",
              itemSlot: "tab",
              itemValueProp: "value",
              itemHeadingProp: "label",
              defaultProp: "default",
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
      },
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "runtime-renderer-mapping-parity",
        path: "/runtime",
        severity: "error",
        message: expect.stringContaining("itemValueProp"),
      }),
    ])
  })

  it("returns structured diagnostics for missing kind-required renderer mapping fields", () => {
    const diagnostics = createRuntimeRenderDiagnostics({
      document: {
        meta: {
          documentStyleConfigReference: "report-default",
        },
        components: [],
      },
      runtimeVerificationState: {
        verificationData: {
          components: [
            {
              name: "tabs",
              renderKind: "tabs",
              props: ["default"],
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          version: 1,
          components: [
            {
              name: "tabs",
              kind: "tabs",
              renderKind: "tabs",
              root: "Tabs",
              list: "TabsList",
              trigger: "TabsTrigger",
              content: "TabsContent",
              itemSlot: "tab",
              itemLabelProp: "label",
              defaultProp: "default",
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
      },
      schema: {
        verificationData: {
          components: [
            {
              name: "tabs",
              renderKind: "tabs",
              props: ["default"],
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          components: [
            {
              name: "tabs",
              kind: "tabs",
              renderKind: "tabs",
              root: "Tabs",
              list: "TabsList",
              trigger: "TabsTrigger",
              content: "TabsContent",
              itemSlot: "tab",
              itemValueProp: "value",
              itemHeadingProp: "label",
              defaultProp: "default",
              slots: [{ name: "tab", children: ["text"] }],
            },
          ],
        },
      },
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "runtime-renderer-mapping-parity",
        path: "/runtime",
        severity: "error",
        message: expect.stringContaining(
          'Missing required field "itemValueProp"',
        ),
      }),
    ])
  })

  it("does not report structural slot children as missing renderer components", () => {
    const diagnostics = createRuntimeRenderDiagnostics({
      document: {
        meta: {
          documentStyleConfigReference: "report-default",
        },
        components: [
          {
            type: "component",
            name: "table",
            props: {},
            children: [
              {
                type: "component",
                name: "row",
                props: { kind: "header" },
                children: [
                  {
                    type: "component",
                    name: "cell",
                    props: {},
                    children: [{ type: "text", value: "Name" }],
                  },
                ],
              },
            ],
          },
          {
            type: "component",
            name: "list",
            props: {},
            children: [
              {
                type: "component",
                name: "item",
                props: {},
                children: [{ type: "text", value: "First" }],
              },
            ],
          },
        ],
      },
      runtimeVerificationState: {
        verificationData: {
          components: [
            {
              name: "table",
              renderKind: "table",
              props: [],
              slots: [{ name: "row", children: ["cell"] }],
            },
            {
              name: "list",
              renderKind: "collection",
              props: [],
              slots: [{ name: "item", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          version: 1,
          components: [
            {
              name: "table",
              kind: "table",
              renderKind: "table",
              root: "Table",
              header: "TableHeader",
              body: "TableBody",
              row: "TableRow",
              headerCell: "TableHead",
              bodyCell: "TableCell",
              rowSlot: "row",
              cellSlot: "cell",
              kindProp: "kind",
              headerKind: "header",
              slots: [{ name: "row", children: ["cell"] }],
            },
            {
              name: "list",
              kind: "collection",
              renderKind: "collection",
              root: "ul",
              item: "li",
              itemSlot: "item",
              childMode: "inline",
              slots: [{ name: "item", children: ["text"] }],
            },
          ],
        },
      },
      schema: {
        verificationData: {
          components: [
            {
              name: "table",
              renderKind: "table",
              props: [],
              slots: [{ name: "row", children: ["cell"] }],
            },
            {
              name: "list",
              renderKind: "collection",
              props: [],
              slots: [{ name: "item", children: ["text"] }],
            },
          ],
        },
        rendererMapping: {
          components: [
            {
              name: "table",
              kind: "table",
              renderKind: "table",
              root: "Table",
              header: "TableHeader",
              body: "TableBody",
              row: "TableRow",
              headerCell: "TableHead",
              bodyCell: "TableCell",
              rowSlot: "row",
              cellSlot: "cell",
              kindProp: "kind",
              headerKind: "header",
              slots: [{ name: "row", children: ["cell"] }],
            },
            {
              name: "list",
              kind: "collection",
              renderKind: "collection",
              root: "ul",
              item: "li",
              itemSlot: "item",
              childMode: "inline",
              slots: [{ name: "item", children: ["text"] }],
            },
          ],
        },
      },
    })

    expect(diagnostics).toEqual([])
  })
})
