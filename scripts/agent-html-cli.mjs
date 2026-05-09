import { spawn } from "node:child_process"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { parseFragment } from "parse5"

const root = process.cwd()
const componentSchemaPath = path.join(
  root,
  "src",
  "agent-html",
  "component-schema.ts",
)
const renderConfigPath = path.join(
  root,
  "src",
  "agent-html",
  "render-config.ts",
)
const defaultDocumentPath = path.join(root, "artifact.agent.html")
const defaultConfigPath = path.resolve(
  root,
  process.env.AGENT_HTML_CONFIG_PATH ?? "agent-html.config.json",
)
const defaultOutputDir = path.join(root, "dist", "html")
const blockedFieldNames = new Set([
  "asChild",
  "class",
  "className",
  "css",
  "dangerouslySetInnerHTML",
  "onClick",
  "onclick",
  "script",
  "style",
])
const textChild = "#text"

const command = process.argv[2]
const args = process.argv.slice(3)

try {
  if (command === "schema") {
    await schemaCommand(args)
  } else if (command === "compose") {
    await composeCommand(args)
  } else if (command === "build") {
    await buildCommand(args)
  } else if (command === "config") {
    await configCommand(args)
  } else {
    fail(
      `Unknown command "${command ?? ""}". Use schema, compose, build, or config.`,
    )
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

async function schemaCommand(commandArgs) {
  const options = parseOptions(commandArgs)
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

async function composeCommand(commandArgs) {
  const options = parseOptions(commandArgs)

  if (options.input && options.stdin) {
    fail("compose accepts either --input or --stdin, not both.")
  }

  const source = options.stdin
    ? await readStdin()
    : await readRequiredFile(
        options.input,
        "compose requires --input or --stdin.",
      )
  const input = parseJson(source, "CompositionInput must be valid JSON.")
  const config = await readEffectiveConfig()
  const document = await composeDocument(input, config)
  const validation = await validateAgentHtmlSource(document)

  if (validation.diagnostics.length > 0) {
    printDiagnostics(validation.diagnostics)
    process.exitCode = 1
    return
  }

  await writeTextFile(
    path.resolve(root, options.out ?? defaultDocumentPath),
    document,
  )
}

async function buildCommand(commandArgs) {
  const options = parseOptions(commandArgs)
  const inputPath = options.input

  if (!inputPath) {
    fail("build requires --input <path>.")
  }

  const source = await readFile(path.resolve(root, inputPath), "utf8")
  const validation = await validateAgentHtmlSource(source)

  if (validation.diagnostics.length > 0) {
    printDiagnostics(validation.diagnostics)
    process.exitCode = 1
    return
  }

  const outputDir = path.resolve(root, options.out ?? defaultOutputDir)
  await rm(outputDir, { force: true, recursive: true })
  await runNodeBin("typescript", ["-b"], {
    VITE_AGENT_HTML_SOURCE: source,
  })
  await runNodeBin("vite", ["build", "--outDir", outputDir], {
    VITE_AGENT_HTML_SOURCE: source,
  })
  await runScript("inline-dist-index.mjs", ["--dir", outputDir])
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

async function composeDocument(input, fallbackConfig) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("CompositionInput must be a JSON object.")
  }

  const meta = { ...fallbackConfig, ...(input.meta ?? {}) }
  assertRenderConfig(meta)

  const rootNode = input.document ?? input.root ?? input.components?.[0]

  if (!rootNode) {
    fail("CompositionInput requires document, root, or components[0].")
  }

  const body = renderCompositionNode(rootNode)
  return `${renderMetaAgent(meta)}\n${body}\n`
}

function renderCompositionNode(node) {
  if (typeof node === "string") {
    return escapeText(node)
  }

  if (!node || typeof node !== "object" || Array.isArray(node)) {
    fail("Composition nodes must be strings or objects.")
  }

  if (blockedFieldNames.has(node.name)) {
    fail(`Blocked component or field "${node.name}" is not allowed.`)
  }

  const name = requireString(
    node.name,
    "Composition node requires a string name.",
  )
  const props = node.props ?? {}

  if (!props || typeof props !== "object" || Array.isArray(props)) {
    fail(`<${name}> props must be an object.`)
  }

  for (const key of Object.keys(node)) {
    if (blockedFieldNames.has(key)) {
      fail(`Blocked implementation field "${key}" is not allowed.`)
    }
  }

  const attrs = Object.entries(props)
    .map(([key, value]) => {
      if (blockedFieldNames.has(key)) {
        fail(`Blocked implementation prop "${key}" is not allowed.`)
      }

      return ` ${key}="${escapeAttr(String(value))}"`
    })
    .join("")
  const children = (node.children ?? []).map(renderCompositionNode).join("")

  if (children.length === 0) {
    return `<${name}${attrs} />`
  }

  return `<${name}${attrs}>${children}</${name}>`
}

async function validateAgentHtmlSource(source) {
  const schema = await getCliSchemaOutput()
  const componentNames = schema.components.map((item) => item.name)
  const componentMap = new Map(
    schema.components.map((item) => [item.name, item]),
  )
  const parsed = parseAgentHtml(source, componentNames)
  const diagnostics = [...parsed.diagnostics]
  const meta = parsed.metaAttrs ?? schema.renderConfig.defaults
  const renderConfigResult = validateRenderConfig(
    meta,
    schema.renderConfig.values,
  )

  if (!renderConfigResult) {
    diagnostics.push({
      code: "invalid-render-config",
      message:
        "The <meta-agent /> header must use only registered render config enum values.",
      path: "/meta-agent",
      severity: "error",
    })
  }

  validateRootNodes(parsed.nodes, componentMap, diagnostics)

  return { diagnostics }
}

function parseAgentHtml(source, componentNames) {
  const fragment = parseFragment(
    normalizeAgentHtmlSource(source, componentNames),
  )
  const diagnostics = []
  const nodes = []
  let metaAttrs

  fragment.childNodes.forEach((child, index) => {
    const pathValue = `/${index}`

    if (isIgnorableTextNode(child)) {
      return
    }

    if (isTextNode(child)) {
      nodes.push({
        type: "text",
        value: child.value.trim(),
        path: pathValue,
      })
      return
    }

    if (!isElementNode(child)) {
      diagnostics.push({
        code: "unsupported-node",
        message: "Only element and text nodes are supported in agent-html.",
        path: pathValue,
        severity: "error",
      })
      return
    }

    if (child.tagName === "meta-agent") {
      if (metaAttrs) {
        diagnostics.push({
          code: "duplicate-meta-agent",
          message: "Only one top-level <meta-agent /> header is allowed.",
          path: pathValue,
          severity: "error",
        })
        return
      }

      metaAttrs = getAttrs(child)
      return
    }

    nodes.push(convertElementNode(child, pathValue))
  })

  return { diagnostics, metaAttrs, nodes }
}

function normalizeAgentHtmlSource(source, componentNames) {
  const componentPattern = componentNames.join("|")

  return source
    .replace(/<meta-agent\b([^>]*)\/>/gi, "<meta-agent$1></meta-agent>")
    .replace(
      new RegExp(`<(${componentPattern})\\b([^>]*)/>`, "gi"),
      "<$1$2></$1>",
    )
    .replace(
      new RegExp(`<(\\/?)(${componentPattern})\\b`, "gi"),
      "<$1agent-html-$2",
    )
}

function convertElementNode(node, nodePath) {
  return {
    type: "element",
    name: node.tagName.startsWith("agent-html-")
      ? node.tagName.slice("agent-html-".length)
      : node.tagName,
    attrs: getAttrs(node),
    children: node.childNodes.flatMap((child, index) => {
      const childPath = `${nodePath}/${index}`

      if (isIgnorableTextNode(child)) {
        return []
      }

      if (isTextNode(child)) {
        return [
          {
            type: "text",
            value: child.value.trim(),
            path: childPath,
          },
        ]
      }

      if (isElementNode(child)) {
        return [convertElementNode(child, childPath)]
      }

      return []
    }),
    path: nodePath,
  }
}

function validateRootNodes(nodes, componentMap, diagnostics) {
  const elementNodes = nodes.filter((node) => node.type === "element")

  for (const node of nodes) {
    if (node.type === "text") {
      diagnostics.push({
        code: "invalid-child",
        message: "Top-level text is not allowed; agent-html must use <page>.",
        path: node.path,
        severity: "error",
      })
    }
  }

  if (elementNodes.length === 0) {
    diagnostics.push({
      code: "missing-root",
      message: "agent-html requires a <page> root component.",
      path: "/",
      severity: "error",
    })
    return
  }

  if (elementNodes.length > 1) {
    diagnostics.push({
      code: "multiple-roots",
      message: "agent-html supports exactly one root component.",
      path: "/",
      severity: "error",
    })
  }

  const rootNode = elementNodes[0]

  if (rootNode.name !== "page") {
    diagnostics.push({
      code: "invalid-child",
      message: "The root component must be <page>.",
      path: rootNode.path,
      severity: "error",
    })
  }

  validateElementNode(rootNode, undefined, componentMap, diagnostics)
}

function validateElementNode(node, parent, componentMap, diagnostics) {
  const componentSchema = componentMap.get(node.name)

  if (!componentSchema) {
    diagnostics.push({
      code: "unknown-component",
      message: `Unknown component <${node.name}> is not registered in the standard component schema.`,
      path: node.path,
      severity: "error",
    })
    return
  }

  if (
    parent &&
    !componentMap.get(parent.name)?.allowedChildren?.includes(node.name)
  ) {
    diagnostics.push({
      code: "invalid-child",
      message: `<${node.name}> is not allowed inside <${parent.name}>.`,
      path: node.path,
      severity: "error",
    })
  }

  validateAttrs(node, componentSchema, diagnostics)

  for (const child of node.children) {
    if (child.type === "text") {
      if (!componentSchema.allowedChildren?.includes(textChild)) {
        diagnostics.push({
          code: "invalid-child",
          message: `Text content is not allowed inside <${node.name}>.`,
          path: child.path,
          severity: "error",
        })
      }
      continue
    }

    if (!componentSchema.allowedChildren?.includes(child.name)) {
      if (!componentMap.has(child.name)) {
        diagnostics.push({
          code: "unknown-component",
          message: `Unknown component <${child.name}> is not registered in the standard component schema.`,
          path: child.path,
          severity: "error",
        })
        continue
      }

      diagnostics.push({
        code: "invalid-child",
        message: `<${child.name}> is not allowed inside <${node.name}>.`,
        path: child.path,
        severity: "error",
      })
      continue
    }

    validateElementNode(child, node, componentMap, diagnostics)
  }
}

function validateAttrs(node, componentSchema, diagnostics) {
  const propMap = new Map(
    componentSchema.props.map((prop) => [prop.name, prop]),
  )

  for (const prop of componentSchema.props) {
    if (prop.required && !(prop.name in node.attrs)) {
      diagnostics.push({
        code: "missing-required-attr",
        message: `<${node.name}> requires the "${prop.name}" attribute.`,
        path: node.path,
        severity: "error",
      })
    }
  }

  for (const [attrName, attrValue] of Object.entries(node.attrs)) {
    const prop = propMap.get(attrName)

    if (!prop || blockedFieldNames.has(attrName)) {
      diagnostics.push({
        code: "unknown-attr",
        message: `"${attrName}" is not an allowed agent-facing attribute on <${node.name}>.`,
        path: node.path,
        severity: "error",
      })
      continue
    }

    if (prop.valueKind === "enum" && !prop.enumValues?.includes(attrValue)) {
      diagnostics.push({
        code: "unknown-attr",
        message: `"${attrValue}" is not an allowed value for ${node.name}.${attrName}.`,
        path: node.path,
        severity: "error",
      })
    }
  }
}

async function getCliSchemaOutput() {
  const [componentSchemaSource, renderConfigSource] = await Promise.all([
    readFile(componentSchemaPath, "utf8"),
    readFile(renderConfigPath, "utf8"),
  ])
  const components = extractArrayLiteral(
    componentSchemaSource,
    "STANDARD_COMPONENT_SCHEMAS",
  )
  const renderConfig = {
    defaults: extractObjectLiteral(renderConfigSource, "DEFAULT_RENDER_CONFIG"),
    values: {
      theme: extractConstArray(renderConfigSource, "RENDER_THEME_VALUES"),
      density: extractConstArray(renderConfigSource, "RENDER_DENSITY_VALUES"),
      tone: extractConstArray(renderConfigSource, "RENDER_TONE_VALUES"),
      width: extractConstArray(renderConfigSource, "RENDER_WIDTH_VALUES"),
    },
  }

  return {
    kind: "agent-html-cli-schema",
    version: 1,
    components,
    renderConfig,
    forbidden:
      "class/className/style/css/Tailwind/shadcn props/Radix props/React props/script/onclick/events/external URLs/unknown tags/unknown attrs.",
  }
}

function formatPrompt(schema) {
  const lines = [
    "Write agent-html only.",
    "",
    "Header:",
    `<meta-agent theme="${schema.renderConfig.values.theme.join("|")}" density="${schema.renderConfig.values.density.join("|")}" tone="${schema.renderConfig.values.tone.join("|")}" width="${schema.renderConfig.values.width.join("|")}" />`,
    "",
    "Standard components:",
    ...schema.components.map(formatComponent),
    "",
    "Forbidden:",
    schema.forbidden,
  ]

  return lines.join("\n")
}

function formatComponent(component) {
  const props = component.props.map(formatProp).join(" ")
  const propText = props ? `(${props})` : ""
  const children = (component.allowedChildren ?? [])
    .map((child) => (child === textChild ? "text" : child))
    .join("/")

  return `${component.name}${propText} -> ${children || "none"}`
}

function formatProp(prop) {
  const required = prop.required ? "*" : "?"
  const name = `${prop.name}${required}`

  if (prop.valueKind === "enum") {
    return `${name}=${prop.enumValues.join("|")}`
  }

  return name
}

async function readEffectiveConfig() {
  const schema = await getCliSchemaOutput()

  try {
    const source = await readFile(defaultConfigPath, "utf8")
    const config = parseJson(
      source,
      "agent-html.config.json must be valid JSON.",
    )
    return assertRenderConfig({ ...schema.renderConfig.defaults, ...config })
  } catch (error) {
    if (error?.code === "ENOENT") {
      return schema.renderConfig.defaults
    }

    throw error
  }
}

function validateRenderConfig(config, values) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false
  }

  return Object.entries(values).every(
    ([key, allowedValues]) =>
      typeof config[key] === "string" && allowedValues.includes(config[key]),
  )
}

