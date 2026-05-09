import { z } from "zod"

import type { ComponentPropSchema, ComponentSchema } from "./types"

export const TEXT_CHILD = "#text"

export const BLOCKED_AGENT_FACING_PROP_NAMES = [
  "asChild",
  "class",
  "className",
  "css",
  "dangerouslySetInnerHTML",
  "onClick",
  "onclick",
  "script",
  "style",
] as const

const ComponentPropSchemaValidator = z
  .object({
    name: z.string().min(1),
    valueKind: z.enum(["boolean", "enum", "number", "string", "text"]),
    required: z.boolean().optional(),
    description: z.string().optional(),
    enumValues: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .refine(
    (prop) =>
      prop.valueKind !== "enum" ||
      (Array.isArray(prop.enumValues) && prop.enumValues.length > 0),
    "Enum component props must declare enumValues.",
  )

const ComponentSchemaValidator = z
  .object({
    name: z.string().min(1),
    description: z.string().min(1),
    props: z.array(ComponentPropSchemaValidator),
    allowedChildren: z.array(z.string().min(1)).optional(),
  })
  .strict()

const ComponentSchemaListValidator = z
  .array(ComponentSchemaValidator)
  .refine((items) => {
    const names = new Set(items.map((item) => item.name))
    return names.size === items.length
  }, "ComponentSchema names must be unique.")
  .refine(
    (items) =>
      items.every((item) =>
        item.props.every(
          (prop) =>
            !BLOCKED_AGENT_FACING_PROP_NAMES.includes(
              prop.name as (typeof BLOCKED_AGENT_FACING_PROP_NAMES)[number],
            ),
        ),
      ),
    "ComponentSchema props must not expose implementation escape hatches.",
  )
  .refine((items) => {
    const names = new Set(items.map((item) => item.name))

    return items.every(
      (item) =>
        item.allowedChildren?.every(
          (childName) => childName === TEXT_CHILD || names.has(childName),
        ) ?? true,
    )
  }, "ComponentSchema allowedChildren must reference registered components or text.")

export const STANDARD_COMPONENT_SCHEMAS = [
  {
    name: "page",
    description: "Document root component.",
    props: [
      {
        name: "title",
        valueKind: "string",
        required: true,
        description: "Visible page title.",
      },
    ],
    allowedChildren: [
      "alert",
      "card",
      "separator",
      "table",
      "list",
      "tabs",
      "accordion",
      "choice-group",
      "slider-control",
      "feedback-box",
      "progress-meter",
    ],
  },
  {
    name: "alert",
    description: "Important callout or warning.",
    props: [
      {
        name: "title",
        valueKind: "string",
        description: "Callout heading.",
      },
      {
        name: "tone",
        valueKind: "enum",
        description: "Alert semantic tone.",
        enumValues: ["neutral", "danger"],
      },
    ],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "card",
    description: "Content grouping component.",
    props: [
      {
        name: "title",
        valueKind: "string",
        description: "Card heading.",
      },
    ],
    allowedChildren: [
      "alert",
      "badge",
      "separator",
      "table",
      "list",
      "tabs",
      "accordion",
      "choice-group",
      "slider-control",
      "feedback-box",
      "progress-meter",
      TEXT_CHILD,
    ],
  },
  {
    name: "separator",
    description: "Section divider.",
    props: [],
    allowedChildren: [],
  },
  {
    name: "badge",
    description: "Short status label.",
    props: [
      {
        name: "tone",
        valueKind: "enum",
        description: "Badge semantic tone.",
        enumValues: ["neutral", "success", "warning", "danger"],
      },
    ],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "table",
    description: "Structured tabular evidence.",
    props: [],
    allowedChildren: ["row"],
  },
  {
    name: "row",
    description: "Table row values.",
    props: [
      {
        name: "kind",
        valueKind: "enum",
        description: "Table row role.",
        enumValues: ["header", "body"],
      },
    ],
    allowedChildren: ["cell"],
  },
  {
    name: "cell",
    description: "Table cell content.",
    props: [],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "list",
    description: "Ordered or unordered item list.",
    props: [
      {
        name: "variant",
        valueKind: "enum",
        description: "List marker style.",
        enumValues: ["ordered", "unordered"],
      },
    ],
    allowedChildren: ["item"],
  },
  {
    name: "item",
    description: "List item.",
    props: [],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "tabs",
    description: "Interactive view switcher.",
    props: [
      {
        name: "default",
        valueKind: "string",
        description: "Initially selected tab value.",
      },
    ],
    allowedChildren: ["tab"],
  },
  {
    name: "tab",
    description: "Single tabs view.",
    props: [
      {
        name: "value",
        valueKind: "string",
        required: true,
        description: "Stable tab value.",
      },
      {
        name: "label",
        valueKind: "string",
        required: true,
        description: "Visible tab label.",
      },
    ],
    allowedChildren: [
      "alert",
      "card",
      "separator",
      "table",
      "list",
      "accordion",
      "choice-group",
      "slider-control",
      "feedback-box",
      "progress-meter",
    ],
  },
  {
    name: "accordion",
    description: "Expandable section group.",
    props: [],
    allowedChildren: ["accordion-item"],
  },
  {
    name: "accordion-item",
    description: "Expandable section.",
    props: [
      {
        name: "value",
        valueKind: "string",
        required: true,
        description: "Stable accordion item value.",
      },
      {
        name: "title",
        valueKind: "string",
        required: true,
        description: "Visible section title.",
      },
    ],
    allowedChildren: ["alert", "badge", "table", "list", TEXT_CHILD],
  },
  {
    name: "choice-group",
    description: "Controlled choice selector.",
    props: [
      {
        name: "title",
        valueKind: "string",
        description: "Choice group heading.",
      },
      {
        name: "mode",
        valueKind: "enum",
        description: "Choice selection mode.",
        enumValues: ["single", "multiple"],
      },
      {
        name: "default",
        valueKind: "string",
        description: "Default selected value.",
      },
    ],
    allowedChildren: ["choice"],
  },
  {
    name: "choice",
    description: "Choice option.",
    props: [
      {
        name: "value",
        valueKind: "string",
        required: true,
        description: "Stable choice value.",
      },
      {
        name: "label",
        valueKind: "string",
        required: true,
        description: "Visible choice label.",
      },
    ],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "slider-control",
    description: "Controlled numeric tuning control.",
    props: [
      {
        name: "label",
        valueKind: "string",
        required: true,
        description: "Visible slider label.",
      },
      {
        name: "value",
        valueKind: "number",
        required: true,
        description: "Initial slider value.",
      },
      {
        name: "min",
        valueKind: "number",
        description: "Minimum value.",
      },
      {
        name: "max",
        valueKind: "number",
        description: "Maximum value.",
      },
      {
        name: "step",
        valueKind: "number",
        description: "Step value.",
      },
      {
        name: "unit",
        valueKind: "string",
        description: "Display unit.",
      },
    ],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "feedback-box",
    description: "Editable feedback capture with copy action.",
    props: [
      {
        name: "title",
        valueKind: "string",
        description: "Feedback box heading.",
      },
      {
        name: "placeholder",
        valueKind: "string",
        description: "Textarea placeholder.",
      },
      {
        name: "copy-label",
        valueKind: "string",
        description: "Copy button label.",
      },
    ],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "progress-meter",
    description: "Progress or confidence indicator.",
    props: [
      {
        name: "label",
        valueKind: "string",
        required: true,
        description: "Visible meter label.",
      },
      {
        name: "value",
        valueKind: "number",
        required: true,
        description: "Progress value from 0 to 100.",
      },
      {
        name: "detail",
        valueKind: "string",
        description: "Supporting detail text.",
      },
    ],
    allowedChildren: [],
  },
] as const satisfies readonly ComponentSchema[]

export const STANDARD_COMPONENT_NAMES = STANDARD_COMPONENT_SCHEMAS.map(
  (item) => item.name,
)

type StandardComponentName = (typeof STANDARD_COMPONENT_NAMES)[number]

export const VALIDATED_STANDARD_COMPONENT_SCHEMAS =
  ComponentSchemaListValidator.parse(
    STANDARD_COMPONENT_SCHEMAS,
  ) satisfies ComponentSchema[]

export function isStandardComponentName(
  name: string,
): name is StandardComponentName {
  return STANDARD_COMPONENT_NAMES.includes(name as StandardComponentName)
}

export function getComponentSchema(name: string): ComponentSchema | undefined {
  return STANDARD_COMPONENT_SCHEMAS.find((item) => item.name === name)
}

export function getComponentPropSchema(
  item: ComponentSchema,
  propName: string,
): ComponentPropSchema | undefined {
  return item.props.find((prop) => prop.name === propName)
}

export function getAllowedPropNames(item: ComponentSchema): readonly string[] {
  return item.props.map((prop) => prop.name)
}
