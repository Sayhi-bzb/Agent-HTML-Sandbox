/// <reference types="node" />
// @vitest-environment node

import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

describe("gallery workflow", () => {
  it("creates a fixed showcase document from a style profile", async () => {
    const { createStyleGalleryDocument } = await importGalleryWorkflowModule()
    const { parseRenderConfig } = await importInternalCoreBridge()
    const styleProfile = parseRenderConfig({
      "style-ref": "ops-compact",
    }).styleProfile

    const document = createStyleGalleryDocument(styleProfile)

    expect(document.meta.documentStyleConfigReference).toBe("ops-compact")
    expect(document.meta.styleProfile.id).toBe("ops-compact")
    expect(document.components[0]).toMatchObject({
      type: "component",
      name: "page",
      props: {
        title: "ops-compact style gallery",
      },
    })

    const serialized = JSON.stringify(document)

    expect(serialized).toContain('"name":"tabs"')
    expect(serialized).toContain('"label":"Overview"')
    expect(serialized).toContain('"label":"Palette"')
    expect(serialized).toContain('"label":"Typography"')
    expect(serialized).toContain('"label":"Forms"')
    expect(serialized).toContain('"label":"Data"')
    expect(serialized).toContain('"label":"Disclosure"')
    expect(serialized).toContain(
      styleProfile.globalStyle.tokenSets.light.background,
    )
    expect(serialized).toContain(styleProfile.componentStyle.treatments.card)
    expect(serialized).toContain("Legacy globals")
    expect(serialized).toContain("CLI gallery")
  })
})

async function importGalleryWorkflowModule() {
  const moduleUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "cli",
      "gallery-workflow.mjs",
    ),
  ).href

  return import(moduleUrl) as Promise<{
    readonly createStyleGalleryDocument: (styleProfile: {
      readonly id: string
      readonly globalStyle: {
        readonly tokenSets: {
          readonly light: {
            readonly background: string
          }
        }
      }
      readonly componentStyle: {
        readonly treatments: Readonly<Record<string, string>>
      }
    }) => {
      readonly meta: {
        readonly documentStyleConfigReference: string
        readonly styleProfile: {
          readonly id: string
        }
      }
      readonly components: readonly {
        readonly type: "component"
        readonly name: string
        readonly props: Record<string, string>
      }[]
    }
  }>
}

async function importInternalCoreBridge() {
  const moduleUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "config",
      "internal-core-bridge.mjs",
    ),
  ).href

  return import(moduleUrl) as Promise<{
    readonly parseRenderConfig: (input: {
      readonly "style-ref": string
    }) => {
      readonly styleProfile: {
        readonly id: string
        readonly globalStyle: {
          readonly tokenSets: {
            readonly light: {
              readonly background: string
            }
          }
        }
        readonly componentStyle: {
          readonly treatments: Readonly<Record<string, string>>
        }
      }
    }
  }>
}
