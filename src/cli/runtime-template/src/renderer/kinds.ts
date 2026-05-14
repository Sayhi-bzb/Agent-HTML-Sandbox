export const runtimeRendererKinds = [
  "collection",
  "compound",
  "interactive-collection",
  "primitive",
  "table",
  "tabs",
] as const

export type RendererKind = (typeof runtimeRendererKinds)[number]
