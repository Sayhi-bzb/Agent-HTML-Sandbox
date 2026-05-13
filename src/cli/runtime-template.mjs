import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"

import {
  createUiCapabilities,
  createRendererSpec,
  supportedRuntimeBase,
} from "../config/render-capabilities.mjs"

const execFileAsync = promisify(execFile)
const templateDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-template",
)

export async function writeRuntimeTemplate({
  packageRoot,
  paths,
  schema,
  setup,
}) {
  const dependencies = resolveRuntimeDependencies(packageRoot)

  await cp(templateDir, paths.runtimeDir, { recursive: true })
  if (setup?.componentSource === "shadcn-cli") {
    if (setup.preset && setup.preset !== "custom") {
      await applyShadcnPreset({ preset: setup.preset, paths })
    }
    await installShadcnComponents({ components: setup.components, paths })
  }
  await renderViteConfig({ dependencies, paths })
  await writeRuntimeCapabilities({ paths, schema, setup })
}

export function resolveRuntimeDependencies(packageRoot) {
  const packageRequire = createRequire(path.join(packageRoot, "package.json"))

  return {
    viteBin: path.join(
      path.dirname(packageRequire.resolve("vite/package.json")),
      "bin",
      "vite.js",
    ),
    reactRoot: path.dirname(packageRequire.resolve("react/package.json")),
    reactJsxRuntime: packageRequire.resolve("react/jsx-runtime"),
    reactDomRoot: path.dirname(
      packageRequire.resolve("react-dom/package.json"),
    ),
    reactDomClient: packageRequire.resolve("react-dom/client"),
    reactDomServer: packageRequire.resolve("react-dom/server"),
    classVarianceAuthorityRoot: packageRequire.resolve(
      "class-variance-authority",
    ),
    clsxRoot: packageRequire.resolve("clsx"),
    lucideReactRoot: packageRequire.resolve("lucide-react"),
    radixUiRoot: packageRequire.resolve("radix-ui"),
    tailwindMergeRoot: packageRequire.resolve("tailwind-merge"),
    tailwindcssStylesheet: path.join(
      path.dirname(packageRequire.resolve("tailwindcss/package.json")),
      "index.css",
    ),
    tailwindcssVitePlugin: packageRequire.resolve("@tailwindcss/vite"),
  }
}

async function renderViteConfig({ dependencies, paths }) {
  const templatePath = path.join(templateDir, "vite.config.mjs.template")
  const source = await readFile(templatePath, "utf8")
  const normalizedDependencies = normalizeDependencyPaths(dependencies)
  const rendered = source
    .replace(
      "__AHTML_RUNTIME_DEPENDENCIES__",
      JSON.stringify(normalizedDependencies, null, 2),
    )
    .replace(
      "__AHTML_TAILWINDCSS_VITE_PLUGIN__",
      normalizedDependencies.tailwindcssVitePlugin,
    )

  await mkdir(path.dirname(paths.runtimeViteConfigPath), { recursive: true })
  await writeFile(paths.runtimeViteConfigPath, rendered)
}

async function writeRuntimeCapabilities({ paths, schema, setup }) {
  const components = Array.isArray(schema?.components) ? schema.components : []
  const uiCapabilities =
    schema?.uiCapabilities ?? createUiCapabilities(components)
  const rendererSpec = schema?.rendererSpec ?? createRendererSpec(components)
  const renderableAgentComponents =
    components.length > 0
      ? components.map((component) => component.name)
      : (uiCapabilities.components ?? []).map((component) => component.name)
  const capabilities = {
    kind: "ahtml-runtime-render-capabilities",
    version: 1,
    runtimeBase: supportedRuntimeBase,
    installedUiComponents: setup.components,
    renderableAgentComponents,
    uiCapabilities,
    rendererSpec,
  }

  await writeFile(
    paths.runtimeCapabilitiesPath,
    `${JSON.stringify(capabilities, null, 2)}\n`,
  )
}

function normalizeDependencyPaths(dependencies) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([key, value]) => [
      key,
      key === "tailwindcssVitePlugin"
        ? pathToFileURL(value).href
        : value.replaceAll("\\", "/"),
    ]),
  )
}

async function installShadcnComponents({ components, paths }) {
  const selectedComponents = components.length > 0 ? components : ["card"]
  await rm(paths.runtimeComponentsDir, { force: true, recursive: true })
  await runShadcnCli(["add", ...selectedComponents, "--overwrite"], paths)
}

async function applyShadcnPreset({ preset, paths }) {
  await runShadcnCli(["apply", preset, "--only", "theme", "--yes"], paths)
}

async function runShadcnCli(args, paths) {
  const command = await resolveNpxCommand()

  await execFileAsync(
    command.file,
    [...command.args, "shadcn@latest", ...args],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_SHADCN_RUNTIME: "1",
      },
    },
  )
}

async function resolveNpxCommand() {
  if (process.platform !== "win32") {
    return { file: "npx", args: [] }
  }

  const npxCliPath = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npx-cli.js",
  )

  try {
    await access(npxCliPath)
  } catch {
    throw new Error(`Unable to find npm npx CLI at ${npxCliPath}.`)
  }

  return { file: process.execPath, args: [npxCliPath] }
}
