import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

describe("artifact workflow inspection", () => {
  it("reports the checked document style config reference separately from resolved document style tokens", async () => {
    const { createInspection } = await importArtifactWorkflowModule()
    const inspection = createInspection({
      meta: {
        documentStyleConfigReference: "ops-compact",
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
      configModel: "document-style-config-reference",
      config: {
        documentStyleConfigReference: "ops-compact",
      },
      resolvedDocumentStyleTokens: {
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

  it("formats inspection summaries with document-style wording", async () => {
    const { formatInspectionSummary } = await importArtifactWorkflowModule()
    const summary = formatInspectionSummary({
      configModel: "document-style-config-reference",
      config: {
        documentStyleConfigReference: "ops-compact",
      },
      resolvedDocumentStyleTokens: {
        density: "compact",
        tone: "dashboard",
      },
      components: [{ name: "card", count: 1 }],
    })

    expect(summary).toContain("config model: document-style-config-reference")
    expect(summary).toContain("documentStyleConfigReference: ops-compact")
    expect(summary).toContain("resolved document style tokens:")
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
      readonly configModel?: string
      readonly config?: Record<string, string>
      readonly resolvedDocumentStyleTokens?: Record<string, string>
      readonly components?: readonly {
        readonly name: string
        readonly count: number
      }[]
    }) => string
  }>
}
