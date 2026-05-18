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
    profileSource: "builtin" | "user"
    styleReference: string
    styleProfile: StyleProfile
  }
}

type GalleryStateResponse = {
  ok: boolean
  availableStyleReferences: string[]
  profileSource: "builtin" | "user"
  styleReference: string
  styleProfile: StyleProfile
}

type GallerySaveResponse = {
  ok: boolean
  error?: string
  overwritten?: boolean
  profileSource?: "builtin" | "user"
  styleReference?: string
  styleProfile?: StyleProfile
}

type GalleryEditorState = {
  availableStyleReferences: string[]
  draftProfile: StyleProfile
  error: string
  isDirty: boolean
  isSaving: boolean
  profileSource: "builtin" | "user"
  saveAsId: string
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
        profileSource={runtimeState.gallery.profileSource}
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
        className="mx-auto grid min-h-screen w-full max-w-4xl gap-6 px-4 py-10 sm:px-6"
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
  profileSource,
  styleReference,
}: {
  availableStyleReferences: string[]
  initialProfile: StyleProfile
  profileSource: "builtin" | "user"
  styleReference: string
}) {
  const [editorState, setEditorState] = React.useState<GalleryEditorState>({
    availableStyleReferences,
    draftProfile: initialProfile,
    error: "",
    isDirty: false,
    isSaving: false,
    profileSource,
    saveAsId:
      profileSource === "builtin" ? `${initialProfile.id}-copy` : initialProfile.id,
    status:
      profileSource === "builtin"
        ? "Built-in profile. Use Save As to persist changes."
        : "User profile loaded.",
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
        profileSource: current.isDirty ? current.profileSource : nextState.profileSource,
        saveAsId:
          current.isDirty
            ? current.saveAsId
            : nextState.profileSource === "builtin"
              ? `${nextState.styleProfile.id}-copy`
              : nextState.styleProfile.id,
        status: current.isDirty ? current.status : createLoadedStatus(nextState.profileSource),
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
    async (mode: "save" | "save-as") => {
      const targetId =
        mode === "save"
          ? editorState.profileSource === "user"
            ? editorState.styleReference
            : ""
          : editorState.saveAsId.trim()

      if (!targetId) {
        setEditorState((current) => ({
          ...current,
          error: 'Save As requires a target id such as "team-ops".',
        }))
        return
      }

      setEditorState((current) => ({
        ...current,
        error: "",
        isSaving: true,
        status: mode === "save" ? "Saving profile..." : "Creating user profile...",
      }))

      try {
        const response = await fetch("/__ahtml/gallery/save", {
          body: JSON.stringify({
            mode,
            profileSource: editorState.profileSource,
            styleProfile: {
              ...editorState.draftProfile,
              id: targetId,
            },
            targetId,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        })
        const result = (await response.json()) as GallerySaveResponse

        if (!response.ok || !result.ok || !result.styleProfile || !result.styleReference) {
          throw new Error(result.error ?? "Unable to save gallery style profile.")
        }

        setEditorState((current) => ({
          ...current,
          availableStyleReferences: current.availableStyleReferences.includes(
            result.styleReference!,
          )
            ? current.availableStyleReferences
            : [...current.availableStyleReferences, result.styleReference!].sort(
                (left, right) => left.localeCompare(right),
              ),
          draftProfile: result.styleProfile!,
          error: "",
          isDirty: false,
          isSaving: false,
          profileSource: "user",
          saveAsId: result.styleReference!,
          status:
            mode === "save"
              ? `Saved ${result.styleReference}.`
              : `Saved as ${result.styleReference}.`,
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
                <h2>Session</h2>
                <span>{editorState.profileSource}</span>
              </div>
              <div className="ahtml-gallery-stack">
                <FieldRow label="Current style-ref" value={editorState.styleReference} />
                <FieldRow
                  label="Available refs"
                  value={editorState.availableStyleReferences.join(", ")}
                  multiline
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
                <span>local</span>
              </div>
              <div className="ahtml-gallery-stack">
                <div className="ahtml-gallery-actions">
                  <button
                    className="ahtml-gallery-button ahtml-gallery-button-primary"
                    disabled={editorState.profileSource !== "user" || editorState.isSaving}
                    onClick={() => void saveProfile("save")}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="ahtml-gallery-button"
                    disabled={editorState.isSaving}
                    onClick={() => void saveProfile("save-as")}
                    type="button"
                  >
                    Save As
                  </button>
                </div>
                <LabeledInput
                  label="Save As Id"
                  value={editorState.saveAsId}
                  onChange={(value) =>
                    setEditorState((current) => ({
                      ...current,
                      saveAsId: value,
                    }))
                  }
                />
              </div>
            </section>
          </div>
        </aside>

        <section className="ahtml-gallery-preview">
          <div className="ahtml-gallery-preview-header">
            <div>
              <p className="ahtml-gallery-kicker">Preview</p>
              <h2>Full component index</h2>
            </div>
            <p className="ahtml-gallery-preview-note">
              All scenes reuse the semantic renderer and current draft style profile.
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

function createLoadedStatus(profileSource: "builtin" | "user") {
  return profileSource === "builtin"
    ? "Built-in profile. Use Save As to persist changes."
    : "User profile loaded."
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
  `
}

function getDocumentTitle(document: AgentDocument) {
  const page = document.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
