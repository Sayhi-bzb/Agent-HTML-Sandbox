import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

describe("artifact workflow inspection", () => {
  it("reports profile separately from resolved profile tokens", async () => {
    const { createInspection } = await importArtifactWorkflowModule()
    const inspection = createInspection({
      meta: {
        profile: "ops-compact",
        theme: "neutral",
        density: "compact",
        tone: "dashboard",
        width: "dashboard",
      },
      components: [
        {
          type: "component",
          name: "page",
          props: {
            title: "Review",
          },
          children: [
            {
              type: "component",
              name: "card",
              props: {},
              children: [],
            },
          ],
        },
      ],
    })

    expect(inspection).toEqual({
      kind: "agent-html-inspection",
      config: {
        profile: "ops-compact",
      },
      resolvedProfileTokens: {
        theme: "neutral",
        density: "compact",
        tone: "dashboard",
        width: "dashboard",
      },
      components: [
        { name: "card", count: 1 },
        { name: "page", count: 1 },
      ],
    })
  })

  it("formats inspection summaries with resolved profile token wording", async () => {
    const { formatInspectionSummary } = await importArtifactWorkflowModule()
    const summary = formatInspectionSummary({
      config: {
        profile: "ops-compact",
      },
      resolvedProfileTokens: {
        density: "compact",
        tone: "dashboard",
      },
      components: [{ name: "card", count: 1 }],
    })

    expect(summary).toContain("profile: ops-compact")
    expect(summary).toContain("resolved profile tokens:")
    expect(summary).not.toContain("resolved config")
    expect(summary).toContain("- density: compact")
    expect(summary).toContain("- tone: dashboard")
    expect(summary).toContain("- card: 1")
  })
})

async function importArtifactWorkflowModule() {
  const moduleUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "cli",
      "artifact-workflow.mjs",
    ),
  ).href

  return import(moduleUrl) as Promise<{
    readonly createInspection: (document: unknown) => unknown
    readonly formatInspectionSummary: (inspection: {
      readonly config?: Record<string, string>
      readonly resolvedProfileTokens?: Record<string, string>
      readonly components?: readonly {
        readonly name: string
        readonly count: number
      }[]
    }) => string
  }>
}
