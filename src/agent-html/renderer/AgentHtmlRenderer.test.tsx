import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SanitizedAgentHtml } from "../types"
import { AgentHtmlRenderer } from "./AgentHtmlRenderer"
import { getRendererBlock } from "./block-registry"
import { getRenderProfile } from "./render-profile"

describe("AgentHtmlRenderer", () => {
  it("renders MVP base blocks from SanitizedAgentHtml", () => {
    render(<AgentHtmlRenderer document={paymentReviewDocument} />)

    expect(
      screen.getByRole("heading", { name: "Payment Review" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Missing finance role check")).toBeInTheDocument()
    expect(screen.getByText("payment/refund.ts")).toBeInTheDocument()

    const list = screen.getByRole("list")
    expect(
      within(list).getByText("Add role check before refund mutation"),
    ).toBeInTheDocument()
  })

  it("does not register unknown blocks", () => {
    expect(getRendererBlock("script")).toBeUndefined()
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
                  children: [{ type: "text", value: "payment/refund.ts" }],
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
