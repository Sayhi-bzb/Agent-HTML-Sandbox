/// <reference types="node" />
// @vitest-environment node

import { execFile, spawn } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  chmod,
  writeFile,
} from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const cliPath = path.join(root, "bin", "ahtml.mjs")
const examplesDir = path.join(root, "src", "engine", "examples")

type CliSchemaJson = {
  readonly kind: string
  readonly components: readonly { readonly name: string }[]
}

type CliSchemaOutput = CliSchemaJson & {
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

type ArtifactConfigJson = {
  readonly density: string
}

type AhtmlProjectConfigJson = {
  readonly kind: string
  readonly integration: string
  readonly packageManager: string
  readonly preset: string
  readonly dryRun?: boolean
  readonly filesWritten?: boolean
  readonly applied?: boolean
  readonly integrationFiles?: boolean
  readonly scaffolded?: boolean
  readonly status: string
  readonly template: string
  readonly wouldApply?: boolean
  readonly wouldScaffold?: boolean
  readonly paths: {
    readonly componentDir: string
  }
  readonly diagnostics: readonly {
    readonly code: string
    readonly severity: string
  }[]
  readonly shadcn: {
    readonly detected: boolean
    readonly components: readonly string[]
    readonly missingComponents: readonly string[]
    readonly commands: readonly string[]
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
}

describe("agent-html CLI", () => {
  it("keeps the checked-in schema prompt in sync with the CLI schema formatter", async () => {
    const schemaModuleUrl = pathToFileURL(
      path.join(root, "src", "cli", "schema.mjs"),
    ).href
    const { formatPrompt, getCliSchemaOutput } = (await import(
      schemaModuleUrl
    )) as SchemaModule
    const schema = await getCliSchemaOutput(root)
    const promptPath = path.join(
      root,
      "src",
      "engine",
      "component-schema-prompt.txt",
    )

    const prompt = await readFile(promptPath, "utf8")

    expect(normalizeNewlines(prompt)).toBe(`${formatPrompt(schema)}\n`)
  })

  it("exposes the ahtml bin entry", async () => {
    const { stdout } = await runCli(["schema", "--format", "prompt"])

    expect(stdout).toContain("Write agent-html only.")
  })

  it("prints global help from default and help flags", async () => {
    const defaultHelp = await runCli([])
    const longHelp = await runCli(["--help"])
    const shortHelp = await runCli(["-h"])
    const namedHelp = await runCli(["help"])

    for (const result of [defaultHelp, longHelp, shortHelp, namedHelp]) {
      expect(result.stdout).toContain("Commands:")
      expect(result.stdout).toContain("Closed-loop workflow:")
      expect(result.stdout).toContain("ahtml init")
      expect(result.stdout).toContain("ahtml status")
      expect(result.stdout).toContain("ahtml schema --format prompt")
      expect(result.stdout).toContain('Run "ahtml <command> --help"')
    }
  })

  it("prints command help without entering option parsing", async () => {
    const commands = Object.keys(await importCommandMetadata())

    for (const command of commands) {
      const { stdout } = await runCli([command, "--help"])

      expect(stdout).toContain(`ahtml ${command}`)
      expect(stdout).toContain("Purpose:")
      expect(stdout).toContain("Usage:")
    }

    const shortHelp = await runCli(["schema", "-h"])
    const { stdout } = await runCli(["help", "schema"])

    expect(shortHelp.stdout).toContain("ahtml schema")
    expect(stdout).toContain("ahtml schema")
    expect(stdout).toContain("--format")
  }, 10000)

  it("points unknown commands to help", async () => {
    await expectCliFailure(runCli(["missing"]), 'Run "ahtml --help"')
    await expectCliFailure(runCli(["help", "missing"]), "Unknown help topic")
  })

  it("prints agent-facing schema without implementation props", async () => {
    const { stdout } = await runCli(["schema", "--format", "json"])
    const schema = parseJson<CliSchemaOutput>(stdout)
    const serializedComponents = JSON.stringify(schema.components)

    expect(schema.kind).toBe("agent-html-cli-schema")
    expect(
      schema.components.some((item: { name: string }) => item.name === "page"),
    ).toBe(true)
    expect(serializedComponents).not.toContain('"className"')
    expect(serializedComponents).not.toContain('"style"')
    expect(schema.safetyPolicy.blockedNames).toContain("className")
    expect(schema.forbidden).toBe(schema.safetyPolicy.forbidden)
  })

  it("writes schema output to a requested path", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const outputPath = path.join(tempDir, "schema.txt")

    await runCli(["schema", "--format", "prompt", "--out", outputPath])

    await expect(readFile(outputPath, "utf8")).resolves.toContain(
      "Write agent-html only.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("initializes finite project config without writing during dry-run", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const outputPath = path.join(tempDir, "agent-html.project.json")

    await writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify({ name: "consumer", packageManager: "pnpm@9.0.0" }),
    )

    const { stdout } = await runCli(
      [
        "init",
        "--template",
        "vite",
        "--preset",
        "base-nova",
        "--components",
        "card,badge",
        "--out",
        outputPath,
        "--dry-run",
      ],
      {},
      tempDir,
    )
    const project = parseJsonFromOutput<AhtmlProjectConfigJson>(stdout)

    expect(stdout).toContain("Dry run: no files written.")
    expect(project.kind).toBe("agent-html-project")
    expect(project.dryRun).toBe(true)
    expect(project.filesWritten).toBe(false)
    expect(project.wouldScaffold).toBe(false)
    expect(project.wouldApply).toBe(false)
    expect(project.integration).toBe("vite-shadcn")
    expect(project.status).toBe("configured")
    expect(project.packageManager).toBe("pnpm")
    expect(project.shadcn.components).toEqual(["card", "badge"])
    expect(project.shadcn.missingComponents).toEqual(["card", "badge"])
    expect(project.diagnostics).toContainEqual(
      expect.objectContaining({ code: "missing-components-json" }),
    )
    expect(project.shadcn.commands.join("\n")).toContain(
      "pnpm dlx shadcn@latest init --template vite --preset base-nova",
    )
    await expect(readFile(outputPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    })
    await rm(tempDir, { force: true, recursive: true })
  })

  it("reports default init plan during dry-run", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))

    const { stdout } = await runCli(["init", "--dry-run"], {}, tempDir)
    const project = parseJsonFromOutput<AhtmlProjectConfigJson>(stdout)

    expect(project.dryRun).toBe(true)
    expect(project.filesWritten).toBe(false)
    expect(project.wouldScaffold).toBe(false)
    expect(project.wouldApply).toBe(true)
    await expect(
      readFile(path.join(tempDir, "agent-html.project.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await rm(tempDir, { force: true, recursive: true })
  })

  it("reports planned scaffold without writing during dry-run", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))

    const { stdout } = await runCli(
      ["init", "--scaffold", "--components", "card", "--dry-run"],
      {},
      tempDir,
    )
    const project = parseJsonFromOutput<AhtmlProjectConfigJson>(stdout)

    expect(project.dryRun).toBe(true)
    expect(project.filesWritten).toBe(false)
    expect(project.wouldScaffold).toBe(true)
    expect(project.scaffolded).toBeUndefined()
    await expect(
      readFile(path.join(tempDir, "agent-html.project.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(
      readFile(path.join(tempDir, "components.json"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" })
    await rm(tempDir, { force: true, recursive: true })
  })

  it("writes project config for an existing shadcn project", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const outputPath = path.join(tempDir, "agent-html.project.json")

    await writeFile(path.join(tempDir, "package.json"), JSON.stringify({}))
    await writeFile(
      path.join(tempDir, "components.json"),
      JSON.stringify({ tailwind: { css: "src/index.css" } }),
    )

    const { stdout } = await runCli(
      ["init", "--components", "card", "--out", outputPath],
      {},
      tempDir,
    )
    const project = parseJson<AhtmlProjectConfigJson>(
      await readFile(outputPath, "utf8"),
    )

    expect(stdout).toContain("Wrote agent-html.project.json")
    expect(stdout).toContain("Next: ahtml init --apply")
    expect(stdout).toContain("Manual shadcn commands:")
    expect(stdout).toContain("Then: ahtml doctor")
    expect(project.shadcn.detected).toBe(true)
    expect(project.paths.componentDir).toBe(
      path.join("src", "components", "ui"),
    )
    expect(project.shadcn.missingComponents).toEqual(["card"])
    expect(project.shadcn.commands).toEqual(["npx shadcn@latest add card"])
    await rm(tempDir, { force: true, recursive: true })
  })

  it("scaffolds a default vite-shadcn project before writing config", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))

    const { stdout } = await runCli(
      ["init", "--scaffold", "--components", "card"],
      {},
      tempDir,
    )
    const project = parseJson<AhtmlProjectConfigJson>(
      await readFile(path.join(tempDir, "agent-html.project.json"), "utf8"),
    )

    expect(stdout).toContain(
      "Scaffolded user-local Vite + shadcn project files.",
    )
    expect(stdout).toContain("Next: ahtml init --apply")
    expect(stdout).toContain("Manual shadcn commands:")
    expect(stdout).toContain("Then: ahtml doctor")
    expect(project.scaffolded).toBe(true)
    expect(project.paths.componentDir).toBe(
      path.join("src", "components", "ui"),
    )
    expect(project.diagnostics.map((item) => item.code)).not.toContain(
      "missing-package-json",
    )
    await expect(
      readFile(path.join(tempDir, "package.json"), "utf8"),
    ).resolves.toContain('"vite"')
    await expect(
      readFile(path.join(tempDir, "components.json"), "utf8"),
    ).resolves.toContain('"@/components/ui"')
    await expect(
      readFile(path.join(tempDir, "src", "lib", "utils.ts"), "utf8"),
    ).resolves.toContain("twMerge")
    await expect(
      readFile(path.join(tempDir, "src", "main.tsx"), "utf8"),
    ).resolves.toContain("createRoot")
    await expect(
      readFile(
        path.join(tempDir, "src", "agent-html", "renderer-adapter.tsx"),
        "utf8",
      ),
    ).resolves.toContain("SanitizedAgentHtml")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("uses shadcn setup and writes adapter files as the default init path", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const fakeBinDir = await setupFakePackageRunner(tempDir)

    const { stdout } = await runCli(
      ["init"],
      { PATH: `${fakeBinDir}${path.delimiter}${process.env.PATH ?? ""}` },
      tempDir,
    )
    const project = parseJson<AhtmlProjectConfigJson>(
      await readFile(path.join(tempDir, "agent-html.project.json"), "utf8"),
    )

    expect(stdout).toContain(
      "Running: npx shadcn@latest init --template vite --preset base-nova",
    )
    expect(stdout).toContain(
      "Running: npx shadcn@latest add accordion alert badge button card checkbox progress separator slider table tabs textarea toggle toggle-group tooltip",
    )
    expect(stdout).toContain("Installed user-local shadcn setup.")
    expect(stdout).toContain("Wrote ahtml renderer adapter files.")
    expect(stdout).toContain("Next: ahtml doctor")
    expect(project.scaffolded).toBe(false)
    expect(project.applied).toBe(true)
    expect(project.integrationFiles).toBe(true)
    expect(project.paths.componentDir).toBe(
      path.join("src", "components", "ui"),
    )
    await expect(
      readFile(path.join(tempDir, "vite.config.ts"), "utf8"),
    ).resolves.toContain("defineConfig")
    await expect(
      readFile(path.join(tempDir, "components.json"), "utf8"),
    ).resolves.toContain('"@/components/ui"')
    await expect(
      readFile(path.join(tempDir, "src", "main.tsx"), "utf8"),
    ).resolves.toContain("createAgentHtmlRendererAdapter")
    await expect(
      readFile(
        path.join(tempDir, "src", "components", "ui", "card.tsx"),
        "utf8",
      ),
    ).resolves.toContain("card")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("reports installed and missing user-local shadcn components through doctor", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))

    await writeFile(path.join(tempDir, "package.json"), JSON.stringify({}))
    await writeFile(
      path.join(tempDir, "components.json"),
      JSON.stringify({
        aliases: { ui: "@/components/ui" },
        tailwind: { css: "src/index.css" },
      }),
    )
    await runCli(["init", "--components", "card,badge"], {}, tempDir)

    await expectCliFailure(
      runCli(["doctor"], {}, tempDir),
      "fail setup:shadcn-components missing card, badge. Run: ahtml init --apply",
    )

    const componentDir = path.join(tempDir, "src", "components", "ui")

    await mkdir(componentDir, { recursive: true })
    await writeFile(path.join(componentDir, "card.tsx"), "export {}\n")
    await writeFile(path.join(componentDir, "badge.tsx"), "export {}\n")

    const { stdout } = await runCli(["doctor"], {}, tempDir)

    expect(stdout).toContain("ok config:project-config")
    expect(stdout).toContain("ok setup:shadcn-components card, badge")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("shows project setup status and a single next step", async () => {
    const missingDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const missingStatus = await runCli(["status"], {}, missingDir)

    expect(missingStatus.stdout).toContain("ready: no")
    expect(missingStatus.stdout).toContain("project config: missing")
    expect(missingStatus.stdout).toContain("Next: ahtml init")
    await rm(missingDir, { force: true, recursive: true })

    const partialDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    await writeFile(path.join(partialDir, "package.json"), JSON.stringify({}))
    await writeFile(
      path.join(partialDir, "components.json"),
      JSON.stringify({
        aliases: { ui: "@/components/ui" },
        tailwind: { css: "src/index.css" },
      }),
    )
    await runCli(["init", "--components", "card"], {}, partialDir)
    const partialStatus = await runCli(["status"], {}, partialDir)

    expect(partialStatus.stdout).toContain("ready: no")
    expect(partialStatus.stdout).toContain("shadcn components: missing card")
    expect(partialStatus.stdout).toContain("Next: ahtml init --apply")
    await rm(partialDir, { force: true, recursive: true })

    const readyDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    await setupFakeUserLocalVite(readyDir, "Ready")
    await runCli(["init", "--components", "card"], {}, readyDir)
    const readyStatus = await runCli(["status"], {}, readyDir)

    expect(readyStatus.stdout).toContain("ready: yes")
    expect(readyStatus.stdout).toContain("shadcn components: ok")
    expect(readyStatus.stdout).toContain(
      "Next: ahtml preview --input artifact.agent.html",
    )
    await rm(readyDir, { force: true, recursive: true })
  })

  it("composes structured input into a valid agent-html document", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "input.json")
    const outputPath = path.join(tempDir, "artifact.agent.html")

    await writeFile(
      inputPath,
      JSON.stringify({
        meta: {
          theme: "neutral",
          density: "compact",
          tone: "dashboard",
          width: "dashboard",
        },
        document: {
          name: "page",
          props: { title: "CLI Demo" },
          children: [
            {
              name: "card",
              props: { title: "Overview" },
              children: ["Generated by compose"],
            },
          ],
        },
      }),
    )

    await runCli(["compose", "--input", inputPath, "--out", outputPath])

    await expect(readFile(outputPath, "utf8")).resolves.toContain(
      '<page title="CLI Demo">',
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("composes the same input shape from stdin", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const outputPath = path.join(tempDir, "artifact.agent.html")

    await runCliWithInput(
      ["compose", "--stdin", "--out", outputPath],
      JSON.stringify({
        document: {
          name: "page",
          props: { title: "Stdin Demo" },
          children: [{ name: "card", children: ["From stdin"] }],
        },
      }),
    )

    await expect(readFile(outputPath, "utf8")).resolves.toContain(
      '<page title="Stdin Demo">',
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("rejects blocked implementation props before compose output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "input.json")
    const outputPath = path.join(tempDir, "artifact.agent.html")

    await writeFile(
      inputPath,
      JSON.stringify({
        document: {
          name: "page",
          props: { title: "Blocked", className: "p-4" },
          children: [],
        },
      }),
    )

    await expectCliFailure(
      runCli(["compose", "--input", inputPath, "--out", outputPath]),
      "Blocked implementation prop",
    )
    await expect(readFile(outputPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    })
    await rm(tempDir, { force: true, recursive: true })
  })

  it("sets finite config values in an isolated config file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const configPath = path.join(tempDir, "agent-html.config.json")
    const env = { AGENT_HTML_CONFIG_PATH: configPath }

    await runCli(["config", "set", "density", "compact"], env)
    const { stdout } = await runCli(["config", "get"], env)
    const config = parseJson<ArtifactConfigJson>(stdout)

    expect(config.density).toBe("compact")
    await expectCliFailure(
      runCli(["config", "set", "density", "loose"], env),
      "Invalid value",
    )
    const persistedConfig = parseJson<ArtifactConfigJson>(
      await readFile(configPath, "utf8"),
    )

    expect(persistedConfig.density).toBe("compact")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("builds a sanitized document into a static artifact directory", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await setupFakeUserLocalVite(tempDir, "Built by CLI")
    await writeFile(
      inputPath,
      [
        '<meta-agent theme="neutral" density="compact" tone="dashboard" width="dashboard" />',
        '<page title="CLI Build"><card title="Overview">Built by CLI</card></page>',
      ].join("\n"),
    )

    await runCli(["init", "--components", "card"], {}, tempDir)
    await runCli(
      ["build", "--input", inputPath, "--out", outputDir],
      {},
      tempDir,
    )

    await expect(
      readFile(path.join(outputDir, "index.html"), "utf8"),
    ).resolves.toContain("Built by CLI")
    await expect(
      readFile(path.join(outputDir, "agent-html.inspect.json"), "utf8"),
    ).resolves.toContain('"agent-html-inspection"')
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

  it("builds through user-local vite when project config exists", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await setupFakeUserLocalVite(tempDir, "user-local vite")
    await writeFile(
      inputPath,
      '<page title="User Local"><card>Built by user-local vite</card></page>',
    )
    await runCli(["init", "--components", "card"], {}, tempDir)
    await runCli(
      ["build", "--input", inputPath, "--out", outputDir],
      {},
      tempDir,
    )

    await expect(
      readFile(path.join(outputDir, "index.html"), "utf8"),
    ).resolves.toContain("user-local vite")
    await expect(
      readFile(
        path.join(tempDir, "src", "agent-html", "document.generated.ts"),
        "utf8",
      ),
    ).resolves.toContain("Built by user-local vite")
    await expect(
      readFile(path.join(outputDir, "agent-html.inspect.json"), "utf8"),
    ).resolves.toContain('"agent-html-inspection"')
    await rm(tempDir, { force: true, recursive: true })
  })

  it("validates a document without generating artifact output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")

    await writeFile(
      inputPath,
      '<page title="CLI Validate"><card>Valid by CLI</card></page>',
    )

    const { stdout } = await runCli(["validate", "--input", inputPath])

    expect(stdout).toContain("agent-html valid")
    await expect(
      readFile(path.join(tempDir, "dist", "html", "index.html"), "utf8"),
    ).rejects.toMatchObject({
      code: "ENOENT",
    })
    await rm(tempDir, { force: true, recursive: true })
  })

  it("reports validate diagnostics for invalid documents", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")

    await writeFile(
      inputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    await expectCliFailure(
      runCli(["validate", "--input", inputPath]),
      "unknown-attr",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("inspects documents and built artifact directories", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      [
        '<meta-agent theme="neutral" density="compact" tone="dashboard" width="dashboard" />',
        '<page title="CLI Inspect"><card title="Overview">Inspect by CLI</card></page>',
      ].join("\n"),
    )

    const documentInspection = await runCli([
      "inspect",
      "--input",
      inputPath,
      "--format",
      "json",
    ])
    const parsedDocumentInspection = parseJson<{
      readonly config: { readonly density: string }
      readonly components: readonly { readonly name: string; count: number }[]
    }>(documentInspection.stdout)

    expect(parsedDocumentInspection.config.density).toBe("compact")
    expect(parsedDocumentInspection.components).toContainEqual({
      name: "card",
      count: 1,
    })

    await setupFakeUserLocalVite(tempDir, "Inspect by CLI")
    await runCli(["init", "--components", "card"], {}, tempDir)
    await runCli(
      ["build", "--input", inputPath, "--out", outputDir],
      {},
      tempDir,
    )

    const artifactInspection = await runCli(["inspect", "--dir", outputDir])

    expect(artifactInspection.stdout).toContain("density: compact")
    expect(artifactInspection.stdout).toContain("- card: 1")
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

  it("runs local doctor checks", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const configPath = path.join(tempDir, "agent-html.config.json")
    const env = { AGENT_HTML_CONFIG_PATH: configPath }
    const { stdout } = await runCli(["doctor"], env, tempDir)

    expect(stdout).toContain("ok environment:node")
    expect(stdout).toContain("ok config:config")
    expect(stdout).toContain("ok config:project-config")
    expect(stdout).toContain("ok setup:shadcn-components")
    expect(stdout).toContain("ok artifact:output-dir")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("reports invalid config through doctor diagnostics", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const configPath = path.join(tempDir, "agent-html.config.json")

    await writeFile(configPath, JSON.stringify({ density: "loose" }))

    await expectCliFailure(
      runCli(["doctor"], { AGENT_HTML_CONFIG_PATH: configPath }),
      "fail config:config",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("serves a preview from generated static output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await setupFakeUserLocalVite(tempDir, "Preview by CLI")
    await runCli(["init", "--components", "card"], {}, tempDir)
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

  it("fails clearly when the preview port is unavailable", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")
    const server = createServer()

    await setupFakeUserLocalVite(tempDir, "Port collision")
    await runCli(["init", "--components", "card"], {}, tempDir)
    await writeFile(
      inputPath,
      '<page title="CLI Preview"><card>Port collision</card></page>',
    )
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve)
    })

    const address = server.address()
    const port = typeof address === "object" && address ? address.port : 0

    try {
      await expectCliFailure(
        runCli(
          [
            "preview",
            "--input",
            inputPath,
            "--out",
            outputDir,
            "--port",
            String(port),
          ],
          {},
          tempDir,
        ),
        "EADDRINUSE",
      )
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
      await rm(tempDir, { force: true, recursive: true })
    }
  }, 60000)

  it("accepts every checked-in agent-html example", async () => {
    const { validateAgentHtmlSource } = await importValidateModule()
    const exampleNames = (await readdir(examplesDir)).filter((name) =>
      name.endsWith(".agent.html"),
    )

    expect(exampleNames.length).toBeGreaterThan(0)

    for (const exampleName of exampleNames) {
      const source = await readFile(path.join(examplesDir, exampleName), "utf8")
      const validation = await validateAgentHtmlSource(source, root)

      expect(
        validation.diagnostics.map((diagnostic) => diagnostic.message),
        exampleName,
      ).toEqual([])
    }
  })

  it("reports helper diagnostics for invalid agent-html source", async () => {
    const { validateAgentHtmlSource } = await importValidateModule()
    const validation = await validateAgentHtmlSource(
      '<page title="Bad"><card className="x" /></page>',
      root,
    )

    expect(
      validation.diagnostics.map((diagnostic) => diagnostic.message),
    ).toEqual([
      '"classname" is not an allowed agent-facing attribute on <card>.',
    ])
  })

  it("rejects invalid build input before artifact generation", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="Bad"><card className="x" /></page>',
    )

    await expectCliFailure(
      runCli(["build", "--input", inputPath, "--out", outputDir]),
      "unknown-attr",
    )
    await expect(
      readFile(path.join(outputDir, "index.html"), "utf8"),
    ).rejects.toMatchObject({
      code: "ENOENT",
    })
    await rm(tempDir, { force: true, recursive: true })
  })

  it("guides build users to initialize the project first", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const inputPath = path.join(tempDir, "artifact.agent.html")

    await writeFile(
      inputPath,
      '<meta-agent theme="neutral" density="compact" tone="report" width="article" /><page title="Ready" />',
    )

    await expectCliFailure(
      runCli(["build", "--input", inputPath], {}, tempDir),
      "Project is not ready. Run: ahtml init.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("rejects invalid flags with a non-zero exit", async () => {
    await expectCliFailure(
      runCli(["schema", "--format"]),
      "--format requires a value.",
    )
    await expectCliFailure(
      runCli(["schema", "--input", "artifact.agent.html"]),
      "does not accept --input",
    )
    await expectCliFailure(
      runCli(["validate", "--out", "dist/html"]),
      "does not accept --out",
    )
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
  const { commandMetadata } = (await import(
    commandModuleUrl
  )) as CommandMetadataModule

  return commandMetadata
}

async function runCliWithInput(args: readonly string[], input: string) {
  await new Promise<void>((resolve, reject) => {
    let stderr = ""
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: root,
      stdio: ["pipe", "ignore", "pipe"],
    })

    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr || `CLI exited with code ${code ?? "null"}`))
    })
    child.stdin.end(input)
  })
}

