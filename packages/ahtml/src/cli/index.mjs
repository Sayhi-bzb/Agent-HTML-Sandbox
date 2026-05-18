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
import { StyleProfileSchema } from "../config/internal-core-bridge.mjs"
import {
  ArtifactWorkflowValidationError,
  createArtifactWorkflow,
  formatInspectionSummary,
} from "./artifact-workflow.mjs"
import { createGalleryWorkflow } from "./gallery-workflow.mjs"
import {
  readPackageVersion as readPackageVersionFromPackage,
  writeOrPrint,
} from "./cli-io.mjs"
import { parseOptions } from "./cli-options.mjs"
import {
  createCommandDefinitions,
  defaultActionMenuItems,
  formatCommandHelp,
  formatGlobalHelp,
  hasHelpFlag,
  isHelpCommand,
  resolveCommandFormat,
} from "./command-contract.mjs"
import { runDoctorCommand } from "./doctor-checks.mjs"
import { formatPrompt, getCliSchemaOutput } from "./schema.mjs"
import { getRuntimePaths } from "./runtime-paths.mjs"
import {
  isInteractiveRuntimeSetup,
  resolveRuntimeSetup,
  RuntimeSetupCancelledError,
} from "./runtime-setup.mjs"
import { bootstrapManagedRuntime, getRuntimeStatus } from "./runtime-status.mjs"
import {
  parsePort,
  readJsonBody,
  serveDirectory,
  writeJsonResponse,
} from "./preview-server.mjs"
import {
  getStyleProfileSource,
  listStyleProfileReferences,
  resolveStyleProfileByReference,
  saveUserStyleProfile,
} from "./style-profile-storage.mjs"

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
const defaultGalleryOutputDir = path.join(
  userRoot,
  ...cliDefaults.galleryOutputDir.split("/"),
)
const {
  buildArtifact,
  ensureManagedRuntime,
  inspectArtifactDir,
  inspectDocument,
  validateDocument,
} = createArtifactWorkflow({
  userRoot,
  defaultOutputDir,
  packageRoot,
  runtimePaths,
  readPackageVersion,
})
const { buildGalleryArtifact } = createGalleryWorkflow({
  userRoot,
  defaultOutputDir: defaultGalleryOutputDir,
  packageRoot,
  runtimePaths,
  readPackageVersion,
  ensureManagedRuntime,
})
const command = process.argv[2]
const args = process.argv.slice(3)
const commandHandlers = {
  setup: setupCommand,
  prompt: promptCommand,
  validate: validateCommand,
  build: buildCommand,
  inspect: inspectCommand,
  preview: previewCommand,
  gallery: galleryCommand,
  doctor: doctorCommand,
}
const commandDefinitions = createCommandDefinitions(commandHandlers)

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
  const format = resolveCommandFormat("prompt", definition, options.format)

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
  const format = resolveCommandFormat("build", definition, options.format)

  if (positionals.length > 1) {
    fail(`Unexpected argument "${positionals[1]}".`)
  }

  const result = await buildArtifact(inputPath, options.out, {
    printDiagnostics: format !== "json",
  })

  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  }

  if (!result.ok) {
    process.exitCode = 1
  }
}

async function validateCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)

  if (positionals.length > 0) {
    fail(`Unexpected argument "${positionals[0]}".`)
  }

  if (!options.input) {
    fail("validate requires --input <path>.")
  }

  const format = resolveCommandFormat("validate", definition, options.format)

  const result = await validateDocument(options.input, {
    printDiagnostics: format !== "json",
  })

  if (format === "json") {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else if (result.ok) {
    process.stdout.write(formatInspectionSummary(result.inspection))
  }

  if (!result.ok) {
    process.exitCode = 1
  }
}

async function previewCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)
  const inputPath = options.input ?? positionals[0] ?? cliDefaults.documentPath

  if (positionals.length > 1) {
    fail(`Unexpected argument "${positionals[1]}".`)
  }

  const port = parsePort(options.port ?? cliDefaults.previewPort, "preview")

  const result = await buildArtifact(inputPath, options.out)
  if (!result?.ok) {
    process.exitCode = 1
    return
  }

  await serveDirectory(result.outputDir, port)
}

