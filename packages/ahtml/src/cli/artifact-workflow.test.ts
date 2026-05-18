import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

describe("artifact workflow inspection", () => {
  it("reports the checked document style config reference in the inspection payload", async () => {
    const { createInspection } = await importArtifactWorkflowModule()
    const inspection = createInspection({
      meta: {
        documentStyleConfigReference: "ops-compact",
        styleProfile: {
          id: "ops-compact",
          globalStyle: {
            tokenSets: {
              light: {
                background: "#f7f7f4",
                foreground: "#26251e",
                card: "#ffffff",
                cardForeground: "#26251e",
                popover: "#ffffff",
                popoverForeground: "#26251e",
                primary: "#f54e00",
                primaryForeground: "#ffffff",
                secondary: "#fafaf7",
                secondaryForeground: "#26251e",
                muted: "#fafaf7",
                mutedForeground: "#807d72",
                accent: "#fafaf7",
                accentForeground: "#26251e",
                destructive: "#cf2d56",
                border: "#e6e5e0",
                input: "#cfcdc4",
                ring: "#f54e00",
              },
              dark: {
                background: "oklch(0.145 0 0)",
                foreground: "oklch(0.985 0 0)",
                card: "oklch(0.205 0 0)",
                cardForeground: "oklch(0.985 0 0)",
                popover: "oklch(0.205 0 0)",
                popoverForeground: "oklch(0.985 0 0)",
                primary: "oklch(0.922 0 0)",
                primaryForeground: "oklch(0.205 0 0)",
                secondary: "oklch(0.269 0 0)",
                secondaryForeground: "oklch(0.985 0 0)",
                muted: "oklch(0.269 0 0)",
                mutedForeground: "oklch(0.708 0 0)",
                accent: "oklch(0.269 0 0)",
                accentForeground: "oklch(0.985 0 0)",
                destructive: "oklch(0.704 0.191 22.216)",
                border: "oklch(1 0 0 / 10%)",
                input: "oklch(1 0 0 / 15%)",
                ring: "oklch(0.556 0 0)",
              },
            },
            radiusScale: {
              base: "0.75rem",
              sm: "calc(var(--radius) * 0.6)",
              md: "calc(var(--radius) * 0.8)",
              lg: "var(--radius)",
              xl: "calc(var(--radius) * 1.4)",
              "2xl": "calc(var(--radius) * 1.8)",
              "3xl": "calc(var(--radius) * 2.2)",
              "4xl": "calc(var(--radius) * 2.6)",
            },
            typography: {
              fontSans:
                '"Inter Variable", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif',
              fontHeading: "var(--font-sans)",
            },
            cssVariableMap: {
              background: "--background",
              foreground: "--foreground",
              card: "--card",
              cardForeground: "--card-foreground",
              popover: "--popover",
              popoverForeground: "--popover-foreground",
              primary: "--primary",
              primaryForeground: "--primary-foreground",
              secondary: "--secondary",
              secondaryForeground: "--secondary-foreground",
              muted: "--muted",
              mutedForeground: "--muted-foreground",
              accent: "--accent",
              accentForeground: "--accent-foreground",
              destructive: "--destructive",
              border: "--border",
              input: "--input",
              ring: "--ring",
              radius: "--radius",
              fontSans: "--font-sans",
              fontHeading: "--font-heading",
            },
          },
          componentStyle: {
            treatments: {
              alert: "ops-alert",
              badge: "ops-badge",
              card: "ops-card",
              input: "ops-field",
              table: "ops-table",
              tabs: "ops-tabs",
              textarea: "ops-field",
            },
          },
        },
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
      components: [{ name: "card", count: 1 }],
    })

    expect(summary).toContain("config model: document-style-config-reference")
    expect(summary).toContain("documentStyleConfigReference: ops-compact")
    expect(summary).not.toContain("resolved config")
    expect(summary).not.toContain("resolved document style tokens")
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
      readonly components?: readonly {
        readonly name: string
        readonly count: number
      }[]
    }) => string
  }>
}
