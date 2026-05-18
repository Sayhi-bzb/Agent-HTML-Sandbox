import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import ts from "typescript"

const bridgeDirectory = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(bridgeDirectory, "..", "..")
const internalCoreRoot = path.join(
  packageRoot,
  "src",
  "config",
  "internal-core",
)
const coreEntryPath = path.join(internalCoreRoot, "core.ts")
const importFromPattern = /from\s+["']([^"']+)["']/g
const localImportPattern = /from\s+["'](\.{1,2}\/[^"']+)["']/g
const compiled = new Set()
const outRoot = path.join(
  os.tmpdir(),
  "ahtml-internal-core",
  createHash("sha256")
    .update(`${packageRoot}:${process.pid}`)
    .digest("hex")
    .slice(0, 16),
)
const core = await loadCoreModule()

export const BLOCKED_AGENT_FACING_PROP_NAMES =
  core.BLOCKED_AGENT_FACING_PROP_NAMES
export const getAllowedPropNames = core.getAllowedPropNames
export const getComponentPropSchema = core.getComponentPropSchema
export const getComponentSchema = core.getComponentSchema
export const isStandardComponentName = core.isStandardComponentName
export const STANDARD_COMPONENT_NAMES = core.STANDARD_COMPONENT_NAMES
export const STANDARD_COMPONENT_SCHEMAS = core.STANDARD_COMPONENT_SCHEMAS
export const TEXT_CHILD = core.TEXT_CHILD
export const VALIDATED_STANDARD_COMPONENT_SCHEMAS =
  core.VALIDATED_STANDARD_COMPONENT_SCHEMAS
export const createPublicAgentContract = core.createPublicAgentContract
export const createPublicRenderConfigContract =
  core.createPublicRenderConfigContract
export const createPublicSafetyPolicy = core.createPublicSafetyPolicy
export const BUILTIN_STYLE_PROFILES_BY_REFERENCE =
  core.BUILTIN_STYLE_PROFILES_BY_REFERENCE
export const createRenderConfigFromStyleProfile =
  core.createRenderConfigFromStyleProfile
export const DEFAULT_STYLE_PROFILE_REFERENCE =
  core.DEFAULT_STYLE_PROFILE_REFERENCE
export const DEFAULT_RENDER_CONFIG = core.DEFAULT_RENDER_CONFIG
export const formatForbiddenPolicy = core.formatForbiddenPolicy
export const parseRenderConfig = core.parseRenderConfig
export const PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES =
  core.PUBLIC_DOCUMENT_STYLE_CONFIG_REFERENCE_VALUES
export const PUBLIC_RENDER_CONFIG_KEY = core.PUBLIC_RENDER_CONFIG_KEY
export const PUBLIC_RENDER_CONFIG_DEFAULTS = core.PUBLIC_RENDER_CONFIG_DEFAULTS
export const PUBLIC_RENDER_CONFIG_MODEL = core.PUBLIC_RENDER_CONFIG_MODEL
export const RENDER_CONFIG_KEYS = core.RENDER_CONFIG_KEYS
export const RENDER_CONFIG_VALUES = core.RENDER_CONFIG_VALUES
export const RenderConfigSchema = core.RenderConfigSchema
export const sanitizeAgentHtml = core.sanitizeAgentHtml
export const StyleProfileSchema = core.StyleProfileSchema
export const STYLE_PROFILE_STORAGE_VERSION = core.STYLE_PROFILE_STORAGE_VERSION

async function loadCoreModule() {
  const outPath = await compileTsGraph(coreEntryPath)
  return import(pathToFileURL(outPath).href)
}

async function compileTsGraph(sourcePath) {
  const resolvedSourcePath = path.resolve(sourcePath)

  if (compiled.has(resolvedSourcePath)) {
    return getOutPath(resolvedSourcePath)
  }

  compiled.add(resolvedSourcePath)

  const source = await readFile(resolvedSourcePath, "utf8")
  const imports = getLocalImports(resolvedSourcePath, source)

  for (const importedPath of imports) {
    await compileTsGraph(importedPath)
  }

  const output = ts.transpileModule(source, {
    compilerOptions: {
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: resolvedSourcePath,
  }).outputText
  const rewritten = rewriteImports(resolvedSourcePath, output)
  const outPath = getOutPath(resolvedSourcePath)

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, rewritten)
  return outPath
}

function getLocalImports(sourcePath, source) {
  return [...source.matchAll(localImportPattern)]
    .map((match) => resolveLocalImport(sourcePath, match[1]))
    .filter(Boolean)
}

function resolveLocalImport(sourcePath, specifier) {
  const candidate = path.resolve(path.dirname(sourcePath), specifier)

  if (path.extname(candidate) === ".ts") {
    return assertInsideVendoredCore(candidate)
  }

  if (hasJavaScriptExtension(candidate)) {
    return undefined
  }

  return assertInsideVendoredCore(`${candidate}.ts`)
}

function assertInsideVendoredCore(candidate) {
  const resolved = path.resolve(candidate)

  if (
    resolved === internalCoreRoot ||
    resolved.startsWith(`${internalCoreRoot}${path.sep}`)
  ) {
    return resolved
  }

  throw new Error(
    `Refusing to load TypeScript module outside vendored internal core root: ${candidate}`,
  )
}

function rewriteImports(sourcePath, output) {
  return output.replace(importFromPattern, (match, specifier) => {
    if (!isLocalSpecifier(specifier)) {
      return match.replace(specifier, resolveBareSpecifier(specifier))
    }

    if (hasExecutableJavaScriptExtension(specifier)) {
      return match.replace(
        specifier,
        pathToFileURL(resolveSourceImportPath(sourcePath, specifier)).href,
      )
    }

    if (hasJavaScriptExtension(specifier)) {
      return match.replace(specifier, specifier.replace(/\.ts$/, ".mjs"))
    }

    return match.replace(specifier, `${specifier}.mjs`)
  })
}

function hasJavaScriptExtension(specifier) {
  return [".cjs", ".js", ".mjs", ".ts"].includes(path.extname(specifier))
}

function hasExecutableJavaScriptExtension(specifier) {
  return [".cjs", ".js", ".mjs"].includes(path.extname(specifier))
}

function isLocalSpecifier(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../")
}

function resolveBareSpecifier(specifier) {
  if (specifier.startsWith("node:")) {
    return specifier
  }

  const require = createRequire(path.join(packageRoot, "package.json"))
  return pathToFileURL(require.resolve(specifier)).href
}

function resolveSourceImportPath(sourcePath, specifier) {
  return path.resolve(path.dirname(sourcePath), specifier)
}

function getOutPath(sourcePath) {
  const relativePath = path.relative(internalCoreRoot, sourcePath)
  const parsed = path.parse(relativePath)

  return path.join(outRoot, parsed.dir, `${parsed.name}.mjs`)
}
