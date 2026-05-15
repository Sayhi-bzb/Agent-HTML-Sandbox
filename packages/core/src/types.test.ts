import { describe, expect, it } from "vitest"

import type {
  ComponentSchema,
  ComponentSchemaOverlay,
  GeneratedShadcnIntrospection,
  RenderConfig,
  SanitizedAgentHtml,
} from "./types"

describe("agent-html public types", () => {
  it("models a profile-first render config and sanitized components", () => {
    const meta = {
      profile: "ops-compact",
      theme: "neutral",
      density: "compact",
      tone: "report",
      width: "article",
    } satisfies RenderConfig

    const pageComponentSchema = {
      name: "page",
      description: "Page root component.",
      props: [
        {
          name: "title",
          valueKind: "string",
          required: true,
        },
      ],
      allowedChildren: ["card", "table", "list"],
    } satisfies ComponentSchema

    const document = {
      meta,
      components: [
        {
          type: "component",
          name: "page",
          props: {
            title: "Payment Review",
          },
          children: [
            {
              type: "text",
              value: "Checked content only.",
            },
          ],
        },
      ],
    } satisfies SanitizedAgentHtml

    expect(pageComponentSchema.name).toBe("page")
    expect(document.meta.profile).toBe("ops-compact")
    expect(document.meta.density).toBe("compact")
    expect(document.components[0]?.name).toBe("page")
  })

  it("models shadcn introspection and explicit schema overlay separately", () => {
    const introspection = {
      registryName: "button",
      componentName: "Button",
      exports: ["Button", "buttonVariants"],
      slots: ["button"],
      variantProps: {
        variant: ["default", "secondary"],
      },
      blockedProps: ["className", "style", "asChild"],
      dependencies: ["class-variance-authority", "radix-ui", "react"],
      registryDependencies: [],
    } satisfies GeneratedShadcnIntrospection

    const overlay = {
      name: "button",
      description: "Semantic button action.",
      expose: true,
      sourceComponents: ["Button"],
      props: [
        {
          name: "intent",
          valueKind: "enum",
          enumValues: ["primary", "secondary"],
        },
      ],
      hiddenProps: ["variant", "className", "style", "asChild"],
    } satisfies ComponentSchemaOverlay

    expect(introspection.variantProps?.variant).toContain("default")
    expect(overlay.hiddenProps).toContain("className")
  })
})
