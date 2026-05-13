import type { ComponentSchema, GeneratedShadcnIntrospection } from "../types"

export const GENERATED_SHADCN_INTROSPECTIONS = [
  {
    "registryName": "accordion",
    "componentName": "Accordion",
    "exports": [
      "Accordion",
      "AccordionItem",
      "AccordionTrigger",
      "AccordionContent"
    ],
    "slots": [
      "accordion",
      "accordion-item",
      "accordion-trigger",
      "accordion-content"
    ],
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "alert",
    "componentName": "Alert",
    "exports": [
      "Alert",
      "AlertTitle",
      "AlertDescription"
    ],
    "slots": [
      "alert",
      "alert-title",
      "alert-description"
    ],
    "variantProps": {
      "variant": [
        "default",
        "destructive"
      ]
    },
    "blockedProps": [
      "className"
    ]
  },
  {
    "registryName": "badge",
    "componentName": "Badge",
    "exports": [
      "Badge",
      "badgeVariants"
    ],
    "slots": [
      "badge"
    ],
    "variantProps": {
      "variant": [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link"
      ]
    },
    "blockedProps": [
      "className",
      "asChild"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "button",
    "componentName": "Button",
    "exports": [
      "Button",
      "buttonVariants"
    ],
    "slots": [
      "button"
    ],
    "variantProps": {
      "variant": [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link"
      ],
      "size": [
        "default",
        "xs",
        "sm",
        "lg",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg"
      ]
    },
    "blockedProps": [
      "className",
      "asChild"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "card",
    "componentName": "Card",
    "exports": [
      "Card",
      "CardHeader",
      "CardFooter",
      "CardTitle",
      "CardAction",
      "CardDescription",
      "CardContent"
    ],
    "slots": [
      "card",
      "card-header",
      "card-title",
      "card-description",
      "card-action",
      "card-content",
      "card-footer"
    ],
    "blockedProps": [
      "className"
    ]
  },
  {
    "registryName": "checkbox",
    "componentName": "Checkbox",
    "exports": [
      "Checkbox"
    ],
    "slots": [
      "checkbox",
      "checkbox-indicator"
    ],
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "progress",
    "componentName": "Progress",
    "exports": [
      "Progress"
    ],
    "slots": [
      "progress",
      "progress-indicator"
    ],
    "blockedProps": [
      "className",
      "style"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "separator",
    "componentName": "Separator",
    "exports": [
      "Separator"
    ],
    "slots": [
      "separator"
    ],
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "slider",
    "componentName": "Slider",
    "exports": [
      "Slider"
    ],
    "slots": [
      "slider",
      "slider-track",
      "slider-range",
      "slider-thumb"
    ],
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "table",
    "componentName": "Table",
    "exports": [
      "Table",
      "TableHeader",
      "TableBody",
      "TableFooter",
      "TableHead",
      "TableRow",
      "TableCell",
      "TableCaption"
    ],
    "slots": [
      "table-container",
      "table",
      "table-header",
      "table-body",
      "table-footer",
      "table-row",
      "table-head",
      "table-cell",
      "table-caption"
    ],
    "blockedProps": [
      "className"
    ]
  },
  {
    "registryName": "tabs",
    "componentName": "Tabs",
    "exports": [
      "Tabs",
      "TabsList",
      "TabsTrigger",
      "TabsContent",
      "tabsListVariants"
    ],
    "slots": [
      "tabs",
      "tabs-list",
      "tabs-trigger",
      "tabs-content"
    ],
    "variantProps": {
      "variant": [
        "default",
        "line"
      ]
    },
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "textarea",
    "componentName": "Textarea",
    "exports": [
      "Textarea"
    ],
    "slots": [
      "textarea"
    ],
    "blockedProps": [
      "className"
    ]
  },
  {
    "registryName": "toggle",
    "componentName": "Toggle",
    "exports": [
      "Toggle",
      "toggleVariants"
    ],
    "slots": [
      "toggle"
    ],
    "variantProps": {
      "variant": [
        "default",
        "outline"
      ],
      "size": [
        "default",
        "sm",
        "lg"
      ]
    },
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  },
  {
    "registryName": "toggle-group",
    "componentName": "ToggleGroup",
    "exports": [
      "ToggleGroup",
      "ToggleGroupItem"
    ],
    "slots": [
      "toggle-group",
      "toggle-group-item"
    ],
    "blockedProps": [
      "className",
      "style"
    ],
    "dependencies": [
      "radix-ui"
    ],
    "registryDependencies": [
      "toggle"
    ]
  },
  {
    "registryName": "tooltip",
    "componentName": "Tooltip",
    "exports": [
      "Tooltip",
      "TooltipTrigger",
      "TooltipContent",
      "TooltipProvider"
    ],
    "slots": [
      "tooltip-provider",
      "tooltip",
      "tooltip-trigger",
      "tooltip-content"
    ],
    "blockedProps": [
      "className"
    ],
    "dependencies": [
      "radix-ui"
    ]
  }
] as const satisfies readonly GeneratedShadcnIntrospection[]

export const GENERATED_STANDARD_COMPONENT_SCHEMAS = [
  {
    "name": "page",
    "description": "Document root component.",
    "props": [
      {
        "name": "title",
        "valueKind": "string",
        "required": true,
        "description": "Visible page title."
      }
    ],
    "allowedChildren": [
      "alert",
      "card",
      "separator",
      "table",
      "list",
      "tabs",
      "accordion"
    ]
  },
  {
    "name": "alert",
    "description": "Important callout or warning.",
    "props": [
      {
        "name": "title",
        "valueKind": "string",
        "description": "Callout heading."
      },
      {
        "name": "tone",
        "valueKind": "enum",
        "description": "Alert semantic tone.",
        "enumValues": [
          "neutral",
          "danger"
        ]
      }
    ],
    "allowedChildren": [
      "#text"
    ]
  },
  {
    "name": "card",
    "description": "Content grouping component.",
    "props": [
      {
        "name": "title",
        "valueKind": "string",
        "description": "Card heading."
      }
    ],
    "allowedChildren": [
      "alert",
      "badge",
      "separator",
      "table",
      "list",
      "tabs",
      "accordion",
      "#text"
    ]
  },
  {
    "name": "separator",
    "description": "Section divider.",
    "props": [],
    "allowedChildren": []
  },
  {
    "name": "badge",
    "description": "Short status label.",
    "props": [
      {
        "name": "tone",
        "valueKind": "enum",
        "description": "Badge semantic tone.",
        "enumValues": [
          "neutral",
          "success",
          "warning",
          "danger"
        ]
      }
    ],
    "allowedChildren": [
      "#text"
    ]
  },
  {
    "name": "table",
    "description": "Structured tabular evidence.",
    "props": [],
    "allowedChildren": [
      "row"
    ]
  },
  {
    "name": "row",
    "description": "Table row values.",
    "props": [
      {
        "name": "kind",
        "valueKind": "enum",
        "description": "Table row role.",
        "enumValues": [
          "header",
          "body"
        ]
      }
    ],
    "allowedChildren": [
      "cell"
    ]
  },
  {
    "name": "cell",
    "description": "Table cell content.",
    "props": [],
    "allowedChildren": [
      "#text"
    ]
  },
  {
    "name": "list",
    "description": "Ordered or unordered item list.",
    "props": [
      {
        "name": "variant",
        "valueKind": "enum",
        "description": "List marker style.",
        "enumValues": [
          "ordered",
          "unordered"
        ]
      }
    ],
    "allowedChildren": [
      "item"
    ]
  },
  {
    "name": "item",
    "description": "List item.",
    "props": [],
    "allowedChildren": [
      "#text"
    ]
  },
  {
    "name": "tabs",
    "description": "Interactive view switcher.",
    "props": [
      {
        "name": "default",
        "valueKind": "string",
        "description": "Initially selected tab value."
      }
    ],
    "allowedChildren": [
      "tab"
    ]
  },
  {
    "name": "tab",
    "description": "Single tabs view.",
    "props": [
      {
        "name": "value",
        "valueKind": "string",
        "required": true,
        "description": "Stable tab value."
      },
      {
        "name": "label",
        "valueKind": "string",
        "required": true,
        "description": "Visible tab label."
      }
    ],
    "allowedChildren": [
      "alert",
      "card",
      "separator",
      "table",
      "list",
      "accordion"
    ]
  },
  {
    "name": "accordion",
    "description": "Expandable section group.",
    "props": [],
    "allowedChildren": [
      "accordion-item"
    ]
  },
  {
    "name": "accordion-item",
    "description": "Expandable section.",
    "props": [
      {
        "name": "value",
        "valueKind": "string",
        "required": true,
        "description": "Stable accordion item value."
      },
      {
        "name": "title",
        "valueKind": "string",
        "required": true,
        "description": "Visible section title."
      }
    ],
    "allowedChildren": [
      "alert",
      "badge",
      "table",
      "list",
      "#text"
    ]
  }
] as const satisfies readonly ComponentSchema[]
