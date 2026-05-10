import { execFile, spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const root = process.cwd()
const npmCommand = "npm"
const windowsShellOptions =
  process.platform === "win32" ? { shell: true } : undefined
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ahtml-pack-"))
const packDir = path.join(tempRoot, "pack")
const consumerDir = path.join(tempRoot, "consumer")
let ahtmlCommand
let ahtmlScriptPath
let commandMetadataPath

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
    "agent-html-sandbox",
    "bin",
    "ahtml.mjs",
  )
  commandMetadataPath = path.join(
    consumerDir,
    "node_modules",
    "agent-html-sandbox",
    "scripts",
    "agent-html-cli-commands.mjs",
  )
  const { commandMetadata } = await import(
    pathToFileURL(commandMetadataPath).href
  )

  await expectStdout(
    ahtmlCommand,
    ["schema", "--format", "prompt"],
    "Write agent-html only.",
  )
  await expectStdout(ahtmlCommand, ["--help"], "Closed-loop workflow:")
  for (const command of Object.keys(commandMetadata)) {
    await expectStdout(ahtmlCommand, [command, "--help"], `ahtml ${command}`)
  }
  await expectStdout(
    ahtmlCommand,
    ["schema", "--format", "json"],
    '"components"',
  )

  const inputPath = path.join(consumerDir, "composition.json")
  const documentPath = path.join(consumerDir, "artifact.agent.html")
  const outputDir = path.join(consumerDir, "dist", "html")
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
        props: { title: "Packed CLI" },
        children: [
          {
            name: "card",
            props: { title: "Overview" },
            children: ["Built from an installed package."],
          },
        ],
      },
    }),
  )

  await runAhtml(["compose", "--input", inputPath, "--out", documentPath])
  await expectFile(documentPath, "Packed CLI")

  await execFileWithInput(
    ahtmlCommand,
    ["compose", "--stdin", "--out", path.join(consumerDir, "stdin.agent.html")],
    JSON.stringify({
      document: {
        name: "page",
        props: { title: "Packed Stdin" },
        children: [{ name: "card", children: ["Composed from stdin."] }],
      },
    }),
  )
  await expectFile(path.join(consumerDir, "stdin.agent.html"), "Packed Stdin")

  await runAhtml(["build", "--input", documentPath, "--out", outputDir])
  await expectFile(
    path.join(outputDir, "index.html"),
    "Built from an installed package.",
  )
  await expectFile(
    path.join(outputDir, "agent-html.inspect.json"),
    "agent-html-inspection",
  )

  await expectStdout(
    ahtmlCommand,
    ["validate", "--input", documentPath],
    "agent-html valid",
  )
  await expectStdout(
    ahtmlCommand,
    ["inspect", "--input", documentPath],
    "card: 1",
  )
  await expectStdout(ahtmlCommand, ["inspect", "--dir", outputDir], "card: 1")
  await expectStdout(ahtmlCommand, ["doctor"], "ok environment:node")
  await expectPreview(documentPath, path.join(consumerDir, "dist", "preview"))

  await expectStdout(ahtmlCommand, ["config", "get"], '"density"')
  await runAhtml(["config", "set", "density", "compact"])
  await expectStdout(ahtmlCommand, ["config", "get"], '"compact"')
  await expectFailure(
    ahtmlCommand,
    ["config", "set", "density", "loose"],
    "Invalid value",
  )
  await expectFailure(
    ahtmlCommand,
    ["schema", "--input", documentPath],
    "does not accept --input",
  )

  await expectFailure(
    ahtmlCommand,
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

  await expectFailure(
    ahtmlCommand,
    [
      "compose",
      "--input",
      await writeTempFile(
        consumerDir,
        "blocked.json",
        JSON.stringify({
          document: {
            name: "page",
            props: { title: "Bad", className: "x" },
            children: [],
          },
        }),
      ),
    ],
    "Blocked implementation prop",
  )

  console.log("Packed ahtml verification passed.")
} finally {
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
    ...windowsShellOptions,
  })
}

function assertPackBoundary(files) {
  const forbiddenPrefixes = [
    "blueprint/",
    "spec/",
    "tests/",
    ".gitnexus/",
    "dist/",
    "build/",
    "coverage/",
  ]
  const forbiddenFiles = ["agent-html.config.json", "artifact.agent.html"]
  const forbiddenSuffixes = [".test.ts", ".test.tsx"]
  const requiredFiles = [
    "bin/ahtml.mjs",
    "scripts/agent-html-cli-contract.mjs",
    "scripts/agent-html-cli-commands.mjs",
    "scripts/agent-html-cli.mjs",
    "scripts/agent-html-cli-schema.mjs",
    "scripts/agent-html-cli-validate.mjs",
    "scripts/inline-dist-index.mjs",
    "src/App.tsx",
    "src/main.tsx",
    "src/index.css",
    "src/agent-html/component-schema.ts",
    "src/agent-html/generated/component-schema.generated.ts",
    "src/agent-html/render-config.ts",
    "src/agent-html/parse/parse-agent-html.ts",
    "src/agent-html/renderer/AgentHtmlRenderer.tsx",
    "index.html",
    "vite.config.ts",
    "package.json",
    "README.md",
  ]

  for (const file of files) {
    if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
      throw new Error(`Forbidden package file included: ${file}`)
    }

    if (forbiddenFiles.includes(file)) {
      throw new Error(`Local artifact/config file included: ${file}`)
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

async function expectStdout(command, args, expected) {
  const result = await execFileAsync(command, args, {
    cwd: consumerDir,
    ...windowsShellOptions,
  })

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

async function expectFailure(command, args, expectedStderr) {
  try {
    await execFileAsync(command, args, {
      cwd: consumerDir,
      ...windowsShellOptions,
    })
  } catch (error) {
    if (String(error.stderr).includes(expectedStderr)) {
      return
    }

    throw error
  }

  throw new Error(`Expected command to fail with "${expectedStderr}".`)
}

async function execFileWithInput(command, args, input) {
  await new Promise((resolve, reject) => {
    let stderr = ""
    const child = spawn(command, args, {
      cwd: consumerDir,
      ...windowsShellOptions,
      stdio: ["pipe", "ignore", "pipe"],
    })

    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr || `${command} exited with code ${code}`))
    })
    child.stdin.end(input)
  })
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
