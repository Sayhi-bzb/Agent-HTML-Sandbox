/// <reference types="node" />
// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  type CliSchemaOutput,
  type ShadcnTestServer,
  expectCliFailure,
  expectPathMissing,
  importCommandMetadata,
  importRenderCapabilitiesModule,
  importRuntimeSetupModule,
  importSchemaModule,
  importShadcnApiModule,
  importValidateModule,
  normalizeNewlines,
  parseJson,
  root,
  runCli,
  startShadcnTestServer,
  validAgentHtmlFixtures,
} from "./cli-test-helpers"

let shadcnTestServer: ShadcnTestServer | undefined

beforeAll(async () => {
  shadcnTestServer = await startShadcnTestServer()
})

afterAll(async () => {
  await shadcnTestServer?.close()
})

function runCliWithServer(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  cwd = root,
) {
  return runCli(args, env, cwd, shadcnTestServer?.registryUrl)
}

describe("agent-html CLI contracts", () => {
  it("keeps the checked-in schema prompt in sync with the CLI schema formatter", async () => {
    const { formatPrompt, getCliSchemaOutput } = await importSchemaModule()
    const schema = await getCliSchemaOutput(root)
    const prompt = await readFile(
      path.join(root, "src", "engine", "component-schema-prompt.txt"),
      "utf8",
    )

    expect(normalizeNewlines(prompt)).toBe(`${formatPrompt(schema)}\n`)
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
    await rm(tempDir, { force: true, recursive: true })
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

  it("rejects invalid input and flags clearly", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    await expectCliFailure(
      runCliWithServer(
        ["build", inputPath, "--out", outputDir],
        {},
        tempDir,
      ),
      "unknown-attr",
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
      runCliWithServer(["validate", "--input", "artifact.agent.html"], {}, tempDir),
      'Unknown command "validate"',
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
