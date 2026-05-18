import React from "react"

import generatedDocument from "../document.generated.json"
import runtimeStateSource from "../runtime-state.generated.json"
import runtimeVerificationState from "../render-verification.generated.json"
import {
  assertRendererRegistryParity,
  createRendererSpecMap,
} from "./renderer/parity"
import { createRendererNode } from "./renderer/render-node"
import type {
  AgentComponentNode,
  AgentDocument,
  RuntimeVerificationState,
} from "./renderer/types"

type StyleProfile = AgentDocument["meta"]["styleProfile"]
type RuntimeState = {
  kind?: string
  version?: number
  mode?: "document" | "gallery"
  gallery?: {
    availableStyleReferences: string[]
    styleReference: string
    styleProfile: StyleProfile
  }
}

type GalleryStateResponse = {
  ok: boolean
  availableStyleReferences: string[]
  styleReference: string
  styleProfile: StyleProfile
}

type GalleryMutationResponse = {
  ok: boolean
  error?: string
  availableStyleReferences?: string[]
  styleReference?: string
  styleProfile?: StyleProfile
}

type GalleryEditorState = {
  availableStyleReferences: string[]
  createId: string
  draftProfile: StyleProfile
  error: string
  isDirty: boolean
  isSaving: boolean
  status: string
  styleReference: string
}

const agentDocument = generatedDocument as AgentDocument
const runtimeState = runtimeStateSource as RuntimeState
const runtimeRendererVerification =
  runtimeVerificationState as RuntimeVerificationState
const rendererSpecByName = createRendererSpecMap(runtimeRendererVerification)

assertRendererRegistryParity(runtimeRendererVerification, rendererSpecByName)

export function App() {
  const title = getDocumentTitle(agentDocument)

  React.useEffect(() => {
    if (title && typeof document !== "undefined") {
      document.title = title
    }
  }, [title])

  if (runtimeState.mode === "gallery" && runtimeState.gallery) {
    return (
      <GalleryApp
        availableStyleReferences={runtimeState.gallery.availableStyleReferences}
        initialProfile={runtimeState.gallery.styleProfile}
        styleReference={runtimeState.gallery.styleReference}
      />
    )
  }

  return <DocumentApp document={agentDocument} />
}

function DocumentApp({ document }: { document: AgentDocument }) {
  const documentStyleCss = createDocumentStyleCss(document.meta.styleProfile)
  const RendererNode = createRendererNode(
    rendererSpecByName,
    document.meta.styleProfile.componentStyle.treatments,
  )

  return (
    <>
      <style>{createSharedShellCss()}</style>
      <style>{documentStyleCss}</style>
      <main
        className="ahtml-document-shell"
        data-style-profile={document.meta.styleProfile.id}
      >
        {document.components.map((node, index) => (
          <RendererNode key={index} node={node} path={[index]} />
        ))}
      </main>
    </>
  )
}

