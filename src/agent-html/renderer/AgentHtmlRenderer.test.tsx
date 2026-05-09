import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SanitizedAgentHtml } from "../types"
import { AgentHtmlRenderer } from "./AgentHtmlRenderer"
import { getRendererComponent } from "./component-registry"
import { getRenderProfile } from "./render-profile"

describe("AgentHtmlRenderer", () => {
  it("renders standard components from SanitizedAgentHtml", () => {
    render(<AgentHtmlRenderer document={paymentReviewDocument} />)

    expect(
      screen.getByRole("heading", { name: "Payment Review" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Webhook replay is still possible",
    )
    expect(screen.getByText("Missing finance role check")).toBeInTheDocument()
    expect(screen.getByText("payment/refund.ts")).toBeInTheDocument()

    const list = screen.getByRole("list")
    expect(
      within(list).getByText("Add role check before refund mutation"),
    ).toBeInTheDocument()
  })

  it("does not register unknown components", () => {
    expect(getRendererComponent("script")).toBeUndefined()
  })

  it("renders controlled interactive components", () => {
    render(<AgentHtmlRenderer document={interactiveWorkbenchDocument} />)

    expect(screen.getByRole("tab", { name: "Explore" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Decide" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Review Console" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Selected: Ship it")).toBeInTheDocument()
    expect(screen.getByText("Review strictness")).toBeInTheDocument()
    expect(screen.getByText("Decision confidence")).toBeInTheDocument()

    const textbox = screen.getByRole("textbox")
    expect(textbox).toHaveValue("Implement the selected direction.")
    fireEvent.change(textbox, {
      target: { value: "Implement with stricter review." },
    })
    expect(textbox).toHaveValue("Implement with stricter review.")
  })

  it("maps render config to internal profiles", () => {
    expect(
      getRenderProfile({
        theme: "neutral",
        density: "compact",
        tone: "dashboard",
        width: "wide",
      }),
    ).toMatchObject({
      cardSize: "sm",
    })
  })
})

const paymentReviewDocument: SanitizedAgentHtml = {
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
          name: "alert",
          props: {
            title: "Risk note",
            tone: "danger",
          },
          children: [
            {
              type: "text",
              value: "Webhook replay is still possible",
            },
          ],
        },
        {
          type: "component",
          name: "separator",
          props: {},
          children: [],
        },
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
                  children: [{ type: "text", value: "payment/refund.ts" }],
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
                  children: [{ type: "text", value: "login-only guard" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

const interactiveWorkbenchDocument: SanitizedAgentHtml = {
  meta: {
    theme: "neutral",
    density: "comfortable",
    tone: "decision",
    width: "wide",
  },
  components: [
    {
      type: "component",
      name: "page",
      props: {
        title: "Interactive Workbench",
      },
      children: [
        {
          type: "component",
          name: "tabs",
          props: {
            default: "decide",
          },
          children: [
            {
              type: "component",
              name: "tab",
              props: {
                value: "explore",
                label: "Explore",
              },
              children: [
                {
                  type: "component",
                  name: "accordion",
                  props: {},
                  children: [
                    {
                      type: "component",
                      name: "accordion-item",
                      props: {
                        value: "review",
                        title: "Review Console",
                      },
                      children: [
                        {
                          type: "text",
                          value: "Inspect findings.",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "component",
              name: "tab",
              props: {
                value: "decide",
                label: "Decide",
              },
              children: [
                {
                  type: "component",
                  name: "accordion",
                  props: {},
                  children: [
                    {
                      type: "component",
                      name: "accordion-item",
                      props: {
                        value: "review",
                        title: "Review Console",
                      },
                      children: [
                        {
                          type: "text",
                          value: "Inspect findings.",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "component",
                  name: "choice-group",
                  props: {
                    title: "Direction",
                    mode: "single",
                    default: "ship",
                  },
                  children: [
                    {
                      type: "component",
                      name: "choice",
                      props: {
                        value: "ship",
                        label: "Ship it",
                      },
                      children: [
                        {
                          type: "text",
                          value: "Use the current plan.",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "component",
                  name: "slider-control",
                  props: {
                    label: "Review strictness",
                    value: "70",
                    min: "0",
                    max: "100",
                    step: "5",
                    unit: "%",
                  },
                  children: [
                    {
                      type: "text",
                      value: "Tune how strict the verifier should be.",
                    },
                  ],
                },
                {
                  type: "component",
                  name: "feedback-box",
                  props: {
                    title: "Export prompt",
                    copyLabel: "Copy",
                  },
                  children: [
                    {
                      type: "text",
                      value: "Implement the selected direction.",
                    },
                  ],
                },
                {
                  type: "component",
                  name: "progress-meter",
                  props: {
                    label: "Decision confidence",
                    value: "82",
                    detail: "Enough signal to continue.",
                  },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
