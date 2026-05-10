import { DISPLAY_RENDERER_COMPONENTS } from "./display-components"
import { INTERACTIVE_RENDERER_COMPONENTS } from "./interactive-components"
import type { RendererComponent } from "./renderer-types"

const STANDARD_RENDERER_COMPONENTS = {
  ...DISPLAY_RENDERER_COMPONENTS,
  ...INTERACTIVE_RENDERER_COMPONENTS,
} satisfies Record<string, RendererComponent>

export function getRendererComponent(
  name: string,
): RendererComponent | undefined {
  const registry: Readonly<Record<string, RendererComponent>> =
    STANDARD_RENDERER_COMPONENTS
  return registry[name]
}

export function getRendererComponentNames(): readonly string[] {
  return Object.keys(STANDARD_RENDERER_COMPONENTS).sort()
}
