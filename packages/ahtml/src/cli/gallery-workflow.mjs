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
  getStyleProfileSource,
  listStyleProfileReferences,
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
  async function buildGalleryArtifact(styleReference, outputPath, options = {}) {
    const outputDir = path.resolve(userRoot, outputPath ?? defaultOutputDir)
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
      profileSource: getStyleProfileSource(styleReference),
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
      component("page", { title: `${styleProfile.id} style gallery` }, [
        component(
          "alert",
          {
            title: "Gallery Preview",
            tone: "success",
          },
          [
            text(
              `Previewing ${styleProfile.id} through the managed shadcn runtime. The gallery reuses the public style-ref pipeline and semantic components only.`,
            ),
          ],
        ),
        component("card", { title: "Coverage" }, [
          component("badge", { tone: "success" }, [text(styleProfile.id)]),
          component("separator"),
          component("list", {}, [
            item("Palette tokens in light and dark modes"),
            item("Typography, spacing, and radius through real content"),
            item("Forms, data views, badges, alerts, and disclosure patterns"),
          ]),
        ]),
        component("tabs", { default: "overview" }, [
          component("tab", { value: "overview", label: "Overview" }, [
            component("card", { title: "Profile Summary" }, [
              text(
                `This profile resolves from style-ref="${styleProfile.id}" and applies token sets, typography, radius, and component treatments through the existing runtime contract.`,
              ),
              component("separator"),
              component("table", {}, [
                headerRow("Signal", "Value"),
                bodyRow("font sans", styleProfile.globalStyle.typography.fontSans),
                bodyRow(
                  "font heading",
                  styleProfile.globalStyle.typography.fontHeading,
                ),
                bodyRow("radius base", styleProfile.globalStyle.radiusScale.base),
                bodyRow(
                  "card treatment",
                  styleProfile.componentStyle.treatments.card ?? "none",
                ),
                bodyRow(
                  "tabs treatment",
                  styleProfile.componentStyle.treatments.tabs ?? "none",
                ),
              ]),
            ]),
            component("card", { title: "Status Surface" }, [
              component("badge", { tone: "success" }, [text("Ready")]),
              component(
                "alert",
                { title: "Default Accent", tone: "danger" },
                [
                  text(
                    "Alerts and badges show how semantic status styling lands under the current profile.",
                  ),
                ],
              ),
              component("progress", { value: "82" }),
              component("list", {}, [
                item("Page spacing uses the runtime layout shell."),
                item("Cards inherit the selected treatment mapping."),
                item("Interactive scenes reuse the same artifact pipeline."),
              ]),
            ]),
          ]),
          component("tab", { value: "palette", label: "Palette" }, [
            component("card", { title: "Light Tokens" }, [
              component("table", {}, [
                headerRow("Token", "Value"),
                ...createTokenRows(styleProfile.globalStyle.tokenSets.light),
              ]),
            ]),
            component("card", { title: "Dark Tokens" }, [
              component("table", {}, [
                headerRow("Token", "Value"),
                ...createTokenRows(styleProfile.globalStyle.tokenSets.dark),
              ]),
            ]),
          ]),
          component("tab", { value: "typography", label: "Typography" }, [
            component("card", { title: "Heading Rhythm" }, [
              text("Section titles, card titles, and dense technical copy should stay legible."),
              component("separator"),
              component("badge", { tone: "success" }, [text("Heading sample")]),
              text(
                "A gallery preview is useful when teams want to compare tone, spacing, and information density before publishing artifacts.",
              ),
            ]),
            component("card", { title: "Body Copy" }, [
              text(
                "The body face should remain calm under long operational notes, release checklists, and audit findings. This scene keeps the preview grounded in realistic artifact copy instead of abstract placeholder text.",
              ),
              component("list", {}, [
                item("Readable under both light and dark palettes"),
                item("Compatible with dense tables and form-heavy reviews"),
                item("No free-form per-document token overrides"),
              ]),
            ]),
          ]),
          component("tab", { value: "forms", label: "Forms" }, [
            component("card", { title: "Inputs & Choices" }, [
              component("input", {
                label: "Owner",
                value: "Ops reviewer",
                description: "Single-line field.",
              }),
              component("textarea", {
                label: "Notes",
                value: "Ship after the guard lands and the evidence table is reviewed.",
                description: "Long-form field.",
              }),
              component("checkbox", {
                label: "Ship now",
                checked: "true",
                description: "Boolean field.",
              }),
              component("switch", {
                label: "Live Sync",
                checked: "true",
                description: "Immediate preference toggle.",
              }),
              component("slider", {
                label: "Review strictness",
                value: "70",
                description: "Read-only numeric field.",
              }),
              component(
                "radio-group",
                {
                  label: "Direction",
                  value: "ship",
                  description: "Single-select field.",
                },
                [
                  option("ship", "Ship", "Use the current direction."),
                  option("hold", "Hold", "Wait for the guard."),
                ],
              ),
              component(
                "toggle-group",
                {
                  label: "Rollout Mode",
                  value: "fast",
                  description: "Inline option set.",
                },
                [
                  option("fast", "Fast", "Prefer speed."),
                  option("safe", "Safe", "Prefer guardrails."),
                ],
              ),
              component(
                "select",
                {
                  label: "Deployment Window",
                  value: "today",
                  description: "Choose a release window.",
                },
                [
                  option("today", "Today", "Ship in the current window."),
                  option("tomorrow", "Tomorrow", "Wait for the next window."),
                ],
              ),
              component(
                "combobox",
                {
                  label: "Escalation Owner",
                  value: "Ops reviewer",
                  description: "Searchable single-select field.",
                },
                [
                  option("Ops reviewer", "Ops reviewer", "Current reviewer."),
                  option(
                    "Security reviewer",
                    "Security reviewer",
                    "Escalation reviewer.",
                  ),
                ],
              ),
            ]),
          ]),
          component("tab", { value: "data", label: "Data" }, [
            component("card", { title: "Review Table" }, [
              component("table", {}, [
                headerRow("Area", "Status"),
                bodyRow("Runtime", "Ready"),
                bodyRow("Token model", "shadcn theming"),
                bodyRow("Legacy globals", "Removed"),
                bodyRow("Preview surface", "CLI gallery"),
              ]),
            ]),
            component("card", { title: "Delivery Signals" }, [
              component("progress", { value: "64" }),
              component("list", {}, [
                item("Profile tokens feed CSS variables directly."),
                item("Tables, alerts, and cards share one treatment system."),
                item("Gallery output is a normal static artifact directory."),
              ]),
            ]),
          ]),
          component("tab", { value: "disclosure", label: "Disclosure" }, [
            component("accordion", {}, [
              component(
                "accordion-item",
                { value: "runtime", title: "Runtime Notes" },
                [
                  component("list", {}, [
                    item("Gallery uses document.generated.json under AHTML_HOME."),
                    item("The preview server serves the built static output."),
                    item("No separate app shell or editor state is introduced."),
                  ]),
                ],
              ),
              component(
                "accordion-item",
                { value: "treatments", title: "Component Treatments" },
                [
                  component("table", {}, [
                    headerRow("Component", "Treatment"),
                    ...createTreatmentRows(styleProfile.componentStyle.treatments),
                  ]),
                ],
              ),
            ]),
          ]),
        ]),
      ]),
    ],
  }
}

export function createGalleryRuntimeState({
  availableStyleReferences,
  profileSource,
  styleProfile,
  styleReference,
}) {
  return {
    kind: "ahtml-runtime-state",
    version: 1,
    mode: "gallery",
    gallery: {
      availableStyleReferences,
      profileSource,
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
