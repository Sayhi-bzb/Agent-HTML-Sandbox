import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { access, cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { promisify } from "node:util"

import {
  createUiCapabilities,
  createRendererMapping,
  createRuntimeElementRegistrySpec,
  createRuntimeRendererKindSpec,
  supportedRuntimeBase,
} from "../config/render-capabilities.mjs"
import {
  createShadcnRuntimeSurface,
  recordManagedRuntimeProof,
} from "./runtime-surface.mjs"
import { getDefaultShadcnPreset } from "./shadcn-api.mjs"

const execFileAsync = promisify(execFile)
const templateDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-template",
)
const rendererSourceDir = path.join(templateDir, "src")

export async function writeRuntimeTemplate({
  packageRoot,
  paths,
  schema,
  setup,
}) {
  const shadcnTemplateDir = resolveShadcnTemplateDir()
  const shellSource = shadcnTemplateDir
    ? "shadcn-template-override"
    : "shadcn-official-template"
  const dependencies = resolveRuntimeDependencies(packageRoot)
  const components = Array.isArray(schema?.components) ? schema.components : []
  const verificationData =
    schema?.verificationData ?? createUiCapabilities(components)
  const rendererMapping =
    schema?.rendererMapping ?? createRendererMapping(components)

  await rm(paths.runtimeDir, { force: true, recursive: true })
  await initShadcnRuntime({
    packageRoot,
    paths,
    setup,
    shadcnTemplateDir,
  })

  const runtimeSurface = await createShadcnRuntimeSurface({
    paths,
    shellSource,
    setup,
    runtimeBase: supportedRuntimeBase,
  })

  await installShadcnComponents({
    packageRoot,
    components: setup.components,
    paths,
    shadcnTemplateDir,
  })
  await injectRendererFiles({
    paths,
    rendererMapping,
    runtimeSurface,
  })
  await renderViteConfig({ dependencies, paths })
  const provenRuntimeSurface = await recordManagedRuntimeProof({
    paths,
    surface: runtimeSurface,
  })
  await writeRuntimeCapabilities({
    components,
    paths,
    rendererMapping,
    runtimeSurface: provenRuntimeSurface,
    setup,
    verificationData,
  })

  return provenRuntimeSurface
}

export function resolveRuntimeDependencies(packageRoot) {
  const packageRequire = createRequire(path.join(packageRoot, "package.json"))

  return {
    viteBin: path.join(
      path.dirname(packageRequire.resolve("vite/package.json")),
      "bin",
      "vite.js",
    ),
    viteModule: packageRequire.resolve("vite"),
    viteReactPlugin: packageRequire.resolve("@vitejs/plugin-react"),
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
    shadcnTailwindStylesheet: path.join(
      path.dirname(path.dirname(packageRequire.resolve("shadcn"))),
      "dist",
      "tailwind.css",
    ),
    tailwindMergeRoot: packageRequire.resolve("tailwind-merge"),
    tailwindcssStylesheet: path.join(
      path.dirname(packageRequire.resolve("tailwindcss/package.json")),
      "index.css",
    ),
    tailwindcssVitePlugin: packageRequire.resolve("@tailwindcss/vite"),
    twAnimateCssStylesheet: resolvePackageSearchPathAsset({
      assetPath: path.join("dist", "tw-animate.css"),
      packageName: "tw-animate-css",
      packageRequire,
    }),
  }
}

