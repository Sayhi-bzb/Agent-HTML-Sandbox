import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import ts from "typescript"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const coreEntryPath = path.join(packageRoot, "src", "core.ts")
const importFromPattern = /from\s+["']([^"']+)["']/g
const localImportPattern = /from\s+["'](\.{1,2}\/[^"']+)["']/g
const compiled = new Set()
const outRoot = path.join(
  os.tmpdir(),
  "ahtml-core-package",
  createHash("sha256").update(packageRoot).digest("hex").slice(0, 16),
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
export const DEFAULT_RENDER_CONFIG = core.DEFAULT_RENDER_CONFIG
export const formatForbiddenPolicy = core.formatForbiddenPolicy
export const parseRenderConfig = core.parseRenderConfig
export const PUBLIC_PROFILE_VALUES = core.PUBLIC_PROFILE_VALUES
export const PUBLIC_RENDER_CONFIG_DEFAULTS = core.PUBLIC_RENDER_CONFIG_DEFAULTS
export const RENDER_CONFIG_KEYS = core.RENDER_CONFIG_KEYS
export const RENDER_CONFIG_VALUES = core.RENDER_CONFIG_VALUES
export const RenderConfigSchema = core.RenderConfigSchema
export const sanitizeAgentHtml = core.sanitizeAgentHtml

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
    return assertInsidePackage(candidate)
  }

  if (hasJavaScriptExtension(candidate)) {
    return undefined
  }

  return assertInsidePackage(`${candidate}.ts`)
}

function assertInsidePackage(candidate) {
  const resolved = path.resolve(candidate)

  if (
    resolved === packageRoot ||
    resolved.startsWith(`${packageRoot}${path.sep}`)
  ) {
    return resolved
  }

  throw new Error(
    `Refusing to load TypeScript module outside core package root: ${candidate}`,
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
  const relativePath = path.relative(packageRoot, sourcePath)
  const parsed = path.parse(relativePath)

  return path.join(outRoot, parsed.dir, `${parsed.name}.mjs`)
}
