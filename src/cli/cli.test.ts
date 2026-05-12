/// <reference types="node" />
// @vitest-environment node

import { execFile, spawn } from "node:child_process"
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
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

type CliSchemaOutput = {
  readonly kind: string
  readonly components: readonly { readonly name: string }[]
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
      expect(result.stdout).toContain("ahtml init")
      expect(result.stdout).toContain("ahtml build --input")
      expect(result.stdout).not.toContain("agent-html.project.json")
      expect(result.stdout).not.toContain("--scaffold")
    }

    const commands = Object.keys(await importCommandMetadata())
    for (const command of commands) {
      const { stdout } = await runCli([command, "--help"])

      expect(stdout).toContain(`ahtml ${command}`)
      expect(stdout).toContain("Usage:")
    }

    const initHelp = await runCli(["init", "--help"])
    expect(initHelp.stdout).toContain("managed runtime")
    expect(initHelp.stdout).not.toContain("--template")
    expect(initHelp.stdout).not.toContain("--components")
  }, 10000)

  it("prints agent-facing schema without implementation props", async () => {
    const { stdout } = await runCli(["schema", "--format", "json"])
    const schema = parseJson<CliSchemaOutput>(stdout)
    const serializedComponents = JSON.stringify(schema.components)

    expect(schema.kind).toBe("agent-html-cli-schema")
    expect(schema.components.some((item) => item.name === "page")).toBe(true)
    expect(serializedComponents).not.toContain('"className"')
    expect(serializedComponents).not.toContain('"style"')
    expect(schema.safetyPolicy.blockedNames).toContain("className")
    expect(schema.forbidden).toBe(schema.safetyPolicy.forbidden)
  })

  it("initializes only the managed runtime and honors AHTML_HOME", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".custom-ahtml")

    const dryRun = await runCli(
      ["init", "--dry-run"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const plan = parseJsonFromOutput<{
      readonly kind: string
      readonly runtimeRoot: string
      readonly wouldBootstrap: boolean
    }>(dryRun.stdout)

    expect(plan.kind).toBe("ahtml-runtime-plan")
    expect(plan.runtimeRoot).toBe(runtimeHome)
    expect(plan.wouldBootstrap).toBe(true)
    await expectPathMissing(path.join(tempDir, "agent-html.project.json"))
    await expectPathMissing(path.join(tempDir, "src"))

    const initialized = await runCli(
      ["init"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(initialized.stdout).toContain("Initialized managed runtime")
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      "ahtml-managed-runtime",
    )
    await expectPathMissing(path.join(tempDir, "components.json"))
    await expectPathMissing(path.join(tempDir, "vite.config.ts"))
    await rm(tempDir, { force: true, recursive: true })
  })

  it("reports managed runtime status without creating project scaffold files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    const missingStatus = await runCli(
      ["status"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(missingStatus.stdout).toContain("ready: no")
    expect(missingStatus.stdout).toContain("runtime manifest: missing")
    expect(missingStatus.stdout).toContain("Next: ahtml init")
    await expectPathMissing(path.join(tempDir, "src"))
    await expectPathMissing(path.join(tempDir, "dist"))
    await expectPathMissing(path.join(tempDir, "dist", "html"))

    await runCli(["init"], { AHTML_HOME: runtimeHome }, tempDir)
    const readyStatus = await runCli(
      ["status"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(readyStatus.stdout).toContain("ready: yes")
    expect(readyStatus.stdout).toContain(
      "Next: ahtml build --input artifact.agent.html --out dist/html",
    )
    await rm(tempDir, { force: true, recursive: true })
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
        '<page title="Managed Runtime"><card title="Overview">Built by managed runtime.</card></page>',
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
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), "ahtml-card")
    await expectFile(
      path.join(outputDir, "agent-html.inspect.json"),
      "agent-html-inspection",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "document.generated.json"),
      "Managed Runtime",
    )
    await assertNoProjectScaffold(consumerDir)
    await rm(tempDir, { force: true, recursive: true })
  })

  it("composes, validates, configures, and inspects artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "composition.json")
    const documentPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

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
          props: { title: "CLI Compose" },
          children: [
            {
              name: "card",
              props: { title: "Overview" },
              children: ["Composed by CLI."],
            },
          ],
        },
      }),
    )

    await runCli(
      ["compose", "--input", inputPath, "--out", documentPath],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    await expectFile(documentPath, "CLI Compose")

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

    await runCli(
      ["config", "set", "density", "compact"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const config = await runCli(
      ["config", "get"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(config.stdout).toContain('"compact"')
    await rm(tempDir, { force: true, recursive: true })
  })

  it("runs managed runtime doctor checks", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    await expectCliFailure(
      runCli(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:root",
    )

    await runCli(["init"], { AHTML_HOME: runtimeHome }, tempDir)
    const { stdout } = await runCli(
      ["doctor"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(stdout).toContain("ok environment:node")
    expect(stdout).toContain("ok runtime:root")
    expect(stdout).toContain("ok runtime:manifest static-html")
    expect(stdout).toContain("ok config:config")
    expect(stdout).toContain("ok artifact:output-dir")
    expect(stdout).not.toContain("project-config")
    expect(stdout).not.toContain("shadcn-components")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("shows cached global update guidance in status and doctor", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0")

    try {
      await runCli(["init"], { AHTML_HOME: runtimeHome }, tempDir)

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
      await runCli(["init"], { AHTML_HOME: runtimeHome }, tempDir)

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
      "does not accept --scaffold",
    )
    await expectCliFailure(
      runCli(["schema", "--input", "artifact.agent.html"], {}, tempDir),
      "does not accept --input",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

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
