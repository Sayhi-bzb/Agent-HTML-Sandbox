import {
  cancel,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
} from "@clack/prompts"

import {
  fallbackShadcnComponents,
  getDefaultShadcnPreset,
  getShadcnComponentCatalog,
  listShadcnPresets,
  validateShadcnPreset,
} from "./shadcn-api.mjs"

export class RuntimeSetupCancelledError extends Error {
  constructor() {
    super("Runtime setup cancelled.")
    this.name = "RuntimeSetupCancelledError"
  }
}

const defaultRuntimeSetup = {
  uiLibrary: "shadcn",
  componentSource: "shadcn-cli",
  installMode: "preset",
  preset: getDefaultShadcnPreset(),
  components: ["card"],
}

export const bundledRuntimeSetup = {
  ...defaultRuntimeSetup,
  componentSource: "bundled",
}

const supportedUiLibraries = ["shadcn"]
const supportedComponentSources = ["bundled", "shadcn-cli"]
const requiredRuntimeComponents = ["card"]

export async function resolveRuntimeSetup({
  options = {},
  interactive = isInteractiveRuntimeSetup(),
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
  const shadcnPresets = listShadcnPresets()
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
    shadcnPresets,
  })

  return {
    uiLibrary,
    componentSource,
    installMode,
    preset,
    components,
  }
}

export function isInteractiveRuntimeSetup() {
  return (
    process.stdin.isTTY &&
    process.stdout.isTTY &&
    process.env.CI !== "true" &&
    process.env.AHTML_NO_INTERACTIVE !== "1"
  )
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
  componentCatalog = fallbackShadcnComponents,
  shadcnPresets = listShadcnPresets(),
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

  if (installMode === "preset" && !validateShadcnPreset(preset)) {
    throw new Error(
      `Unsupported shadcn preset "${preset}". Supported named styles: ${shadcnPresets.join(", ")}. Preset codes from shadcn are also supported.`,
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
  intro("ahtml managed runtime setup")

  const uiLibrary = await chooseOption({
    label: "UI library",
    options: supportedUiLibraries,
    defaultValue: defaultRuntimeSetup.uiLibrary,
  })
  const componentSource = await chooseOption({
    label: "Component source",
    options: supportedComponentSources,
    defaultValue: defaultRuntimeSetup.componentSource,
  })
  const installMode = await chooseOption({
    label: "Install mode",
    options: ["preset", "custom"],
    defaultValue: defaultRuntimeSetup.installMode,
  })
  const preset =
    installMode === "preset"
      ? await chooseOption({
          label: "shadcn preset",
          options: listShadcnPresets(),
          defaultValue: defaultRuntimeSetup.preset,
        })
      : "custom"
  const componentCatalog = await getComponentCatalog(componentSource)
  const components =
    installMode === "custom"
      ? await chooseComponents(componentCatalog)
      : defaultRuntimeSetup.components

  outro("Runtime setup choices captured.")

  return {
    uiLibrary,
    componentSource,
    installMode,
    preset,
    components,
  }
}

async function chooseOption({ label, options, defaultValue }) {
  const answer = await select({
    message: label,
    options: options.map((option) => ({ value: option, label: option })),
    initialValue: defaultValue,
  })

  return unwrapPromptValue(answer)
}

async function chooseComponents(componentCatalog) {
  const answer = await multiselect({
    message: "shadcn components",
    options: componentCatalog.map((component) => ({
      value: component,
      label: component,
    })),
    initialValues: componentCatalog,
    required: true,
  })

  return unwrapPromptValue(answer)
}

function unwrapPromptValue(value) {
  if (isCancel(value)) {
    cancel("Runtime setup cancelled.")
    throw new RuntimeSetupCancelledError()
  }

  return value
}

function normalizeComponents(
  value,
  componentCatalog = fallbackShadcnComponents,
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
    return fallbackShadcnComponents
  }

  const catalog = await getShadcnComponentCatalog()
  return catalog.components
}
