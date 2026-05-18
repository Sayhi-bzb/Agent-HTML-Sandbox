export const runtimeRendererKinds = [
  "accordion",
  "choice-group",
  "choice-inline",
  "choice-overlay",
  "combobox-input",
  "collection",
  "compound",
  "primitive",
  "range-field",
  "select-overlay",
  "table",
  "tabs",
  "text-field",
  "toggle-field",
] as const

export type RendererKind = (typeof runtimeRendererKinds)[number]