function GalleryApp({
  availableStyleReferences,
  initialProfile,
  styleReference,
}: {
  availableStyleReferences: string[]
  initialProfile: StyleProfile
  styleReference: string
}) {
  const [editorState, setEditorState] = React.useState<GalleryEditorState>({
    availableStyleReferences,
    createId: "",
    draftProfile: initialProfile,
    error: "",
    isDirty: false,
    isSaving: false,
    status: "Style gallery ready.",
    styleReference,
  })

  React.useEffect(() => {
    let cancelled = false

    void fetchGalleryState().then((nextState) => {
      if (!nextState || cancelled) {
        return
      }

      setEditorState((current) => ({
        ...current,
        availableStyleReferences: nextState.availableStyleReferences,
        draftProfile: current.isDirty ? current.draftProfile : nextState.styleProfile,
        error: "",
        status: current.isDirty ? current.status : "Style gallery ready.",
        styleReference: current.isDirty
          ? current.styleReference
          : nextState.styleReference,
      }))
    })

    return () => {
      cancelled = true
    }
  }, [])

  const previewDocument = React.useMemo(
    () => createGalleryPreviewDocument(editorState.draftProfile),
    [editorState.draftProfile],
  )
  const RendererNode = React.useMemo(
    () =>
      createRendererNode(
        rendererSpecByName,
        editorState.draftProfile.componentStyle.treatments,
      ),
    [editorState.draftProfile.componentStyle.treatments],
  )
  const documentStyleCss = React.useMemo(
    () => createDocumentStyleCss(editorState.draftProfile),
    [editorState.draftProfile],
  )

  const updateDraftProfile = React.useCallback(
    (updater: (draft: StyleProfile) => StyleProfile) => {
      setEditorState((current) => ({
        ...current,
        draftProfile: updater(current.draftProfile),
        error: "",
        isDirty: true,
        status: "Unsaved changes.",
      }))
    },
    [],
  )

  const saveProfile = React.useCallback(
    async () => {
      setEditorState((current) => ({
        ...current,
        error: "",
        isSaving: true,
        status: "Saving style profile...",
      }))

      try {
        const response = await fetch("/__ahtml/gallery/save", {
          body: JSON.stringify({
            styleProfile: editorState.draftProfile,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        })
        const result = (await response.json()) as GalleryMutationResponse

        if (!response.ok || !result.ok || !result.styleProfile || !result.styleReference) {
          throw new Error(result.error ?? "Unable to save gallery style profile.")
        }

        setEditorState((current) => ({
          ...current,
          availableStyleReferences:
            result.availableStyleReferences ?? current.availableStyleReferences,
          draftProfile: result.styleProfile!,
          error: "",
          isDirty: false,
          isSaving: false,
          status: `Saved ${result.styleReference}.`,
          styleReference: result.styleReference!,
        }))
      } catch (error) {
        setEditorState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : String(error),
          isSaving: false,
          status: "Save failed.",
        }))
      }
    },
    [editorState],
  )

  const selectStyleReference = React.useCallback(
    async (nextStyleReference: string) => {
      setEditorState((current) => ({
        ...current,
        error: "",
        status: `Loading ${nextStyleReference}...`,
      }))

      try {
        const response = await fetch("/__ahtml/gallery/select", {
          body: JSON.stringify({
            styleReference: nextStyleReference,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        })
        const result = (await response.json()) as GalleryMutationResponse

        if (!response.ok || !result.ok || !result.styleProfile || !result.styleReference) {
          throw new Error(result.error ?? "Unable to switch style profile.")
        }

        setEditorState((current) => ({
          ...current,
          availableStyleReferences:
            result.availableStyleReferences ?? current.availableStyleReferences,
          draftProfile: result.styleProfile!,
          error: "",
          isDirty: false,
          status: `Selected ${result.styleReference}.`,
          styleReference: result.styleReference!,
        }))
      } catch (error) {
        setEditorState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : String(error),
          status: "Switch failed.",
        }))
      }
    },
    [],
  )

  const createStyleReference = React.useCallback(async () => {
    const createId = editorState.createId.trim()

    if (!createId) {
      setEditorState((current) => ({
        ...current,
        error: 'New style id is required, for example "team-ops".',
      }))
      return
    }

    setEditorState((current) => ({
      ...current,
      error: "",
      isSaving: true,
      status: `Creating ${createId}...`,
    }))

    try {
      const response = await fetch("/__ahtml/gallery/create", {
        body: JSON.stringify({
          styleReference: createId,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      })
      const result = (await response.json()) as GalleryMutationResponse

      if (!response.ok || !result.ok || !result.styleProfile || !result.styleReference) {
        throw new Error(result.error ?? "Unable to create style profile.")
      }

      setEditorState((current) => ({
        ...current,
        availableStyleReferences:
          result.availableStyleReferences ?? current.availableStyleReferences,
        createId: "",
        draftProfile: result.styleProfile!,
        error: "",
        isDirty: false,
        isSaving: false,
        status: `Created ${result.styleReference}.`,
        styleReference: result.styleReference!,
      }))
    } catch (error) {
      setEditorState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : String(error),
        isSaving: false,
        status: "Create failed.",
      }))
    }
  }, [editorState.createId])

  const deleteCurrentStyleReference = React.useCallback(async () => {
    setEditorState((current) => ({
      ...current,
      error: "",
      isSaving: true,
      status: `Deleting ${current.styleReference}...`,
    }))

    try {
      const response = await fetch("/__ahtml/gallery/delete", {
        body: JSON.stringify({
          styleReference: editorState.styleReference,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      })
      const result = (await response.json()) as GalleryMutationResponse

      if (!response.ok || !result.ok || !result.styleProfile || !result.styleReference) {
        throw new Error(result.error ?? "Unable to delete style profile.")
      }

      setEditorState((current) => ({
        ...current,
        availableStyleReferences:
          result.availableStyleReferences ?? current.availableStyleReferences,
        draftProfile: result.styleProfile!,
        error: "",
        isDirty: false,
        isSaving: false,
        status: `Deleted style. Current is ${result.styleReference}.`,
        styleReference: result.styleReference!,
      }))
    } catch (error) {
      setEditorState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : String(error),
        isSaving: false,
        status: "Delete failed.",
      }))
    }
  }, [editorState.styleReference])

  return (
    <>
      <style>{createSharedShellCss()}</style>
      <style>{documentStyleCss}</style>
      <main
        className="ahtml-gallery-shell"
        data-style-profile={editorState.draftProfile.id}
      >
        <aside className="ahtml-gallery-sidebar">
          <div className="ahtml-gallery-sidebar-inner">
            <header className="ahtml-gallery-hero">
              <p className="ahtml-gallery-kicker">AHTML Gallery</p>
              <h1>{editorState.draftProfile.id}</h1>
              <p className="ahtml-gallery-meta">
                Create-style customizer on the left, full semantic preview on the
                right.
              </p>
            </header>

            <section className="ahtml-gallery-panel">
              <div className="ahtml-gallery-panel-header">
                <h2>Style Id</h2>
                <span>global</span>
              </div>
              <div className="ahtml-gallery-stack">
                <label className="ahtml-gallery-field">
                  <span>Current style id</span>
                  <select
                    onChange={(event) => void selectStyleReference(event.target.value)}
                    value={editorState.styleReference}
                  >
                    {editorState.availableStyleReferences.map((styleId) => (
                      <option key={styleId} value={styleId}>
                        {styleId}
                      </option>
                    ))}
                  </select>
                </label>
                <FieldRow
                  label="Available ids"
                  value={editorState.availableStyleReferences.join(", ")}
                  multiline
                />
                <div className="ahtml-gallery-actions">
                  <button
                    className="ahtml-gallery-button"
                    disabled={editorState.isSaving}
                    onClick={() => void createStyleReference()}
                    type="button"
                  >
                    New Id
                  </button>
                  <button
                    className="ahtml-gallery-button"
                    disabled={editorState.isSaving}
                    onClick={() => void deleteCurrentStyleReference()}
                    type="button"
                  >
                    Delete Id
                  </button>
                </div>
                <LabeledInput
                  label="New Style Id"
                  value={editorState.createId}
                  onChange={(value) =>
                    setEditorState((current) => ({
                      ...current,
                      createId: value,
                    }))
                  }
                />
                <p className="ahtml-gallery-status">{editorState.status}</p>
                {editorState.error ? (
                  <p className="ahtml-gallery-error">{editorState.error}</p>
                ) : null}
              </div>
            </section>

            <section className="ahtml-gallery-panel">
              <div className="ahtml-gallery-panel-header">
                <h2>Typography</h2>
                <span>global</span>
              </div>
              <div className="ahtml-gallery-stack">
                <LabeledInput
                  label="Font Sans"
                  value={editorState.draftProfile.globalStyle.typography.fontSans}
                  onChange={(value) =>
                    updateDraftProfile((draft) => ({
                      ...draft,
                      globalStyle: {
                        ...draft.globalStyle,
                        typography: {
                          ...draft.globalStyle.typography,
                          fontSans: value,
                        },
                      },
                    }))
                  }
                />
                <LabeledInput
                  label="Font Heading"
                  value={editorState.draftProfile.globalStyle.typography.fontHeading}
                  onChange={(value) =>
                    updateDraftProfile((draft) => ({
                      ...draft,
                      globalStyle: {
                        ...draft.globalStyle,
                        typography: {
                          ...draft.globalStyle.typography,
                          fontHeading: value,
                        },
                      },
                    }))
                  }
                />
                <LabeledInput
                  label="Radius Base"
                  value={editorState.draftProfile.globalStyle.radiusScale.base}
                  onChange={(value) =>
                    updateDraftProfile((draft) => ({
                      ...draft,
                      globalStyle: {
                        ...draft.globalStyle,
                        radiusScale: {
                          ...draft.globalStyle.radiusScale,
                          base: value,
                        },
                      },
                    }))
                  }
                />
              </div>
            </section>

            <section className="ahtml-gallery-panel">
              <div className="ahtml-gallery-panel-header">
                <h2>Light Tokens</h2>
                <span>semantic</span>
              </div>
              <TokenEditor
                tokens={editorState.draftProfile.globalStyle.tokenSets.light}
                onChange={(tokenName, value) =>
                  updateDraftProfile((draft) => ({
                    ...draft,
                    globalStyle: {
                      ...draft.globalStyle,
                      tokenSets: {
                        ...draft.globalStyle.tokenSets,
                        light: {
                          ...draft.globalStyle.tokenSets.light,
                          [tokenName]: value,
                        },
                      },
                    },
                  }))
                }
              />
            </section>

            <section className="ahtml-gallery-panel">
              <div className="ahtml-gallery-panel-header">
                <h2>Dark Tokens</h2>
                <span>semantic</span>
              </div>
              <TokenEditor
                tokens={editorState.draftProfile.globalStyle.tokenSets.dark}
                onChange={(tokenName, value) =>
                  updateDraftProfile((draft) => ({
                    ...draft,
                    globalStyle: {
                      ...draft.globalStyle,
                      tokenSets: {
                        ...draft.globalStyle.tokenSets,
                        dark: {
                          ...draft.globalStyle.tokenSets.dark,
                          [tokenName]: value,
                        },
                      },
                    },
                  }))
                }
              />
            </section>

            <section className="ahtml-gallery-panel">
              <div className="ahtml-gallery-panel-header">
                <h2>Treatments</h2>
                <span>components</span>
              </div>
              <div className="ahtml-gallery-stack">
                {Object.entries(editorState.draftProfile.componentStyle.treatments)
                  .sort(([left], [right]) => left.localeCompare(right))
                  .map(([componentName, treatment]) => (
                    <LabeledInput
                      key={componentName}
                      label={componentName}
                      value={treatment}
                      onChange={(value) =>
                        updateDraftProfile((draft) => ({
                          ...draft,
                          componentStyle: {
                            ...draft.componentStyle,
                            treatments: {
                              ...draft.componentStyle.treatments,
                              [componentName]: value,
                            },
                          },
                        }))
                      }
                    />
                  ))}
              </div>
            </section>

            <section className="ahtml-gallery-panel">
              <div className="ahtml-gallery-panel-header">
                <h2>Persist</h2>
                <span>config</span>
              </div>
              <div className="ahtml-gallery-stack">
                <button
                  className="ahtml-gallery-button ahtml-gallery-button-primary"
                  disabled={editorState.isSaving}
                  onClick={() => void saveProfile()}
                  type="button"
                >
                  Save Current Style
                </button>
              </div>
            </section>
          </div>
        </aside>

        <section className="ahtml-gallery-preview">
          <div className="ahtml-gallery-preview-header">
            <div>
              <p className="ahtml-gallery-kicker">Preview</p>
              <h2>Showcase canvas</h2>
            </div>
            <p className="ahtml-gallery-preview-note">
              All components are stitched into one continuous semantic preview surface.
            </p>
          </div>
          <div className="ahtml-gallery-preview-surface">
            {previewDocument.components.map((node, index) => (
              <RendererNode key={index} node={node} path={[index]} />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

function TokenEditor({
  tokens,
  onChange,
}: {
  tokens: StyleProfile["globalStyle"]["tokenSets"]["light"]
  onChange: (
    tokenName: keyof StyleProfile["globalStyle"]["tokenSets"]["light"],
    value: string,
  ) => void
}) {
  return (
    <div className="ahtml-gallery-stack">
      {Object.entries(tokens).map(([tokenName, tokenValue]) => (
        <div className="ahtml-gallery-token-row" key={tokenName}>
          <span
            className="ahtml-gallery-swatch"
            style={{ background: tokenValue }}
            aria-hidden="true"
          />
          <LabeledInput
            label={tokenName}
            value={tokenValue}
            onChange={(value) =>
              onChange(
                tokenName as keyof StyleProfile["globalStyle"]["tokenSets"]["light"],
                value,
              )
            }
          />
        </div>
      ))}
    </div>
  )
}

function LabeledInput({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  const id = React.useId()

  return (
    <label className="ahtml-gallery-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  )
}

function FieldRow({
  label,
  multiline = false,
  value,
}: {
  label: string
  multiline?: boolean
  value: string
}) {
  return (
    <div className="ahtml-gallery-field-row">
      <span>{label}</span>
      <strong className={multiline ? "ahtml-gallery-wrap" : undefined}>{value}</strong>
    </div>
  )
}

function fetchGalleryState() {
  return fetch("/__ahtml/gallery/state", {
    headers: {
      accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        return null
      }

      return (await response.json()) as GalleryStateResponse
    })
    .catch(() => null)
}

function createGalleryPreviewDocument(styleProfile: StyleProfile): AgentDocument {
  return {
    meta: {
      ...agentDocument.meta,
      documentStyleConfigReference: styleProfile.id,
      styleProfile,
    },
    components: [
      createPageSection("Feedback", [
        createCard("Status surfaces", [
          textNode(
            "Alerts, badges, and progress indicators reveal contrast, treatment, and emphasis quickly.",
          ),
          componentNode("badge", { tone: "success" }, [textNode("healthy")]),
          componentNode(
            "alert",
            { title: "Review block", tone: "danger" },
            [textNode("A destructive state should remain distinct under both themes.")],
          ),
          componentNode("progress", { value: "68" }, []),
        ]),
      ]),
      createPageSection("Content", [
        createCard("Cards and lists", [
          textNode(
            "Card shells, separators, and list rhythm make typography and spacing drift obvious.",
          ),
          componentNode("separator", {}, []),
          componentNode("list", {}, [
            itemNode("Operations review summary"),
            itemNode("Release checklist copy density"),
            itemNode("Portable artifact reading comfort"),
          ]),
        ]),
        createCard("Table", [
          componentNode("table", {}, [
            rowNode("header", "Surface", "Signal"),
            rowNode("body", "Card", styleProfile.componentStyle.treatments.card ?? "none"),
            rowNode("body", "Tabs", styleProfile.componentStyle.treatments.tabs ?? "none"),
            rowNode("body", "Radius", styleProfile.globalStyle.radiusScale.base),
          ]),
        ]),
      ]),
      createPageSection("Forms", [
        createCard("Inputs", [
          componentNode("input", {
            label: "Owner",
            value: "Platform reviewer",
            description: "Single-line control.",
          }, []),
          componentNode("textarea", {
            label: "Notes",
            value: "Preview should reflect changes immediately without changing the authoring surface.",
            description: "Long-form control.",
          }, []),
          componentNode("slider", {
            label: "Density",
            value: "72",
            description: "Read-only slider preview.",
          }, []),
        ]),
        createCard("Selections", [
          componentNode("checkbox", {
            label: "Ship to runtime",
            checked: "true",
            description: "Checkbox state.",
          }, []),
          componentNode("switch", {
            label: "Sync preview",
            checked: "true",
            description: "Switch state.",
          }, []),
          componentNode(
            "radio-group",
            {
              label: "Direction",
              value: "stable",
              description: "Radio group density.",
            },
            [
              optionNode("stable", "Stable", "Favor predictability."),
              optionNode("fast", "Fast", "Favor speed."),
            ],
          ),
          componentNode(
            "toggle-group",
            {
              label: "Mode",
              value: "editor",
              description: "Inline option set.",
            },
            [
              optionNode("editor", "Editor", "Edit shell"),
              optionNode("gallery", "Gallery", "Preview grid"),
            ],
          ),
        ]),
      ]),
      createPageSection("Selection", [
        createCard("Overlay controls", [
          componentNode(
            "select",
            {
              label: "Profile family",
              value: styleProfile.id,
              description: "Select trigger, content, and item treatment.",
            },
            [
              optionNode("report-default", "report-default", "Builtin"),
              optionNode("ops-compact", "ops-compact", "Builtin"),
              optionNode("review-dense", "review-dense", "Builtin"),
            ],
          ),
          componentNode(
            "combobox",
            {
              label: "Style ref",
              value: styleProfile.id,
              description: "Combobox trigger and option body.",
            },
            [
              optionNode(styleProfile.id, styleProfile.id, "Current profile"),
              optionNode("team-ops", "team-ops", "User profile sample"),
            ],
          ),
        ]),
      ]),
      createPageSection("Disclosure", [
        componentNode("tabs", { default: "summary" }, [
          componentNode("tab", { value: "summary", label: "Summary" }, [
            createCard("Tabs", [
              textNode(
                "Tabs preview trigger contrast, content spacing, and nested card treatment.",
              ),
            ]),
          ]),
          componentNode("tab", { value: "details", label: "Details" }, [
            createCard("Accordion", [
              componentNode("accordion", {}, [
                componentNode(
                  "accordion-item",
                  { value: "palette", title: "Palette tokens" },
                  [textNode("Expanded disclosure spacing should remain balanced.")],
                ),
                componentNode(
                  "accordion-item",
                  { value: "typography", title: "Typography" },
                  [textNode("Heading and body font assignments surface here.")],
                ),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
  }
}

function createPageSection(
  title: string,
  children: AgentComponentNode[],
): AgentComponentNode {
  return componentNode("card", { title }, children)
}

function createCard(title: string, children: (AgentComponentNode | { type: "text"; value: string })[]) {
  return componentNode("card", { title }, children)
}

function itemNode(value: string) {
  return componentNode("item", {}, [textNode(value)])
}

function rowNode(kind: "header" | "body", left: string, right: string) {
  return componentNode("row", { kind }, [
    componentNode("cell", {}, [textNode(left)]),
    componentNode("cell", {}, [textNode(right)]),
  ])
}

function optionNode(value: string, label: string, content: string) {
  return componentNode("option", { value, label }, [textNode(content)])
}

function componentNode(
  name: string,
  props: Record<string, string>,
  children: (AgentComponentNode | { type: "text"; value: string })[],
): AgentComponentNode {
  return {
    type: "component",
    name,
    props,
    children,
  }
}

function textNode(value: string) {
  return {
    type: "text" as const,
    value,
  }
}

function createDocumentStyleCss(styleProfile: StyleProfile) {
  const globalStyle = styleProfile.globalStyle

  return [
    `:root{${createGlobalStyleDeclarations(globalStyle, "light")}}`,
    `@media (prefers-color-scheme: dark){:root{${createGlobalStyleDeclarations(
      globalStyle,
      "dark",
    )}}}`,
  ].join("")
}

function createGlobalStyleDeclarations(
  globalStyle: StyleProfile["globalStyle"],
  mode: "light" | "dark",
) {
  return [
    `${globalStyle.cssVariableMap.background}:${globalStyle.tokenSets[mode].background};`,
    `${globalStyle.cssVariableMap.foreground}:${globalStyle.tokenSets[mode].foreground};`,
    `${globalStyle.cssVariableMap.card}:${globalStyle.tokenSets[mode].card};`,
    `${globalStyle.cssVariableMap.cardForeground}:${globalStyle.tokenSets[mode].cardForeground};`,
    `${globalStyle.cssVariableMap.popover}:${globalStyle.tokenSets[mode].popover};`,
    `${globalStyle.cssVariableMap.popoverForeground}:${globalStyle.tokenSets[mode].popoverForeground};`,
    `${globalStyle.cssVariableMap.primary}:${globalStyle.tokenSets[mode].primary};`,
    `${globalStyle.cssVariableMap.primaryForeground}:${globalStyle.tokenSets[mode].primaryForeground};`,
    `${globalStyle.cssVariableMap.secondary}:${globalStyle.tokenSets[mode].secondary};`,
    `${globalStyle.cssVariableMap.secondaryForeground}:${globalStyle.tokenSets[mode].secondaryForeground};`,
    `${globalStyle.cssVariableMap.muted}:${globalStyle.tokenSets[mode].muted};`,
    `${globalStyle.cssVariableMap.mutedForeground}:${globalStyle.tokenSets[mode].mutedForeground};`,
    `${globalStyle.cssVariableMap.accent}:${globalStyle.tokenSets[mode].accent};`,
    `${globalStyle.cssVariableMap.accentForeground}:${globalStyle.tokenSets[mode].accentForeground};`,
    `${globalStyle.cssVariableMap.destructive}:${globalStyle.tokenSets[mode].destructive};`,
    `${globalStyle.cssVariableMap.border}:${globalStyle.tokenSets[mode].border};`,
    `${globalStyle.cssVariableMap.input}:${globalStyle.tokenSets[mode].input};`,
    `${globalStyle.cssVariableMap.ring}:${globalStyle.tokenSets[mode].ring};`,
    `${globalStyle.cssVariableMap.radius}:${globalStyle.radiusScale.base};`,
    `${globalStyle.cssVariableMap.fontSans}:${globalStyle.typography.fontSans};`,
    `${globalStyle.cssVariableMap.fontHeading}:${globalStyle.typography.fontHeading};`,
    `color-scheme:${mode};`,
  ].join("")
}

function createSharedShellCss() {
  return `
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 12%, transparent), transparent 32%),
        linear-gradient(180deg, color-mix(in srgb, var(--background) 96%, black 4%), var(--background));
      color: var(--foreground);
      font-family: var(--font-sans);
    }
    .ahtml-document-shell {
      width: min(100%, 72rem);
      min-height: 100vh;
      margin: 0 auto;
      padding: 4rem 1.25rem 5rem;
      box-sizing: border-box;
      display: grid;
      gap: 2rem;
    }
    .ahtml-document-shell > * {
      min-width: 0;
    }
    .ahtml-document-shell [data-agent-html-component="page"] {
      display: grid;
      gap: 2rem;
    }
    .ahtml-document-shell [data-agent-html-component="page"] > * {
      min-width: 0;
    }
    .ahtml-document-shell .ahtml-prose-block {
      max-width: 68ch;
    }
    .ahtml-document-shell .ahtml-prose-block > p {
      line-height: 1.75;
    }
    .ahtml-document-shell .ahtml-prose-inline {
      line-height: 1.65;
    }
    .ahtml-document-shell .ahtml-section-stack {
      display: grid;
      gap: 1.35rem;
    }
    .ahtml-document-shell [data-slot="card-content"].ahtml-section-stack > :where(
      [data-agent-html-component="alert"],
      [data-agent-html-component="table"],
      [data-agent-html-component="list"],
      [data-agent-html-component="tabs"],
      [data-agent-html-component="accordion"],
      [data-agent-html-component="checkbox"],
      [data-agent-html-component="switch"],
      [data-agent-html-component="input"],
      [data-agent-html-component="textarea"],
      [data-agent-html-component="slider"],
      [data-agent-html-component="radio-group"],
      [data-agent-html-component="toggle-group"],
      [data-agent-html-component="select"],
      [data-agent-html-component="combobox"],
      [data-agent-html-component="progress"],
      [data-agent-html-component="badge"],
      [data-agent-html-component="separator"]
    ) + :where(
      [data-agent-html-component="alert"],
      [data-agent-html-component="table"],
      [data-agent-html-component="list"],
      [data-agent-html-component="tabs"],
      [data-agent-html-component="accordion"],
      [data-agent-html-component="checkbox"],
      [data-agent-html-component="switch"],
      [data-agent-html-component="input"],
      [data-agent-html-component="textarea"],
      [data-agent-html-component="slider"],
      [data-agent-html-component="radio-group"],
      [data-agent-html-component="toggle-group"],
      [data-agent-html-component="select"],
      [data-agent-html-component="combobox"],
      [data-agent-html-component="progress"],
      [data-agent-html-component="badge"],
      [data-agent-html-component="separator"]
    ) {
      margin-top: 0;
    }
    .ahtml-gallery-shell {
      display: grid;
      grid-template-columns: minmax(20rem, 26rem) minmax(0, 1fr);
      min-height: 100vh;
      gap: 1.5rem;
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .ahtml-gallery-sidebar {
      position: sticky;
      top: 0;
      align-self: start;
      height: calc(100vh - 3rem);
      overflow: hidden;
    }
    .ahtml-gallery-sidebar-inner {
      height: 100%;
      overflow: auto;
      border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
      background: color-mix(in srgb, var(--card) 92%, transparent);
      border-radius: calc(var(--radius) * 1.8);
      box-shadow: 0 24px 80px color-mix(in srgb, var(--foreground) 10%, transparent);
      backdrop-filter: blur(18px);
      padding: 1.25rem;
      box-sizing: border-box;
    }
    .ahtml-gallery-hero h1,
    .ahtml-gallery-preview-header h2 {
      margin: 0;
      font-family: var(--font-heading);
      letter-spacing: -0.04em;
    }
    .ahtml-gallery-kicker {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--muted-foreground);
    }
    .ahtml-gallery-meta,
    .ahtml-gallery-preview-note,
    .ahtml-gallery-status {
      margin: 0;
      color: var(--muted-foreground);
      line-height: 1.5;
    }
    .ahtml-gallery-panel {
      margin-top: 1rem;
      padding: 1rem;
      border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
      background: color-mix(in srgb, var(--card) 96%, transparent);
      border-radius: calc(var(--radius) * 1.4);
    }
    .ahtml-gallery-panel-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.8rem;
    }
    .ahtml-gallery-panel-header h2 {
      margin: 0;
      font-size: 0.95rem;
      font-family: var(--font-heading);
    }
    .ahtml-gallery-panel-header span,
    .ahtml-gallery-field span,
    .ahtml-gallery-field-row span {
      color: var(--muted-foreground);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .ahtml-gallery-stack {
      display: grid;
      gap: 0.8rem;
    }
    .ahtml-gallery-field {
      display: grid;
      gap: 0.45rem;
    }
    .ahtml-gallery-field input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.72rem 0.85rem;
      border-radius: calc(var(--radius) * 1.1);
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--background) 90%, var(--card) 10%);
      color: var(--foreground);
      font: inherit;
    }
    .ahtml-gallery-field select {
      width: 100%;
      box-sizing: border-box;
      padding: 0.72rem 0.85rem;
      border-radius: calc(var(--radius) * 1.1);
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--background) 90%, var(--card) 10%);
      color: var(--foreground);
      font: inherit;
    }
    .ahtml-gallery-token-row {
      display: grid;
      grid-template-columns: 1.75rem minmax(0, 1fr);
      gap: 0.7rem;
      align-items: start;
    }
    .ahtml-gallery-swatch {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
      margin-top: 1.35rem;
    }
    .ahtml-gallery-actions {
      display: flex;
      gap: 0.75rem;
    }
    .ahtml-gallery-button {
      border: 1px solid var(--border);
      background: color-mix(in srgb, var(--secondary) 88%, var(--card) 12%);
      color: var(--secondary-foreground);
      padding: 0.72rem 1rem;
      border-radius: calc(var(--radius) * 1.15);
      font: inherit;
      cursor: pointer;
    }
    .ahtml-gallery-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .ahtml-gallery-button-primary {
      background: var(--primary);
      color: var(--primary-foreground);
      border-color: color-mix(in srgb, var(--primary) 65%, black 35%);
    }
    .ahtml-gallery-field-row {
      display: grid;
      gap: 0.28rem;
    }
    .ahtml-gallery-field-row strong {
      font-weight: 600;
      line-height: 1.5;
    }
    .ahtml-gallery-wrap {
      word-break: break-word;
    }
    .ahtml-gallery-error {
      margin: 0;
      color: var(--destructive);
      line-height: 1.4;
    }
    .ahtml-gallery-preview {
      min-width: 0;
      padding: 1rem 0 2rem;
    }
    .ahtml-gallery-preview-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .ahtml-gallery-preview-surface {
      display: grid;
      gap: 1.25rem;
    }
    @media (max-width: 1100px) {
      .ahtml-document-shell {
        width: min(100%, 60rem);
        padding: 2.75rem 1rem 3.5rem;
        gap: 1.5rem;
      }
      .ahtml-document-shell [data-agent-html-component="page"] {
        gap: 1.5rem;
      }
      .ahtml-gallery-shell {
        grid-template-columns: 1fr;
      }
      .ahtml-gallery-sidebar {
        position: static;
        height: auto;
      }
      .ahtml-gallery-sidebar-inner {
        overflow: visible;
      }
      .ahtml-gallery-preview-header {
        align-items: start;
        flex-direction: column;
      }
    }
    @media (min-width: 1200px) {
      .ahtml-document-shell {
        width: min(100%, 76rem);
        padding-top: 4.5rem;
      }
    }
  `
}

function getDocumentTitle(document: AgentDocument) {
  const page = document.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
