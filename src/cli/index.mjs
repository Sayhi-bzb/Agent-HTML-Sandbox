import http from "node:http"
import {
  access,
  constants,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { cliDefaults } from "../config/defaults.mjs"
import {
  commandMetadata,
  formatCommandHelp,
  formatGlobalHelp,
  hasHelpFlag,
  isHelpCommand,
} from "./commands.mjs"
import { formatPrompt, getCliSchemaOutput } from "./schema.mjs"
import { checkForPackageUpdate } from "./update-check.mjs"
import { buildRuntimeArtifact } from "./runtime-build.mjs"
import { getRuntimePaths } from "./runtime-paths.mjs"
import { bundledRuntimeSetup, resolveRuntimeSetup } from "./runtime-setup.mjs"
import {
  bootstrapManagedRuntime,
  getRuntimeStatus,
  readRuntimeManifest,
  writeGeneratedDocument,
} from "./runtime-status.mjs"
import { validateAgentHtmlSource, validateRenderConfig } from "./validate.mjs"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)
const userRoot = process.cwd()
const runtimePaths = getRuntimePaths()
const defaultConfigPath = path.resolve(
  userRoot,
  process.env.AGENT_HTML_CONFIG_PATH ?? cliDefaults.configPath,
)
const defaultOutputDir = path.join(
  userRoot,
  ...cliDefaults.outputDir.split("/"),
)
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
  if (!command || isHelpCommand(command)) {
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
  fail(error instanceof Error ? error.message : String(error))
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

  const setup = await resolveRuntimeSetup({ options })
  const schema = await getCliSchemaOutput()
  const manifest = await bootstrapManagedRuntime({
    packageRoot,
    packageVersion,
    paths: runtimePaths,
    setup,
    schema,
  })

  process.stdout.write("ahtml runtime ready\n")
  process.stdout.write(`runtime root: ${runtimePaths.runtimeRoot}\n`)
  process.stdout.write(`ui library: ${manifest.uiLibrary}\n`)
  process.stdout.write(`component source: ${manifest.componentSource}\n`)
  process.stdout.write(`preset: ${manifest.preset}\n`)
  process.stdout.write(`components: ${manifest.components.join(", ")}\n`)
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
  if (commandArgs.length > 0) {
    fail("doctor does not accept arguments.")
  }

  const packageVersion = await readPackageVersion()
  await ensureManagedRuntime(packageVersion)
  const checks = []

  checks.push(
    await runDoctorCheck("environment", "node", async () => process.version),
  )
  checks.push(
    await runDoctorCheck("environment", "package-root", async () => {
      await stat(packageRoot)
      return packageRoot
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "root", async () => {
      await stat(runtimePaths.runtimeRoot)
      return runtimePaths.runtimeRoot
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "manifest", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return `${manifest.renderer} v${manifest.version} ${manifest.uiLibrary}/${manifest.componentSource}/${manifest.preset}`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "renderer-adapter", async () => {
      await stat(path.join(runtimePaths.runtimeSrcDir, "app.tsx"))
      await stat(path.join(runtimePaths.runtimeSrcDir, "main.tsx"))
      await stat(path.join(runtimePaths.runtimeSrcDir, "ssr.tsx"))
      return "React adapter ready"
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-card", async () => {
      const cardPath = path.join(runtimePaths.runtimeComponentsDir, "card.tsx")
      await stat(cardPath)
      return cardPath
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "prompt-ui-manifest", async () => {
      await stat(runtimePaths.promptUiManifestPath)
      return runtimePaths.promptUiManifestPath
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "vite-config", async () => {
      await stat(runtimePaths.runtimeViteConfigPath)
      return runtimePaths.runtimeViteConfigPath
    }),
  )
  checks.push(
    await runDoctorCheck("config", "config", async () => {
      const config = await readConfigForDoctor()
      return JSON.stringify(config)
    }),
  )
  checks.push(
    await runDoctorCheck("artifact", "output-dir", async () => {
      await mkdir(defaultOutputDir, { recursive: true })
      await access(defaultOutputDir, constants.W_OK)
      return defaultOutputDir
    }),
  )
  checks.push(await runDoctorUpdateCheck(packageVersion))

  for (const check of checks) {
    process.stdout.write(
      `${check.status} ${check.category}:${check.name} ${check.detail}\n`,
    )
  }

  if (checks.some((check) => check.status === "fail")) {
    process.exitCode = 1
  }
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
  const lines = [
    "ahtml status",
    `ready: ${status.ready ? "yes" : "no"}`,
    `runtime root: ${status.paths.runtimeRoot}`,
    `runtime manifest: ${status.checks.manifest ? "ok" : "missing"}`,
    `runtime renderer: ${status.manifest?.renderer ?? "missing"}`,
    `ui library: ${status.manifest?.uiLibrary ?? "missing"}`,
    `component source: ${status.manifest?.componentSource ?? "missing"}`,
    `runtime preset: ${status.manifest?.preset ?? "missing"}`,
    `prompt-ui manifest: ${status.checks.promptUiManifest ? "ok" : "missing"}`,
    `artifact output: ${cliDefaults.outputDir}`,
    `output writable: ${status.checks.outputWritable ? "yes" : "no"}`,
    `Next: ahtml build --input ${cliDefaults.documentPath} --out ${cliDefaults.outputDir}`,
  ]

  if (!status.ready && status.manifestError) {
    lines.push(`runtime detail: ${status.manifestError}`)
  }

  if (update?.status === "available") {
    lines.push(
      `update: ${update.latestVersion} available. Run: ${update.command}`,
    )
  }

  return `${lines.join("\n")}\n`
}

async function buildArtifact(inputPath, outputPath) {
  const source = await readFile(path.resolve(userRoot, inputPath), "utf8")
  const validation = await validateAgentHtmlSource(source)

  if (validation.diagnostics.length > 0) {
    printDiagnostics(validation.diagnostics)
    process.exitCode = 1
    return undefined
  }

  const packageVersion = await readPackageVersion()
  await ensureManagedRuntime(packageVersion)
  await writeGeneratedDocument(validation.document, runtimePaths)

  const outputDir = path.resolve(userRoot, outputPath ?? defaultOutputDir)
  await buildRuntimeArtifact({
    outputDir,
    packageRoot,
    paths: runtimePaths,
  })
  await writeJsonFile(
    path.join(outputDir, "agent-html.inspect.json"),
    createInspection(validation.document),
  )
  return outputDir
}

async function ensureManagedRuntime(packageVersion) {
  const status = await getRuntimeStatus({
    packageVersion,
    outputDir: defaultOutputDir,
    paths: runtimePaths,
  })

  if (status.ready) {
    return
  }

  await bootstrapManagedRuntime({
    packageRoot,
    packageVersion,
    paths: runtimePaths,
    setup: await resolveRuntimeSetup({
      options: {
        ui: bundledRuntimeSetup.uiLibrary,
        "component-source": bundledRuntimeSetup.componentSource,
        preset: bundledRuntimeSetup.preset,
        components: bundledRuntimeSetup.components,
        yes: true,
      },
      interactive: false,
    }),
    schema: await getCliSchemaOutput(),
  })
}

async function inspectDocument(inputPath) {
  const source = await readFile(path.resolve(userRoot, inputPath), "utf8")
  const validation = await validateAgentHtmlSource(source)

  if (validation.diagnostics.length > 0) {
    printDiagnostics(validation.diagnostics)
    process.exit(1)
  }

  return createInspection(validation.document)
}

async function inspectArtifactDir(dirPath) {
  const metadataPath = path.join(
    path.resolve(userRoot, dirPath),
    "agent-html.inspect.json",
  )
  const source = await readFile(metadataPath, "utf8")
  return parseJson(source, "agent-html.inspect.json must be valid JSON.")
}

function createInspection(document) {
  if (!document) {
    fail("Cannot inspect an invalid agent-html document.")
  }

  return {
    kind: "agent-html-inspection",
    config: document.meta,
    components: countComponents(document.components),
  }
}

function countComponents(nodes, counts = {}) {
  for (const node of nodes) {
    if (node.type !== "component") {
      continue
    }

    counts[node.name] = (counts[node.name] ?? 0) + 1
    countComponents(node.children, counts)
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function formatInspectionSummary(inspection) {
  const lines = [
    "agent-html inspection",
    ...Object.entries(inspection.config).map(
      ([key, value]) => `${key}: ${value}`,
    ),
    "components:",
  ]

  if (inspection.components.length === 0) {
    lines.push("- none")
  } else {
    for (const component of inspection.components) {
      lines.push(`- ${component.name}: ${component.count}`)
    }
  }

  return `${lines.join("\n")}\n`
}

async function runDoctorCheck(category, name, check) {
  try {
    const detail = await check()
    return { category, name, status: "ok", detail }
  } catch (error) {
    return {
      category,
      name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runDoctorUpdateCheck(packageVersion) {
  const update = await checkForPackageUpdate({ packageManager: "npm" })

  if (update.status === "available") {
    return {
      category: "package",
      name: "update",
      status: "warn",
      detail: `latest is ${update.latestVersion}. Run: ${update.command}`,
    }
  }

  if (update.status === "current") {
    return {
      category: "package",
      name: "update",
      status: "ok",
      detail: `current ${packageVersion}`,
    }
  }

  return {
    category: "package",
    name: "update",
    status: "skip",
    detail: update.reason,
  }
}

function parsePort(value) {
  const port = Number(value)

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    fail("preview --port must be an integer from 0 to 65535.")
  }

  return port
}

async function serveDirectory(directory, port) {
  const root = path.resolve(directory)
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost")
      const pathname = decodeURIComponent(requestUrl.pathname)
      const requestedPath =
        pathname === "/"
          ? path.join(root, "index.html")
          : path.join(root, pathname)
      const resolvedPath = path.resolve(requestedPath)

      if (
        resolvedPath !== root &&
        !resolvedPath.startsWith(`${root}${path.sep}`)
      ) {
        response.writeHead(403)
        response.end("Forbidden")
        return
      }

      const fileStat = await stat(resolvedPath)
      const filePath = fileStat.isDirectory()
        ? path.join(resolvedPath, "index.html")
        : resolvedPath
      const body = await readFile(filePath)

      response.writeHead(200, {
        "content-type": getContentType(filePath),
      })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end("Not found")
    }
  })

  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", resolve)
  })

  const address = server.address()
  const actualPort =
    typeof address === "object" && address ? address.port : port
  process.stdout.write(`Preview: http://127.0.0.1:${actualPort}\n`)

  await new Promise((resolve) => {
    const close = () => server.close(resolve)
    process.once("SIGINT", close)
    process.once("SIGTERM", close)
  })
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8"
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8"
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8"
  }

  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8"
  }

  return "application/octet-stream"
}

async function configCommand(commandArgs) {
  const [subcommand, key, value, ...rest] = commandArgs

  if (rest.length > 0) {
    fail("config accepts only get or set <key> <value>.")
  }

  if (subcommand === "get") {
    const config = await readEffectiveConfig()
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`)
    return
  }

  if (subcommand !== "set") {
    fail("config accepts only get or set <key> <value>.")
  }

  if (!key || value === undefined) {
    fail("config set requires <key> <value>.")
  }

  const schema = await getCliSchemaOutput()
  const allowedValues = schema.renderConfig.values[key]

  if (!allowedValues) {
    fail(`Unknown config key "${key}".`)
  }

  if (!allowedValues.includes(value)) {
    fail(`Invalid value "${value}" for config key "${key}".`)
  }

  const current = await readEffectiveConfig()
  const next = { ...current, [key]: value }
  await writeJsonFile(defaultConfigPath, next)
}

async function readEffectiveConfig() {
  const schema = await getCliSchemaOutput()

  try {
    const source = await readFile(defaultConfigPath, "utf8")
    const config = parseJson(
      source,
      "agent-html.config.json must be valid JSON.",
    )
    return assertRenderConfig(
      { ...schema.renderConfig.defaults, ...config },
      schema.renderConfig.values,
    )
  } catch (error) {
    if (error?.code === "ENOENT") {
      return schema.renderConfig.defaults
    }

    throw error
  }
}

async function readConfigForDoctor() {
  const schema = await getCliSchemaOutput()

  try {
    const source = await readFile(defaultConfigPath, "utf8")
    const config = JSON.parse(source)

    if (
      !validateRenderConfig(
        { ...schema.renderConfig.defaults, ...config },
        schema.renderConfig.values,
      )
    ) {
      throw new Error(
        "agent-html.config.json contains an unknown key or invalid enum value.",
      )
    }

    return { ...schema.renderConfig.defaults, ...config }
  } catch (error) {
    if (error?.code === "ENOENT") {
      return schema.renderConfig.defaults
    }

    if (error instanceof SyntaxError) {
      throw new Error("agent-html.config.json must be valid JSON.")
    }

    throw error
  }
}

function assertRenderConfig(config, values) {
  if (!validateRenderConfig(config, values)) {
    fail("ArtifactConfig contains an unknown key or invalid enum value.")
  }

  return Object.fromEntries(
    Object.keys(values).map((key) => [key, config[key]]),
  )
}

function parseOptions(commandArgs, definition) {
  const options = {}
  const optionDefinitions = new Map(
    definition.options.map((option) => [option.name, option]),
  )

  for (let index = 0; index < commandArgs.length; index++) {
    const arg = commandArgs[index]

    if (!arg.startsWith("--")) {
      fail(`Unexpected argument "${arg}".`)
    }

    const key = arg.slice(2)
    const optionDefinition = optionDefinitions.get(key)

    if (!optionDefinition) {
      fail(`${definition.usage.split("\n")[0]} does not accept ${arg}.`)
    }

    if (!optionDefinition.value) {
      options[key] = true
      continue
    }

    const value = commandArgs[index + 1]
    if (!value || value.startsWith("--")) {
      fail(`${arg} requires a value.`)
    }

    options[key] = value
    index += 1
  }

  return options
}

async function writeOrPrint(output, outputPath) {
  if (!outputPath) {
    process.stdout.write(output)
    return
  }

  await writeTextFile(path.resolve(userRoot, outputPath), output)
}

async function writeJsonFile(filePath, value) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function writeTextFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, value)
}

async function readPackageVersion() {
  const manifest = parseJson(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
    "package.json must be valid JSON.",
  )
  return typeof manifest.version === "string" ? manifest.version : "0.0.0"
}

function parseJson(source, message) {
  try {
    return JSON.parse(source)
  } catch {
    fail(message)
  }
}

function printDiagnostics(diagnostics) {
  for (const diagnostic of diagnostics) {
    console.error(
      `${diagnostic.severity}: ${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`,
    )
  }
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
