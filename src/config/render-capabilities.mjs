export {
  getAgentComponentSource,
  getAgentRenderKind,
  nativeRenderableAgentComponents,
  renderableAgentComponents,
  requiredShadcnRuntimeComponents,
  requiredShadcnRuntimeExports,
  schemaRenderableComponents,
  structuralAgentComponents,
} from "./component-capabilities.mjs"

import {
  componentCapabilityDefinitions,
  createStandardRendererSlots,
  createUiSlots,
  structuralAgentComponents,
} from "./component-capabilities.mjs"

export const supportedRuntimeBase = "radix"

export function createUiCapabilities(components) {
  const componentMap = new Map(
    components.map((component) => [component.name, component]),
  )

  return {
    version: 1,
    components: components
      .filter(
        (component) => !structuralAgentComponents.includes(component.name),
      )
      .map((component) => {
        const definition = componentCapabilityDefinitions[component.name]

        return {
          name: component.name,
          renderKind: definition?.renderKind ?? "structural",
          source: definition?.source ?? "ahtml-standard",
          props: component.props.map((prop) => prop.name),
          slots: createUiSlots(component, componentMap),
        }
      }),
  }
}

export function createRendererSpec(components) {
  const componentMap = new Map(
    components.map((component) => [component.name, component]),
  )

  return {
    version: 1,
    components: components
      .filter(
        (component) => !structuralAgentComponents.includes(component.name),
      )
      .map((component) => createRendererSpecComponent(component, componentMap)),
  }
}

function createRendererSpecComponent(component, componentMap) {
  const definition = componentCapabilityDefinitions[component.name]
  const renderer = definition?.renderer ?? { kind: "structural" }
  const slots =
    renderer.slotMode === "standard-children"
      ? createStandardRendererSlots(component, componentMap)
      : createUiSlots(component, componentMap)
  const rendererSpec = { ...renderer }
  delete rendererSpec.slotMode

  return {
    name: component.name,
    renderKind: definition?.renderKind ?? "structural",
    source: definition?.source ?? "ahtml-standard",
    requiredRegistryItem: definition?.requiredRegistryItem,
    requiredExports: definition?.requiredExports,
    ...rendererSpec,
    slots,
  }
}
