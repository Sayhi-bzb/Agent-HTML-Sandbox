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
import { createShadcnRuntimeSurface } from "./runtime-surface.mjs"
import { getDefaultShadcnPreset } from "./shadcn-api.mjs"

const execFileAsync = promisify(execFile)
const templateDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-template",
)
const shadcnTemplateRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "shadcn-template",
)
const shadcnBootstrapTemplateDir = path.join(shadcnTemplateRoot, "vite-app")
const rendererSourceDir = path.join(templateDir, "src")

export async function writeRuntimeTemplate({
  packageRoot,
  paths,
  schema,
  setup,
}) {
  const dependencies = resolveRuntimeDependencies(packageRoot)

  await rm(paths.runtimeDir, { force: true, recursive: true })

  await seedRuntimeProjectShell({ packageRoot, paths })
  await initShadcnRuntime({ packageRoot, paths, setup })

  const runtimeSurface = await createShadcnRuntimeSurface({
    paths,
    setup,
    runtimeBase: supportedRuntimeBase,
  })

  await installShadcnComponents({
    packageRoot,
    components: setup.components,
    paths,
  })
  await injectRendererFiles({ paths, runtimeSurface })
  await renderViteConfig({ dependencies, paths })
  await writeRuntimeCapabilities({ paths, schema, setup, runtimeSurface })

  return runtimeSurface
}

async function seedRuntimeProjectShell({ packageRoot, paths }) {
  await cp(shadcnBootstrapTemplateDir, paths.runtimeDir, { recursive: true })
  await writeRuntimePackageManifest({ packageRoot, paths })
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
    twAnimateCssStylesheet: path.join(
      packageRoot,
      "node_modules",
      "tw-animate-css",
      "dist",
      "tw-animate.css",
    ),
  }
}

async function initShadcnRuntime({ packageRoot, paths, setup }) {
  const preset =
    setup.preset && setup.preset !== "custom"
      ? setup.preset
      : getDefaultShadcnPreset()
  const args = [
    "init",
    "--base",
    supportedRuntimeBase,
    "--yes",
    "--force",
    "--no-reinstall",
    "--cwd",
    paths.runtimeDir,
    "--silent",
    "--preset",
    preset,
  ]

  try {
    await runShadcnCli(args, { packageRoot, paths })
  } catch (error) {
    if (await canContinueAfterInitInstallFailure(error, paths)) {
      return
    }

    throw error
  }
}

async function injectRendererFiles({ paths, runtimeSurface }) {
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
  await writeAhtmlCss(paths)
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
    'import "./ahtml.css"',
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

async function writeAhtmlCss(paths) {
  const source = [
    ".ahtml-shell {",
    "  width: min(calc(100% - 32px), 1120px);",
    "  margin: 0 auto;",
    "  padding: 40px 0;",
    "  display: grid;",
    "  gap: 24px;",
    "}",
    "",
    '.ahtml-shell[data-width="article"] {',
    "  max-width: 860px;",
    "}",
    "",
    '.ahtml-shell[data-width="wide"] {',
    "  max-width: 1440px;",
    "}",
    "",
    '.ahtml-shell[data-density="compact"] {',
    "  gap: 16px;",
    "}",
    "",
    ".ahtml-page {",
    "  display: grid;",
    "  gap: 20px;",
    "}",
    "",
    ".ahtml-page-title {",
    "  margin: 0;",
    "  font-size: 2rem;",
    "  line-height: 1.15;",
    "  font-weight: 700;",
    "}",
    "",
    ".ahtml-section {",
    "  display: grid;",
    "  gap: 12px;",
    "}",
    "",
    ".ahtml-section-title {",
    "  margin: 0;",
    "  font-size: 1.125rem;",
    "  line-height: 1.35;",
    "  font-weight: 650;",
    "}",
    "",
    ".ahtml-content {",
    "  display: grid;",
    "  gap: 12px;",
    "  line-height: 1.7;",
    "}",
    "",
    ".ahtml-text {",
    "  margin: 0;",
    "  white-space: pre-wrap;",
    "}",
    "",
    ".ahtml-list {",
    "  margin: 0;",
    "  padding-left: 1.25rem;",
    "}",
    "",
  ].join("\n")

  await writeFile(path.join(paths.runtimeSrcDir, "ahtml.css"), source)
}

async function writeRuntimePackageManifest({ packageRoot, paths }) {
  const packageJsonPath = path.join(packageRoot, "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
  const versions = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  }
  const manifest = {
    name: "ahtml-runtime",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      build: "vite build",
    },
    dependencies: pickRuntimePackageVersions(versions, [
      "class-variance-authority",
      "clsx",
      "lucide-react",
      "radix-ui",
      "react",
      "react-dom",
      "tailwind-merge",
    ]),
    devDependencies: pickRuntimePackageVersions(versions, [
      "@tailwindcss/vite",
      "tailwindcss",
      "typescript",
      "vite",
    ]),
  }

  await writeFile(
    paths.runtimePackageJsonPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
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

function pickRuntimePackageVersions(versions, names) {
  return Object.fromEntries(
    names.map((name) => [name, requirePackageVersion(versions, name)]),
  )
}

function requirePackageVersion(versions, name) {
  const version = versions[name]

  if (!version) {
    throw new Error(
      `Unable to resolve ${name} from package.json for managed runtime bootstrap.`,
    )
  }

  return version
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
  paths,
  schema,
  setup,
  runtimeSurface,
}) {
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
    shadcnRuntimeSurface: runtimeSurface,
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

async function installShadcnComponents({ packageRoot, components, paths }) {
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
    { packageRoot, paths },
  )
}

function normalizeCssImportPath({ from, to }) {
  const relative = path.relative(path.dirname(from), to).replaceAll("\\", "/")
  return relative.startsWith(".") ? relative : `./${relative}`
}

async function runShadcnCli(args, { packageRoot, paths }) {
  const command = await resolveShadcnCommand(packageRoot)
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
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_SHADCN_RUNTIME: "1",
        SHADCN_TEMPLATE_DIR: shadcnTemplateRoot,
        ...localRegistryEnv,
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

async function canContinueAfterInitInstallFailure(error, paths) {
  const detail =
    error instanceof Error && typeof error.message === "string"
      ? error.message
      : String(error)

  if (!detail.includes("npm install")) {
    return false
  }

  try {
    await access(path.join(paths.runtimeDir, "components.json"))
    return true
  } catch {
    return false
  }
}
