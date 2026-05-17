import { z } from "zod"

import {
  GENERATED_SHADCN_INTROSPECTIONS,
  GENERATED_STANDARD_COMPONENT_SCHEMAS,
} from "./generated/component-schema.generated"
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

export const GENERATED_COMPONENT_SCHEMA_FACTS = GENERATED_SHADCN_INTROSPECTIONS

export const STANDARD_COMPONENT_SCHEMAS = GENERATED_STANDARD_COMPONENT_SCHEMAS

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
