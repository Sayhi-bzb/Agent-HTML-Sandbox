import { execFile } from "node:child_process"
import readline from "node:readline/promises"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export const defaultRuntimeSetup = {
  uiLibrary: "shadcn",
  componentSource: "shadcn-cli",
  installMode: "preset",
  preset: "nova",
  components: ["card"],
}

export const bundledRuntimeSetup = {
  ...defaultRuntimeSetup,
  componentSource: "bundled",
}

export const supportedUiLibraries = ["shadcn"]
export const supportedComponentSources = ["bundled", "shadcn-cli"]
export const requiredRuntimeComponents = ["card"]
export const supportedShadcnPresets = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
  "sera",
]
export const supportedShadcnComponents = ["card"]

export async function resolveRuntimeSetup({
  options = {},
  interactive = process.stdin.isTTY && process.stdout.isTTY,
} = {}) {
  const explicitYes = Boolean(options.yes)
  const shouldPrompt = interactive && !explicitYes
  const answers = shouldPrompt ? await promptForRuntimeSetup() : {}
  const uiLibrary =
    options.ui ?? answers.uiLibrary ?? defaultRuntimeSetup.uiLibrary
  const componentSource =
    options["component-source"] ??
    answers.componentSource ??
    defaultRuntimeSetup.componentSource
  const installMode =
    options.preset === "custom"
      ? "custom"
      : (answers.installMode ?? defaultRuntimeSetup.installMode)
  const preset =
    installMode === "preset"
      ? (options.preset ?? answers.preset ?? defaultRuntimeSetup.preset)
      : "custom"
  const componentCatalog = await getComponentCatalog(componentSource)
  const components = withRequiredRuntimeComponents(
    normalizeComponents(
      options.components ??
        answers.components ??
        defaultRuntimeSetup.components,
      componentCatalog,
    ),
  )

  assertRuntimeSetup({
    uiLibrary,
    componentSource,
    installMode,
    preset,
    components,
    componentCatalog,
  })

  return {
    uiLibrary,
    componentSource,
    installMode,
    preset,
    components,
  }
}

export function createPromptUiManifest({
  packageVersion = "0.0.0",
  setup = defaultRuntimeSetup,
  schema,
} = {}) {
  return {
    kind: "ahtml-prompt-ui-manifest",
    version: 1,
    uiLibrary: setup.uiLibrary,
    componentSource: setup.componentSource,
    preset: setup.preset,
    installedUiComponents: setup.components,
    packageVersion,
    agentComponents: createAgentComponentManifest(schema),
    forbidden:
      "Do not use Tailwind classes, className, style, event handlers, scripts, raw HTML, Radix props, or full shadcn props.",
  }
}

function createAgentComponentManifest(schema) {
  const components = Array.isArray(schema?.components) ? schema.components : []

  if (components.length === 0) {
    return [
      {
        name: "page",
        source: "ahtml-standard",
        purpose: "Top-level artifact page with an optional title.",
      },
      {
        name: "card",
        source: "shadcn",
        purpose: "Grouped content container rendered with the shadcn Card.",
      },
    ]
  }

  return components.map((component) => ({
    name: component.name,
    source: component.name === "card" ? "shadcn" : "ahtml-standard",
    props: component.props.map((prop) => prop.name),
    children: component.allowedChildren ?? [],
  }))
}

function assertRuntimeSetup({
  uiLibrary,
  componentSource,
  installMode,
  preset,
  components,
  componentCatalog = supportedShadcnComponents,
}) {
  if (!supportedUiLibraries.includes(uiLibrary)) {
    throw new Error(
      `Unsupported UI library "${uiLibrary}". Supported: ${supportedUiLibraries.join(", ")}.`,
    )
  }

  if (!supportedComponentSources.includes(componentSource)) {
    throw new Error(
      `Unsupported component source "${componentSource}". Supported: ${supportedComponentSources.join(", ")}.`,
    )
  }

  if (installMode !== "preset" && installMode !== "custom") {
    throw new Error('setup mode must be "preset" or "custom".')
  }

  if (installMode === "preset" && !supportedShadcnPresets.includes(preset)) {
    throw new Error(
      `Unsupported shadcn preset "${preset}". Supported: ${supportedShadcnPresets.join(", ")}.`,
    )
  }

  for (const component of components) {
    if (!componentCatalog.includes(component)) {
      throw new Error(
        `Unsupported shadcn component "${component}". Supported: ${componentCatalog.join(", ")}.`,
      )
    }
  }
}

