const textChild = "#text"
const uiProtocolDefinitions = {
  page: {
    promptOrder: 0,
  },
  card: {
    promptOrder: 1,
  },
  alert: {
    promptOrder: 2,
  },
  badge: {
    promptOrder: 3,
  },
  separator: {
    promptOrder: 4,
  },
  list: {
    promptOrder: 5,
    normalization: {
      kind: "slotted",
      slotName: "item",
      childComponentName: "item",
    },
    slots: [
      {
        name: "item",
        children: ["text"],
      },
    ],
  },
  table: {
    promptOrder: 6,
    normalization: {
      kind: "table",
      rowSlotName: "row",
      rowComponentName: "row",
      cellSlotName: "cell",
      cellComponentName: "cell",
    },
    slots: [
      {
        name: "row",
        props: ["kind"],
        children: ["cell"],
      },
      {
        name: "cell",
        children: ["text"],
      },
    ],
  },
  tabs: {
    promptOrder: 7,
    attrAliases: {
      default: "default-value",
    },
    normalization: {
      kind: "tabs",
      triggerSlotName: "tabs-trigger",
      contentSlotName: "tabs-content",
      childComponentName: "tab",
    },
    slots: [
      {
        name: "tabs-list",
        children: ["tabs-trigger"],
      },
      {
        name: "tabs-trigger",
        props: ["value"],
        children: ["text"],
      },
      {
        name: "tabs-content",
        props: ["value", "label"],
        childrenFromComponent: "tab",
      },
    ],
  },
  accordion: {
    promptOrder: 8,
    normalization: {
      kind: "slotted",
      slotName: "accordion-item",
      childComponentName: "accordion-item",
    },
    slots: [
      {
        name: "accordion-item",
        props: ["value", "title"],
        childrenFromComponent: "accordion-item",
      },
    ],
  },
}

export const componentCapabilityDefinitions = {
  page: {
    source: "ahtml-standard",
    renderKind: "compound",
    uiProtocol: uiProtocolDefinitions.page,
    renderer: {
      kind: "compound",
      root: "article",
      title: "h1",
      titleProp: "title",
      titleClassName: "ahtml-page-title",
      rootClassName: "ahtml-page",
      childMode: "block",
    },
  },
  alert: {
    source: "shadcn",
    renderKind: "compound",
    uiProtocol: uiProtocolDefinitions.alert,
    requiredRegistryItem: "alert",
    requiredExports: ["Alert", "AlertDescription", "AlertTitle"],
    renderer: {
      kind: "compound",
      root: "Alert",
      title: "AlertTitle",
      content: "AlertDescription",
      titleProp: "title",
      childMode: "block",
      propMappings: [
        {
          prop: "tone",
          target: "variant",
          map: {
            danger: "destructive",
            neutral: "default",
          },
        },
      ],
    },
  },
  card: {
    source: "shadcn",
    renderKind: "compound",
    uiProtocol: uiProtocolDefinitions.card,
    requiredRegistryItem: "card",
    requiredExports: ["Card", "CardContent", "CardHeader", "CardTitle"],
    renderer: {
      kind: "compound",
      root: "Card",
      title: "CardTitle",
      titleContainer: "CardHeader",
      content: "CardContent",
      titleProp: "title",
      childMode: "block",
    },
  },
  separator: {
    source: "shadcn",
    renderKind: "primitive",
    uiProtocol: uiProtocolDefinitions.separator,
    requiredRegistryItem: "separator",
    requiredExports: ["Separator"],
    renderer: {
      kind: "primitive",
      component: "Separator",
      childMode: "none",
    },
  },
  badge: {
    source: "shadcn",
    renderKind: "primitive",
    uiProtocol: uiProtocolDefinitions.badge,
    requiredRegistryItem: "badge",
    requiredExports: ["Badge"],
    renderer: {
      kind: "primitive",
      component: "Badge",
      childMode: "inline",
      propMappings: [
        {
          prop: "tone",
          target: "variant",
          map: {
            danger: "destructive",
            neutral: "default",
            success: "secondary",
            warning: "secondary",
          },
        },
      ],
    },
  },
  table: {
    source: "shadcn",
    renderKind: "table",
    uiProtocol: uiProtocolDefinitions.table,
    requiredRegistryItem: "table",
    requiredExports: [
      "Table",
      "TableBody",
      "TableCell",
      "TableHead",
      "TableHeader",
      "TableRow",
    ],
    renderer: {
      kind: "table",
      root: "Table",
      header: "TableHeader",
      body: "TableBody",
      row: "TableRow",
      headerCell: "TableHead",
      bodyCell: "TableCell",
      headerKind: "header",
      kindProp: "kind",
      rowSlot: "row",
      cellSlot: "cell",
    },
  },
  list: {
    source: "ahtml-standard",
    renderKind: "collection",
    uiProtocol: uiProtocolDefinitions.list,
    renderer: {
      kind: "collection",
      rootByProp: {
        prop: "variant",
        target: "tag",
        map: {
          ordered: "ol",
          unordered: "ul",
        },
        default: "ul",
      },
      rootClassName: "ahtml-list",
      item: "li",
      itemSlot: "item",
      childMode: "inline",
    },
  },
  tabs: {
    source: "shadcn",
    renderKind: "tabs",
    uiProtocol: uiProtocolDefinitions.tabs,
    requiredRegistryItem: "tabs",
    requiredExports: ["Tabs", "TabsContent", "TabsList", "TabsTrigger"],
    renderer: {
      kind: "tabs",
      root: "Tabs",
      list: "TabsList",
      trigger: "TabsTrigger",
      content: "TabsContent",
      itemSlot: "tab",
      itemValueProp: "value",
      itemHeadingProp: "label",
      defaultProp: "default",
      fallback: true,
      slotMode: "standard-children",
    },
  },
  accordion: {
    source: "shadcn",
    renderKind: "interactive-collection",
    uiProtocol: uiProtocolDefinitions.accordion,
    requiredRegistryItem: "accordion",
    requiredExports: [
      "Accordion",
      "AccordionContent",
      "AccordionItem",
      "AccordionTrigger",
    ],
    renderer: {
      kind: "interactive-collection",
      root: "Accordion",
      item: "AccordionItem",
      trigger: "AccordionTrigger",
      content: "AccordionContent",
      itemSlot: "accordion-item",
      itemValueProp: "value",
      itemHeadingProp: "title",
      mode: "multiple",
      fallback: true,
    },
  },
}

