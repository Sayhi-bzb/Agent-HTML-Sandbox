/// <reference types="node" />
// @vitest-environment node

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  type CliSchemaOutput,
  expectCliFailure,
  expectPathMissing,
  importCommandMetadata,
  importRenderCapabilitiesModule,
  importRuntimeSetupModule,
  importSchemaModule,
  importShadcnApiModule,
  importValidateModule,
  parseJson,
  removeTempDir,
  root,
  useShadcnCliHarness,
  validAgentHtmlFixtures,
} from "./cli-test-helpers"

const { runCliWithServer } = useShadcnCliHarness()

describe("agent-html CLI contracts", () => {
  it("formats a document-style-config prompt without implementation tokens", async () => {
    const { formatPrompt, getCliSchemaOutput } = await importSchemaModule()
    const schema = await getCliSchemaOutput(root)
    const prompt = `${formatPrompt(schema)}\n`

    expect(prompt).toContain("document style config reference")
    expect(prompt).toContain('<meta-agent style-ref="')
    expect(prompt).not.toContain('theme="')
    expect(prompt).not.toContain('density="')
    expect(prompt).not.toContain('tone="')
    expect(prompt).not.toContain('width="')
  })

  it("prints global and command help for the managed runtime workflow", async () => {
    const defaultHelp = await runCliWithServer([])
    const longHelp = await runCliWithServer(["--help"])
    const shortHelp = await runCliWithServer(["-h"])
    const namedHelp = await runCliWithServer(["help"])

    for (const result of [defaultHelp, longHelp, shortHelp, namedHelp]) {
      expect(result.stdout).toContain("Main workflow:")
      expect(result.stdout).toContain("ahtml prompt")
      expect(result.stdout).toContain("ahtml build artifact.agent.html")
      expect(result.stdout).toContain("ahtml preview artifact.agent.html")
      expect(result.stdout).toContain("ahtml gallery")
      expect(result.stdout).not.toContain("agent-html.project.json")
      expect(result.stdout).not.toContain("--scaffold")
    }

    const { commandMetadata } = await importCommandMetadata()
    const commands = Object.keys(commandMetadata)
    for (const command of commands) {
      const { stdout } = await runCliWithServer([command, "--help"])

      expect(stdout).toContain(`ahtml ${command}`)
      expect(stdout).toContain("Usage:")
    }
  }, 30000)

  it("keeps the README quick-start commands aligned with the CLI", async () => {
    const readme = await readFile(path.join(root, "README.md"), "utf8")
    expect(readme).toContain("ahtml prompt")
    expect(readme).toContain("ahtml build artifact.agent.html")
    expect(readme).toContain("ahtml preview artifact.agent.html")
    expect(readme).toContain("ahtml gallery")
  })

  it("prints agent-facing schema without implementation props", async () => {
    const { stdout } = await runCliWithServer(["prompt", "--format", "json"])
    const schema = parseJson<CliSchemaOutput>(stdout)
    const serializedComponents = JSON.stringify(schema.components)

    expect(schema.kind).toBe("agent-html-cli-schema")
    expect(schema.components.some((item) => item.name === "page")).toBe(true)
    const tabsCapability = schema.verificationData.components.find(
      (component) => component.name === "tabs",
    )
    expect(tabsCapability).toBeDefined()
    expect(tabsCapability?.renderKind).toBe("tabs")
    expect(tabsCapability?.source).toBe("shadcn")
    const tabsContentSlot = tabsCapability?.slots.find(
      (slot) => slot.name === "tabs-content",
    )
    expect(tabsContentSlot?.children).toEqual(
      expect.arrayContaining(["card", "accordion"]),
    )

    const tabsRendererSpec = schema.rendererMapping.components.find(
      (component) => component.name === "tabs",
    )
    expect(tabsRendererSpec).toBeDefined()
    expect(tabsRendererSpec?.kind).toBe("tabs")
    expect(tabsRendererSpec?.renderKind).toBe("tabs")
    const tabRendererSlot = tabsRendererSpec?.slots.find(
      (slot) => slot.name === "tab",
    )
    expect(tabRendererSlot?.children).toEqual(
      expect.arrayContaining(["card", "accordion"]),
    )
    expect(schema.renderConfig.defaults).toEqual({
      "style-ref": "report-default",
    })
    expect(schema.renderConfig.model).toBe("document-style-config-reference")
    expect(schema.renderConfig.keys).toEqual(["style-ref"])
    expect(schema.renderConfig.keys).not.toContain("theme")
    expect(schema.renderConfig.keys).not.toContain("density")
    expect(schema.renderConfig.keys).not.toContain("tone")
    expect(schema.renderConfig.keys).not.toContain("width")
    expect(Object.keys(schema.renderConfig.values)).toEqual(["style-ref"])
    expect(Object.keys(schema.renderConfig.values)).not.toContain("theme")
    expect(Object.keys(schema.renderConfig.values)).not.toContain("density")
    expect(Object.keys(schema.renderConfig.values)).not.toContain("tone")
    expect(Object.keys(schema.renderConfig.values)).not.toContain("width")
    expect(schema.renderConfig.values["style-ref"]).toEqual(
      expect.arrayContaining(["report-default", "ops-compact"]),
    )
    expect(serializedComponents).not.toContain('"className"')
    expect(serializedComponents).not.toContain('"style"')
    expect(schema.safetyPolicy.blockedNames).toContain("className")
    expect(schema.forbidden).toBe(schema.safetyPolicy.forbidden)
  })

  it("rejects the removed init command without creating project files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".custom-ahtml")

    await expectCliFailure(
      runCliWithServer(["init"], { AHTML_HOME: runtimeHome }, tempDir),
      'Unknown command "init"',
    )
    await expectCliFailure(
      runCliWithServer(
        ["init", "--dry-run"],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      'Unknown command "init"',
    )
    await expectPathMissing(path.join(tempDir, "agent-html.project.json"))
    await expectPathMissing(path.join(tempDir, "src"))
    await removeTempDir(tempDir)
  })

  it("prints first-run guidance without bootstrapping in non-interactive help", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    const help = await runCliWithServer(
      [],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(help.stdout).toContain("Main workflow:")
    expect(help.stdout).toContain("Run ahtml setup to prepare the runtime.")
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await expectPathMissing(path.join(tempDir, "src"))
    await removeTempDir(tempDir)
  })

  it("uses shadcn API for runtime setup catalogs and keeps required runtime components renderable", async () => {
    const { resolveManagedRuntimeComponentSet, resolveRuntimeSetup } =
      await importRuntimeSetupModule()
    const { requiredShadcnRuntimeComponents } =
      await importRenderCapabilitiesModule()
    const {
      getShadcnComponentCatalog,
      listShadcnPresets,
      validateShadcnPreset,
    } = await importShadcnApiModule()

    const setup = await resolveRuntimeSetup({
      interactive: false,
      options: {
        "component-source": "shadcn-cli",
        preset: "custom",
        components: "accordion",
      },
    })
    expect([...setup.components].sort()).toEqual(
      [...requiredShadcnRuntimeComponents].sort(),
    )

    const catalog = await getShadcnComponentCatalog()
    expect(catalog.source).toBe("shadcn-api")
    expect(catalog.components).toContain("button")
    expect(catalog.components).toEqual(
      expect.arrayContaining([...requiredShadcnRuntimeComponents]),
    )
    expect(
      resolveManagedRuntimeComponentSet({
        componentCatalog: catalog.components,
        componentSet: "recommended",
      }),
    ).toEqual(requiredShadcnRuntimeComponents)
    expect(
      resolveManagedRuntimeComponentSet({
        componentCatalog: catalog.components,
        componentSet: "all",
      }),
    ).toEqual(catalog.components)

    const presets = listShadcnPresets()
    expect(presets).toContain("nova")
    expect(validateShadcnPreset("nova")).toBe(true)
    await expect(
      resolveRuntimeSetup({
        interactive: false,
        options: { preset: "not-a-shadcn-preset" },
      }),
    ).rejects.toThrow("Unsupported shadcn preset")
  }, 30000)

  it("renders minimal setup guidance", async () => {
    const { formatSetupControls, formatSetupHeader } =
      await importRuntimeSetupModule()

    expect(formatSetupHeader()).toContain("ahtml setup")
    expect(formatSetupControls()).toContain("Up/Down")
  })

  it("rejects invalid input and flags clearly", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    await expectCliFailure(
      runCliWithServer(["build", inputPath, "--out", outputDir], {}, tempDir),
      "unknown-attr",
    )
    await expectCliFailure(
      runCliWithServer(["build", inputPath, "--format", "yaml"], {}, tempDir),
      'build --format must be "text" or "json".',
    )
    await expectCliFailure(
      runCliWithServer(["preview", inputPath], {}, tempDir),
      "unknown-attr",
    )
    await expectCliFailure(
      runCliWithServer(["gallery", "extra"], {}, tempDir),
      'Unexpected argument "extra".',
    )
    await expectCliFailure(
      runCliWithServer(
        ["gallery", "--port", "bad"],
        {},
        tempDir,
      ),
      "gallery --port must be an integer from 0 to 65535.",
    )
    await expectPathMissing(path.join(outputDir, "index.html"))
    await expectCliFailure(
      runCliWithServer(["prompt", "--format"]),
      "--format requires",
    )
    await expectCliFailure(
      runCliWithServer(["init", "--scaffold"], {}, tempDir),
      'Unknown command "init"',
    )
    await expectCliFailure(
      runCliWithServer(["compose", "--input", "composition.json"], {}, tempDir),
      'Unknown command "compose"',
    )
    await expectCliFailure(
      runCliWithServer(["schema"], {}, tempDir),
      'Unknown command "schema"',
    )
    await expectCliFailure(
      runCliWithServer(
        ["validate", "--input", inputPath, "--format", "yaml"],
        {},
        tempDir,
      ),
      'validate --format must be "text" or "json".',
    )
    await expectCliFailure(
      runCliWithServer(["validate"], {}, tempDir),
      "validate requires --input <path>.",
    )
    await removeTempDir(tempDir)
  })

  it("returns structured validation results without bootstrapping the runtime", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const validInputPath = path.join(tempDir, "valid.agent.html")
    const invalidInputPath = path.join(tempDir, "invalid.agent.html")

    await writeFile(
      validInputPath,
      '<page title="Valid"><card title="Summary">Ready.</card></page>',
    )
    await writeFile(
      invalidInputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    const validResult = await runCliWithServer(
      ["validate", "--input", validInputPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const parsedValidResult = parseJson<{
      kind: string
      ok: boolean
      inspection?: { components: Array<{ name: string; count: number }> }
    }>(validResult.stdout)
    expect(parsedValidResult.kind).toBe("agent-html-validation-result")
    expect(parsedValidResult.ok).toBe(true)
    expect(parsedValidResult.inspection?.components).toEqual([
      { name: "card", count: 1 },
      { name: "page", count: 1 },
    ])
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))

    const invalidResult = await runCliWithServer(
      ["validate", "--input", invalidInputPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    ).catch((error) => error)
    const invalidStdout: string =
      invalidResult &&
      typeof invalidResult === "object" &&
      "stdout" in invalidResult &&
      typeof invalidResult.stdout === "string"
        ? invalidResult.stdout
        : ""
    const parsedInvalidResult = parseJson<{
      kind: string
      ok: boolean
      diagnostics?: Array<{ code: string; severity: string }>
    }>(invalidStdout)
    expect(parsedInvalidResult.kind).toBe("agent-html-validation-result")
    expect(parsedInvalidResult.ok).toBe(false)
    expect(parsedInvalidResult.diagnostics).toEqual([
      expect.objectContaining({
        code: "unknown-attr",
        severity: "error",
      }),
    ])
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await removeTempDir(tempDir)
  })

  it("fails inspect with validation diagnostics before runtime inspection", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const invalidInputPath = path.join(tempDir, "invalid.agent.html")

    await writeFile(
      invalidInputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    await expectCliFailure(
      runCliWithServer(
        ["inspect", "--input", invalidInputPath],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "Cannot inspect an invalid agent-html document.",
    )
    await expectCliFailure(
      runCliWithServer(
        ["inspect", "--input", invalidInputPath],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "unknown-attr",
    )
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await removeTempDir(tempDir)
  })

  it("rejects the removed gallery --style-ref argument", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    await expectCliFailure(
      runCliWithServer(
        ["gallery", "--style-ref", "team-missing"],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "does not accept --style-ref",
    )
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await removeTempDir(tempDir)
  })

  it("validates and inspects user style profiles from runtime storage without bootstrapping the runtime", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "team-ops.agent.html")

    await writeCustomStyleProfile(runtimeHome)
    await writeFile(
      inputPath,
      [
        '<meta-agent style-ref="team-ops" />',
        '<page title="Team Ops"><card title="Summary">Ready.</card></page>',
      ].join("\n"),
    )

    const validation = await runCliWithServer(
      ["validate", "--input", inputPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const parsedValidation = parseJson<{
      kind: string
      ok: boolean
      inspection?: {
        config: { documentStyleConfigReference: string }
      }
    }>(validation.stdout)
    expect(parsedValidation.kind).toBe("agent-html-validation-result")
    expect(parsedValidation.ok).toBe(true)
    expect(parsedValidation.inspection?.config.documentStyleConfigReference).toBe(
      "team-ops",
    )
    expect(validation.stdout).not.toContain("resolvedDocumentStyleTokens")

    const inspection = await runCliWithServer(
      ["inspect", "--input", inputPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(inspection.stdout).toContain(
      '"documentStyleConfigReference": "team-ops"',
    )
    expect(inspection.stdout).not.toContain('"resolvedDocumentStyleTokens"')
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await removeTempDir(tempDir)
  })

  it("falls back to the default profile for unresolved runtime style references in validate", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "fallback.agent.html")

    await writeFile(
      inputPath,
      [
        '<meta-agent style-ref="team-missing" />',
        '<page title="Fallback"><card title="Summary">Default profile.</card></page>',
      ].join("\n"),
    )

    const validation = await runCliWithServer(
      ["validate", "--input", inputPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const parsedValidation = parseJson<{
      ok: boolean
      inspection?: {
        config: { documentStyleConfigReference: string }
      }
    }>(validation.stdout)

    expect(parsedValidation.ok).toBe(true)
    expect(parsedValidation.inspection?.config.documentStyleConfigReference).toBe(
      "report-default",
    )
    expect(validation.stdout).not.toContain("resolvedDocumentStyleTokens")
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await removeTempDir(tempDir)
  })

  it("accepts representative agent-html fixtures", async () => {
    const { validateAgentHtmlSource } = await importValidateModule()

    for (const source of validAgentHtmlFixtures) {
      const validation = await validateAgentHtmlSource(source, root)

      expect(
        validation.diagnostics.map((diagnostic) => diagnostic.message),
        source,
      ).toEqual([])
    }
  })
})

async function writeCustomStyleProfile(runtimeHome: string) {
  const profileDir = path.join(
    runtimeHome,
    "config",
    "style-profiles",
    "user",
  )
  const profilePath = path.join(profileDir, "team-ops.json")

  await mkdir(profileDir, { recursive: true })
  await writeFile(
    profilePath,
    `${JSON.stringify(createCustomStyleProfile(), null, 2)}\n`,
  )
}

function createCustomStyleProfile() {
  return {
    id: "team-ops",
    globalStyle: {
      tokenSets: {
        light: {
          background: "#fcfbf8",
          foreground: "#1f2933",
          card: "#ffffff",
          cardForeground: "#1f2933",
          popover: "#ffffff",
          popoverForeground: "#1f2933",
          primary: "#0f766e",
          primaryForeground: "#f8fafc",
          secondary: "#f2f7f6",
          secondaryForeground: "#1f2933",
          muted: "#eef4f3",
          mutedForeground: "#52606d",
          accent: "#dff5f2",
          accentForeground: "#134e4a",
          destructive: "#be123c",
          border: "#d9e2ec",
          input: "#bcccdc",
          ring: "#0f766e",
        },
        dark: {
          background: "oklch(0.18 0.02 190)",
          foreground: "oklch(0.96 0.01 190)",
          card: "oklch(0.24 0.02 190)",
          cardForeground: "oklch(0.96 0.01 190)",
          popover: "oklch(0.24 0.02 190)",
          popoverForeground: "oklch(0.96 0.01 190)",
          primary: "oklch(0.74 0.11 190)",
          primaryForeground: "oklch(0.2 0.02 190)",
          secondary: "oklch(0.3 0.02 190)",
          secondaryForeground: "oklch(0.96 0.01 190)",
          muted: "oklch(0.28 0.02 190)",
          mutedForeground: "oklch(0.78 0.01 190)",
          accent: "oklch(0.32 0.03 190)",
          accentForeground: "oklch(0.96 0.01 190)",
          destructive: "oklch(0.62 0.2 20)",
          border: "oklch(1 0 0 / 12%)",
          input: "oklch(1 0 0 / 18%)",
          ring: "oklch(0.74 0.11 190)",
        },
      },
      radiusScale: {
        base: "0.9rem",
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
    },
    componentStyle: {
      treatments: {
        alert: "ops-alert",
        badge: "ops-badge",
        card: "review-card",
        input: "ops-field",
        table: "ops-table",
        tabs: "ops-tabs",
        textarea: "ops-field",
      },
    },
  }
}
