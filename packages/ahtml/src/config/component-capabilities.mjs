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
  progress: {
    promptOrder: 4,
  },
  input: {
    promptOrder: 5,
  },
  textarea: {
    promptOrder: 6,
  },
  checkbox: {
    promptOrder: 7,
  },
  switch: {
    promptOrder: 8,
  },
  slider: {
    promptOrder: 9,
  },
  "radio-group": {
    promptOrder: 10,
    normalization: {
      kind: "slotted",
      slotName: "option",
      childComponentName: "option",
    },
    slots: [
      {
        name: "option",
        props: ["value", "label"],
        children: ["text"],
      },
    ],
  },
  "toggle-group": {
    promptOrder: 11,
    normalization: {
      kind: "slotted",
      slotName: "option",
      childComponentName: "option",
    },
    slots: [
      {
        name: "option",
        props: ["value", "label"],
        children: ["text"],
      },
    ],
  },
  select: {
    promptOrder: 12,
    normalization: {
      kind: "slotted",
      slotName: "option",
      childComponentName: "option",
    },
    slots: [
      {
        name: "option",
        props: ["value", "label"],
        children: ["text"],
      },
    ],
  },
  combobox: {
    promptOrder: 13,
    normalization: {
      kind: "slotted",
      slotName: "option",
      childComponentName: "option",
    },
    slots: [
      {
        name: "option",
        props: ["value", "label"],
        children: ["text"],
      },
    ],
  },
  separator: {
    promptOrder: 14,
  },
  list: {
    promptOrder: 15,
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
    promptOrder: 16,
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
    promptOrder: 17,
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
    promptOrder: 18,
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
      titleClassName:
        "text-3xl font-semibold tracking-normal text-foreground sm:text-4xl",
      rootClassName: "grid gap-5",
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
  progress: {
    source: "shadcn",
    renderKind: "primitive",
    uiProtocol: uiProtocolDefinitions.progress,
    requiredRegistryItem: "progress",
    requiredExports: ["Progress"],
    renderer: {
      kind: "primitive",
      component: "Progress",
      childMode: "none",
      propMappings: [{ prop: "value", target: "value", coerce: "number" }],
    },
  },
  input: {
    source: "shadcn",
    renderKind: "field-control",
    uiProtocol: uiProtocolDefinitions.input,
    requiredRegistryItem: "input",
    requiredExports: ["Input"],
    renderer: {
      kind: "field-control",
      root: "div",
      label: "p",
      control: "Input",
      description: "p",
      rootClassName: "grid gap-2",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [
        { prop: "value", target: "defaultValue" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  textarea: {
    source: "shadcn",
    renderKind: "field-control",
    uiProtocol: uiProtocolDefinitions.textarea,
    requiredRegistryItem: "textarea",
    requiredExports: ["Textarea"],
    renderer: {
      kind: "field-control",
      root: "div",
      label: "p",
      control: "Textarea",
      description: "p",
      rootClassName: "grid gap-2",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [
        { prop: "value", target: "defaultValue" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  checkbox: {
    source: "shadcn",
    renderKind: "field-control",
    uiProtocol: uiProtocolDefinitions.checkbox,
    requiredRegistryItem: "checkbox",
    requiredExports: ["Checkbox"],
    renderer: {
      kind: "field-control",
      root: "div",
      label: "p",
      control: "Checkbox",
      description: "p",
      rootClassName: "grid gap-2",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [
        { prop: "checked", target: "defaultChecked", coerce: "boolean" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  switch: {
    source: "shadcn",
    renderKind: "field-control",
    uiProtocol: uiProtocolDefinitions.switch,
    requiredRegistryItem: "switch",
    requiredExports: ["Switch"],
    renderer: {
      kind: "field-control",
      root: "div",
      label: "p",
      control: "Switch",
      description: "p",
      rootClassName: "grid gap-2",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [
        { prop: "checked", target: "defaultChecked", coerce: "boolean" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  slider: {
    source: "shadcn",
    renderKind: "field-control",
    uiProtocol: uiProtocolDefinitions.slider,
    requiredRegistryItem: "slider",
    requiredExports: ["Slider"],
    renderer: {
      kind: "field-control",
      root: "div",
      label: "p",
      control: "Slider",
      description: "p",
      rootClassName: "grid gap-2",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      valueProp: "value",
      fallback: true,
      propMappings: [
        { prop: "value", target: "defaultValue", coerce: "number-array" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  "radio-group": {
    source: "shadcn",
    renderKind: "field-control",
    uiProtocol: uiProtocolDefinitions["radio-group"],
    requiredRegistryItem: "radio-group",
    requiredExports: ["RadioGroup", "RadioGroupItem"],
    renderer: {
      kind: "field-control",
      root: "div",
      label: "p",
      control: "RadioGroup",
      item: "RadioGroupItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "p",
      rootClassName: "grid gap-3",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [
        { prop: "value", target: "defaultValue" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  "toggle-group": {
    source: "shadcn",
    renderKind: "option-set",
    uiProtocol: uiProtocolDefinitions["toggle-group"],
    requiredRegistryItem: "toggle-group",
    requiredExports: ["ToggleGroup", "ToggleGroupItem"],
    renderer: {
      kind: "option-set",
      root: "div",
      label: "p",
      control: "ToggleGroup",
      item: "ToggleGroupItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "p",
      rootClassName: "grid gap-3",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      staticProps: {
        type: "single",
      },
      propMappings: [
        { prop: "value", target: "defaultValue" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  select: {
    source: "shadcn",
    renderKind: "option-set",
    uiProtocol: uiProtocolDefinitions.select,
    requiredRegistryItem: "select",
    requiredExports: [
      "Select",
      "SelectContent",
      "SelectItem",
      "SelectTrigger",
      "SelectValue",
    ],
    renderer: {
      kind: "option-set",
      root: "div",
      label: "p",
      control: "Select",
      controlTrigger: "SelectTrigger",
      controlValue: "SelectValue",
      controlContent: "SelectContent",
      item: "SelectItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "p",
      rootClassName: "grid gap-3",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      fallback: true,
      propMappings: [
        { prop: "value", target: "defaultValue" },
        { prop: "label", target: "aria-label" },
      ],
    },
  },
  combobox: {
    source: "shadcn",
    renderKind: "option-set",
    uiProtocol: uiProtocolDefinitions.combobox,
    requiredRegistryItem: "combobox",
    requiredExports: [
      "Combobox",
      "ComboboxContent",
      "ComboboxInput",
      "ComboboxItem",
      "ComboboxList",
    ],
    renderer: {
      kind: "option-set",
      root: "div",
      label: "p",
      controlRoot: "Combobox",
      control: "ComboboxInput",
      controlContent: "ComboboxContent",
      controlList: "ComboboxList",
      item: "ComboboxItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "p",
      rootClassName: "grid gap-3",
      labelClassName: "m-0 text-sm font-medium leading-6 text-foreground",
      descriptionClassName: "m-0 text-sm text-muted-foreground",
      labelProp: "label",
      descriptionProp: "description",
      fallback: true,
      propMappings: [
        { prop: "value", target: "defaultValue" },
        { prop: "label", target: "aria-label" },
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
      rootClassName: "space-y-2 pl-5 marker:text-muted-foreground",
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
  "option",
  "row",
  "tab",
]

export const requiredShadcnRuntimeComponents = [
  ...new Set(
    Object.values(componentCapabilityDefinitions)
      .map((definition) => definition.requiredRegistryItem)
      .filter(Boolean),
  ),
]

export const nativeRenderableAgentComponents = Object.entries(
  componentCapabilityDefinitions,
)
  .filter(([, definition]) => definition.source !== "shadcn")
  .map(([name]) => name)

export const renderableAgentComponents = Object.keys(
  componentCapabilityDefinitions,
)

export const schemaRenderableComponents = [
  ...renderableAgentComponents,
  ...structuralAgentComponents,
]

export const requiredShadcnRuntimeExports = Object.fromEntries(
  Object.values(componentCapabilityDefinitions)
    .filter((definition) => definition.requiredRegistryItem)
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
  const configuredSlots =
    componentCapabilityDefinitions[component.name]?.uiProtocol?.slots

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