async function galleryCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)

  if (positionals.length > 0) {
    fail(`Unexpected argument "${positionals[0]}".`)
  }

  if (!options["style-ref"]) {
    fail("gallery requires --style-ref <id>.")
  }

  const port = parsePort(options.port ?? cliDefaults.previewPort, "gallery")

  const result = await buildGalleryArtifact(options["style-ref"], options.out)

  if (!result?.ok) {
    process.exitCode = 1
    return
  }

  await serveDirectory(result.outputDir, port, {
    requestHandler: createGalleryRequestHandler({
      styleReference: options["style-ref"],
    }),
  })
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

  const format = resolveCommandFormat("inspect", definition, options.format)

  let inspection
  try {
    inspection = options.input
      ? await inspectDocument(options.input)
      : await inspectArtifactDir(options.dir)
  } catch (error) {
    if (error instanceof ArtifactWorkflowValidationError) {
      process.exitCode = 1
      process.stdout.write(`${error.message}\n`)
      process.stdout.write("\n")
      for (const diagnostic of error.diagnostics) {
        process.stdout.write(
          `${diagnostic.severity} ${diagnostic.code} ${diagnostic.path} ${diagnostic.message}\n`,
        )
      }
      return
    }

    throw error
  }
  const output =
    format === "json"
      ? `${JSON.stringify(inspection, null, 2)}\n`
      : formatInspectionSummary(inspection)

  process.stdout.write(output)
}

async function doctorCommand(commandArgs, definition) {
  const { options, positionals } = parseOptions(commandArgs, definition)

  if (positionals.length > 0) {
    fail(`Unexpected argument "${positionals[0]}".`)
  }

  const format = resolveCommandFormat("doctor", definition, options.format)
  const report = await runDoctorCommand({
    defaultOutputDir,
    ensureManagedRuntime,
    format,
    packageRoot,
    readPackageVersion,
    runtimePaths,
  })

  if (report.status === "fail") {
    process.exitCode = 1
  }
}

function createGalleryRequestHandler({ styleReference }) {
  let currentStyleReference = styleReference
  let currentStyleProfilePromise = loadGalleryStyleProfile(styleReference)

  return async ({ request, response }) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost")

    if (
      request.method === "GET" &&
      requestUrl.pathname === "/__ahtml/gallery/state"
    ) {
      const styleProfile = await currentStyleProfilePromise

      writeJsonResponse(response, 200, {
        ok: true,
        availableStyleReferences: await listStyleProfileReferences(runtimePaths),
        profileSource: styleProfile.source,
        styleReference: currentStyleReference,
        styleProfile: styleProfile.profile,
      })
      return true
    }

    if (
      request.method === "POST" &&
      requestUrl.pathname === "/__ahtml/gallery/save"
    ) {
      try {
        const body = await readJsonBody(request)
        const profileInput = StyleProfileSchema.parse(body.styleProfile)
        const saveMode = body.mode === "save-as" ? "save-as" : "save"
        const targetId =
          saveMode === "save-as"
            ? String(body.targetId ?? "").trim()
            : profileInput.id
        const profile = { ...profileInput, id: targetId }
        const source = body.profileSource === "builtin" ? "builtin" : "user"

        if (!targetId) {
          writeJsonResponse(response, 400, {
            ok: false,
            error: "save target id is required.",
          })
          return true
        }

        if (saveMode === "save" && source === "builtin") {
          writeJsonResponse(response, 400, {
            ok: false,
            error:
              "Built-in style profiles cannot be overwritten. Use Save As.",
          })
          return true
        }

        const saved = await saveUserStyleProfile(runtimePaths, profile, {
          overwrite: saveMode === "save",
        })
        currentStyleReference = saved.id
        currentStyleProfilePromise = Promise.resolve({
          profile: saved.profile,
          source: saved.source,
        })

        writeJsonResponse(response, 200, {
          ok: true,
          profileSource: saved.source,
          styleReference: saved.id,
          styleProfile: saved.profile,
          overwritten: saved.overwritten,
        })
      } catch (error) {
        writeJsonResponse(response, 400, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      return true
    }

    return false
  }
}

async function loadGalleryStyleProfile(styleReference) {
  const profile = await resolveStyleProfileByReference(runtimePaths, styleReference)

  if (!profile) {
    fail(`Unable to load style profile "${styleReference}".`)
  }

  return {
    profile,
    source: getStyleProfileSource(styleReference),
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

async function defaultActionCommand() {
  const choice = await select({
    message: "What do you want to do?",
    options: defaultActionMenuItems,
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