function assertRenderConfig(config) {
  const values = {
    theme: ["neutral"],
    density: ["compact", "comfortable"],
    tone: ["report", "dashboard", "decision"],
    width: ["article", "dashboard", "wide"],
  }

  if (!validateRenderConfig(config, values)) {
    fail("ArtifactConfig contains an unknown key or invalid enum value.")
  }

  return {
    theme: config.theme,
    density: config.density,
    tone: config.tone,
    width: config.width,
  }
}

function renderMetaAgent(meta) {
  return `<meta-agent theme="${escapeAttr(meta.theme)}" density="${escapeAttr(meta.density)}" tone="${escapeAttr(meta.tone)}" width="${escapeAttr(meta.width)}" />`
}

function extractArrayLiteral(source, exportName) {
  const marker = `export const ${exportName} = `
  const start = source.indexOf(marker)

  if (start === -1) {
    throw new Error(`Cannot find ${exportName}`)
  }

  const arrayStart = source.indexOf("[", start)
  const arrayEnd = findMatchingBracket(source, arrayStart, "[", "]")
  const literal = source
    .slice(arrayStart, arrayEnd + 1)
    .replaceAll("TEXT_CHILD", '"#text"')

  return Function(`"use strict"; return (${literal});`)()
}

function extractObjectLiteral(source, exportName) {
  const marker = `export const ${exportName} = `
  const start = source.indexOf(marker)

  if (start === -1) {
    throw new Error(`Cannot find ${exportName}`)
  }

  const objectStart = source.indexOf("{", start)
  const objectEnd = findMatchingBracket(source, objectStart, "{", "}")
  const literal = source.slice(objectStart, objectEnd + 1)

  return Function(`"use strict"; return (${literal});`)()
}

