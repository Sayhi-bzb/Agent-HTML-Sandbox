import {
  cancel as cancelPrompt,
  confirm,
  isCancel,
  spinner,
} from "@clack/prompts"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { cliDefaults } from "../config/defaults.mjs"
import {
  createArtifactWorkflow,
  formatInspectionSummary,
} from "./artifact-workflow.mjs"
import {
  printDiagnostics,
  readPackageVersion as readPackageVersionFromPackage,
  writeOrPrint,
} from "./cli-io.mjs"
import { parseOptions } from "./cli-options.mjs"
import {
  commandMetadata,
  formatCommandHelp,
  formatGlobalHelp,
  hasHelpFlag,
  isHelpCommand,
} from "./commands.mjs"
import { runDoctorCommand } from "./doctor-checks.mjs"
import { formatPrompt, getCliSchemaOutput } from "./schema.mjs"
import { getShadcnRuntimeProvenanceState } from "./runtime-surface.mjs"
import { checkForPackageUpdate } from "./update-check.mjs"
import { getRuntimePaths } from "./runtime-paths.mjs"
import {
  isInteractiveRuntimeSetup,
  resolveRuntimeSetup,
  RuntimeSetupCancelledError,
} from "./runtime-setup.mjs"
import { bootstrapManagedRuntime, getRuntimeStatus } from "./runtime-status.mjs"
import { parsePort, serveDirectory } from "./preview-server.mjs"
import { validateAgentHtmlSource } from "./validate.mjs"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)
const readPackageVersion = () => readPackageVersionFromPackage(packageRoot)
const userRoot = process.cwd()
const runtimePaths = getRuntimePaths()
const defaultOutputDir = path.join(
  userRoot,
  ...cliDefaults.outputDir.split("/"),
)
const {
  buildArtifact,
  ensureManagedRuntime,
  inspectArtifactDir,
  inspectDocument,
} = createArtifactWorkflow({
  userRoot,
  defaultOutputDir,
  packageRoot,
  runtimePaths,
  readPackageVersion,
})
const command = process.argv[2]
const args = process.argv.slice(3)
const commandHandlers = {
  setup: setupCommand,
  schema: schemaCommand,
  validate: validateCommand,
  build: buildCommand,
  inspect: inspectCommand,
  preview: previewCommand,
  doctor: doctorCommand,
  status: statusCommand,
  config: configCommand,
}
const commandDefinitions = Object.fromEntries(
  Object.entries(commandMetadata).map(([name, definition]) => [
    name,
    { ...definition, handler: commandHandlers[name] },
  ]),
)

try {
  if (!command) {
    await defaultCommand()
  } else if (isHelpCommand(command)) {
    printGlobalHelp()
  } else if (command === "help") {
    printCommandHelp(args[0])
  } else if (hasHelpFlag(args)) {
    printCommandHelp(command)
  } else if (commandDefinitions[command]) {
    await commandDefinitions[command].handler(args, commandDefinitions[command])
  } else {
    fail(`Unknown command "${command}". Run "ahtml --help" for command list.`)
  }
} catch (error) {
  if (error instanceof RuntimeSetupCancelledError) {
    process.stdout.write("Run ahtml setup when you are ready.\n")
    process.exit(0)
  }

  fail(error instanceof Error ? error.message : String(error))
}

async function defaultCommand() {
  const packageVersion = await readPackageVersion()
  const status = await getRuntimeStatus({
    packageVersion,
    outputDir: defaultOutputDir,
    paths: runtimePaths,
  })

  if (status.ready || !isInteractiveRuntimeSetup()) {
    printGlobalHelp()
    if (!status.ready) {
      process.stdout.write("\nRun ahtml setup for guided runtime setup.\n")
    }
    return
  }

  const shouldSetup = await confirm({
    message: "Managed runtime is not configured. Run guided setup now?",
    active: "Yes",
    inactive: "No",
    initialValue: true,
  })

  if (isCancel(shouldSetup) || !shouldSetup) {
    if (isCancel(shouldSetup)) {
      cancelPrompt("Runtime setup skipped.")
    }
    printGlobalHelp()
    process.stdout.write("\nRun ahtml setup when you are ready.\n")
    return
  }

  await runSetup({})
}

function printGlobalHelp() {
  process.stdout.write(formatGlobalHelp())
}

