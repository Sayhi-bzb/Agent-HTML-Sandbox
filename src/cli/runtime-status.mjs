import {
  access,
  constants,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"

import {
  getRuntimePaths,
  runtimeManifestName,
  runtimePackageRoot,
  runtimeRenderer,
  runtimeVersion,
} from "./runtime-paths.mjs"
import { supportedRuntimeBase } from "../config/render-capabilities.mjs"
import {
  bundledRuntimeSetup,
  createPromptUiManifest,
} from "./runtime-setup.mjs"
import { writeRuntimeTemplate } from "./runtime-template.mjs"

export async function bootstrapManagedRuntime({
  packageVersion = "0.0.0",
  packageRoot = runtimePackageRoot,
  paths = getRuntimePaths(),
  setup = bundledRuntimeSetup,
  schema,
} = {}) {
  await mkdir(paths.runtimeDir, { recursive: true })
  await mkdir(paths.cacheDir, { recursive: true })
  await mkdir(paths.logsDir, { recursive: true })
  await mkdir(paths.configDir, { recursive: true })
  await writeRuntimeTemplate({ packageRoot, paths, schema, setup })
  const promptUiManifest = createPromptUiManifest({
    packageVersion,
    setup,
    schema,
  })

  const manifest = {
    kind: "ahtml-managed-runtime",
    version: runtimeVersion,
    renderer: runtimeRenderer,
    packageVersion,
    uiLibrary: setup.uiLibrary,
    componentSource: setup.componentSource,
    runtimeBase: supportedRuntimeBase,
    installMode: setup.installMode,
    preset: setup.preset,
    components: setup.components,
    installedUiComponents: setup.components,
    renderableAgentComponents: promptUiManifest.agentComponents.map(
      (component) => component.name,
    ),
    paths: {
      runtime: paths.runtimeDir,
      cache: paths.cacheDir,
      logs: paths.logsDir,
      config: paths.configDir,
    },
  }

  await writeJsonFile(paths.manifestPath, manifest)
  await writeJsonFile(paths.promptUiManifestPath, promptUiManifest)
  return {
    ...manifest,
    runtimeBase: manifest.runtimeBase ?? supportedRuntimeBase,
    installedUiComponents:
      manifest.installedUiComponents ?? manifest.components,
    renderableAgentComponents:
      manifest.renderableAgentComponents ?? manifest.components,
  }
}

export async function readRuntimeManifest(paths = getRuntimePaths()) {
  const source = await readFile(paths.manifestPath, "utf8")
  const manifest = JSON.parse(source)

  if (
    manifest?.kind !== "ahtml-managed-runtime" ||
    manifest?.renderer !== runtimeRenderer ||
    manifest?.version !== runtimeVersion
  ) {
    throw new Error(`${runtimeManifestName} was not written by ahtml.`)
  }

  return {
    ...manifest,
    runtimeBase: manifest.runtimeBase ?? supportedRuntimeBase,
    installedUiComponents:
      manifest.installedUiComponents ?? manifest.components,
    renderableAgentComponents:
      manifest.renderableAgentComponents ?? manifest.components,
  }
}

export async function getRuntimeStatus({
  packageVersion = "0.0.0",
  outputDir,
  paths = getRuntimePaths(),
} = {}) {
  const checks = {
    root: await pathExists(paths.runtimeRoot),
    runtime: await pathExists(paths.runtimeDir),
    cache: await pathExists(paths.cacheDir),
    logs: await pathExists(paths.logsDir),
    config: await pathExists(paths.configDir),
    manifest: false,
    rendererAdapter: await pathExists(
      path.join(paths.runtimeSrcDir, "main.tsx"),
    ),
    shadcnComponents: false,
    promptUiManifest: await pathExists(paths.promptUiManifestPath),
    runtimeCapabilities: await pathExists(paths.runtimeCapabilitiesPath),
    viteConfig: await pathExists(paths.runtimeViteConfigPath),
    outputWritable: false,
  }
  let manifest
  let manifestError = ""

  try {
    manifest = await readRuntimeManifest(paths)
    checks.manifest = true
    checks.shadcnComponents = await runtimeComponentFilesExist({
      components: manifest.installedUiComponents ?? manifest.components ?? [],
      paths,
    })
  } catch (error) {
    manifestError = error instanceof Error ? error.message : String(error)
  }

  if (outputDir) {
    checks.outputWritable = await probeOutputPath(outputDir)
  }

  const ready =
    checks.root &&
    checks.runtime &&
    checks.cache &&
    checks.logs &&
    checks.config &&
    checks.manifest &&
    checks.rendererAdapter &&
    checks.shadcnComponents &&
    checks.promptUiManifest &&
    checks.runtimeCapabilities &&
    checks.viteConfig

  return {
    ready,
    checks,
    manifest,
    manifestError,
    packageVersion,
    paths,
  }
}

export async function writeGeneratedDocument(
  document,
  paths = getRuntimePaths(),
) {
  await mkdir(path.dirname(paths.generatedDocumentPath), { recursive: true })
  await writeJsonFile(paths.generatedDocumentPath, document)
}

async function probeWritableDirectory(directory) {
  try {
    await mkdir(directory, { recursive: true })
    await access(directory, constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function probeOutputPath(directory) {
  try {
    if (await pathExists(directory)) {
      return probeWritableDirectory(directory)
    }

    const parent = await findExistingAncestor(
      path.dirname(path.resolve(directory)),
    )
    await access(parent, constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function findExistingAncestor(directory) {
  let current = path.resolve(directory)

  while (!(await pathExists(current))) {
    const parent = path.dirname(current)

    if (parent === current) {
      throw new Error(`No existing parent directory for ${directory}.`)
    }

    current = parent
  }

  return current
}

async function pathExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false
    }

    throw error
  }
}

async function runtimeComponentFilesExist({ components, paths }) {
  for (const component of components) {
    if (
      !(await pathExists(
        path.join(paths.runtimeComponentsDir, `${component}.tsx`),
      ))
    ) {
      return false
    }
  }

  return true
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
