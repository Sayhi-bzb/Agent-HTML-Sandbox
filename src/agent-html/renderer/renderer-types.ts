import type { ReactNode } from "react"

import type { SanitizedNode, StandardAgentNode } from "../types"
import type { RenderProfile } from "./render-profile"

export type RendererContext = {
  readonly profile: RenderProfile
  readonly renderChildren: (children: readonly SanitizedNode[]) => ReactNode
}

export type RendererComponent = {
  readonly name: string
  readonly render: (
    node: StandardAgentNode,
    context: RendererContext,
  ) => ReactNode
}