function extractConstArray(source, exportName) {
  const exportMarker = `export const ${exportName} = `
  const constMarker = `const ${exportName} = `
  const start = source.includes(exportMarker)
    ? source.indexOf(exportMarker)
    : source.indexOf(constMarker)

  if (start === -1) {
    throw new Error(`Cannot find ${exportName}`)
  }

  const arrayStart = source.indexOf("[", start)
  const arrayEnd = findMatchingBracket(source, arrayStart, "[", "]")
  const literal = source.slice(arrayStart, arrayEnd + 1)

  return Function(`"use strict"; return (${literal});`)()
}

function findMatchingBracket(source, start, open, close) {
  let depth = 0
  let quote = null

  for (let index = start; index < source.length; index++) {
    const char = source[index]
    const previous = source[index - 1]

    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === open) {
      depth += 1
    }

    if (char === close) {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  throw new Error(`Unclosed ${open}${close} literal`)
}

function parseOptions(commandArgs) {
  const options = {}

  for (let index = 0; index < commandArgs.length; index++) {
    const arg = commandArgs[index]

    if (arg === "--stdin") {
      options.stdin = true
      continue
    }

    if (!arg.startsWith("--")) {
      fail(`Unexpected argument "${arg}".`)
    }

    const key = arg.slice(2)
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

  await writeTextFile(path.resolve(root, outputPath), output)
}

async function readRequiredFile(inputPath, message) {
  if (!inputPath) {
    fail(message)
  }

  return readFile(path.resolve(root, inputPath), "utf8")
}

async function writeJsonFile(filePath, value) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function writeTextFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, value)
}

