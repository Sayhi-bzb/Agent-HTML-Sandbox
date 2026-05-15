export const runtimeRendererKinds = ["collection","compound","field-control","interactive-collection","option-set","primitive","table","tabs"] as const

export type RendererKind = (typeof runtimeRendererKinds)[number]