function printCommandHelp(commandName) {
  if (!commandName) {
    printGlobalHelp()
    return
  }

  const commandDefinition = commandDefinitions[commandName]

  if (!commandDefinition) {
    fail(
      `Unknown help topic "${commandName}". Run "ahtml --help" for command list.`,
    )
  }

  process.stdout.write(formatCommandHelp(commandName, commandDefinition))
}

async function schemaCommand(commandArgs, definition) {
  const options = parseOptions(commandArgs, definition)
  const format = options.format ?? "prompt"

  if (format !== "prompt" && format !== "json") {
    fail('schema --format must be "prompt" or "json".')
  }

  const cliSchema = await getCliSchemaOutput()
  const output =
    format === "json"
      ? `${JSON.stringify(cliSchema, null, 2)}\n`
      : `${formatPrompt(cliSchema)}\n`

  await writeOrPrint(output, options.out)
}

async function setupCommand(commandArgs, definition) {
  const options = parseOptions(commandArgs, definition)
  const packageVersion = await readPackageVersion()
  const status = await getRuntimeStatus({
    packageVersion,
    outputDir: defaultOutputDir,
    paths: runtimePaths,
  })

  if (status.ready && !options.force) {
    process.stdout.write(
      `ahtml runtime already ready at ${runtimePaths.runtimeRoot}\n`,
    )
    process.stdout.write("Run ahtml setup --force to rewrite it.\n")
    return
  }

  await runSetup(options)
}

async function runSetup(options) {
  const packageVersion = await readPackageVersion()
  const setup = await resolveRuntimeSetup({ options })
  const schema = await getCliSchemaOutput()
  const progress =
    isInteractiveRuntimeSetup() && !options.yes ? spinner() : undefined

  progress?.start("Preparing managed runtime...")
  let manifest
  try {
    manifest = await bootstrapManagedRuntime({
      packageRoot,
      packageVersion,
      paths: runtimePaths,
      setup,
      schema,
    })
    progress?.stop("Runtime ready.")
  } catch (error) {
    progress?.stop("Runtime setup failed.")
    throw error
  }

  process.stdout.write("ahtml runtime ready\n")
  process.stdout.write(`runtime root: ${runtimePaths.runtimeRoot}\n`)
  process.stdout.write(`ui library: ${manifest.uiLibrary}\n`)
  process.stdout.write(`component source: ${manifest.componentSource}\n`)
  process.stdout.write(`runtime base: ${manifest.runtimeBase}\n`)
  process.stdout.write(
    `runtime surface: ${manifest.shadcnRuntimeSurface?.source ?? "unknown"}\n`,
  )
  process.stdout.write(`preset: ${manifest.preset}\n`)
  process.stdout.write(
    `components: ${manifest.installedUiComponents.join(", ")}\n`,
  )
  process.stdout.write(
    `renderable agent components: ${manifest.renderableAgentComponents.join(", ")}\n`,
  )
  process.stdout.write(
    `prompt-ui manifest: ${runtimePaths.promptUiManifestPath}\n`,
  )
}

async function validateCommand(commandArgs, definition) {
  const options = parseOptions(commandArgs, definition)
  const inputPath = options.input

  if (!inputPath) {
    fail("validate requires --input <path>.")
  }

  const source = await readFile(path.resolve(userRoot, inputPath), "utf8")
  const validation = await validateAgentHtmlSource(source)

  if (validation.diagnostics.length > 0) {
    printDiagnostics(validation.diagnostics)
    process.exitCode = 1
    return
  }

  process.stdout.write("agent-html valid\n")
}

async function buildCommand(commandArgs, definition) {
  const options = parseOptions(commandArgs, definition)

  if (!options.input) {
    fail("build requires --input <path>.")
  }

  await buildArtifact(options.input, options.out)
}

async function previewCommand(commandArgs, definition) {
  const options = parseOptions(commandArgs, definition)

  if (!options.input) {
    fail("preview requires --input <path>.")
  }

  const outputDir = await buildArtifact(options.input, options.out)
  if (!outputDir) {
    return
  }

  const port = parsePort(options.port ?? cliDefaults.previewPort)
  await serveDirectory(outputDir, port)
}

