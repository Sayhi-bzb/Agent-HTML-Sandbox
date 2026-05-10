/// <reference types="node" />
// @vitest-environment node

import { execFile, spawn } from "node:child_process"
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const cliPath = path.join(root, "bin", "ahtml.mjs")
const examplesDir = path.join(root, "src", "agent-html", "examples")

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
      path.join(root, "scripts", "agent-html-cli-schema.mjs"),
    ).href
    const { formatPrompt, getCliSchemaOutput } = (await import(
      schemaModuleUrl
    )) as SchemaModule
    const schema = await getCliSchemaOutput(root)
    const promptPath = path.join(
      root,
      "src",
      "agent-html",
      "component-schema-prompt.txt",
    )

    await expect(readFile(promptPath, "utf8")).resolves.toBe(
      `${formatPrompt(schema)}\n`,
    )
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
  })

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

    await writeFile(
      inputPath,
      [
        '<meta-agent theme="neutral" density="compact" tone="dashboard" width="dashboard" />',
        '<page title="CLI Build"><card title="Overview">Built by CLI</card></page>',
      ].join("\n"),
    )

    await runCli(["build", "--input", inputPath, "--out", outputDir])

    await expect(
      readFile(path.join(outputDir, "index.html"), "utf8"),
    ).resolves.toContain("Built by CLI")
    await expect(
      readFile(path.join(outputDir, "agent-html.inspect.json"), "utf8"),
    ).resolves.toContain('"agent-html-inspection"')
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

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

    await runCli(["build", "--input", inputPath, "--out", outputDir])

    const artifactInspection = await runCli(["inspect", "--dir", outputDir])

    expect(artifactInspection.stdout).toContain("density: compact")
    expect(artifactInspection.stdout).toContain("- card: 1")
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

  it("runs local doctor checks", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const configPath = path.join(tempDir, "agent-html.config.json")
    const env = { AGENT_HTML_CONFIG_PATH: configPath }
    const { stdout } = await runCli(["doctor"], env)

    expect(stdout).toContain("ok environment:node")
    expect(stdout).toContain("ok environment:vite")
    expect(stdout).toContain("ok config:config")
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
        cwd: root,
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
        runCli([
          "preview",
          "--input",
          inputPath,
          "--out",
          outputDir,
          "--port",
          String(port),
        ]),
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

function runCli(args: readonly string[], env: NodeJS.ProcessEnv = {}) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: root,
    env: {
      ...process.env,
      ...env,
    },
  })
}

async function importValidateModule(): Promise<ValidateModule> {
  const validateModuleUrl = pathToFileURL(
    path.join(root, "scripts", "agent-html-cli-validate.mjs"),
  ).href

  return (await import(validateModuleUrl)) as ValidateModule
}

async function importCommandMetadata() {
  const commandModuleUrl = pathToFileURL(
    path.join(root, "scripts", "agent-html-cli-commands.mjs"),
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

function parseJson<T>(source: string): T {
  return JSON.parse(source) as T
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
