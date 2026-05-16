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
  createRendererSlots,
  createStandardRendererSlots,
  createUiSlots,
  structuralAgentComponents,
} from "./component-capabilities.mjs"

export const supportedRuntimeBase = "radix"
export const rendererKindDefinitions = {
  primitive: {
    requiredFields: ["component"],
  },
  "field-control": {
    requiredFields: ["root", "label", "control", "labelProp"],
    requiredWhenPresent: {
      description: ["descriptionProp"],
      fallback: ["valueProp"],
      item: ["itemSlot", "itemValueProp", "itemHeadingProp"],
    },
  },
  "option-set": {
    requiredFields: [
      "root",
      "label",
      "control",
      "item",
      "itemSlot",
      "itemValueProp",
      "itemHeadingProp",
      "labelProp",
    ],
    requiredWhenPresent: {
      description: ["descriptionProp"],
      controlTrigger: ["controlContent"],
      controlValue: ["controlTrigger"],
      controlList: ["controlContent"],
      controlListAttr: ["itemContainer"],
    },
  },
  compound: {
    requiredFields: ["root"],
    requiredWhenPresent: {
      title: ["titleProp"],
    },
  },
  collection: {
    requiredFields: ["item", "itemSlot", "childMode"],
    requiredAnyOf: [["root", "rootByProp"]],
  },
  table: {
    requiredFields: [
      "root",
      "header",
      "body",
      "row",
      "headerCell",
      "bodyCell",
      "rowSlot",
      "cellSlot",
      "kindProp",
      "headerKind",
    ],
  },
  "interactive-collection": {
    requiredFields: [
      "root",
      "item",
      "trigger",
      "content",
      "itemSlot",
      "itemValueProp",
      "itemHeadingProp",
      "mode",
    ],
  },
  tabs: {
    requiredFields: [
      "root",
      "list",
      "trigger",
      "content",
      "itemSlot",
      "itemValueProp",
      "itemHeadingProp",
      "defaultProp",
    ],
  },
}
export const supportedRendererKinds = new Set(
  Object.keys(rendererKindDefinitions),
)

