import { describe, expect, it } from "vitest"

import { sanitizeAgentHtml } from "./sanitize-agent-html"

const semanticReportSource = `
  <meta-agent style-ref="report-default" />
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
  <meta-agent style-ref="ops-compact" />
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
        <alert title="Decision">Ship the current direction.</alert>
        <table>
          <row kind="header">
            <cell>Signal</cell>
            <cell>Status</cell>
          </row>
          <row>
            <cell>Review confidence</cell>
            <cell>Enough signal to continue.</cell>
          </row>
        </table>
      </tab>
    </tabs>
  </page>
`

describe("sanitizeAgentHtml", () => {
  it("produces SanitizedAgentHtml for valid MVP agent-html", () => {
    const result = sanitizeAgentHtml(`
      <meta-agent style-ref="report-default" />
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
        documentStyleConfigReference: "report-default",
        styleProfile: {
          id: "report-default",
          globalStyle: {
            tokenSets: {
              light: expect.objectContaining({
                background: "#f7f7f4",
                foreground: "#26251e",
              }),
              dark: expect.objectContaining({
                background: "oklch(0.145 0 0)",
                foreground: "oklch(0.985 0 0)",
              }),
            },
            radiusScale: expect.objectContaining({
              base: "0.75rem",
            }),
            typography: expect.objectContaining({
              fontHeading: "var(--font-sans)",
            }),
            cssVariableMap: expect.objectContaining({
              border: "--border",
            }),
            legacyProjection: {
              theme: "neutral",
              density: "comfortable",
              tone: "report",
              width: "article",
            },
          },
          componentStyle: {
            treatments: {
              alert: "report-alert",
              badge: "report-badge",
              card: "report-card",
              input: "report-field",
              table: "report-table",
              tabs: "report-tabs",
              textarea: "report-field",
            },
          },
        },
        theme: "neutral",
        density: "comfortable",
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
      documentStyleConfigReference: "report-default",
      styleProfile: {
        id: "report-default",
        globalStyle: {
          tokenSets: {
            light: expect.objectContaining({
              background: "#f7f7f4",
              foreground: "#26251e",
            }),
            dark: expect.objectContaining({
              background: "oklch(0.145 0 0)",
              foreground: "oklch(0.985 0 0)",
            }),
          },
          radiusScale: expect.objectContaining({
            lg: "var(--radius)",
          }),
          typography: expect.objectContaining({
            fontSans: expect.stringContaining("Inter Variable"),
          }),
          cssVariableMap: expect.objectContaining({
            radius: "--radius",
          }),
          legacyProjection: {
            theme: "neutral",
            density: "comfortable",
            tone: "report",
            width: "article",
          },
        },
        componentStyle: {
          treatments: {
            alert: "report-alert",
            badge: "report-badge",
            card: "report-card",
            input: "report-field",
            table: "report-table",
            tabs: "report-tabs",
            textarea: "report-field",
          },
        },
      },
      theme: "neutral",
      density: "comfortable",
      tone: "report",
      width: "article",
    })
  })

  it("keeps the page root after a self-closing meta-agent header", () => {
    const result = sanitizeAgentHtml(`
      <meta-agent style-ref="ops-compact" />
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

  it("rejects removed profile render config header values", () => {
    const result = sanitizeAgentHtml(`
      <meta-agent profile="report-default" />
      <page title="Payment Review" />
    `)

    expect(result.document).toBeUndefined()
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "invalid-render-config",
    )
  })

  it("rejects legacy free-form render config header values", () => {
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

  it("accepts first-pass interactive structure components", () => {
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
            <alert title="Decision">Ship the current direction.</alert>
            <table>
              <row kind="header">
                <cell>Signal</cell>
                <cell>Status</cell>
              </row>
              <row>
                <cell>Review confidence</cell>
                <cell>Enough signal to continue.</cell>
              </row>
            </table>
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

  it("accepts progress inside supported content containers", () => {
    const result = sanitizeAgentHtml(`
      <page title="Delivery Readiness">
        <card title="Rollout">
          <progress value="0" />
        </card>
      </page>
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.components[0]?.children[0]).toMatchObject({
      type: "component",
      name: "card",
      children: [
        {
          type: "component",
          name: "progress",
          props: {
            value: "0",
          },
          children: [],
        },
      ],
    })
  })

  it("accepts text field controls inside supported content containers", () => {
    const result = sanitizeAgentHtml(`
      <page title="Reviewer Form">
        <card title="Feedback">
          <input label="Owner" value="Ops reviewer" description="Single-line field." />
          <textarea label="Notes" value="Ship after the guard lands." description="Long-form field." />
        </card>
      </page>
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.components[0]?.children[0]).toMatchObject({
      type: "component",
      name: "card",
      children: [
        {
          type: "component",
          name: "input",
          props: {
            label: "Owner",
            value: "Ops reviewer",
            description: "Single-line field.",
          },
          children: [],
        },
        {
          type: "component",
          name: "textarea",
          props: {
            label: "Notes",
            value: "Ship after the guard lands.",
            description: "Long-form field.",
          },
          children: [],
        },
      ],
    })
  })

  it("accepts boolean, single-select, and choice controls inside supported content containers", () => {
    const result = sanitizeAgentHtml(`
      <page title="Reviewer Form">
        <card title="Decision">
          <checkbox label="Ship now" checked="true" description="Boolean field." />
          <switch label="Live Sync" checked="true" description="Immediate preference toggle." />
          <slider label="Review strictness" value="70" description="Read-only numeric field." />
          <radio-group label="Direction" value="ship" description="Single-select field.">
            <option value="ship" label="Ship">Use the current direction.</option>
            <option value="hold" label="Hold">Wait for the guard.</option>
          </radio-group>
          <toggle-group label="Rollout Mode" value="fast" description="Inline option set.">
            <option value="fast" label="Fast">Prefer speed.</option>
            <option value="safe" label="Safe">Prefer guardrails.</option>
          </toggle-group>
          <select label="Deployment Window" value="today" description="Choose a release window.">
            <option value="today" label="Today">Ship in the current window.</option>
            <option value="tomorrow" label="Tomorrow">Wait for the next window.</option>
          </select>
          <combobox label="Owner" value="Ops reviewer" description="Searchable single-select field.">
            <option value="Ops reviewer" label="Ops reviewer">Current reviewer.</option>
            <option value="Security reviewer" label="Security reviewer">Escalation reviewer.</option>
          </combobox>
        </card>
      </page>
    `)

    expect(result.diagnostics).toEqual([])
    expect(result.document?.components[0]?.children[0]).toMatchObject({
      type: "component",
      name: "card",
      children: [
        {
          type: "component",
          name: "checkbox",
          props: {
            label: "Ship now",
            checked: "true",
            description: "Boolean field.",
          },
          children: [],
        },
        {
          type: "component",
          name: "switch",
          props: {
            label: "Live Sync",
            checked: "true",
            description: "Immediate preference toggle.",
          },
          children: [],
        },
        {
          type: "component",
          name: "slider",
          props: {
            label: "Review strictness",
            value: "70",
            description: "Read-only numeric field.",
          },
          children: [],
        },
        {
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
              props: {
                value: "ship",
                label: "Ship",
              },
            },
            {
              type: "component",
              name: "option",
              props: {
                value: "hold",
                label: "Hold",
              },
            },
          ],
        },
        {
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
              props: {
                value: "fast",
                label: "Fast",
              },
            },
            {
              type: "component",
              name: "option",
              props: {
                value: "safe",
                label: "Safe",
              },
            },
          ],
        },
        {
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
              props: {
                value: "today",
                label: "Today",
              },
            },
            {
              type: "component",
              name: "option",
              props: {
                value: "tomorrow",
                label: "Tomorrow",
              },
            },
          ],
        },
        {
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
              props: {
                value: "Ops reviewer",
                label: "Ops reviewer",
              },
            },
            {
              type: "component",
              name: "option",
              props: {
                value: "Security reviewer",
                label: "Security reviewer",
              },
            },
          ],
        },
      ],
    })
  })

  it("rejects invalid typed field values", () => {
    const result = sanitizeAgentHtml(`
      <page title="Invalid Fields">
        <card title="Bad types">
          <progress value="lots" />
          <checkbox label="Ship now" checked="maybe" />
        </card>
      </page>
    `)

    expect(result.document).toBeUndefined()
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["unknown-attr"]),
    )
  })

  it("rejects removed custom controls", () => {
    const result = sanitizeAgentHtml(`
      <page title="Removed Controls">
        <choice-group title="Direction" mode="single" default="ship">
          <choice value="ship" label="Ship">Use the current direction.</choice>
        </choice-group>
        <slider-control label="Review strictness" value="70" />
        <feedback-box title="Export prompt">Notes</feedback-box>
        <progress-meter label="Decision confidence" value="82" />
      </page>
    `)

    expect(result.document).toBeUndefined()
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "unknown-component",
    )
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
