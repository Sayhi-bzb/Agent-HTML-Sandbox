import { describe, expect, it } from "vitest"

import { sanitizeAgentHtml } from "./sanitize-agent-html"

const semanticReportSource = `
  <meta-agent theme="neutral" density="comfortable" tone="report" width="wide" />
  <page title="Semantic Report">
    <alert title="Thesis">HTML artifacts can stay readable without exposing implementation details.</alert>
    <card title="Executive Summary">
      <badge tone="success">Readable</badge>
      <list>
        <item>Agents use semantic components.</item>
        <item>Renderer details stay internal.</item>
      </list>
    </card>
    <table>
      <row kind="header">
        <cell>Use Case</cell>
        <cell>Component</cell>
      </row>
      <row>
        <cell>Code review</cell>
        <cell>alert, table, list</cell>
      </row>
    </table>
  </page>
`

const collaborationWorkbenchSource = `
  <meta-agent theme="neutral" density="comfortable" tone="dashboard" width="wide" />
  <page title="Human Agent Collaboration Workbench">
    <tabs default="decide">
      <tab value="explore" label="Explore">
        <accordion>
          <accordion-item value="review" title="Review Console">
            <list>
              <item>Inspect findings and choose a response.</item>
            </list>
          </accordion-item>
        </accordion>
      </tab>
      <tab value="decide" label="Decide">
        <choice-group title="Direction" mode="single" default="ship">
          <choice value="ship" label="Ship">Use the current direction.</choice>
          <choice value="revise" label="Revise">Ask for another pass.</choice>
        </choice-group>
        <slider-control label="Review strictness" value="70" min="0" max="100" step="5" unit="%">
          Increase this when the artifact drives implementation.
        </slider-control>
        <feedback-box title="Export prompt" copy-label="Copy">
          Implement the selected direction with the chosen strictness.
        </feedback-box>
        <progress-meter label="Decision confidence" value="82" detail="Enough signal to continue." />
      </tab>
    </tabs>
  </page>
`

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
      components: [
        {
          type: "component",
          name: "page",
          props: {
            title: "Payment Review",
          },
          children: [
            {
              type: "component",
              name: "card",
              props: {
                title: "High Risk",
              },
              children: [
                {
                  type: "component",
                  name: "badge",
                  props: {
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
                  type: "component",
                  name: "list",
                  props: {},
                  children: [
                    {
                      type: "component",
                      name: "item",
                      props: {},
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
              type: "component",
              name: "table",
              props: {},
              children: [
                {
                  type: "component",
                  name: "row",
                  props: {
                    kind: "header",
                  },
                  children: [
                    {
                      type: "component",
                      name: "cell",
                      props: {},
                      children: [{ type: "text", value: "file" }],
                    },
                    {
                      type: "component",
                      name: "cell",
                      props: {},
                      children: [{ type: "text", value: "line" }],
                    },
                    {
                      type: "component",
                      name: "cell",
                      props: {},
                      children: [{ type: "text", value: "evidence" }],
                    },
                  ],
                },
                {
                  type: "component",
                  name: "row",
                  props: {},
                  children: [
                    {
                      type: "component",
                      name: "cell",
                      props: {},
                      children: [
                        {
                          type: "text",
                          value: "payment/refund.ts",
                        },
                      ],
                    },
                    {
                      type: "component",
                      name: "cell",
                      props: {},
                      children: [{ type: "text", value: "42" }],
                    },
                    {
                      type: "component",
                      name: "cell",
                      props: {},
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
    expect(result.document?.components[0]?.name).toBe("page")
  })

  it("keeps row components inside semantic agent-html tables", () => {
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

    const table = result.document?.components[0]?.children[0]

    expect(result.diagnostics).toEqual([])
    expect(table?.type).toBe("component")

    if (table?.type !== "component") {
      throw new Error("Expected table component.")
    }

    const row = table.children[0]

    expect(table.name).toBe("table")
    expect(row?.type).toBe("component")

    if (row?.type !== "component") {
      throw new Error("Expected row component.")
    }

    expect(row.name).toBe("row")
    expect(row.children[0]).toMatchObject({
      type: "component",
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

    const table = result.document?.components[0]?.children[0]

    expect(result.diagnostics).toEqual([])
    expect(table?.type).toBe("component")

    if (table?.type !== "component") {
      throw new Error("Expected table component.")
    }

    expect(table.children[0]).toMatchObject({
      type: "component",
      name: "row",
      children: [
        {
          type: "component",
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

  it("diagnoses unknown components, attrs, and invalid nesting", () => {
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
        "unknown-component",
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
    expect(result.document?.components[0]?.type).toBe("component")
    expect(result.document?.components[0]?.children[0]?.type).toBe("component")
  })

  it("accepts a representative semantic report", () => {
    const result = sanitizeAgentHtml(semanticReportSource)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.components[0]).toMatchObject({
      type: "component",
      name: "page",
      props: {
        title: "Semantic Report",
      },
    })
  })

  it("accepts controlled interactive agent-html components", () => {
    const result = sanitizeAgentHtml(`
      <page title="Interactive Workbench">
        <tabs default="decide">
          <tab value="explore" label="Explore">
            <accordion>
              <accordion-item value="review" title="Review Console">
                <list>
                  <item>Inspect findings and choose a response.</item>
                </list>
              </accordion-item>
            </accordion>
          </tab>
          <tab value="decide" label="Decide">
            <choice-group title="Direction" mode="single" default="ship">
              <choice value="ship" label="Ship">Use the current direction.</choice>
              <choice value="revise" label="Revise">Ask for another pass.</choice>
            </choice-group>
            <slider-control label="Review strictness" value="70" min="0" max="100" step="5" unit="%">
              Increase this when the artifact drives implementation.
            </slider-control>
            <feedback-box title="Export prompt" copy-label="Copy">
              Implement the selected direction with the chosen strictness.
            </feedback-box>
            <progress-meter label="Decision confidence" value="82" detail="Enough signal to continue." />
          </tab>
        </tabs>
      </page>
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.components[0]?.children[0]).toMatchObject({
      type: "component",
      name: "tabs",
    })
  })

  it("accepts a representative interactive collaboration workbench", () => {
    const result = sanitizeAgentHtml(collaborationWorkbenchSource)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.components[0]).toMatchObject({
      type: "component",
      name: "page",
      props: {
        title: "Human Agent Collaboration Workbench",
      },
    })
  })
})
