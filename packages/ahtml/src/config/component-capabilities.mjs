const textChild = "#text"
const fieldRegistryModules = [
  {
    registryItem: "field",
    exports: [
      "Field",
      "FieldContent",
      "FieldDescription",
      "FieldLabel",
      "FieldTitle",
    ],
  },
]

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
    behavior: {
      model: "determinate-progress",
      runtimeOwner: "managed-ui",
      forwardedProps: ["value"],
      visualStateProp: "value",
    },
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
    renderKind: "text-field",
    uiProtocol: uiProtocolDefinitions.input,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "input",
        exports: ["Input"],
      },
    ],
    requiredRegistryItem: "input",
    requiredExports: ["Input"],
    renderer: {
      kind: "text-field",
      root: "Field",
      label: "FieldLabel",
      control: "Input",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [{ prop: "value", target: "defaultValue" }],
    },
  },
  textarea: {
    source: "shadcn",
    renderKind: "text-field",
    uiProtocol: uiProtocolDefinitions.textarea,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "textarea",
        exports: ["Textarea"],
      },
    ],
    requiredRegistryItem: "textarea",
    requiredExports: ["Textarea"],
    renderer: {
      kind: "text-field",
      root: "Field",
      label: "FieldLabel",
      control: "Textarea",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [{ prop: "value", target: "defaultValue" }],
    },
  },
  checkbox: {
    source: "shadcn",
    renderKind: "toggle-field",
    uiProtocol: uiProtocolDefinitions.checkbox,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "checkbox",
        exports: ["Checkbox"],
      },
    ],
    requiredRegistryItem: "checkbox",
    requiredExports: ["Checkbox"],
    renderer: {
      kind: "toggle-field",
      root: "Field",
      label: "FieldLabel",
      control: "Checkbox",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [{ prop: "checked", target: "defaultChecked", coerce: "boolean" }],
    },
  },
  switch: {
    source: "shadcn",
    renderKind: "toggle-field",
    uiProtocol: uiProtocolDefinitions.switch,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "switch",
        exports: ["Switch"],
      },
    ],
    requiredRegistryItem: "switch",
    requiredExports: ["Switch"],
    renderer: {
      kind: "toggle-field",
      root: "Field",
      label: "FieldLabel",
      control: "Switch",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [{ prop: "checked", target: "defaultChecked", coerce: "boolean" }],
    },
  },
  slider: {
    source: "shadcn",
    renderKind: "range-field",
    uiProtocol: uiProtocolDefinitions.slider,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "slider",
        exports: ["Slider"],
      },
    ],
    requiredRegistryItem: "slider",
    requiredExports: ["Slider"],
    renderer: {
      kind: "range-field",
      root: "Field",
      label: "FieldLabel",
      control: "Slider",
      description: "FieldDescription",
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
    renderKind: "choice-group",
    uiProtocol: uiProtocolDefinitions["radio-group"],
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "radio-group",
        exports: ["RadioGroup", "RadioGroupItem"],
      },
    ],
    requiredRegistryItem: "radio-group",
    requiredExports: ["RadioGroup", "RadioGroupItem"],
    renderer: {
      kind: "choice-group",
      root: "Field",
      label: "FieldTitle",
      control: "RadioGroup",
      item: "RadioGroupItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      propMappings: [{ prop: "value", target: "defaultValue" }],
    },
  },
  "toggle-group": {
    source: "shadcn",
    renderKind: "choice-inline",
    uiProtocol: uiProtocolDefinitions["toggle-group"],
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "toggle-group",
        exports: ["ToggleGroup", "ToggleGroupItem"],
      },
    ],
    requiredRegistryItem: "toggle-group",
    requiredExports: ["ToggleGroup", "ToggleGroupItem"],
    renderer: {
      kind: "choice-inline",
      root: "Field",
      label: "FieldTitle",
      control: "ToggleGroup",
      item: "ToggleGroupItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      staticProps: {
        type: "single",
      },
      propMappings: [{ prop: "value", target: "defaultValue" }],
    },
  },
  select: {
    source: "shadcn",
    renderKind: "select-overlay",
    uiProtocol: uiProtocolDefinitions.select,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "select",
        exports: [
          "Select",
          "SelectContent",
          "SelectGroup",
          "SelectItem",
          "SelectTrigger",
          "SelectValue",
        ],
      },
    ],
    requiredRegistryItem: "select",
    requiredExports: [
      "Select",
      "SelectContent",
      "SelectGroup",
      "SelectItem",
      "SelectTrigger",
      "SelectValue",
    ],
    renderer: {
      kind: "select-overlay",
      root: "Field",
      label: "FieldTitle",
      control: "Select",
      controlTrigger: "SelectTrigger",
      controlValue: "SelectValue",
      controlContent: "SelectContent",
      itemContainer: "SelectGroup",
      item: "SelectItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      fallback: true,
      propMappings: [{ prop: "value", target: "defaultValue" }],
    },
  },
  combobox: {
    source: "shadcn",
    renderKind: "combobox-input",
    uiProtocol: uiProtocolDefinitions.combobox,
    requiredRegistryModules: [
      ...fieldRegistryModules,
      {
        registryItem: "combobox",
        exports: [
          "Combobox",
          "ComboboxCollection",
          "ComboboxContent",
          "ComboboxEmpty",
          "ComboboxInput",
          "ComboboxItem",
          "ComboboxList",
        ],
      },
    ],
    requiredRegistryItem: "combobox",
    requiredExports: [
      "Combobox",
      "ComboboxCollection",
      "ComboboxContent",
      "ComboboxEmpty",
      "ComboboxInput",
      "ComboboxItem",
      "ComboboxList",
    ],
    renderer: {
      kind: "combobox-input",
      root: "Field",
      label: "FieldTitle",
      controlRoot: "Combobox",
      control: "ComboboxInput",
      controlContent: "ComboboxContent",
      controlEmpty: "ComboboxEmpty",
      controlList: "ComboboxList",
      itemContainer: "ComboboxCollection",
      item: "ComboboxItem",
      itemSlot: "option",
      itemValueProp: "value",
      itemHeadingProp: "label",
      description: "FieldDescription",
      labelProp: "label",
      descriptionProp: "description",
      emptyText: "No results found.",
      fallback: true,
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
    renderKind: "accordion",
    behavior: {
      model: "explicit-default-state",
      runtimeOwner: "renderer",
      modeProp: "mode",
      defaultProp: "default",
      defaultMode: "multiple",
      multiValueDelimiter: ",",
    },
    uiProtocol: uiProtocolDefinitions.accordion,
    requiredRegistryItem: "accordion",
    requiredExports: [
      "Accordion",
      "AccordionContent",
      "AccordionItem",
      "AccordionTrigger",
    ],
    renderer: {
      kind: "accordion",
      root: "Accordion",
      item: "AccordionItem",
      trigger: "AccordionTrigger",
      content: "AccordionContent",
      itemSlot: "accordion-item",
      itemValueProp: "value",
      itemHeadingProp: "title",
      modeProp: "mode",
      defaultProp: "default",
      defaultMode: "multiple",
      fallback: true,
    },
  },
}

function getDefinitionRequiredRegistryModules(definition) {
  if (Array.isArray(definition?.requiredRegistryModules)) {
    return definition.requiredRegistryModules
  }

  if (definition?.requiredRegistryItem && definition?.requiredExports) {
    return [
      {
        registryItem: definition.requiredRegistryItem,
        exports: definition.requiredExports,
      },
    ]
  }

  return []
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
      .flatMap((definition) =>
        getDefinitionRequiredRegistryModules(definition).map(
          (module) => module.registryItem,
        ),
      )
      .filter(Boolean),
  ),
]

export const requiredShadcnRuntimeExports = Object.fromEntries(
  requiredShadcnRuntimeComponents.map((registryItem) => [
    registryItem,
    [
      ...new Set(
        Object.values(componentCapabilityDefinitions).flatMap((definition) =>
          getDefinitionRequiredRegistryModules(definition)
            .filter((module) => module.registryItem === registryItem)
            .flatMap((module) => module.exports),
        ),
      ),
    ],
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
