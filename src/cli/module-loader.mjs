import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import ts from "typescript"

const coreModulePath = "src/engine/core.ts"
const compiledRoots = new Map()
const coreModuleLoaders = new Map()
const importFromPattern = /from\s+["']([^"']+)["']/g
const localImportPattern = /from\s+["'](\.{1,2}\/[^"']+)["']/g

export async function loadCoreModule(root) {
  const resolvedRoot = path.resolve(root)
  let loader = coreModuleLoaders.get(resolvedRoot)

  if (!loader) {
    loader = loadTsModule(resolvedRoot, coreModulePath)
    coreModuleLoaders.set(resolvedRoot, loader)
  }

  return loader
}

async function loadTsModule(root, relativePath) {
  const sourcePath = path.resolve(root, relativePath)
  const outRoot = getOutRoot(root)
  const outPath = await compileTsGraph(root, outRoot, sourcePath)

  return import(pathToFileURL(outPath).href)
}

function getOutRoot(root) {
  const resolvedRoot = path.resolve(root)
  const hash = createHash("sha256")
    .update(resolvedRoot)
    .digest("hex")
    .slice(0, 16)
  return path.join(os.tmpdir(), "ahtml-core-loader", hash)
}

async function compileTsGraph(root, outRoot, sourcePath) {
  const resolvedSourcePath = path.resolve(sourcePath)
  const compiled = getCompiledSet(root)

  if (compiled.has(resolvedSourcePath)) {
    return getOutPath(root, outRoot, resolvedSourcePath)
  }

  compiled.add(resolvedSourcePath)

  const source = await readFile(resolvedSourcePath, "utf8")
  const imports = getLocalImports(root, resolvedSourcePath, source)

  for (const importedPath of imports) {
    await compileTsGraph(root, outRoot, importedPath)
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
  const rewritten = rewriteImports(root, resolvedSourcePath, output)
  const outPath = getOutPath(root, outRoot, resolvedSourcePath)

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, rewritten)
  return outPath
}

function getCompiledSet(root) {
  const resolvedRoot = path.resolve(root)
  let compiled = compiledRoots.get(resolvedRoot)

  if (!compiled) {
    compiled = new Set()
    compiledRoots.set(resolvedRoot, compiled)
  }

  return compiled
}

function getLocalImports(root, sourcePath, source) {
  return [...source.matchAll(localImportPattern)]
    .map((match) => resolveLocalImport(root, sourcePath, match[1]))
    .filter(Boolean)
}

function resolveLocalImport(root, sourcePath, specifier) {
  const candidate = path.resolve(path.dirname(sourcePath), specifier)
  const rootPath = path.resolve(root)

  if (path.extname(candidate) === ".ts") {
    return assertInsideRoot(rootPath, candidate)
  }

  if (hasJavaScriptExtension(candidate)) {
    return undefined
  }

  return assertInsideRoot(rootPath, `${candidate}.ts`)
}

function assertInsideRoot(root, candidate) {
  const resolved = path.resolve(candidate)

  if (resolved === root || resolved.startsWith(`${root}${path.sep}`)) {
    return resolved
  }

  throw new Error(
    `Refusing to load TypeScript module outside package root: ${candidate}`,
  )
}

function rewriteImports(root, sourcePath, output) {
  return output.replace(importFromPattern, (match, specifier) => {
    if (!isLocalSpecifier(specifier)) {
      return match.replace(specifier, resolveBareSpecifier(root, specifier))
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

function resolveBareSpecifier(root, specifier) {
  if (specifier.startsWith("node:")) {
    return specifier
  }

  const require = createRequire(path.join(root, "package.json"))
  return pathToFileURL(require.resolve(specifier)).href
}

function resolveSourceImportPath(sourcePath, specifier) {
  return path.resolve(path.dirname(sourcePath), specifier)
}

function getOutPath(root, outRoot, sourcePath) {
  const relativePath = path.relative(path.resolve(root), sourcePath)
  const parsed = path.parse(relativePath)

  return path.join(outRoot, parsed.dir, `${parsed.name}.mjs`)
}