async function readStdin() {
  const chunks = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString("utf8")
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

async function runNodeBin(packageName, commandArgs, extraEnv) {
  const manifest = JSON.parse(
    await readFile(
      path.join(root, "node_modules", packageName, "package.json"),
    ),
  )
  const bin =
    typeof manifest.bin === "string"
      ? manifest.bin
      : Object.values(manifest.bin)[0]
  await runNodeFile(
    path.join(root, "node_modules", packageName, bin),
    commandArgs,
    extraEnv,
  )
}

async function runScript(scriptName, commandArgs) {
  await runNodeFile(path.join(root, "scripts", scriptName), commandArgs)
}

async function runNodeFile(filePath, commandArgs, extraEnv = {}) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [filePath, ...commandArgs], {
      cwd: root,
      env: {
        ...process.env,
        ...extraEnv,
      },
      stdio: "inherit",
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${path.basename(filePath)} exited with code ${code}`))
    })
  })
}

function requireString(value, message) {
  if (typeof value !== "string" || value.length === 0) {
    fail(message)
  }

  return value
}

function getAttrs(node) {
  return Object.fromEntries(node.attrs.map((attr) => [attr.name, attr.value]))
}

function isElementNode(node) {
  return "tagName" in node
}

function isTextNode(node) {
  return node.nodeName === "#text"
}

function isIgnorableTextNode(node) {
  return isTextNode(node) && node.value.trim().length === 0
}

function escapeAttr(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
