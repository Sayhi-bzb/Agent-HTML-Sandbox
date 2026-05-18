import { describe, expect, it } from "vitest"

import type {
  ComponentSchema,
  ComponentSchemaOverlay,
  DocumentStyleConfigReference,
  GeneratedShadcnIntrospection,
  RenderConfig,
  SanitizedAgentHtml,
} from "./types"

describe("agent-html public types", () => {
  it("models a checked render config with a document style config reference", () => {
    const styleReference = "ops-compact" satisfies DocumentStyleConfigReference
    const meta = {
      documentStyleConfigReference: styleReference,
      styleProfile: {
        id: styleReference,
        globalStyle: {
          tokenSets: {
            light: {
              background: "#f7f7f4",
              foreground: "#26251e",
              card: "#ffffff",
              cardForeground: "#26251e",
              popover: "#ffffff",
              popoverForeground: "#26251e",
              primary: "#f54e00",
              primaryForeground: "#ffffff",
              secondary: "#fafaf7",
              secondaryForeground: "#26251e",
              muted: "#fafaf7",
              mutedForeground: "#807d72",
              accent: "#fafaf7",
              accentForeground: "#26251e",
              destructive: "#cf2d56",
              border: "#e6e5e0",
              input: "#cfcdc4",
              ring: "#f54e00",
            },
            dark: {
              background: "oklch(0.145 0 0)",
              foreground: "oklch(0.985 0 0)",
              card: "oklch(0.205 0 0)",
              cardForeground: "oklch(0.985 0 0)",
              popover: "oklch(0.205 0 0)",
              popoverForeground: "oklch(0.985 0 0)",
              primary: "oklch(0.922 0 0)",
              primaryForeground: "oklch(0.205 0 0)",
              secondary: "oklch(0.269 0 0)",
              secondaryForeground: "oklch(0.985 0 0)",
              muted: "oklch(0.269 0 0)",
              mutedForeground: "oklch(0.708 0 0)",
              accent: "oklch(0.269 0 0)",
              accentForeground: "oklch(0.985 0 0)",
              destructive: "oklch(0.704 0.191 22.216)",
              border: "oklch(1 0 0 / 10%)",
              input: "oklch(1 0 0 / 15%)",
              ring: "oklch(0.556 0 0)",
            },
          },
          radiusScale: {
            base: "0.75rem",
            sm: "calc(var(--radius) * 0.6)",
            md: "calc(var(--radius) * 0.8)",
            lg: "var(--radius)",
            xl: "calc(var(--radius) * 1.4)",
            "2xl": "calc(var(--radius) * 1.8)",
            "3xl": "calc(var(--radius) * 2.2)",
            "4xl": "calc(var(--radius) * 2.6)",
          },
          typography: {
            fontSans:
              '"Inter Variable", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif',
            fontHeading: "var(--font-sans)",
          },
          cssVariableMap: {
            background: "--background",
            foreground: "--foreground",
            card: "--card",
            cardForeground: "--card-foreground",
            popover: "--popover",
            popoverForeground: "--popover-foreground",
            primary: "--primary",
            primaryForeground: "--primary-foreground",
            secondary: "--secondary",
            secondaryForeground: "--secondary-foreground",
            muted: "--muted",
            mutedForeground: "--muted-foreground",
            accent: "--accent",
            accentForeground: "--accent-foreground",
            destructive: "--destructive",
            border: "--border",
            input: "--input",
            ring: "--ring",
            radius: "--radius",
            fontSans: "--font-sans",
            fontHeading: "--font-heading",
          },
          legacyProjection: {
            theme: "neutral",
            density: "compact",
            tone: "report",
            width: "article",
          },
        },
        componentStyle: {
          treatments: {
            alert: "ops-alert",
            badge: "ops-badge",
            card: "ops-card",
            input: "ops-field",
            table: "ops-table",
            tabs: "ops-tabs",
            textarea: "ops-field",
          },
        },
      },
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
    expect(document.meta.documentStyleConfigReference).toBe("ops-compact")
    expect(document.meta.styleProfile.id).toBe("ops-compact")
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