function resolvePackageSearchPathAsset({
  assetPath,
  packageName,
  packageRequire,
}) {
  const searchPaths = packageRequire.resolve.paths(packageName) ?? []

  for (const searchPath of searchPaths) {
    const candidate = path.join(searchPath, packageName, assetPath)

    if (existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `Unable to resolve ${packageName}/${assetPath.replaceAll("\\", "/")} from Node search paths for managed runtime bootstrap.`,
  )
}

async function initShadcnRuntime({
  packageRoot,
  paths,
  setup,
  shadcnTemplateDir,
}) {
  const preset =
    setup.preset && setup.preset !== "custom"
      ? setup.preset
      : getDefaultShadcnPreset()
  const runtimeParentDir = path.dirname(paths.runtimeDir)
  const generatedRuntimeDir = path.join(runtimeParentDir, "vite-app")

  await mkdir(runtimeParentDir, { recursive: true })
  await rm(generatedRuntimeDir, { force: true, recursive: true })
  const args = [
    "init",
    "--template",
    "vite",
    "--base",
    supportedRuntimeBase,
    "--yes",
    "--force",
    "--no-reinstall",
    "--no-monorepo",
    "--cwd",
    runtimeParentDir,
    "--silent",
    "--preset",
    preset,
  ]

  try {
    await runShadcnCli(args, {
      cwd: runtimeParentDir,
      packageRoot,
      paths,
      shadcnTemplateDir,
    })
  } catch (error) {
    if (!(await canContinueAfterInitInstallFailure(error, generatedRuntimeDir))) {
      throw error
    }
  }

  await rm(paths.runtimeDir, { force: true, recursive: true })
  await rename(generatedRuntimeDir, paths.runtimeDir)
}

async function injectRendererFiles({ paths, rendererMapping, runtimeSurface }) {
  await mkdir(paths.runtimeSrcDir, { recursive: true })
  await cp(
    path.join(rendererSourceDir, "renderer"),
    path.join(paths.runtimeSrcDir, "renderer"),
    { recursive: true },
  )
  await cp(
    path.join(rendererSourceDir, "app.tsx"),
    path.join(paths.runtimeSrcDir, "app.tsx"),
  )
  await cp(
    path.join(rendererSourceDir, "ssr.tsx"),
    path.join(paths.runtimeSrcDir, "ssr.tsx"),
  )
  await writeRuntimeRendererKindSource({ paths })
  await writeRuntimeElementRegistrySource({ paths, rendererMapping })
  await writeRendererMain({ paths, cssPath: runtimeSurface.cssPath })
}

async function writeRendererMain({ paths, cssPath }) {
  const cssImport = normalizeCssImportPath({
    from: path.join(paths.runtimeSrcDir, "main.tsx"),
    to: path.join(paths.runtimeDir, cssPath),
  })
  const source = [
    'import React from "react"',
    'import { createRoot } from "react-dom/client"',
    'import { App } from "./app"',
    `import "${cssImport}"`,
    "",
    'createRoot(window.document.getElementById("root")!).render(',
    "  <React.StrictMode>",
    "    <App />",
    "  </React.StrictMode>,",
    ")",
    "",
  ].join("\n")

  await writeFile(path.join(paths.runtimeSrcDir, "main.tsx"), source)
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
    .replace("__AHTML_VITE_MODULE__", normalizedDependencies.viteModule)

  await mkdir(path.dirname(paths.runtimeViteConfigPath), { recursive: true })
  await writeFile(paths.runtimeViteConfigPath, rendered)
}

function withLocalNoProxy(value) {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const localHost of ["127.0.0.1", "localhost"]) {
    if (!entries.includes(localHost)) {
      entries.push(localHost)
    }
  }

  return entries.join(",")
}

function isLocalRegistryUrl(value) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.hostname === "127.0.0.1" || url.hostname === "localhost"
  } catch {
    return false
  }
}

async function writeRuntimeCapabilities({
  components,
  paths,
  rendererMapping,
  setup,
  runtimeSurface,
  verificationData,
}) {
  const renderableAgentComponents =
    components.length > 0
      ? components.map((component) => component.name)
      : (verificationData.components ?? []).map((component) => component.name)
  const capabilities = {
    kind: "ahtml-runtime-render-capabilities",
    version: 1,
    runtimeBase: supportedRuntimeBase,
    shadcnRuntimeSurface: runtimeSurface,
    installedUiComponents: setup.components,
    renderableAgentComponents,
    verificationData,
    rendererMapping,
  }

  await writeFile(
    paths.runtimeCapabilitiesPath,
    `${JSON.stringify(capabilities, null, 2)}\n`,
  )
}

async function writeRuntimeElementRegistrySource({ paths, rendererMapping }) {
  const registrySpec = createRuntimeElementRegistrySpec(rendererMapping)
  const source = createRuntimeElementRegistrySource(registrySpec)

  await writeFile(
    path.join(paths.runtimeSrcDir, "renderer", "elements.tsx"),
    source,
  )
}

async function writeRuntimeRendererKindSource({ paths }) {
  const kindSpec = createRuntimeRendererKindSpec()
  const source = createRuntimeRendererKindSource(kindSpec)

  await writeFile(
    path.join(paths.runtimeSrcDir, "renderer", "kinds.ts"),
    source,
  )
}

function createRuntimeElementRegistrySource(registrySpec) {
  const imports = registrySpec.modules.map(({ registryItem, exports }) =>
    formatRuntimeElementImport({ registryItem, exports }),
  )
  const registryEntries = [
    ...registrySpec.nativeElements.map((name) => `  ${name}: "${name}",`),
    ...registrySpec.modules.flatMap(({ exports }) =>
      exports.map((name) => `  ${name},`),
    ),
  ]

  return [
    'import React from "react"',
    ...imports,
    "",
    "const runtimeElementRegistry: Record<string, React.ElementType> = {",
    ...registryEntries,
    "}",
    "",
    "export function resolveElement(name: string | undefined): React.ElementType {",
    "  if (!name) {",
    "    return React.Fragment",
    "  }",
    "",
    "  return runtimeElementRegistry[name] ?? (name as React.ElementType)",
    "}",
    "",
  ].join("\n")
}

