import { describe, expect, it } from "vitest"

import { sanitizeAgentHtml } from "./sanitize-agent-html"

describe("sanitizeAgentHtml", () => {
  it("produces SanitizedAgentHtml for valid MVP agent-html", () => {
    const result = sanitizeAgentHtml(`
      <meta-agent theme="neutral" density="compact" tone="report" width="article" />
      <page title="Payment Review">
        <card title="High Risk">
          <badge tone="danger">Missing finance role check</badge>
          <list>
            <item>Add role check before refund mutation</item>
          </list>
        </card>
        <table>
          <row kind="header">
            <cell>file</cell>
            <cell>line</cell>
            <cell>evidence</cell>
          </row>
          <row>
            <cell>payment/refund.ts</cell>
            <cell>42</cell>
            <cell>login-only guard</cell>
          </row>
        </table>
      </page>
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document).toEqual({
      meta: {
        theme: "neutral",
        density: "compact",
        tone: "report",
        width: "article",
      },
      blocks: [
        {
          type: "block",
          name: "page",
          attrs: {
            title: "Payment Review",
          },
          children: [
            {
              type: "block",
              name: "card",
              attrs: {
                title: "High Risk",
              },
              children: [
                {
                  type: "block",
                  name: "badge",
                  attrs: {
                    tone: "danger",
                  },
                  children: [
                    {
                      type: "text",
                      value: "Missing finance role check",
                    },
                  ],
                },
                {
                  type: "block",
                  name: "list",
                  attrs: {},
                  children: [
                    {
                      type: "block",
                      name: "item",
                      attrs: {},
                      children: [
                        {
                          type: "text",
                          value: "Add role check before refund mutation",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "block",
              name: "table",
              attrs: {},
              children: [
                {
                  type: "block",
                  name: "row",
                  attrs: {
                    kind: "header",
                  },
                  children: [
                    {
                      type: "block",
                      name: "cell",
                      attrs: {},
                      children: [{ type: "text", value: "file" }],
                    },
                    {
                      type: "block",
                      name: "cell",
                      attrs: {},
                      children: [{ type: "text", value: "line" }],
                    },
                    {
                      type: "block",
                      name: "cell",
                      attrs: {},
                      children: [{ type: "text", value: "evidence" }],
                    },
                  ],
                },
                {
                  type: "block",
                  name: "row",
                  attrs: {},
                  children: [
                    {
                      type: "block",
                      name: "cell",
                      attrs: {},
                      children: [
                        {
                          type: "text",
                          value: "payment/refund.ts",
                        },
                      ],
                    },
                    {
                      type: "block",
                      name: "cell",
                      attrs: {},
                      children: [{ type: "text", value: "42" }],
                    },
                    {
                      type: "block",
                      name: "cell",
                      attrs: {},
                      children: [
                        {
                          type: "text",
                          value: "login-only guard",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
  })

  it("uses the default render config when the header is omitted", () => {
    const result = sanitizeAgentHtml(`
      <page title="Payment Review">
        <card>Checked content</card>
      </page>
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.meta).toEqual({
      theme: "neutral",
      density: "comfortable",
      tone: "report",
      width: "article",
    })
  })

  it("keeps the page root after a self-closing meta-agent header", () => {
    const result = sanitizeAgentHtml(`
      <meta-agent theme="neutral" density="compact" tone="report" width="article" />
      <page title="Payment Review" />
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.blocks[0]?.name).toBe("page")
  })

  it("keeps row blocks inside semantic agent-html tables", () => {
    const result = sanitizeAgentHtml(`
      <page title="Payment Review">
        <table>
          <row kind="header">
            <cell>file</cell>
            <cell>line</cell>
          </row>
          <row>
            <cell>payment/refund.ts</cell>
            <cell>42</cell>
          </row>
        </table>
      </page>
    `)

    const table = result.document?.blocks[0]?.children[0]

    expect(result.diagnostics).toEqual([])
    expect(table?.type).toBe("block")

    if (table?.type !== "block") {
      throw new Error("Expected table block.")
    }

    const row = table.children[0]

    expect(table.name).toBe("table")
    expect(row?.type).toBe("block")

    if (row?.type !== "block") {
      throw new Error("Expected row block.")
    }

    expect(row.name).toBe("row")
    expect(row.children[0]).toMatchObject({
      type: "block",
      name: "cell",
    })
  })

  it("keeps delimiter characters as cell text instead of parsing custom string protocols", () => {
    const result = sanitizeAgentHtml(`
      <page title="Payment Review">
        <table>
          <row>
            <cell>contains, comma | and pipe</cell>
          </row>
        </table>
      </page>
    `)

    const table = result.document?.blocks[0]?.children[0]

    expect(result.diagnostics).toEqual([])
    expect(table?.type).toBe("block")

    if (table?.type !== "block") {
      throw new Error("Expected table block.")
    }

    expect(table.children[0]).toMatchObject({
      type: "block",
      name: "row",
      children: [
        {
          type: "block",
          name: "cell",
          children: [
            {
              type: "text",
              value: "contains, comma | and pipe",
            },
          ],
        },
      ],
    })
  })

  it("diagnoses unknown blocks, attrs, and invalid nesting", () => {
    const result = sanitizeAgentHtml(`
      <page title="Payment Review">
        <script>alert("x")</script>
        <card onclick="steal()" style="color:red">Bad card</card>
        <table>Text is not a row</table>
      </page>
    `)

    expect(result.document).toBeUndefined()
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "unknown-block",
        "unknown-attr",
        "invalid-child",
      ]),
    )
  })

  it("diagnoses CSS-like render config header values", () => {
    const result = sanitizeAgentHtml(`
      <meta-agent theme="neutral" density="compact" tone="color:red" width="article" />
      <page title="Payment Review" />
    `)

    expect(result.document).toBeUndefined()
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "invalid-render-config",
    )
  })

  it("does not pass cleaned HTML through as the renderer input", () => {
    const result = sanitizeAgentHtml(`
      <page title="Payment Review">
        <card>Safe text</card>
      </page>
    `)

    expect(typeof result.document).toBe("object")
    expect(result.document?.blocks[0]?.type).toBe("block")
    expect(result.document?.blocks[0]?.children[0]?.type).toBe("block")
  })
})
