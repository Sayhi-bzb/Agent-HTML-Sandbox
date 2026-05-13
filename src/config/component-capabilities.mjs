const textChild = "#text"

export const componentCapabilityDefinitions = {
  page: {
    source: "ahtml-standard",
    renderKind: "compound",
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
      rowSlot: "row",
      cellSlot: "cell",
    },
  },
  list: {
    source: "ahtml-standard",
    renderKind: "collection",
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
    requiredRegistryItem: "tabs",
    requiredExports: ["Tabs", "TabsContent", "TabsList", "TabsTrigger"],
    renderer: {
      kind: "tabs",
      root: "Tabs",
      list: "TabsList",
      trigger: "TabsTrigger",
      content: "TabsContent",
      itemSlot: "tab",
      defaultProp: "default",
      fallback: true,
      slotMode: "standard-children",
    },
  },
  accordion: {
    source: "shadcn",
    renderKind: "interactive-collection",
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
      mode: "multiple",
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
  if (component.name === "tabs") {
    return [
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
        children: getAllowedUiChildren(componentMap.get("tab")),
      },
    ]
  }

  if (component.name === "accordion") {
    return [
      {
        name: "accordion-item",
        props: ["value", "title"],
        children: getAllowedUiChildren(componentMap.get("accordion-item")),
      },
    ]
  }

  if (component.name === "table") {
    return [
      {
        name: "row",
        props: ["kind"],
        children: ["cell"],
      },
      {
        name: "cell",
        children: ["text"],
      },
    ]
  }

  if (component.name === "list") {
    return [
      {
        name: "item",
        children: ["text"],
      },
    ]
  }

  return [
    {
      name: "children",
      children: getAllowedUiChildren(component),
    },
  ]
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
        children: getAllowedUiChildren(componentMap.get(child)),
      })),
  ]
}

function getAllowedUiChildren(component) {
  return (component?.allowedChildren ?? []).map((child) =>
    child === textChild ? "text" : child,
  )
}