async function inspectCommand(commandArgs, definition) {
  const options = parseOptions(commandArgs, definition)

  if (options.input && options.dir) {
    fail("inspect accepts either --input or --dir, not both.")
  }

  if (!options.input && !options.dir) {
    fail("inspect requires --input <path> or --dir <dir>.")
  }

  const format = options.format ?? "summary"

  if (format !== "summary" && format !== "json") {
    fail('inspect --format must be "summary" or "json".')
  }

  const inspection = options.input
    ? await inspectDocument(options.input)
    : await inspectArtifactDir(options.dir)
  const output =
    format === "json"
      ? `${JSON.stringify(inspection, null, 2)}\n`
      : formatInspectionSummary(inspection)

  process.stdout.write(output)
}

async function doctorCommand(commandArgs) {
  await runDoctorCommand({
    commandArgs,
    defaultOutputDir,
    ensureManagedRuntime,
    packageRoot,
    readPackageVersion,
    runtimePaths,
  })
}

async function statusCommand(commandArgs) {
  if (commandArgs.length > 0) {
    fail("status does not accept arguments.")
  }

  const packageVersion = await readPackageVersion()
  await ensureManagedRuntime(packageVersion)
  const status = await getRuntimeStatus({
    packageVersion,
    outputDir: defaultOutputDir,
    paths: runtimePaths,
  })
  const update = await checkForPackageUpdate({ packageManager: "npm" })
  process.stdout.write(formatRuntimeStatus(status, update))
}

function formatRuntimeStatus(status, update) {
  const formatCheck = (value) => (value ? "ok" : "incomplete")
  const runtimeProvenance = status.manifest?.shadcnRuntimeSurface
    ? getShadcnRuntimeProvenanceState(status.manifest.shadcnRuntimeSurface)
    : null
  const lines = [
    "ahtml status",
    `ready: ${status.ready ? "yes" : "no"}`,
    `runtime root: ${status.paths.runtimeRoot}`,
    `runtime manifest: ${status.checks.manifest ? "ok" : "missing"}`,
    `runtime renderer: ${status.manifest?.renderer ?? "missing"}`,
    `ui library: ${status.manifest?.uiLibrary ?? "missing"}`,
    `component source: ${status.manifest?.componentSource ?? "missing"}`,
    `runtime base: ${status.manifest?.runtimeBase ?? "missing"}`,
    `runtime surface: ${status.manifest?.shadcnRuntimeSurface?.source ?? "missing"}`,
    `runtime shell: ${status.manifest?.shadcnRuntimeSurface?.shellSource ?? "missing"}`,
    `runtime init: ${status.manifest?.shadcnRuntimeSurface?.initSource ?? "missing"}`,
    `tailwind version: ${status.manifest?.shadcnRuntimeSurface?.tailwindVersion ?? "missing"}`,
    `runtime provenance: ${runtimeProvenance?.state ?? "missing"}`,
    `runtime preset: ${status.manifest?.preset ?? "missing"}`,
    `installed ui components: ${status.manifest?.installedUiComponents?.join(", ") ?? "missing"}`,
    `renderable agent components: ${status.manifest?.renderableAgentComponents?.join(", ") ?? "missing"}`,
    `components.json: ${formatCheck(status.checks.componentsJson)}`,
    `shadcn css entry: ${formatCheck(status.checks.shadcnCssEntry)}`,
    `shadcn css imports: ${formatCheck(status.checks.shadcnCssImports)}`,
    `shadcn css base: ${formatCheck(status.checks.shadcnCssBase)}`,
    `shadcn surface: ${formatCheck(status.checks.shadcnSurface)}`,
    `prompt-ui manifest: ${status.checks.promptUiManifest ? "ok" : "missing"}`,
    `runtime verification data: ${status.checks.runtimeCapabilities ? "ok" : "missing"}`,
    `artifact output: ${cliDefaults.outputDir}`,
    `output writable: ${status.checks.outputWritable ? "yes" : "no"}`,
    `Next: ahtml build --input ${cliDefaults.documentPath} --out ${cliDefaults.outputDir}`,
  ]

  if (!status.ready && (status.runtimeDetail || status.manifestError)) {
    lines.push(`runtime detail: ${status.runtimeDetail || status.manifestError}`)
  }

  if (update?.status === "available") {
    lines.push(
      `update: ${update.latestVersion} available. Run: ${update.command}`,
    )
  }

  return `${lines.join("\n")}\n`
}

async function configCommand(commandArgs) {
  const [subcommand, ...rest] = commandArgs

  if (rest.length > 0) {
    fail("config accepts only get.")
  }

  if (subcommand === "get") {
    const schema = await getCliSchemaOutput()
    const config = schema.renderConfig.defaults
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`)
    return
  }

  fail("config accepts only get.")
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
