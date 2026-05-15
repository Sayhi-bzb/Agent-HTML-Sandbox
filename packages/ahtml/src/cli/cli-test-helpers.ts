import { execFile } from "node:child_process"
import type { ChildProcessByStdio } from "node:child_process"
import { readFile, stat } from "node:fs/promises"
import { createServer } from "node:http"
import path from "node:path"
import type { Readable } from "node:stream"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { expect } from "vitest"

const execFileAsync = promisify(execFile)

export const root = process.cwd()
export const cliPath = path.join(root, "bin", "ahtml.mjs")
export const shadcnTemplateFixtureDir = path.join(
  root,
  "scripts",
  "shadcn-test-fixtures",
  "template",
  "shadcn-template",
)
export const validAgentHtmlFixtures = [
  '<page title="Fixture"><card title="Summary">Valid text.</card></page>',
  [
    '<meta-agent profile="ops-compact" />',
    '<page title="Dashboard"><card title="Queue">Ready.</card></page>',
  ].join("\n"),
]

export type CliSchemaOutput = {
  readonly kind: string
  readonly components: readonly { readonly name: string }[]
  readonly verificationData: {
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
  readonly rendererMapping: {
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

export type ShadcnTestServer = {
  readonly registryUrl: string
  readonly close: () => Promise<void>
}

export function runCli(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  cwd = root,
  registryUrl?: string,
) {
  const testRuntimeTemplateEnv = registryUrl
    ? {
        AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE: "1",
        AHTML_SHADCN_TEMPLATE_DIR: shadcnTemplateFixtureDir,
        REGISTRY_URL: registryUrl,
      }
    : {}

  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd,
    env: {
      ...process.env,
      AHTML_NO_UPDATE_CHECK: "1",
      ...testRuntimeTemplateEnv,
      ...env,
    },
  })
}

export async function importSchemaModule(): Promise<SchemaModule> {
  const schemaModuleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "schema.mjs"),
  ).href

  return (await import(schemaModuleUrl)) as SchemaModule
}

export async function importValidateModule(): Promise<ValidateModule> {
  const validateModuleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "validate.mjs"),
  ).href

  return (await import(validateModuleUrl)) as ValidateModule
}

export async function importCommandMetadata(): Promise<CommandMetadataModule> {
  const commandModuleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "commands.mjs"),
  ).href

  return (await import(commandModuleUrl)) as CommandMetadataModule
}

export async function importRenderCapabilitiesModule(): Promise<RenderCapabilitiesModule> {
  const renderCapabilitiesUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "config", "render-capabilities.mjs"),
  ).href

  return (await import(renderCapabilitiesUrl)) as RenderCapabilitiesModule
}

export async function importRuntimeSetupModule(): Promise<RuntimeSetupModule> {
  const runtimeSetupModuleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "runtime-setup.mjs"),
  ).href

  return (await import(runtimeSetupModuleUrl)) as RuntimeSetupModule
}

export async function importShadcnApiModule(): Promise<ShadcnApiModule> {
  const shadcnApiModuleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "shadcn-api.mjs"),
  ).href

  return (await import(shadcnApiModuleUrl)) as ShadcnApiModule
}

export async function startShadcnTestServer(): Promise<ShadcnTestServer> {
  const { startShadcnTestServer: startServer } = (await import(
    pathToFileURL(path.join(root, "scripts", "shadcn-test-server.mjs")).href
  )) as ShadcnTestServerModule

  return startServer()
}

export async function startPackageVersionServer(
  version: string,
  statusCode = 200,
) {
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

export async function assertNoProjectScaffold(directory: string) {
  await expectPathMissing(path.join(directory, "src"))
  await expectPathMissing(path.join(directory, "vite.config.ts"))
  await expectPathMissing(path.join(directory, "components.json"))
  await expectPathMissing(path.join(directory, "agent-html.project.json"))
}

export async function expectFile(filePath: string, expected: string) {
  const source = await readFile(filePath, "utf8")

  expect(source).toContain(expected)
}

export async function expectFileMissingText(
  filePath: string,
  expected: string,
) {
  const source = await readFile(filePath, "utf8")

  expect(source).not.toContain(expected)
}

export async function expectPathMissing(filePath: string) {
  await expect(stat(filePath)).rejects.toMatchObject({ code: "ENOENT" })
}

export async function expectCliFailure(
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

type PreviewProcess = ChildProcessByStdio<null, Readable, Readable>

export async function waitForPreviewUrl(child: PreviewProcess) {
  return new Promise<string>((resolve, reject) => {
    if (!child.stdout || !child.stderr) {
      reject(new Error("Preview process was started without stdout/stderr."))
      return
    }

    let stdout = ""
    let stderr = ""
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for preview URL. ${stderr}`))
    }, 60000)

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

export async function waitForProcessExit(child: PreviewProcess) {
  if (child.exitCode !== null) {
    return
  }

  await new Promise<void>((resolve) => {
    child.on("exit", () => resolve())
  })
}

export function parseJson<T>(source: string): T {
  return JSON.parse(source) as T
}

export function normalizeNewlines(value: string) {
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
