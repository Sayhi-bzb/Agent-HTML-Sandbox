import { describe, expect, it } from "vitest"

import type { CatalogItem, RenderConfig, SanitizedAgentHtml } from "./types"

describe("agent-html public types", () => {
  it("models a finite render config and sanitized blocks", () => {
    const meta = {
      theme: "neutral",
      density: "compact",
      tone: "report",
      width: "article",
    } satisfies RenderConfig

    const pageCatalogItem = {
      name: "page",
      kind: "base",
      description: "Page root block.",
      props: [
        {
          name: "title",
          valueKind: "string",
          required: true,
        },
      ],
      allowedChildren: ["card", "table", "list"],
    } satisfies CatalogItem

    const document = {
      meta,
      blocks: [
        {
          type: "block",
          name: "page",
          attrs: {
            title: "Payment Review",
          },
          children: [
            {
              type: "text",
              value: "Checked content only.",
            },
          ],
        },
      ],
    } satisfies SanitizedAgentHtml

    expect(pageCatalogItem.kind).toBe("base")
    expect(document.meta.density).toBe("compact")
    expect(document.blocks[0]?.name).toBe("page")
  })
})
