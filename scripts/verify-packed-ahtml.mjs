import { execFile, spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import {
  assertConformanceResultMatchesFixture,
  createConformanceFixtures,
  normalizeConformanceResult,
} from "./agent-html-conformance.mjs"
import { assertPackBoundary } from "./package-boundaries.mjs"
import { startShadcnTestServer } from "./shadcn-test-server.mjs"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const ahtmlPackageDir = path.join(root, "packages", "ahtml")
const corePackageDir = path.join(root, "packages", "core")
const npmCommand = "npm"
const windowsShellOptions =
  process.platform === "win32" ? { shell: true } : undefined
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ahtml-pack-"))
const packDir = path.join(tempRoot, "pack")
const consumerDir = path.join(tempRoot, "consumer")
const runtimeHome = path.join(tempRoot, "runtime-home")
const shadcnTestServer = await startShadcnTestServer()
let ahtmlCommand
let ahtmlScriptPath

try {
  await mkdir(packDir, { recursive: true })
  await mkdir(consumerDir, { recursive: true })

  const ahtmlDryRun = await runNpm(
    ["pack", "--dry-run", "--json"],
    ahtmlPackageDir,
  )
  assertPackBoundary("ahtml", parsePackFiles(ahtmlDryRun.stdout))

  const corePacked = await runNpm(
    ["pack", "--json", "--pack-destination", packDir],
    corePackageDir,
  )
  const coreTarball = path.join(
    packDir,
    JSON.parse(corePacked.stdout)[0].filename,
  )

  const ahtmlPacked = await runNpm(
    ["pack", "--json", "--pack-destination", packDir],
    ahtmlPackageDir,
  )
  const ahtmlTarball = path.join(
    packDir,
    JSON.parse(ahtmlPacked.stdout)[0].filename,
  )

  await runNpm(["init", "-y"], consumerDir)
  await runNpm(["install", coreTarball], consumerDir)
  await runNpm(["install", ahtmlTarball], consumerDir)

  ahtmlCommand = path.join(
    consumerDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "ahtml.cmd" : "ahtml",
  )
  ahtmlScriptPath = path.join(
    consumerDir,
    "node_modules",
    "@agent-html",
    "ahtml",
    "bin",
    "ahtml.mjs",
  )
  const commandMetadataPath = path.join(
    consumerDir,
    "node_modules",
    "@agent-html",
    "ahtml",
    "src",
    "cli",
    "command-contract.mjs",
  )
  const { commandMetadata } = await import(
    pathToFileURL(commandMetadataPath).href
  )
  const runtimeContractPath = path.join(
    consumerDir,
    "node_modules",
    "@agent-html",
    "ahtml",
    "src",
    "config",
    "runtime-contract.mjs",
  )
  const installedCorePackagePath = path.join(
    consumerDir,
    "node_modules",
    "@agent-html",
    "core",
  )
  const [coreModule, runtimeContractModule] = await Promise.all([
    import(pathToFileURL(path.join(installedCorePackagePath, "index.mjs")).href),
    import(pathToFileURL(runtimeContractPath).href),
  ])

  if (
    typeof coreModule.sanitizeAgentHtml !== "function" ||
    !Array.isArray(coreModule.VALIDATED_STANDARD_COMPONENT_SCHEMAS) ||
    typeof coreModule.createPublicAgentContract !== "function"
  ) {
    throw new Error(
      "Installed @agent-html/ahtml package cannot consume @agent-html/core exports.",
    )
  }

  if (
    typeof runtimeContractModule.createRuntimeContract !== "function" ||
    typeof runtimeContractModule.createRuntimeContractFromSchema !== "function"
  ) {
    throw new Error(
      "Installed @agent-html/ahtml package is missing runtime contract exports.",
    )
  }

  await expectPathPresent(installedCorePackagePath)

  await expectStdout(["prompt", "--format", "prompt"], "Write agent-html only.")
  await expectStdout(["--help"], "Main workflow:")
  await expectStdout(["--help"], "ahtml prompt")
  for (const command of Object.keys(commandMetadata)) {
    await expectStdout([command, "--help"], `ahtml ${command}`)
  }
  await expectStdout(["prompt", "--format", "json"], '"components"')

  await expectStdout(
    ["setup", "--yes", "--component-source", "shadcn-cli"],
    "ahtml runtime ready",
  )
  await expectStdout(
    ["setup", "--yes", "--component-source", "shadcn-cli"],
    "ahtml runtime already ready",
  )
  await expectStdout(["doctor"], "ok runtime:manifest shadcn-runtime")
  await expectStdout(["doctor"], "ok runtime:base radix")
  await expectStdout(["doctor"], "ok runtime:shadcn-surface shadcn-init/vite")
  await expectStdout(
    ["doctor"],
    "ok runtime:shadcn-provenance shadcn-template-override/shadcn-cli/",
  )
  await expectStdout(["doctor"], "ok runtime:prompt-ui-manifest")
  await expectStdout(["doctor"], "ok runtime:shadcn-template-vite-config")
  await expectStdout(["doctor"], "skip artifact:built-css")
  await expectFile(
    path.join(runtimeHome, "config", "runtime.json"),
    "ahtml-managed-runtime",
  )
  await expectFile(
    path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
    "ahtml-prompt-ui-manifest",
  )
  await expectFile(
    path.join(runtimeHome, "config", "runtime.json"),
    "shadcn-template-override",
  )
  const documentPath = path.join(consumerDir, "artifact.agent.html")
  const outputDir = path.join(consumerDir, "dist", "html")
  await writeFile(
    documentPath,
    [
      '<meta-agent style-ref="ops-compact" />',
      '<page title="Packed CLI"><card title="Overview">Built from an installed package.</card></page>',
    ].join("\n"),
  )

  await runAhtml(["build", "--input", documentPath, "--out", outputDir])
  await expectFile(path.join(outputDir, "index.html"), "Packed CLI")
  await expectFile(path.join(outputDir, "index.html"), "Overview")
  await expectFile(
    path.join(outputDir, "index.html"),
    "Built from an installed package.",
  )
  await expectFile(
    path.join(outputDir, "assets", "ahtml.css"),
    "background-color:var(--background)",
  )
  await expectFile(
    path.join(outputDir, "agent-html.inspect.json"),
    "agent-html-inspection",
  )
  await expectFile(
    path.join(runtimeHome, "runtime", "document.generated.json"),
    "Built from an installed package.",
  )
  await expectFile(
    path.join(runtimeHome, "runtime", "vite.config.ts"),
    "defineConfig",
  )
  await expectFile(
    path.join(runtimeHome, "runtime", "vite.ahtml.config.mjs"),
    "vite.config.ts",
  )
  await expectFile(
    path.join(runtimeHome, "runtime", "vite.ahtml.config.mjs"),
    "mergeConfig",
  )
  await assertNoProjectScaffold(consumerDir)

  await expectStdout(["inspect", "--input", documentPath], "card: 1")
  await expectStdout(["inspect", "--dir", outputDir], "card: 1")
  await expectStdout(["doctor"], "ok environment:node")
  await expectStdout(["doctor"], "ok runtime:manifest")
  await expectStdout(["doctor"], "ok artifact:built-css assets/")
  await expectPreview(documentPath, path.join(consumerDir, "dist", "preview"))

  await expectFailure(
    ["prompt", "--input", documentPath],
    "ahtml prompt [--format prompt|json] [--out <path>] does not accept --input.",
  )
  await expectFailure(
    ["inspect"],
    "inspect requires --input <path> or --dir <dir>.",
  )
  await expectFailure(["config", "get"], 'Unknown command "config"')
  await expectFailure(["init"], 'Unknown command "init"')
  await expectFailure(["compose"], 'Unknown command "compose"')
  await expectFailure(
    ["schema", "--input", documentPath],
    'Unknown command "schema"',
  )
  await expectStdout(["validate", "--input", documentPath], "card: 1")

  await expectFailure(
    [
      "build",
      "--input",
      await writeTempFile(
        consumerDir,
        "invalid.agent.html",
        '<page title="Bad"><card className="x" /></page>',
      ),
      "--out",
      path.join(consumerDir, "dist", "invalid"),
    ],
    "unknown-attr",
  )

  await expectInstalledConformance(coreModule)

  console.log("Packed ahtml verification passed.")
} finally {
  await shadcnTestServer.close()
  await rm(tempRoot, { force: true, recursive: true })
}

function parsePackFiles(stdout) {
  const result = JSON.parse(stdout)[0]
  return result.files.map((item) => item.path)
}

function runNpm(args, cwd) {
  return execFileAsync(npmCommand, args, {
    cwd,
    ...windowsShellOptions,
  })
}

function runAhtml(args) {
  return execFileAsync(ahtmlCommand, args, {
    cwd: consumerDir,
    env: getAhtmlEnv(),
    ...windowsShellOptions,
  })
}

async function expectStdout(args, expected) {
  const result = await runAhtml(args)

  if (!result.stdout.includes(expected)) {
    throw new Error(`Expected stdout to include "${expected}".`)
  }
}

async function expectFile(filePath, expected) {
  const source = await readFile(filePath, "utf8")

  if (!source.includes(expected)) {
    throw new Error(`Expected ${filePath} to include "${expected}".`)
  }
}

async function expectPathMissing(filePath) {
  try {
    await stat(filePath)
  } catch (error) {
    if (error?.code === "ENOENT") {
      return
    }

    throw error
  }

  throw new Error(`Expected path to be absent: ${filePath}`)
}

async function expectPathPresent(filePath) {
  await stat(filePath)
}

async function assertNoProjectScaffold(directory) {
  await expectPathMissing(path.join(directory, "src"))
  await expectPathMissing(path.join(directory, "vite.config.ts"))
  await expectPathMissing(path.join(directory, "components.json"))
  await expectPathMissing(path.join(directory, "agent-html.project.json"))
}

async function expectFailure(args, expectedStderr) {
  try {
    await runAhtml(args)
  } catch (error) {
    if (String(error.stderr).includes(expectedStderr)) {
      return
    }

    throw error
  }

  throw new Error(`Expected command to fail with "${expectedStderr}".`)
}

async function expectPreview(inputPath, outputDir) {
  const child = spawn(
    process.execPath,
    [
      ahtmlScriptPath,
      "preview",
      "--input",
      inputPath,
      "--out",
      outputDir,
      "--port",
      "0",
    ],
    {
      cwd: consumerDir,
      env: getAhtmlEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  )

  try {
    const url = await waitForPreviewUrl(child)
    const response = await fetch(url)
    const body = await response.text()

    if (!body.includes("Built from an installed package.")) {
      throw new Error("Expected preview response to include built content.")
    }
  } finally {
    child.kill("SIGTERM")
    await waitForProcessExit(child)
  }
}

async function expectInstalledConformance(coreModule) {
  for (const fixture of createConformanceFixtures()) {
    const inputPath = await writeTempFile(
      consumerDir,
      `${fixture.name.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}.agent.html`,
      fixture.source,
    )
    const coreResult = normalizeConformanceResult({
      ok: true,
      ...toCoreConformanceResult(coreModule.sanitizeAgentHtml(fixture.source)),
    })
    const cliResult = await runInstalledValidateJson(inputPath)

    assertConformanceResultMatchesFixture(fixture.expect, coreResult)
    assertConformanceResultMatchesFixture(fixture.expect, cliResult)

    if (JSON.stringify(cliResult) !== JSON.stringify(coreResult)) {
      throw new Error(
        `Installed conformance mismatch for "${fixture.name}": ${JSON.stringify({ coreResult, cliResult })}`,
      )
    }
  }
}

function toCoreConformanceResult(result) {
  return {
    ok: result.diagnostics.length === 0,
    documentStyleConfigReference:
      result.document?.meta.documentStyleConfigReference,
    components: createInspectionCounts(result.document?.components ?? []),
    diagnosticCodes: result.diagnostics.map((diagnostic) => diagnostic.code),
  }
}

async function runInstalledValidateJson(inputPath) {
  try {
    const result = await runAhtml([
      "validate",
      "--input",
      inputPath,
      "--format",
      "json",
    ])
    const parsed = JSON.parse(result.stdout)
    return normalizeConformanceResult({
      ok: parsed.ok,
      documentStyleConfigReference:
        parsed.inspection?.config?.documentStyleConfigReference,
      components: parsed.inspection?.components ?? [],
      diagnosticCodes: (parsed.diagnostics ?? []).map((diagnostic) => diagnostic.code),
    })
  } catch (error) {
    const parsed = JSON.parse(String(error.stdout ?? "{}"))
    return normalizeConformanceResult({
      ok: parsed.ok,
      documentStyleConfigReference:
        parsed.inspection?.config?.documentStyleConfigReference,
      components: parsed.inspection?.components ?? [],
      diagnosticCodes: (parsed.diagnostics ?? []).map((diagnostic) => diagnostic.code),
    })
  }
}

function createInspectionCounts(nodes, counts = {}) {
  for (const node of nodes) {
    if (node.type !== "component") {
      continue
    }

    counts[node.name] = (counts[node.name] ?? 0) + 1
    createInspectionCounts(node.children ?? [], counts)
  }

  return Object.entries(counts).map(([name, count]) => ({ name, count }))
}

async function waitForPreviewUrl(child) {
  return new Promise((resolve, reject) => {
    let stdout = ""
    let stderr = ""
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for preview URL. ${stderr}`))
    }, 30000)

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      stdout += chunk
      const match = stdout.match(/Preview: (http:\/\/127\.0\.0\.1:\d+)/)

      if (match) {
        clearTimeout(timeout)
        resolve(match[1])
      }
    })
    child.stderr.on("data", (chunk) => {
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

async function waitForProcessExit(child) {
  if (child.exitCode !== null) {
    return
  }

  await new Promise((resolve) => {
    child.on("exit", () => resolve())
  })
}

async function writeTempFile(directory, name, source) {
  const filePath = path.join(directory, name)
  await writeFile(filePath, source)
  return filePath
}

function getAhtmlEnv() {
  return {
    ...process.env,
    AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE: "1",
    AHTML_HOME: runtimeHome,
    AHTML_NO_UPDATE_CHECK: "1",
    AHTML_SHADCN_TEMPLATE_DIR: path.join(
      root,
      "scripts",
      "shadcn-test-fixtures",
      "template",
      "shadcn-template",
    ),
    REGISTRY_URL: shadcnTestServer.registryUrl,
  }
}
