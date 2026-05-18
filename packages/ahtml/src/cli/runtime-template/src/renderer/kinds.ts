export const runtimeRendererKinds = [
  "choice-group",
  "choice-inline",
  "choice-overlay",
  "collection",
  "compound",
  "interactive-collection",
  "primitive",
  "range-field",
  "table",
  "tabs",
  "text-field",
  "toggle-field",
] as const

export type RendererKind = (typeof runtimeRendererKinds)[number]
