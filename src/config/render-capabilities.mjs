export const requiredShadcnRuntimeComponents = [
  "accordion",
  "alert",
  "badge",
  "card",
  "separator",
  "table",
  "tabs",
]

export const supportedRuntimeBase = "radix"

export const requiredShadcnRuntimeExports = {
  accordion: [
    "Accordion",
    "AccordionContent",
    "AccordionItem",
    "AccordionTrigger",
  ],
  alert: ["Alert", "AlertDescription", "AlertTitle"],
  badge: ["Badge"],
  card: ["Card", "CardContent", "CardHeader", "CardTitle"],
  separator: ["Separator"],
  table: [
    "Table",
    "TableBody",
    "TableCell",
    "TableHead",
    "TableHeader",
    "TableRow",
  ],
  tabs: ["Tabs", "TabsContent", "TabsList", "TabsTrigger"],
}

export const nativeRenderableAgentComponents = ["list", "page"]

export const structuralAgentComponents = [
  "accordion-item",
  "cell",
  "item",
  "row",
  "tab",
]

export const renderableAgentComponents = [
  ...nativeRenderableAgentComponents,
  ...requiredShadcnRuntimeComponents,
]

export const schemaRenderableComponents = [
  ...renderableAgentComponents,
  ...structuralAgentComponents,
]

const textChild = "#text"

export function getAgentComponentSource(name) {
  if (requiredShadcnRuntimeComponents.includes(name)) {
    return "shadcn"
  }

  if (structuralAgentComponents.includes(name)) {
    return "ahtml-structure"
  }

  return "ahtml-standard"
}

export function getAgentRenderKind(name) {
  if (name === "accordion") {
    return "interactive-collection"
  }

  if (name === "badge" || name === "separator") {
    return "primitive"
  }

  if (name === "card" || name === "alert" || name === "page") {
    return "compound"
  }

  if (name === "list") {
    return "collection"
  }

  if (name === "table") {
    return "table"
  }

  if (name === "tabs") {
    return "tabs"
  }

  return "structural"
}

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
      .map((component) => ({
        name: component.name,
        renderKind: getAgentRenderKind(component.name),
        source: getAgentComponentSource(component.name),
        props: component.props.map((prop) => prop.name),
        slots: createUiSlots(component, componentMap),
      })),
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
  const renderKind = getAgentRenderKind(component.name)
  const slots = createUiSlots(component, componentMap)

  if (component.name === "page") {
    return {
      name: component.name,
      renderKind,
      kind: "compound",
      root: "article",
      title: "h1",
      titleProp: "title",
      titleClassName: "ahtml-page-title",
      rootClassName: "ahtml-page",
      childMode: "block",
      slots,
    }
  }

  if (component.name === "alert") {
    return {
      name: component.name,
      renderKind,
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
      slots,
    }
  }

  if (component.name === "card") {
    return {
      name: component.name,
      renderKind,
      kind: "compound",
      root: "Card",
      title: "CardTitle",
      titleContainer: "CardHeader",
      content: "CardContent",
      titleProp: "title",
      childMode: "block",
      slots,
    }
  }

  if (component.name === "separator") {
    return {
      name: component.name,
      renderKind,
      kind: "primitive",
      component: "Separator",
      childMode: "none",
      slots,
    }
  }

  if (component.name === "badge") {
    return {
      name: component.name,
      renderKind,
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
      slots,
    }
  }

  if (component.name === "list") {
    return {
      name: component.name,
      renderKind,
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
      slots,
    }
  }

  if (component.name === "table") {
    return {
      name: component.name,
      renderKind,
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
      slots,
    }
  }

  if (component.name === "tabs") {
    return {
      name: component.name,
      renderKind,
      kind: "tabs",
      root: "Tabs",
      list: "TabsList",
      trigger: "TabsTrigger",
      content: "TabsContent",
      itemSlot: "tab",
      defaultProp: "default",
      fallback: true,
      slots: createStandardRendererSlots(component, componentMap),
    }
  }

  if (component.name === "accordion") {
    return {
      name: component.name,
      renderKind,
      kind: "interactive-collection",
      root: "Accordion",
      item: "AccordionItem",
      trigger: "AccordionTrigger",
      content: "AccordionContent",
      itemSlot: "accordion-item",
      mode: "multiple",
      slots,
    }
  }

  return {
    name: component.name,
    renderKind,
    kind: "structural",
    slots,
  }
}

function createStandardRendererSlots(component, componentMap) {
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

function createUiSlots(component, componentMap) {
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

function getAllowedUiChildren(component) {
  return (component?.allowedChildren ?? []).map((child) =>
    child === textChild ? "text" : child,
  )
}
