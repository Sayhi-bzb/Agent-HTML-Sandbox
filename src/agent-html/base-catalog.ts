import { z } from "zod"

import type { CatalogItem, CatalogProp } from "./types"

export const TEXT_CHILD = "#text"

export const FORBIDDEN_AGENT_FACING_PROP_NAMES = [
  "class",
  "className",
  "css",
  "dangerouslySetInnerHTML",
  "onClick",
  "onclick",
  "script",
  "style",
] as const

const CatalogPropSchema = z
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
    "Enum catalog props must declare enumValues.",
  )

const CatalogItemSchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(["base", "custom"]),
    description: z.string().min(1),
    props: z.array(CatalogPropSchema),
    allowedChildren: z.array(z.string().min(1)).optional(),
  })
  .strict()

const BaseCatalogSchema = z
  .array(CatalogItemSchema)
  .refine(
    (items) => items.every((item) => item.kind === "base"),
    "MVP base catalog may only contain base blocks.",
  )
  .refine((items) => {
    const names = new Set(items.map((item) => item.name))
    return names.size === items.length
  }, "Catalog block names must be unique.")
  .refine(
    (items) =>
      items.every((item) =>
        item.props.every(
          (prop) =>
            !FORBIDDEN_AGENT_FACING_PROP_NAMES.includes(
              prop.name as (typeof FORBIDDEN_AGENT_FACING_PROP_NAMES)[number],
            ),
        ),
      ),
    "Catalog props must not expose implementation escape hatches.",
  )
  .refine((items) => {
    const names = new Set(items.map((item) => item.name))

    return items.every(
      (item) =>
        item.allowedChildren?.every(
          (childName) => childName === TEXT_CHILD || names.has(childName),
        ) ?? true,
    )
  }, "Catalog allowedChildren must reference registered blocks or text.")

export const MVP_BASE_CATALOG = [
  {
    name: "page",
    kind: "base",
    description: "Document root block.",
    props: [
      {
        name: "title",
        valueKind: "string",
        required: true,
        description: "Visible page title.",
      },
    ],
    allowedChildren: ["card", "table", "list"],
  },
  {
    name: "card",
    kind: "base",
    description: "Content grouping block.",
    props: [
      {
        name: "title",
        valueKind: "string",
        description: "Card heading.",
      },
    ],
    allowedChildren: ["badge", "table", "list", TEXT_CHILD],
  },
  {
    name: "badge",
    kind: "base",
    description: "Short status label.",
    props: [
      {
        name: "tone",
        valueKind: "enum",
        description: "Badge intent.",
        enumValues: ["neutral", "success", "warning", "danger"],
      },
    ],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "table",
    kind: "base",
    description: "Structured tabular evidence.",
    props: [],
    allowedChildren: ["row"],
  },
  {
    name: "row",
    kind: "base",
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
    kind: "base",
    description: "Table cell content.",
    props: [],
    allowedChildren: [TEXT_CHILD],
  },
  {
    name: "list",
    kind: "base",
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
    kind: "base",
    description: "List item.",
    props: [],
    allowedChildren: [TEXT_CHILD],
  },
] as const satisfies readonly CatalogItem[]

export const BASE_BLOCK_NAMES = MVP_BASE_CATALOG.map((item) => item.name)

type BaseBlockName = (typeof BASE_BLOCK_NAMES)[number]

export const VALIDATED_MVP_BASE_CATALOG = BaseCatalogSchema.parse(
  MVP_BASE_CATALOG,
) satisfies CatalogItem[]

export function isBaseBlockName(name: string): name is BaseBlockName {
  return BASE_BLOCK_NAMES.includes(name as BaseBlockName)
}

export function getBaseCatalogItem(name: string): CatalogItem | undefined {
  return MVP_BASE_CATALOG.find((item) => item.name === name)
}

export function getCatalogProp(
  item: CatalogItem,
  propName: string,
): CatalogProp | undefined {
  return item.props.find((prop) => prop.name === propName)
}

export function getAllowedPropNames(item: CatalogItem): readonly string[] {
  return item.props.map((prop) => prop.name)
}