async function setupFakeUserLocalVite(directory: string, html: string) {
  const viteDir = path.join(directory, "node_modules", "vite")
  const componentDir = path.join(directory, "src", "components", "ui")

  await mkdir(path.join(viteDir, "bin"), { recursive: true })
  await mkdir(componentDir, { recursive: true })
  await writeFile(path.join(directory, "package.json"), JSON.stringify({}))
  await writeFile(path.join(directory, "vite.config.ts"), "export default {}\n")
  await writeFile(path.join(componentDir, "card.tsx"), "export {}\n")
  await writeFile(
    path.join(directory, "components.json"),
    JSON.stringify({
      aliases: { ui: "@/components/ui" },
      tailwind: { css: "src/index.css" },
    }),
  )
  await writeFile(
    path.join(viteDir, "package.json"),
    JSON.stringify({ bin: { vite: "bin/vite.mjs" } }),
  )
  await writeFile(
    path.join(viteDir, "bin", "vite.mjs"),
    [
      'import { mkdir, writeFile } from "node:fs/promises"',
      'import path from "node:path"',
      'const outDir = process.argv[process.argv.indexOf("--outDir") + 1]',
      "await mkdir(outDir, { recursive: true })",
      `await writeFile(path.join(outDir, "index.html"), ${JSON.stringify(html)})`,
      "",
    ].join("\n"),
  )
}