export const structuralAgentComponents = [
  "accordion-item",
  "cell",
  "item",
  "row",
  "tab",
]

export const requiredShadcnRuntimeComponents = [
  "accordion",
  "alert",
  "badge",
  "card",
  "separator",
  "table",
  "tabs",
]

export const nativeRenderableAgentComponents = Object.entries(
  componentCapabilityDefinitions,
)
  .filter(([, definition]) => definition.source !== "shadcn")
  .map(([name]) => name)

export const renderableAgentComponents = [
  ...nativeRenderableAgentComponents,
  ...requiredShadcnRuntimeComponents,
]

export const schemaRenderableComponents = [
  ...renderableAgentComponents,
  ...structuralAgentComponents,
]

export const requiredShadcnRuntimeExports = Object.fromEntries(
  Object.values(componentCapabilityDefinitions)
    .filter((definition) => definition.source === "shadcn")
    .map((definition) => [
      definition.requiredRegistryItem,
      definition.requiredExports,
    ]),
)

export function getAgentComponentSource(name) {
  if (structuralAgentComponents.includes(name)) {
    return "ahtml-structure"
  }

  return componentCapabilityDefinitions[name]?.source ?? "ahtml-standard"
}

export function getAgentRenderKind(name) {
  return componentCapabilityDefinitions[name]?.renderKind ?? "structural"
}

export function createUiSlots(component, componentMap) {
  const configuredSlots = componentCapabilityDefinitions[component.name]?.uiProtocol
    ?.slots

  if (configuredSlots?.length) {
    return configuredSlots.map((slot) =>
      resolveUiProtocolSlot(slot, componentMap),
    )
  }

  return [
    {
      name: "children",
      children: getAllowedUiChildren(component),
    },
  ]
}

export function getUiProtocolDefinition(name) {
  return componentCapabilityDefinitions[name]?.uiProtocol
}

export function getUiProtocolAttrAliases(name) {
  return getUiProtocolDefinition(name)?.attrAliases ?? {}
}

export function createStandardRendererSlots(component, componentMap) {
  return [
    {
      name: "children",
      children: getAllowedUiChildren(component),
    },
    ...getAllowedUiChildren(component)
      .filter((child) => child !== "text")
      .map((child) => ({
        name: child,
        childNames: [child],
        children: getAllowedUiChildren(componentMap.get(child)),
      })),
  ]
}

export function createRendererSlots(component, componentMap) {
  return createUiSlots(component, componentMap).map((slot) =>
    slot.name === "children"
      ? slot
      : {
          ...slot,
          childNames: [slot.name],
        },
  )
}

function getAllowedUiChildren(component) {
  return (component?.allowedChildren ?? []).map((child) =>
    child === textChild ? "text" : child,
  )
}

function resolveUiProtocolSlot(slot, componentMap) {
  const { childrenFromComponent, ...rest } = slot

  return {
    ...rest,
    children: childrenFromComponent
      ? getAllowedUiChildren(componentMap.get(childrenFromComponent))
      : [...(slot.children ?? [])],
  }
}