function createRuntimeRendererKindSource(kindSpec) {
  return [
    `export const runtimeRendererKinds = ${JSON.stringify(kindSpec.kinds)} as const`,
    "",
    "export type RendererKind = (typeof runtimeRendererKinds)[number]",
    "",
  ].join("\n")
}

function formatRuntimeElementImport({ registryItem, exports }) {
  const specifier = `@/components/ui/${registryItem}`

  if (exports.length === 1) {
    return `import { ${exports[0]} } from "${specifier}"`
  }

  return [
    "import {",
    ...exports.map((name) => `  ${name},`),
    `} from "${specifier}"`,
  ].join("\n")
}

function normalizeDependencyPaths(dependencies) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([key, value]) => [
      key,
      key === "tailwindcssVitePlugin" ||
      key === "viteModule" ||
      key === "viteReactPlugin"
        ? pathToFileURL(value).href
        : value.replaceAll("\\", "/"),
    ]),
  )
}

async function installShadcnComponents({
  packageRoot,
  components,
  paths,
  shadcnTemplateDir,
}) {
  const selectedComponents = components.length > 0 ? components : ["card"]

  await runShadcnCli(
    [
      "add",
      ...selectedComponents,
      "--yes",
      "--overwrite",
      "--cwd",
      paths.runtimeDir,
      "--silent",
    ],
    { packageRoot, paths, shadcnTemplateDir },
  )
}

function normalizeCssImportPath({ from, to }) {
  const relative = path.relative(path.dirname(from), to).replaceAll("\\", "/")
  return relative.startsWith(".") ? relative : `./${relative}`
}

async function runShadcnCli(
  args,
  { cwd, env, packageRoot, paths, shadcnTemplateDir },
) {
  const command = await resolveShadcnCommand(packageRoot)
  const commandCwd = cwd ?? paths.runtimeDir
  const localRegistryEnv = isLocalRegistryUrl(process.env.REGISTRY_URL)
    ? {
        ALL_PROXY: "",
        HTTPS_PROXY: "",
        HTTP_PROXY: "",
        NO_PROXY: withLocalNoProxy(process.env.NO_PROXY),
        all_proxy: "",
        http_proxy: "",
        https_proxy: "",
        no_proxy: withLocalNoProxy(process.env.no_proxy),
      }
    : {}

  try {
    await execFileAsync(command.file, [...command.args, ...args], {
      cwd: commandCwd,
      env: {
        ...process.env,
        AHTML_SHADCN_RUNTIME: "1",
        ...(shadcnTemplateDir
          ? { SHADCN_TEMPLATE_DIR: shadcnTemplateDir }
          : {}),
        ...localRegistryEnv,
        ...env,
      },
    })
  } catch (error) {
    const detail =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : String(error)
    const stdout =
      typeof error?.stdout === "string" && error.stdout.trim().length > 0
        ? ` stdout: ${error.stdout.trim()}`
        : ""
    const stderr =
      typeof error?.stderr === "string" && error.stderr.trim().length > 0
        ? ` stderr: ${error.stderr.trim()}`
        : ""

    throw new Error(
      `shadcn CLI failed during runtime setup. ${detail}${stdout}${stderr}`,
    )
  }
}

export function resolveShadcnTemplateDir() {
  const templateDir = process.env.AHTML_SHADCN_TEMPLATE_DIR?.trim()
  const allowTemplateOverride =
    process.env.AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE === "1"
  const localRegistryUrl = isLocalRegistryUrl(process.env.REGISTRY_URL)

  if (!templateDir || !allowTemplateOverride || !localRegistryUrl) {
    return undefined
  }

  return path.resolve(templateDir)
}

async function resolveShadcnCommand(packageRoot) {
  const packageRequire = createRequire(path.join(packageRoot, "package.json"))
  const shadcnBin = packageRequire.resolve("shadcn")

  try {
    await access(shadcnBin)
  } catch {
    throw new Error(`Unable to find shadcn CLI at ${shadcnBin}.`)
  }

  return { file: process.execPath, args: [shadcnBin] }
}

async function canContinueAfterInitInstallFailure(error, generatedRuntimeDir) {
  try {
    await access(path.join(generatedRuntimeDir, "components.json"))
    return true
  } catch {
    return false
  }
}