async function setupFakePackageRunner(directory: string) {
  const binDir = path.join(directory, "fake-bin")
  const runnerPath = path.join(binDir, "fake-npx.mjs")

  await mkdir(binDir, { recursive: true })
  await writeFile(
    runnerPath,
    [
      'import { mkdir, writeFile } from "node:fs/promises"',
      'import path from "node:path"',
      "const args = process.argv.slice(2)",
      'const initIndex = args.indexOf("init")',
      'const addIndex = args.indexOf("add")',
      "if (initIndex >= 0) {",
      '  await writeFile(path.join(process.cwd(), "package.json"), JSON.stringify({ type: "module", scripts: { build: "vite build" }, dependencies: { vite: "latest", react: "latest", "react-dom": "latest" } }))',
      '  await writeFile(path.join(process.cwd(), "vite.config.ts"), "import { defineConfig } from \\"vite\\"\\nexport default defineConfig({})\\n")',
      '  await writeFile(path.join(process.cwd(), "components.json"), JSON.stringify({ aliases: { ui: "@/components/ui" }, tailwind: { css: "src/index.css" } }))',
      '  await mkdir(path.join(process.cwd(), "src"), { recursive: true })',
      '  await writeFile(path.join(process.cwd(), "src", "index.css"), "@import \\"tailwindcss\\";\\n")',
      "}",
      "if (addIndex >= 0) {",
      '  const componentDir = path.join(process.cwd(), "src", "components", "ui")',
      "  await mkdir(componentDir, { recursive: true })",
      "  for (const component of args.slice(addIndex + 1)) {",
      '    await writeFile(path.join(componentDir, `${component}.tsx`), `export const ${component.replace(/-/g, "_")} = "${component}"\\n`)',
      "  }",
      "}",
      "",
    ].join("\n"),
  )

  if (process.platform === "win32") {
    await writeFile(
      path.join(binDir, "npx.cmd"),
      `@echo off\r\n"${process.execPath}" "${runnerPath}" %*\r\n`,
    )
  } else {
    const npxPath = path.join(binDir, "npx")
    await writeFile(
      npxPath,
      `#!/usr/bin/env sh\n"${process.execPath}" "${runnerPath}" "$@"\n`,
    )
    await chmod(npxPath, 0o755)
  }

  return binDir
}

function parseJson<T>(source: string): T {
  return JSON.parse(source) as T
}

function parseJsonFromOutput<T>(source: string): T {
  const start = source.indexOf("{")

  if (start < 0) {
    throw new Error("Expected CLI output to include JSON.")
  }

  return parseJson<T>(source.slice(start))
}

function normalizeNewlines(value: string): string {
  return value.replaceAll("\r\n", "\n")
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
