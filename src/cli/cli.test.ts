/// <reference types="node" />
// @vitest-environment node

import { execFile, spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const cliPath = path.join(root, "bin", "ahtml.mjs")
const validAgentHtmlFixtures = [
  '<page title="Fixture"><card title="Summary">Valid text.</card></page>',
  [
    '<meta-agent theme="neutral" density="compact" tone="dashboard" width="dashboard" />',
    '<page title="Dashboard"><card title="Queue">Ready.</card></page>',
  ].join("\n"),
]

type CliSchemaOutput = {
  readonly kind: string
  readonly components: readonly { readonly name: string }[]
  readonly uiCapabilities: {
    readonly components: readonly {
      readonly name: string
      readonly renderKind: string
      readonly source: string
      readonly slots: readonly {
        readonly name: string
        readonly children: readonly string[]
      }[]
    }[]
  }
  readonly rendererSpec: {
    readonly components: readonly {
      readonly name: string
      readonly kind: string
      readonly renderKind: string
      readonly slots: readonly {
        readonly name: string
        readonly children: readonly string[]
      }[]
    }[]
  }
  readonly forbidden: string
  readonly safetyPolicy: {
    readonly blockedNames: readonly string[]
    readonly forbidden: string
  }
  readonly renderConfig: {
    readonly keys: readonly string[]
    readonly values: Readonly<Record<string, readonly string[]>>
  }
}

type SchemaModule = {
  readonly formatPrompt: (schema: CliSchemaOutput) => string
  readonly getCliSchemaOutput: (root?: string) => Promise<CliSchemaOutput>
}

type ValidateModule = {
  readonly validateAgentHtmlSource: (
    source: string,
    root?: string,
  ) => Promise<{
    readonly diagnostics: readonly { readonly message: string }[]
  }>
}

type CommandMetadataModule = {
  readonly commandMetadata: Readonly<Record<string, unknown>>
  readonly formatCliCommandUsageBlock: () => string
}

type RenderCapabilitiesModule = {
  readonly requiredShadcnRuntimeComponents: readonly string[]
}

type RuntimeSetupModule = {
  readonly resolveRuntimeSetup: (options?: {
    readonly options?: Record<string, string | boolean>
    readonly interactive?: boolean
  }) => Promise<{
    readonly componentSource: string
    readonly preset: string
    readonly components: readonly string[]
  }>
  readonly formatSetupControls: () => string
  readonly formatSetupHeader: () => string
}

type ShadcnApiModule = {
  readonly getShadcnComponentCatalog: () => Promise<{
    readonly components: readonly string[]
    readonly source: string
  }>
  readonly listShadcnPresets: () => readonly string[]
  readonly validateShadcnPreset: (value: string) => boolean
}

type ShadcnTestServerModule = {
  readonly startShadcnTestServer: () => Promise<ShadcnTestServer>
}

type ShadcnTestServer = {
  readonly registryUrl: string
  readonly close: () => Promise<void>
}

let shadcnTestServer: ShadcnTestServer | undefined

beforeAll(async () => {
  const { startShadcnTestServer } = (await import(
    pathToFileURL(path.join(root, "scripts", "shadcn-test-server.mjs")).href
  )) as ShadcnTestServerModule

  shadcnTestServer = await startShadcnTestServer()
})

afterAll(async () => {
  await shadcnTestServer?.close()
})

describe("agent-html CLI", () => {
  it("keeps the checked-in schema prompt in sync with the CLI schema formatter", async () => {
    const schemaModuleUrl = pathToFileURL(
      path.join(root, "src", "cli", "schema.mjs"),
    ).href
    const { formatPrompt, getCliSchemaOutput } = (await import(
      schemaModuleUrl
    )) as SchemaModule
    const schema = await getCliSchemaOutput(root)
    const prompt = await readFile(
      path.join(root, "src", "engine", "component-schema-prompt.txt"),
      "utf8",
    )

    expect(normalizeNewlines(prompt)).toBe(`${formatPrompt(schema)}\n`)
  })

  it("prints global and command help for the managed runtime workflow", async () => {
    const defaultHelp = await runCli([])
    const longHelp = await runCli(["--help"])
    const shortHelp = await runCli(["-h"])
    const namedHelp = await runCli(["help"])

    for (const result of [defaultHelp, longHelp, shortHelp, namedHelp]) {
      expect(result.stdout).toContain("Closed-loop workflow:")
      expect(result.stdout).toContain("ahtml setup --yes")
      expect(result.stdout).toContain("ahtml status")
      expect(result.stdout).toContain("ahtml build --input")
      expect(result.stdout).not.toContain("agent-html.project.json")
      expect(result.stdout).not.toContain("--scaffold")
    }

    const { commandMetadata } = await importCommandMetadata()
    const commands = Object.keys(commandMetadata)
    for (const command of commands) {
      const { stdout } = await runCli([command, "--help"])

      expect(stdout).toContain(`ahtml ${command}`)
      expect(stdout).toContain("Usage:")
    }
  }, 30000)

  it("keeps the README CLI command block in sync with command metadata", async () => {
    const { formatCliCommandUsageBlock } = await importCommandMetadata()
    const readme = await readFile(path.join(root, "README.md"), "utf8")
    const commandBlock = readme.match(
      /## CLI Commands\s+```bash\n(?<commands>[\s\S]*?)\n```/,
    )?.groups?.commands

    expect(commandBlock).toBe(formatCliCommandUsageBlock())
  })

  it("prints agent-facing schema without implementation props", async () => {
    const { stdout } = await runCli(["schema", "--format", "json"])
    const schema = parseJson<CliSchemaOutput>(stdout)
    const serializedComponents = JSON.stringify(schema.components)

    expect(schema.kind).toBe("agent-html-cli-schema")
    expect(schema.components.some((item) => item.name === "page")).toBe(true)
    const tabsCapability = schema.uiCapabilities.components.find(
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

    const tabsRendererSpec = schema.rendererSpec.components.find(
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
    expect(serializedComponents).not.toContain('"className"')
    expect(serializedComponents).not.toContain('"style"')
    expect(schema.safetyPolicy.blockedNames).toContain("className")
    expect(schema.forbidden).toBe(schema.safetyPolicy.forbidden)
  })

  it("prints generic ui slot syntax before semantic compatibility tags", async () => {
    const { stdout } = await runCli(["schema", "--format", "prompt"])

    expect(stdout).toContain("Preferred generic ui/slot syntax:")
    expect(stdout).toContain('<ui name="tabs" default-value="id">')
    expect(stdout).toContain('<slot name="tabs-content" value="id">')
    expect(stdout.indexOf("Preferred generic ui/slot syntax:")).toBeLessThan(
      stdout.indexOf("Semantic compatibility tags:"),
    )
  })

  it("rejects the removed init command without creating project files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".custom-ahtml")

    await expectCliFailure(
      runCli(["init"], { AHTML_HOME: runtimeHome }, tempDir),
      'Unknown command "init"',
    )
    await expectCliFailure(
      runCli(["init", "--dry-run"], { AHTML_HOME: runtimeHome }, tempDir),
      'Unknown command "init"',
    )
    await expectPathMissing(path.join(tempDir, "agent-html.project.json"))
    await expectPathMissing(path.join(tempDir, "src"))
    await rm(tempDir, { force: true, recursive: true })
  })

  it("bootstraps managed runtime from status without creating project scaffold files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const { requiredShadcnRuntimeComponents } =
      await importRenderCapabilitiesModule()

    const missingStatus = await runCli(
      ["status"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(missingStatus.stdout).toContain("ready: yes")
    expect(missingStatus.stdout).toContain("runtime manifest: ok")
    expect(missingStatus.stdout).toContain("ui library: shadcn")
    expect(missingStatus.stdout).toContain("component source: shadcn-cli")
    expect(missingStatus.stdout).toContain("runtime base: radix")
    expect(missingStatus.stdout).toContain("runtime surface: shadcn-init")
    expect(missingStatus.stdout).toContain("runtime preset: nova")
    expect(missingStatus.stdout).toContain(
      `installed ui components: ${requiredShadcnRuntimeComponents.join(", ")}`,
    )
    expect(missingStatus.stdout).toContain("renderable agent components:")
    expect(missingStatus.stdout).toContain("prompt-ui manifest: ok")
    expect(missingStatus.stdout).toContain("render capabilities: ok")
    expect(missingStatus.stdout).toContain(
      "Next: ahtml build --input artifact.agent.html --out dist/html",
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      "ahtml-managed-runtime",
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      "ahtml-prompt-ui-manifest",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "render-capabilities.generated.json"),
      "ahtml-runtime-render-capabilities",
    )
    await expectPathMissing(path.join(tempDir, "src"))
    await expectPathMissing(path.join(tempDir, "dist"))
    await expectPathMissing(path.join(tempDir, "dist", "html"))
    await rm(tempDir, { force: true, recursive: true })
  })

  it("prints first-run guidance without bootstrapping in non-interactive help", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    const help = await runCli([], { AHTML_HOME: runtimeHome }, tempDir)

    expect(help.stdout).toContain("Closed-loop workflow:")
    expect(help.stdout).toContain("Run ahtml setup for guided runtime setup.")
    await expectPathMissing(path.join(runtimeHome, "config", "runtime.json"))
    await expectPathMissing(path.join(tempDir, "src"))
    await rm(tempDir, { force: true, recursive: true })
  })

  it("sets up the managed shadcn runtime explicitly", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const { requiredShadcnRuntimeComponents } =
      await importRenderCapabilitiesModule()

    const setup = await runCli(
      [
        "setup",
        "--yes",
        "--component-source",
        "shadcn-cli",
        "--preset",
        "custom",
        "--components",
        "1",
      ],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(setup.stdout).toContain("ahtml runtime ready")
    expect(setup.stdout).toContain("ui library: shadcn")
    expect(setup.stdout).toContain("component source: shadcn-cli")
    expect(setup.stdout).toContain("runtime base: radix")
    expect(setup.stdout).toContain("runtime surface: shadcn-init")
    expect(setup.stdout).toContain("preset: custom")
    expect(setup.stdout).toContain(
      `components: ${requiredShadcnRuntimeComponents.join(", ")}`,
    )
    expect(setup.stdout).toContain("renderable agent components:")
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"preset": "custom"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"runtimeBase": "radix"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"installedUiComponents"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"renderableAgentComponents"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      '"uiLibrary": "shadcn"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      '"componentSource": "shadcn-cli"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      '"name": "table"',
    )

    const secondSetup = await runCli(
      ["setup", "--yes"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(secondSetup.stdout).toContain("ahtml runtime already ready")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("uses shadcn API for runtime setup catalogs and keeps required runtime components renderable", async () => {
    const { resolveRuntimeSetup } = await importRuntimeSetupModule()
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
    expect(setup.components).toEqual(requiredShadcnRuntimeComponents)

    const catalog = await getShadcnComponentCatalog()
    expect(catalog.source).toBe("shadcn-api")
    expect(catalog.components).toContain("card")
    expect(catalog.components).toContain("button")

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

  it("builds from an empty consumer directory and writes runtime state outside the project", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const consumerDir = path.join(tempDir, "consumer")
    const inputPath = path.join(consumerDir, "artifact.agent.html")
    const outputDir = path.join(consumerDir, "dist", "html")

    await mkdir(consumerDir, { recursive: true })
    await writeFile(
      inputPath,
      [
        '<meta-agent theme="neutral" density="compact" tone="dashboard" width="dashboard" />',
        [
          '<page title="Managed Runtime">',
          '<card title="Overview">',
          "Built by managed runtime.",
          '<alert title="State" tone="danger">Needs attention.</alert>',
          '<badge tone="success">Ready</badge>',
          "<separator />",
          '<table><row kind="header"><cell>Name</cell><cell>Status</cell></row><row><cell>Runtime</cell><cell>Ready</cell></row></table>',
          '<list variant="unordered"><item>Portable output</item><item>Readable content</item></list>',
          '<tabs default="summary"><tab value="summary" label="Summary"><card title="Tab card">Tab content.</card></tab></tabs>',
          '<accordion><accordion-item value="details" title="Details">Accordion content.</accordion-item></accordion>',
          "</card>",
          "</page>",
        ].join(""),
      ].join("\n"),
    )

    await runCli(
      ["build", "--input", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      consumerDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Managed Runtime")
    await expectFile(path.join(outputDir, "index.html"), "Overview")
    await expectFile(
      path.join(outputDir, "index.html"),
      "Built by managed runtime.",
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="tabs"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="table"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="accordion"',
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="alert"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="badge"')
    await expectFileMissingText(
      path.join(outputDir, "index.html"),
      'class="ahtml-section" data-agent-html-component="tab"',
    )
    await expectFileMissingText(
      path.join(outputDir, "index.html"),
      'class="ahtml-section" data-agent-html-component="accordion-item"',
    )
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), "ahtml-card")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".flex")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".gap-6")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".rounded-lg")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".border")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".shadow-sm")
    await expectFile(
      path.join(outputDir, "agent-html.inspect.json"),
      "agent-html-inspection",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "document.generated.json"),
      "Managed Runtime",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "render-capabilities.generated.json"),
      '"uiCapabilities"',
    )
    await assertNoProjectScaffold(consumerDir)
    await rm(tempDir, { force: true, recursive: true })
  })

  it("builds generic ui slot syntax into real shadcn/native artifact structure", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      [
        '<meta-agent theme="neutral" density="compact" tone="report" width="article" />',
        [
          '<ui name="page" title="Generic Artifact">',
          '<ui name="tabs" default-value="summary">',
          '<slot name="tabs-list">',
          '<slot name="tabs-trigger" value="summary">Summary</slot>',
          '<slot name="tabs-trigger" value="details">Details</slot>',
          "</slot>",
          '<slot name="tabs-content" value="summary">',
          '<ui name="card" title="Overview">Built from ui slot syntax.</ui>',
          "</slot>",
          '<slot name="tabs-content" value="details">',
          '<ui name="accordion">',
          '<slot name="accordion-item" value="runtime" title="Runtime">',
          '<ui name="table">',
          '<slot name="row" kind="header"><slot name="cell">Layer</slot><slot name="cell">Status</slot></slot>',
          '<slot name="row"><slot name="cell">Renderer</slot><slot name="cell">Ready</slot></slot>',
          "</ui>",
          "</slot>",
          "</ui>",
          "</slot>",
          "</ui>",
          "</ui>",
        ].join(""),
      ].join("\n"),
    )

    await runCli(
      ["build", "--input", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Generic Artifact")
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="tabs"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="tabs-trigger"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="accordion"',
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="table"')
    await expectFile(
      path.join(outputDir, "index.html"),
      "Built from ui slot syntax.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("fails build when runtime renderer spec drifts from capabilities", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")
    const capabilitiesPath = path.join(
      runtimeHome,
      "runtime",
      "render-capabilities.generated.json",
    )

    await runCli(["status"], { AHTML_HOME: runtimeHome }, tempDir)
    await writeFile(
      inputPath,
      '<page title="Drift"><card title="Summary">Slot drift.</card></page>',
    )

    const capabilities = parseJson<{
      rendererSpec: {
        components: {
          name: string
          kind: string
        }[]
      }
    }>(await readFile(capabilitiesPath, "utf8"))
    const card = capabilities.rendererSpec.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card renderer spec in runtime capabilities.")
    }

    card.kind = "primitive"
    await writeFile(
      capabilitiesPath,
      `${JSON.stringify(capabilities, null, 2)}\n`,
    )

    await expectCliFailure(
      runCli(
        ["build", "--input", inputPath, "--out", outputDir],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "Kind mismatch: card kind: primitive expected compound",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("validates, reads config defaults, and inspects artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const documentPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      documentPath,
      [
        '<meta-agent theme="neutral" density="compact" tone="dashboard" width="dashboard" />',
        '<page title="CLI Artifact"><card title="Overview">Written as agent-html.</card></page>',
      ].join("\n"),
    )

    const validation = await runCli(
      ["validate", "--input", documentPath],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(validation.stdout).toContain("agent-html valid")

    await runCli(
      ["build", "--input", documentPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    const documentInspection = await runCli(
      ["inspect", "--input", documentPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(documentInspection.stdout).toContain('"density": "compact"')
    expect(documentInspection.stdout).toContain('"name": "card"')

    const artifactInspection = await runCli(
      ["inspect", "--dir", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(artifactInspection.stdout).toContain("density: compact")
    expect(artifactInspection.stdout).toContain("- card: 1")

    const config = await runCli(
      ["config", "get"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(config.stdout).toContain('"comfortable"')
    await expectCliFailure(
      runCli(
        ["config", "set", "density", "compact"],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "config accepts only get",
    )
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

  it("runs managed runtime doctor checks", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    const { stdout } = await runCli(
      ["doctor"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(stdout).toContain("ok environment:node")
    expect(stdout).toContain("ok runtime:root")
    expect(stdout).toContain("ok runtime:manifest shadcn-runtime")
    expect(stdout).toContain("ok runtime:base radix")
    expect(stdout).toContain("ok runtime:schema-renderer-parity")
    expect(stdout).toContain("ok runtime:renderer-adapter")
    expect(stdout).toContain("ok runtime:components-json")
    expect(stdout).toContain("ok runtime:shadcn-css-entry")
    expect(stdout).toContain("ok runtime:shadcn-css-base")
    expect(stdout).toContain("ok runtime:shadcn-surface")
    expect(stdout).toContain("ok runtime:shadcn-components")
    expect(stdout).toContain("ok runtime:prompt-ui-manifest")
    expect(stdout).toContain("ok runtime:render-capabilities")
    expect(stdout).toContain("ok runtime:render-capability-parity")
    expect(stdout).toContain("ok runtime:renderer-spec-parity")
    expect(stdout).toContain("ok runtime:vite-config")
    expect(stdout).toContain("ok artifact:output-dir")
    expect(stdout).not.toContain("project-config")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("fails doctor when runtime capabilities drift from schema", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const capabilitiesPath = path.join(
      runtimeHome,
      "runtime",
      "render-capabilities.generated.json",
    )

    await runCli(["status"], { AHTML_HOME: runtimeHome }, tempDir)

    const capabilities = parseJson<{
      uiCapabilities: {
        components: {
          name: string
          slots: { name: string; children: string[] }[]
        }[]
      }
    }>(await readFile(capabilitiesPath, "utf8"))
    const card = capabilities.uiCapabilities.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card capability in runtime capabilities.")
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      capabilitiesPath,
      `${JSON.stringify(capabilities, null, 2)}\n`,
    )

    await expectCliFailure(
      runCli(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:render-capability-parity runtime render capabilities card slots does not match schema uiCapabilities card slots.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("fails doctor when runtime renderer spec drifts from schema", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const capabilitiesPath = path.join(
      runtimeHome,
      "runtime",
      "render-capabilities.generated.json",
    )

    await runCli(["status"], { AHTML_HOME: runtimeHome }, tempDir)

    const capabilities = parseJson<{
      rendererSpec: {
        components: {
          name: string
          slots: { name: string; children: string[] }[]
        }[]
      }
    }>(await readFile(capabilitiesPath, "utf8"))
    const card = capabilities.rendererSpec.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card renderer spec in runtime capabilities.")
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      capabilitiesPath,
      `${JSON.stringify(capabilities, null, 2)}\n`,
    )

    await expectCliFailure(
      runCli(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:renderer-spec-parity runtime renderer spec card slots does not match schema rendererSpec card slots.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("shows cached global update guidance in status and doctor", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0")

    try {
      await runCli(["status"], { AHTML_HOME: runtimeHome }, tempDir)

      const status = await runCli(
        ["status"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "0",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(status.stdout).toContain(
        "update: 99.0.0 available. Run: npm install -g @agent-html/ahtml@latest",
      )
      expect(registry.requests()).toBe(1)

      const doctor = await runCli(
        ["doctor"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "0",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(doctor.stdout).toContain(
        "warn package:update latest is 99.0.0. Run: npm install -g @agent-html/ahtml@latest",
      )
      expect(registry.requests()).toBe(1)
    } finally {
      await registry.close()
      await rm(tempDir, { force: true, recursive: true })
    }
  })

  it("skips or soft-fails package update checks without breaking diagnostics", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0", 500)

    try {
      await runCli(["status"], { AHTML_HOME: runtimeHome }, tempDir)

      const disabled = await runCli(
        ["doctor"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "1",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(disabled.stdout).toContain("skip package:update disabled")

      const unavailable = await runCli(
        ["doctor"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "0",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(unavailable.stdout).toContain("skip package:update unavailable")
    } finally {
      await registry.close()
      await rm(tempDir, { force: true, recursive: true })
    }
  })

  it("serves a preview from the generated static output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="CLI Preview"><card>Preview by CLI</card></page>',
    )

    const preview = spawn(
      process.execPath,
      [
        cliPath,
        "preview",
        "--input",
        inputPath,
        "--out",
        outputDir,
        "--port",
        "0",
      ],
      {
        cwd: tempDir,
        env: {
          ...process.env,
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "1",
          ...(shadcnTestServer
            ? { REGISTRY_URL: shadcnTestServer.registryUrl }
            : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    )

    try {
      const url = await waitForPreviewUrl(preview)
      const response = await fetch(url)
      const body = await response.text()

      expect(body).toContain("Preview by CLI")
    } finally {
      preview.kill("SIGTERM")
      await waitForProcessExit(preview)
      await rm(tempDir, { force: true, recursive: true })
    }
  }, 60000)

  it("rejects invalid input and flags clearly", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    await expectCliFailure(
      runCli(["build", "--input", inputPath, "--out", outputDir], {}, tempDir),
      "unknown-attr",
    )
    await expectPathMissing(path.join(outputDir, "index.html"))
    await expectCliFailure(runCli(["schema", "--format"]), "--format requires")
    await expectCliFailure(
      runCli(["init", "--scaffold"], {}, tempDir),
      'Unknown command "init"',
    )
    await expectCliFailure(
      runCli(["compose", "--input", "composition.json"], {}, tempDir),
      'Unknown command "compose"',
    )
    await expectCliFailure(
      runCli(["schema", "--input", "artifact.agent.html"], {}, tempDir),
      "does not accept --input",
    )
    await rm(tempDir, { force: true, recursive: true })
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

function runCli(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  cwd = root,
) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd,
    env: {
      ...process.env,
      AHTML_NO_UPDATE_CHECK: "1",
      ...(shadcnTestServer
        ? { REGISTRY_URL: shadcnTestServer.registryUrl }
        : {}),
      ...env,
    },
  })
}

async function importValidateModule(): Promise<ValidateModule> {
  const validateModuleUrl = pathToFileURL(
    path.join(root, "src", "cli", "validate.mjs"),
  ).href

  return (await import(validateModuleUrl)) as ValidateModule
}

async function importCommandMetadata() {
  const commandModuleUrl = pathToFileURL(
    path.join(root, "src", "cli", "commands.mjs"),
  ).href
  return (await import(commandModuleUrl)) as CommandMetadataModule
}

async function importRenderCapabilitiesModule(): Promise<RenderCapabilitiesModule> {
  const renderCapabilitiesUrl = pathToFileURL(
    path.join(root, "src", "config", "render-capabilities.mjs"),
  ).href

  return (await import(renderCapabilitiesUrl)) as RenderCapabilitiesModule
}

async function importRuntimeSetupModule(): Promise<RuntimeSetupModule> {
  const runtimeSetupModuleUrl = pathToFileURL(
    path.join(root, "src", "cli", "runtime-setup.mjs"),
  ).href

  return (await import(runtimeSetupModuleUrl)) as RuntimeSetupModule
}

async function importShadcnApiModule(): Promise<ShadcnApiModule> {
  const shadcnApiModuleUrl = pathToFileURL(
    path.join(root, "src", "cli", "shadcn-api.mjs"),
  ).href

  return (await import(shadcnApiModuleUrl)) as ShadcnApiModule
}

async function startPackageVersionServer(version: string, statusCode = 200) {
  let requests = 0
  const server = createServer((_request, response) => {
    requests += 1
    response.writeHead(statusCode, { "content-type": "application/json" })
    response.end(JSON.stringify({ version }))
  })

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })

  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0

  return {
    url: `http://127.0.0.1:${port}/@agent-html%2Fahtml/latest`,
    requests: () => requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }
}

async function assertNoProjectScaffold(directory: string) {
  await expectPathMissing(path.join(directory, "src"))
  await expectPathMissing(path.join(directory, "vite.config.ts"))
  await expectPathMissing(path.join(directory, "components.json"))
  await expectPathMissing(path.join(directory, "agent-html.project.json"))
}

async function expectFile(filePath: string, expected: string) {
  const source = await readFile(filePath, "utf8")

  expect(source).toContain(expected)
}

async function expectFileMissingText(filePath: string, expected: string) {
  const source = await readFile(filePath, "utf8")

  expect(source).not.toContain(expected)
}

async function expectPathMissing(filePath: string) {
  await expect(stat(filePath)).rejects.toMatchObject({ code: "ENOENT" })
}

async function expectCliFailure(
  promise: Promise<unknown>,
  expectedOutput: string,
) {
  try {
    await promise
  } catch (error) {
    expect(getErrorOutput(error)).toContain(expectedOutput)
    return
  }

  throw new Error("Expected CLI command to fail.")
}

async function waitForPreviewUrl(child: ReturnType<typeof spawn>) {
  return new Promise<string>((resolve, reject) => {
    if (!child.stdout || !child.stderr) {
      reject(new Error("Preview process was started without stdout/stderr."))
      return
    }

    let stdout = ""
    let stderr = ""
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for preview URL. ${stderr}`))
    }, 30000)

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
      const match = stdout.match(/Preview: (http:\/\/127\.0\.0\.1:\d+)/)

      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on("exit", (code) => {
      if (!stdout.includes("Preview:")) {
        clearTimeout(timeout)
        reject(new Error(stderr || `Preview exited with code ${code}`))
      }
    })
  })
}

async function waitForProcessExit(child: ReturnType<typeof spawn>) {
  if (child.exitCode !== null) {
    return
  }

  await new Promise<void>((resolve) => {
    child.on("exit", () => resolve())
  })
}

function parseJson<T>(source: string): T {
  return JSON.parse(source) as T
}

function normalizeNewlines(value: string): string {
  return value.replaceAll("\r\n", "\n")
}

function getErrorOutput(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "stderr" in error &&
    typeof error.stderr === "string" &&
    "stdout" in error &&
    typeof error.stdout === "string"
  ) {
    return `${error.stdout}\n${error.stderr}`
  }

  return ""
}
