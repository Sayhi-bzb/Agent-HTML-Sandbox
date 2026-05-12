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
  await writeRuntimeTemplate({ packageRoot, paths, setup })

  const manifest = {
    kind: "ahtml-managed-runtime",
    version: runtimeVersion,
    renderer: runtimeRenderer,
    packageVersion,
    uiLibrary: setup.uiLibrary,
    componentSource: setup.componentSource,
    installMode: setup.installMode,
    preset: setup.preset,
    components: setup.components,
    paths: {
      runtime: paths.runtimeDir,
      cache: paths.cacheDir,
      logs: paths.logsDir,
      config: paths.configDir,
    },
  }

  await writeJsonFile(paths.manifestPath, manifest)
  await writeJsonFile(
    paths.promptUiManifestPath,
    createPromptUiManifest({ packageVersion, setup, schema }),
  )
  return manifest
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

  return manifest
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
    shadcnCard: await pathExists(
      path.join(paths.runtimeComponentsDir, "card.tsx"),
    ),
    promptUiManifest: await pathExists(paths.promptUiManifestPath),
    viteConfig: await pathExists(paths.runtimeViteConfigPath),
    outputWritable: false,
  }
  let manifest
  let manifestError = ""

  try {
    manifest = await readRuntimeManifest(paths)
    checks.manifest = true
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
    checks.shadcnCard &&
    checks.promptUiManifest &&
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

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
