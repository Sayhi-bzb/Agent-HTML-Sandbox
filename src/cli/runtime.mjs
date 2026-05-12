import os from "node:os"
import {
  access,
  constants,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"

export const runtimeManifestName = "runtime.json"

export function getRuntimePaths(env = process.env) {
  const runtimeRoot = path.resolve(
    env.AHTML_HOME || path.join(os.homedir(), ".ahtml"),
  )

  return {
    runtimeRoot,
    runtimeDir: path.join(runtimeRoot, "runtime"),
    cacheDir: path.join(runtimeRoot, "cache"),
    logsDir: path.join(runtimeRoot, "logs"),
    configDir: path.join(runtimeRoot, "config"),
    manifestPath: path.join(runtimeRoot, "config", runtimeManifestName),
    generatedDocumentPath: path.join(
      runtimeRoot,
      "runtime",
      "document.generated.json",
    ),
  }
}

export async function bootstrapManagedRuntime({
  packageVersion = "0.0.0",
  paths = getRuntimePaths(),
} = {}) {
  await mkdir(paths.runtimeDir, { recursive: true })
  await mkdir(paths.cacheDir, { recursive: true })
  await mkdir(paths.logsDir, { recursive: true })
  await mkdir(paths.configDir, { recursive: true })

  const manifest = {
    kind: "ahtml-managed-runtime",
    version: 1,
    renderer: "static-html",
    packageVersion,
    paths: {
      runtime: paths.runtimeDir,
      cache: paths.cacheDir,
      logs: paths.logsDir,
      config: paths.configDir,
    },
  }

  await writeJsonFile(paths.manifestPath, manifest)
  return manifest
}

export async function readRuntimeManifest(paths = getRuntimePaths()) {
  const source = await readFile(paths.manifestPath, "utf8")
  const manifest = JSON.parse(source)

  if (
    manifest?.kind !== "ahtml-managed-runtime" ||
    manifest?.renderer !== "static-html"
  ) {
    throw new Error(`${runtimeManifestName} was not written by ahtml init.`)
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
    checks.manifest

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

export async function renderStaticArtifact(document, outputDir) {
  await rm(outputDir, { force: true, recursive: true })
  await mkdir(path.join(outputDir, "assets"), { recursive: true })
  await writeFile(
    path.join(outputDir, "assets", "ahtml.css"),
    createArtifactCss(document),
  )
  await writeFile(
    path.join(outputDir, "index.html"),
    createArtifactHtml(document),
  )
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

function createArtifactHtml(document) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${escapeHtml(getDocumentTitle(document) || "agent-html artifact")}</title>`,
    '    <link rel="stylesheet" href="./assets/ahtml.css" />',
    "  </head>",
    "  <body>",
    `    <main class="ahtml-shell" data-theme="${escapeAttr(document.meta.theme)}" data-density="${escapeAttr(document.meta.density)}" data-tone="${escapeAttr(document.meta.tone)}" data-width="${escapeAttr(document.meta.width)}">`,
    ...document.components.map((node) => indent(renderNode(node), 6)),
    "    </main>",
    "  </body>",
    "</html>",
    "",
  ].join("\n")
}

function createArtifactCss(document) {
  const maxWidth =
    {
      article: "860px",
      dashboard: "1120px",
      wide: "1440px",
    }[document.meta.width] ?? "1120px"
  const gap = document.meta.density === "compact" ? "16px" : "24px"

  return [
    ":root {",
    "  color-scheme: light;",
    '  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    "  background: #f7f7f5;",
    "  color: #1f2933;",
    "}",
    "* { box-sizing: border-box; }",
    "body { margin: 0; min-height: 100vh; background: #f7f7f5; }",
    `.ahtml-shell { width: min(calc(100% - 32px), ${maxWidth}); margin: 0 auto; padding: 40px 0; display: grid; gap: ${gap}; }`,
    ".ahtml-page { display: grid; gap: 20px; }",
    ".ahtml-page-title { margin: 0; font-size: 2rem; line-height: 1.15; font-weight: 700; color: #111827; }",
    ".ahtml-card { border: 1px solid #d9ddd6; border-radius: 8px; background: #ffffff; padding: 24px; box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04); }",
    ".ahtml-card-title { margin: 0 0 12px; font-size: 1.125rem; line-height: 1.35; font-weight: 650; color: #111827; }",
    ".ahtml-section { display: grid; gap: 12px; }",
    ".ahtml-section-title { margin: 0; font-size: 1.125rem; line-height: 1.35; font-weight: 650; color: #111827; }",
    ".ahtml-content { display: grid; gap: 12px; line-height: 1.7; }",
    ".ahtml-text { margin: 0; white-space: pre-wrap; }",
    "",
  ].join("\n")
}

function renderNode(node) {
  if (node.type === "text") {
    return `<p class="ahtml-text">${escapeHtml(node.value)}</p>`
  }

  const title = node.props.title
  const children = node.children.map(renderNode).join("\n")

  if (node.name === "page") {
    return [
      `<article class="ahtml-page" data-agent-html-component="${escapeAttr(node.name)}">`,
      title ? `  <h1 class="ahtml-page-title">${escapeHtml(title)}</h1>` : "",
      children ? indent(children, 2) : "",
      "</article>",
    ]
      .filter(Boolean)
      .join("\n")
  }

  if (node.name === "card") {
    return [
      `<section class="ahtml-card" data-agent-html-component="${escapeAttr(node.name)}">`,
      title ? `  <h2 class="ahtml-card-title">${escapeHtml(title)}</h2>` : "",
      children
        ? `  <div class="ahtml-content">\n${indent(children, 4)}\n  </div>`
        : "",
      "</section>",
    ]
      .filter(Boolean)
      .join("\n")
  }

  return [
    `<section class="ahtml-section" data-agent-html-component="${escapeAttr(node.name)}">`,
    title ? `  <h2 class="ahtml-section-title">${escapeHtml(title)}</h2>` : "",
    children ? indent(children, 2) : "",
    "</section>",
  ]
    .filter(Boolean)
    .join("\n")
}

function getDocumentTitle(document) {
  const page = document.components.find((node) => node.name === "page")
  return page?.props?.title
}

function indent(value, spaces) {
  const prefix = " ".repeat(spaces)
  return value
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join("\n")
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;")
}
