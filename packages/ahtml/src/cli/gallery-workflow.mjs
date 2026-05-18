import path from "node:path"

import { createRenderConfigFromStyleProfile } from "../config/internal-core-bridge.mjs"
import { buildRuntimeArtifact } from "./runtime-build.mjs"
import {
  writeGeneratedDocument,
  writeGeneratedRuntimeState,
} from "./runtime-status.mjs"
import { getRuntimeRenderDiagnostics } from "./runtime-renderability.mjs"
import { getCliSchemaOutput } from "./schema.mjs"
import {
  listStyleProfileReferences,
  readCurrentStyleProfileReference,
  resolveStyleProfileByReference,
} from "./style-profile-storage.mjs"
import { printDiagnostics, writeJsonFile } from "./cli-io.mjs"
import { createInspection } from "./artifact-workflow.mjs"

export class StyleGalleryProfileNotFoundError extends Error {
  constructor(styleReference, availableReferences) {
    super(
      [
        `Unknown style profile "${styleReference}".`,
        availableReferences.length > 0
          ? `Available style-ref values: ${availableReferences.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
    this.name = "StyleGalleryProfileNotFoundError"
    this.styleReference = styleReference
    this.availableReferences = availableReferences
  }
}

export function createGalleryWorkflow({
  userRoot,
  defaultOutputDir,
  packageRoot,
  runtimePaths,
  readPackageVersion,
  ensureManagedRuntime,
}) {
  async function buildGalleryArtifact(outputPath, options = {}) {
    const outputDir = path.resolve(userRoot, outputPath ?? defaultOutputDir)
    const styleReference =
      options.styleReference ??
      (await readCurrentStyleProfileReference(runtimePaths))
    const styleProfile = await resolveStyleProfileByReference(
      runtimePaths,
      styleReference,
    )

    if (!styleProfile) {
      throw new StyleGalleryProfileNotFoundError(
        styleReference,
        await listStyleProfileReferences(runtimePaths),
      )
    }

    const schema = await getCliSchemaOutput()
    const packageVersion = await readPackageVersion()
    await ensureManagedRuntime(packageVersion, schema)

    const document = createStyleGalleryDocument(styleProfile)
    const runtimeState = createGalleryRuntimeState({
      styleProfile,
      styleReference,
      availableStyleReferences: await listStyleProfileReferences(runtimePaths),
    })
    const runtimeDiagnostics = await getRuntimeRenderDiagnostics({
      document,
      runtimePaths,
      schema,
    })

    if (runtimeDiagnostics.length > 0) {
      if (options.printDiagnostics !== false) {
        printDiagnostics(runtimeDiagnostics)
      }

      return createGalleryResult({
        diagnostics: runtimeDiagnostics,
        ok: false,
        outputDir,
        stage: "runtime-renderability",
        styleReference,
      })
    }

    await writeGeneratedDocument(document, runtimePaths)
    await writeGeneratedRuntimeState(runtimeState, runtimePaths)
    await buildRuntimeArtifact({
      outputDir,
      packageRoot,
      paths: runtimePaths,
    })

    const inspection = createInspection(document)
    const inspectionPath = path.join(outputDir, "agent-html.inspect.json")
    await writeJsonFile(inspectionPath, inspection)

    return createGalleryResult({
      inspection,
      inspectionPath,
      ok: true,
      outputDir,
      runtimeState,
      styleReference,
    })
  }

  return {
    buildGalleryArtifact,
  }
}

export function createStyleGalleryDocument(styleProfile) {
  const renderConfig = createRenderConfigFromStyleProfile(styleProfile)

  return {
    meta: renderConfig,
    components: [
      component("page", { title: `${styleProfile.id} showcase canvas` }, [
        component("card", { title: "Feedback" }, [
          component("alert", { title: "Status surfaces", tone: "success" }, [
            text("Showcase canvas surfaces contrast and treatment changes immediately."),
          ]),
          component("badge", { tone: "success" }, [text("Current profile")]),
          component("progress", { value: "68" }),
        ]),
        component("card", { title: "Content" }, [
          text("Tables, cards, and lists are stitched together into one continuous preview."),
          component("table", {}, [
            headerRow("Signal", "Value"),
            bodyRow("font sans", styleProfile.globalStyle.typography.fontSans),
            bodyRow("radius base", styleProfile.globalStyle.radiusScale.base),
            bodyRow("card treatment", styleProfile.componentStyle.treatments.card ?? "none"),
          ]),
          component("list", {}, [
            item("Showcase canvas"),
            item("Current profile"),
            item("Continuous preview"),
          ]),
        ]),
        component("card", { title: "Forms" }, [
          component("input", {
            label: "Owner",
            value: "Ops reviewer",
            description: "Single-line field.",
          }),
          component("textarea", {
            label: "Notes",
            value: "Preview all components under one style id.",
            description: "Long-form field.",
          }),
          component("slider", {
            label: "Review strictness",
            value: "70",
            description: "Read-only numeric field.",
          }),
        ]),
        component("card", { title: "Selection" }, [
          component(
            "select",
            {
              label: "Style Profile",
              value: styleProfile.id,
              description: "Overlay controls should inherit the active style.",
            },
            [
              option(styleProfile.id, styleProfile.id, "Current profile"),
              option("review-dense", "review-dense", "Builtin"),
            ],
          ),
          component(
            "combobox",
            {
              label: "Current style id",
              value: styleProfile.id,
              description: "Canvas should update from one selected style id.",
            },
            [
              option(styleProfile.id, styleProfile.id, "Current profile"),
              option("team-ops", "team-ops", "User profile"),
            ],
          ),
        ]),
        component("card", { title: "Disclosure" }, [
          component("tabs", { default: "summary" }, [
            component("tab", { value: "summary", label: "Summary" }, [
              component("card", { title: "Canvas" }, [
                text("All scenes stay on one continuous showcase surface."),
              ]),
            ]),
            component("tab", { value: "details", label: "Details" }, [
              component("accordion", {}, [
                component("accordion-item", {
                  value: "tokens",
                  title: "Token strategy",
                }, [
                  text("Palette, radius, and typography changes should remain obvious."),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
  }
}

export function createGalleryRuntimeState({
  availableStyleReferences,
  styleProfile,
  styleReference,
}) {
  return {
    kind: "ahtml-runtime-state",
    version: 1,
    mode: "gallery",
    gallery: {
      availableStyleReferences,
      styleReference,
      styleProfile,
    },
  }
}

function createGalleryResult({
  diagnostics = [],
  inspection,
  inspectionPath,
  ok,
  outputDir,
  stage,
  styleReference,
}) {
  return {
    kind: "agent-html-gallery-result",
    version: 1,
    ok,
    outputDir,
    styleReference,
    ...(inspection ? { inspection, inspectionPath } : {}),
    ...(diagnostics.length > 0 ? { diagnostics, stage } : {}),
  }
}

function createTokenRows(tokenSet) {
  return Object.entries(tokenSet).map(([tokenName, tokenValue]) =>
    bodyRow(tokenName, tokenValue),
  )
}

function createTreatmentRows(treatments) {
  return Object.entries(treatments)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([componentName, treatmentName]) =>
      bodyRow(componentName, treatmentName),
    )
}

function headerRow(left, right) {
  return component("row", { kind: "header" }, [
    component("cell", {}, [text(left)]),
    component("cell", {}, [text(right)]),
  ])
}

function bodyRow(left, right) {
  return component("row", {}, [
    component("cell", {}, [text(left)]),
    component("cell", {}, [text(right)]),
  ])
}

function item(value) {
  return component("item", {}, [text(value)])
}

function option(value, label, description) {
  return component("option", { value, label }, [text(description)])
}

function component(name, props = {}, children = []) {
  return {
    type: "component",
    name,
    props,
    children,
  }
}

function text(value) {
  return {
    type: "text",
    value,
  }
}
