import { execFile, spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

import { startShadcnTestServer } from "./shadcn-test-server.mjs"

const execFileAsync = promisify(execFile)
const root = process.cwd()
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

  const dryRun = await runNpm(["pack", "--dry-run", "--json"], root)
  const dryRunFiles = parsePackFiles(dryRun.stdout)
  assertPackBoundary(dryRunFiles)

  const packed = await runNpm(
    ["pack", "--json", "--pack-destination", packDir],
    root,
  )
  const tarball = path.join(packDir, JSON.parse(packed.stdout)[0].filename)

  await runNpm(["init", "-y"], consumerDir)
  await runNpm(["install", tarball], consumerDir)

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
    "commands.mjs",
  )
  const { commandMetadata } = await import(
    pathToFileURL(commandMetadataPath).href
  )

  await expectStdout(["schema", "--format", "prompt"], "Write agent-html only.")
  await expectStdout(["--help"], "Closed-loop workflow:")
  await expectStdout(["--help"], "ahtml setup --yes")
  for (const command of Object.keys(commandMetadata)) {
    await expectStdout([command, "--help"], `ahtml ${command}`)
  }
  await expectStdout(["schema", "--format", "json"], '"components"')

  await expectStdout(
    ["setup", "--yes", "--component-source", "shadcn-cli"],
    "ahtml runtime ready",
  )
  await expectStdout(
    ["setup", "--yes", "--component-source", "shadcn-cli"],
    "ahtml runtime already ready",
  )
  await expectStdout(["status"], "ready: yes")
  await expectStdout(["status"], "runtime manifest: ok")
  await expectStdout(["status"], "ui library: shadcn")
  await expectStdout(["status"], "component source: shadcn-cli")
  await expectStdout(["status"], "runtime shell: ahtml-managed-shell")
  await expectStdout(["status"], "prompt-ui manifest: ok")
  await expectStdout(
    ["status"],
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
  await expectStdout(["status"], "ready: yes")
  await expectStdout(
    ["status"],
    "Next: ahtml build --input artifact.agent.html --out dist/html",
  )

  const documentPath = path.join(consumerDir, "artifact.agent.html")
  const outputDir = path.join(consumerDir, "dist", "html")
  await writeFile(
    documentPath,
    [
      '<meta-agent profile="ops-compact" />',
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
  await expectFile(path.join(outputDir, "assets", "ahtml.css"), "ahtml-card")
  await expectFile(
    path.join(outputDir, "agent-html.inspect.json"),
    "agent-html-inspection",
  )
  await expectFile(
    path.join(runtimeHome, "runtime", "document.generated.json"),
    "Built from an installed package.",
  )
  await assertNoProjectScaffold(consumerDir)

  await expectStdout(["validate", "--input", documentPath], "agent-html valid")
  await expectStdout(["inspect", "--input", documentPath], "card: 1")
  await expectStdout(["inspect", "--dir", outputDir], "card: 1")
  await expectStdout(["doctor"], "ok environment:node")
  await expectStdout(["doctor"], "ok runtime:manifest")
  await expectPreview(documentPath, path.join(consumerDir, "dist", "preview"))

  await expectStdout(["config", "get"], '"report-default"')
  await expectFailure(
    ["config", "set", "density", "compact"],
    "config accepts only get",
  )
  await expectFailure(
    ["schema", "--input", documentPath],
    "does not accept --input",
  )
  await expectFailure(["init"], 'Unknown command "init"')
  await expectFailure(["compose"], 'Unknown command "compose"')

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

function assertPackBoundary(files) {
  const forbiddenPrefixes = [
    "blueprint/",
    "spec/",
    "tests/",
    "src/components/ui/",
    "src/agent-html/renderer/",
    "src/engine/examples/",
    "scripts/agent-html-cli",
    ".gitnexus/",
    "dist/",
    "build/",
    "coverage/",
  ]
  const forbiddenFiles = [
    "agent-html.config.json",
    "agent-html.project.json",
    "artifact.agent.html",
    "src/config/project.mjs",
    "src/cli/scaffold.mjs",
  ]
  const forbiddenSuffixes = [".test.ts", ".test.tsx"]
  const requiredFiles = [
    "bin/ahtml.mjs",
    "src/config/defaults.mjs",
    "src/cli/commands.mjs",
    "src/cli/index.mjs",
    "src/cli/module-loader.mjs",
    "src/cli/runtime-paths.mjs",
    "src/cli/runtime-setup.mjs",
    "src/cli/runtime-status.mjs",
    "src/cli/runtime-build.mjs",
    "src/cli/runtime-template.mjs",
    "src/cli/runtime-template/src/app.tsx",
    "src/config/component-capabilities.mjs",
    "src/cli/schema.mjs",
    "src/cli/shadcn-api.mjs",
    "src/cli/validate.mjs",
    "src/engine/component-schema.ts",
    "src/engine/core.ts",
    "src/engine/generated/component-schema.generated.ts",
    "src/engine/render-config.ts",
    "src/engine/parse/parse-agent-html.ts",
    "package.json",
    "README.md",
  ]

  for (const file of files) {
    if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
      throw new Error(`Forbidden package file included: ${file}`)
    }

    if (forbiddenFiles.includes(file)) {
      throw new Error(`Forbidden package file included: ${file}`)
    }

    if (forbiddenSuffixes.some((suffix) => file.endsWith(suffix))) {
      throw new Error(`Test file included in package: ${file}`)
    }
  }

  for (const requiredFile of requiredFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(`Required package file missing: ${requiredFile}`)
    }
  }
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
    AHTML_HOME: runtimeHome,
    AHTML_NO_UPDATE_CHECK: "1",
    REGISTRY_URL: shadcnTestServer.registryUrl,
  }
}