async function promptForRuntimeSetup() {
  const prompts = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const uiLibrary = await chooseOption({
      prompts,
      label: "UI library",
      options: supportedUiLibraries,
      defaultValue: defaultRuntimeSetup.uiLibrary,
    })
    const componentSource = await chooseOption({
      prompts,
      label: "Component source",
      options: supportedComponentSources,
      defaultValue: defaultRuntimeSetup.componentSource,
    })
    const installMode = await chooseOption({
      prompts,
      label: "Install mode",
      options: ["preset", "custom"],
      defaultValue: defaultRuntimeSetup.installMode,
    })
    const preset =
      installMode === "preset"
        ? await chooseOption({
            prompts,
            label: "shadcn preset",
            options: supportedShadcnPresets,
            defaultValue: defaultRuntimeSetup.preset,
          })
        : "custom"
    const componentCatalog = await getComponentCatalog(componentSource)
    const components =
      installMode === "custom"
        ? await chooseComponents(prompts, componentCatalog)
        : defaultRuntimeSetup.components

    return {
      uiLibrary,
      componentSource,
      installMode,
      preset,
      components,
    }
  } finally {
    prompts.close()
  }
}

async function chooseOption({ prompts, label, options, defaultValue }) {
  const renderedOptions = options
    .map((option, index) => `${index + 1}) ${option}`)
    .join("  ")
  const answer = await prompts.question(
    `${label} [${defaultValue}]\n${renderedOptions}\n> `,
  )
  const trimmed = answer.trim()

  if (!trimmed) {
    return defaultValue
  }

  const index = Number(trimmed)
  if (Number.isInteger(index) && index >= 1 && index <= options.length) {
    return options[index - 1]
  }

  return trimmed
}

async function chooseComponents(prompts, componentCatalog) {
  const answer = await prompts.question(
    `shadcn components [all]\n${componentCatalog.map((component, index) => `${index + 1}) ${component}`).join("  ")}\n> `,
  )

  return normalizeComponents(answer || "all", componentCatalog)
}

function normalizeComponents(
  value,
  componentCatalog = supportedShadcnComponents,
) {
  if (Array.isArray(value)) {
    return [...new Set(value)]
  }

  const rawValue = String(value).trim()

  if (rawValue === "all") {
    return [...componentCatalog]
  }

  return [
    ...new Set(
      rawValue
        .split(",")
        .map((item) => item.trim())
        .map((item) => {
          const index = Number(item)
          if (
            Number.isInteger(index) &&
            index >= 1 &&
            index <= componentCatalog.length
          ) {
            return componentCatalog[index - 1]
          }

          return item
        })
        .filter(Boolean),
    ),
  ]
}

function withRequiredRuntimeComponents(components) {
  return [...new Set([...components, ...requiredRuntimeComponents])]
}

async function getComponentCatalog(componentSource) {
  if (componentSource !== "shadcn-cli") {
    return supportedShadcnComponents
  }

  const { stdout } = await execFileAsync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["shadcn@latest", "search", "@shadcn", "--limit", "100"],
    {
      shell: process.platform === "win32",
    },
  )
  const search = JSON.parse(stdout)
  const names = search.items
    .filter((item) => item.type === "registry:ui")
    .map((item) => item.name)

  if (names.length === 0) {
    throw new Error("shadcn registry search returned no UI components.")
  }

  return names
}
