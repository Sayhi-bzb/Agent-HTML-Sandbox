import {
  cancel as cancelPrompt,
  confirm,
  isCancel,
  select,
  spinner,
} from "@clack/prompts"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { cliDefaults } from "../config/defaults.mjs"
import {
  createArtifactWorkflow,
  formatInspectionSummary,
} from "./artifact-workflow.mjs"
import {
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
import { getRuntimePaths } from "./runtime-paths.mjs"
import {
  isInteractiveRuntimeSetup,
  resolveRuntimeSetup,
  RuntimeSetupCancelledError,
} from "./runtime-setup.mjs"
import { bootstrapManagedRuntime, getRuntimeStatus } from "./runtime-status.mjs"
import { parsePort, serveDirectory } from "./preview-server.mjs"

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
  prompt: promptCommand,
  build: buildCommand,
  inspect: inspectCommand,
  preview: previewCommand,
  doctor: doctorCommand,
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
    if (status.ready && isInteractiveRuntimeSetup()) {
      await defaultActionCommand()
      return
    }

    printGlobalHelp()
    if (!status.ready) {
      process.stdout.write("\nRun ahtml setup to prepare the runtime.\n")
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
  await defaultActionCommand()
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

async function promptCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)
  if (positionals.length > 0) {
    fail(`Unexpected argument "${positionals[0]}".`)
  }
  const format = options.format ?? "prompt"

  if (format !== "prompt" && format !== "json") {
    fail('prompt --format must be "prompt" or "json".')
  }

  const cliSchema = await getCliSchemaOutput()
  const output =
    format === "json"
      ? `${JSON.stringify(cliSchema, null, 2)}\n`
      : `${formatPrompt(cliSchema)}\n`

  await writeOrPrint(output, options.out)
}

async function setupCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)
  if (positionals.length > 0) {
    fail(`Unexpected argument "${positionals[0]}".`)
  }
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
  process.stdout.write("Next: run ahtml\n")
}

async function buildCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)
  const inputPath = options.input ?? positionals[0] ?? cliDefaults.documentPath
  const format = options.format ?? "text"

  if (positionals.length > 1) {
    fail(`Unexpected argument "${positionals[1]}".`)
  }

  if (format !== "text" && format !== "json") {
    fail('build --format must be "text" or "json".')
  }

  const result = await buildArtifact(inputPath, options.out, {
    printDiagnostics: format !== "json",
  })

  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  }
}

async function previewCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)
  const inputPath = options.input ?? positionals[0] ?? cliDefaults.documentPath

  if (positionals.length > 1) {
    fail(`Unexpected argument "${positionals[1]}".`)
  }

  const result = await buildArtifact(inputPath, options.out)
  if (!result?.ok) {
    return
  }

  const port = parsePort(options.port ?? cliDefaults.previewPort)
  await serveDirectory(result.outputDir, port)
}

async function inspectCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)
  if (positionals.length > 0) {
    fail(`Unexpected argument "${positionals[0]}".`)
  }

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

function fail(message) {
  console.error(message)
  process.exit(1)
}

async function defaultActionCommand() {
  const choice = await select({
    message: "What do you want to do?",
    options: [
      {
        value: "prompt",
        label: "Print the writing prompt",
        hint: "Show the agent-facing schema prompt",
      },
      {
        value: "build",
        label: `Build ${cliDefaults.documentPath}`,
        hint: `Write static HTML to ${cliDefaults.outputDir}`,
      },
      {
        value: "preview",
        label: `Preview ${cliDefaults.documentPath}`,
        hint: `Build and serve on port ${cliDefaults.previewPort}`,
      },
      {
        value: "doctor",
        label: "Run doctor",
        hint: "Check runtime health and output paths",
      },
      {
        value: "help",
        label: "Show command help",
        hint: "Print the compact command list",
      },
    ],
  })

  if (isCancel(choice)) {
    cancelPrompt("No action selected.")
    return
  }

  switch (choice) {
    case "prompt":
      await promptCommand([], commandDefinitions.prompt)
      return
    case "build":
      await buildCommand([cliDefaults.documentPath], commandDefinitions.build)
      return
    case "preview":
      await previewCommand(
        [cliDefaults.documentPath],
        commandDefinitions.preview,
      )
      return
    case "doctor":
      await doctorCommand([])
      return
    default:
      printGlobalHelp()
  }
}