export function createRuntimeVerificationData(components) {
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

export function createRendererMapping(components) {
  const componentMap = new Map(
    components.map((component) => [component.name, component]),
  )

  return {
    version: 1,
    components: components
      .filter(
        (component) => !structuralAgentComponents.includes(component.name),
      )
      .map((component) =>
        createRendererMappingComponent(component, componentMap),
      ),
  }
}

export function createRuntimeRendererKindSpec() {
  return {
    version: 1,
    kinds: [...supportedRendererKinds].sort(),
  }
}

export function collectRendererSpecComponentIssues(component) {
  const kindDefinition = rendererKindDefinitions[component?.kind]

  if (!kindDefinition) {
    return [`Unsupported renderer kind "${String(component?.kind)}".`]
  }

  const issues = []

  for (const fieldName of kindDefinition.requiredFields ?? []) {
    if (!hasRendererSpecValue(component?.[fieldName])) {
      issues.push(`Missing required field "${fieldName}".`)
    }
  }

  for (const fieldGroup of kindDefinition.requiredAnyOf ?? []) {
    if (
      !fieldGroup.some((fieldName) =>
        hasRendererSpecValue(component?.[fieldName]),
      )
    ) {
      issues.push(`Missing one of required fields: ${fieldGroup.join(", ")}.`)
    }
  }

  for (const [fieldName, requiredFields] of Object.entries(
    kindDefinition.requiredWhenPresent ?? {},
  )) {
    if (!hasRendererSpecValue(component?.[fieldName])) {
      continue
    }

    for (const requiredField of requiredFields) {
      if (!hasRendererSpecValue(component?.[requiredField])) {
        issues.push(`Field "${fieldName}" requires "${requiredField}".`)
      }
    }
  }

  return issues
}

const rendererElementKeys = [
  "component",
  "control",
  "controlRoot",
  "controlContent",
  "controlEmpty",
  "controlList",
  "controlTrigger",
  "controlValue",
  "label",
  "description",
  "root",
  "title",
  "titleContainer",
  "content",
  "list",
  "trigger",
  "body",
  "header",
  "row",
  "headerCell",
  "bodyCell",
  "item",
  "itemContainer",
]

export function createRuntimeElementRegistrySpec(rendererMapping) {
  const components = Array.isArray(rendererMapping)
    ? rendererMapping
    : (rendererMapping?.components ?? [])
  const modulesByRegistryItem = new Map()
  const exportOwners = new Map()
  const referencedElementNames = new Set()

  for (const component of components) {
    const requiredRegistryModules =
      component.requiredRegistryModules?.length > 0
        ? component.requiredRegistryModules
        : component.requiredRegistryItem && component.requiredExports
          ? [
              {
                registryItem: component.requiredRegistryItem,
                exports: component.requiredExports,
              },
            ]
          : []

    for (const module of requiredRegistryModules) {
      addModuleExports({
        exportOwners,
        exports: module.exports ?? [],
        modulesByRegistryItem,
        registryItem: module.registryItem,
      })
    }

    for (const elementName of collectRendererElementNames(component)) {
      referencedElementNames.add(elementName)
    }
  }

  const nativeElements = []

  for (const elementName of referencedElementNames) {
    if (isNativeElementName(elementName)) {
      nativeElements.push(elementName)
      continue
    }

    if (!exportOwners.has(elementName)) {
      throw new Error(
        `Renderer element "${elementName}" is not backed by a required registry export.`,
      )
    }
  }

  return {
    version: 1,
    nativeElements: nativeElements.sort(),
    modules: [...modulesByRegistryItem.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([registryItem, exports]) => ({
        registryItem,
        exports: [...exports].sort(),
      })),
  }
}

function addModuleExports({
  registryItem,
  exports,
  modulesByRegistryItem,
  exportOwners,
}) {
  if (!registryItem || exports.length === 0) {
    return
  }

  if (!modulesByRegistryItem.has(registryItem)) {
    modulesByRegistryItem.set(registryItem, new Set())
  }

  const registryExports = modulesByRegistryItem.get(registryItem)

  for (const exportName of exports) {
    const previousOwner = exportOwners.get(exportName)

    if (previousOwner && previousOwner !== registryItem) {
      throw new Error(
        `Renderer export "${exportName}" is declared by multiple registry items: ${previousOwner}, ${registryItem}.`,
      )
    }

    exportOwners.set(exportName, registryItem)
    registryExports.add(exportName)
  }
}

function collectRendererElementNames(component) {
  const names = []

  for (const key of rendererElementKeys) {
    if (typeof component?.[key] === "string" && component[key].trim() !== "") {
      names.push(component[key])
    }
  }

  if (component?.rootByProp) {
    if (
      typeof component.rootByProp.default === "string" &&
      component.rootByProp.default.trim() !== ""
    ) {
      names.push(component.rootByProp.default)
    }

    for (const mappedValue of Object.values(component.rootByProp.map ?? {})) {
      if (typeof mappedValue === "string" && mappedValue.trim() !== "") {
        names.push(mappedValue)
      }
    }
  }

  return names
}

function isNativeElementName(value) {
  return /^[a-z][a-z0-9-]*$/.test(value)
}

function hasRendererSpecValue(value) {
  if (typeof value === "string") {
    return value.trim() !== ""
  }

  if (typeof value === "boolean") {
    return true
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== undefined && value !== null
}

function createRendererMappingComponent(component, componentMap) {
  const definition = componentCapabilityDefinitions[component.name]
  const renderer = definition?.renderer ?? { kind: "structural" }
  const slots =
    renderer.slotMode === "standard-children"
      ? createStandardRendererSlots(component, componentMap)
      : createRendererSlots(component, componentMap)
  const rendererMapping = { ...renderer }
  delete rendererMapping.slotMode

  return {
    name: component.name,
    renderKind: definition?.renderKind ?? "structural",
    source: definition?.source ?? "ahtml-standard",
    requiredRegistryModules: definition?.requiredRegistryModules,
    requiredRegistryItem: definition?.requiredRegistryItem,
    requiredExports: definition?.requiredExports,
    ...rendererMapping,
    slots,
  }
}
