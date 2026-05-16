import { execFile } from "node:child_process"
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { parse, parseFragment, serialize } from "parse5"

import { getRuntimePaths, runtimePackageRoot } from "./runtime-paths.mjs"
import {
  ensureRuntimeBuildConfig,
  resolveRuntimeDependencies,
} from "./runtime-template.mjs"

const execFileAsync = promisify(execFile)

export async function buildRuntimeArtifact({
  outputDir,
  packageRoot = runtimePackageRoot,
  paths = getRuntimePaths(),
}) {
  await rm(outputDir, { force: true, recursive: true })
  await mkdir(outputDir, { recursive: true })

  const { viteBin } = resolveRuntimeDependencies(packageRoot)
  await ensureRuntimeBuildConfig({ packageRoot, paths })
  await execFileAsync(
    process.execPath,
    [
      viteBin,
      "build",
      "--config",
      paths.runtimeViteConfigPath,
      "--outDir",
      outputDir,
    ],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_RUNTIME_PACKAGE_ROOT: packageRoot,
      },
    },
  )
  await rm(paths.runtimeSsrDir, { force: true, recursive: true })
  await execFileAsync(
    process.execPath,
    [
      viteBin,
      "build",
      "--config",
      paths.runtimeViteConfigPath,
      "--ssr",
      path.join(paths.runtimeSrcDir, "ssr.tsx"),
      "--outDir",
      paths.runtimeSsrDir,
    ],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_RUNTIME_PACKAGE_ROOT: packageRoot,
      },
    },
  )

  const ssr = await execFileAsync(
    process.execPath,
    [await findSsrEntrypoint(paths.runtimeSsrDir)],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_RUNTIME_PACKAGE_ROOT: packageRoot,
      },
    },
  )
  await patchBuiltIndexHtml({
    html: ssr.stdout.trim(),
    outputDir,
  })
  await copyDefaultBrandIcon({ outputDir, packageRoot })
}

export async function patchBuiltIndexHtml({ html, outputDir }) {
  const indexPath = path.join(outputDir, "index.html")
  const source = await readFile(indexPath, "utf8")
  const document = parse(source)
  const htmlDocument = findFirstElementByTag(document, "html")
  const head = findFirstElementByTag(htmlDocument ?? document, "head")
  const body = findFirstElementByTag(htmlDocument ?? document, "body")
  const root = findElementById(body ?? document, "root")

  if (!head || !body || !root) {
    throw new Error(
      `Built index.html is missing expected head/body/root nodes.`,
    )
  }

  replaceHeadTitle(head, getSsrDocumentTitle(html))
  replaceHeadIcon(head)
  replaceRootContent(root, html)

  await writeFile(indexPath, await serialize(document))
}

async function copyDefaultBrandIcon({ outputDir, packageRoot }) {
  await copyFile(
    path.join(packageRoot, "assets", "ghost.svg"),
    path.join(outputDir, "ghost.svg"),
  )
}

async function findSsrEntrypoint(directory) {
  const entries = await readdir(directory, { recursive: true })
  const entry = entries
    .map((item) => String(item))
    .find(
      (item) =>
        item.endsWith("ssr.mjs") ||
        item.endsWith("ssr.js") ||
        item.endsWith(".mjs") ||
        item.endsWith(".js"),
    )

  if (!entry) {
    throw new Error(`SSR renderer entry was not built in ${directory}.`)
  }

  return path.join(directory, entry)
}

function getSsrDocumentTitle(html) {
  const fragment = parseFragment(html)
  const heading = findFirstElementByTag(fragment, "h1")
  const title = heading ? getTextContent(heading).trim() : ""

  return title || "agent-html artifact"
}

function replaceHeadTitle(head, title) {
  const titleElement = createElementNode("title", title)
  const existingTitleIndex = head.childNodes.findIndex(
    (node) => isElementNode(node) && node.tagName === "title",
  )

  if (existingTitleIndex >= 0) {
    head.childNodes.splice(existingTitleIndex, 1, titleElement)
    titleElement.parentNode = head
    return
  }

  head.childNodes.push(titleElement)
  titleElement.parentNode = head
}

function replaceHeadIcon(head) {
  const iconElement = createElementNode(
    "link",
    undefined,
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "./ghost.svg",
    },
    true,
  )
  const existingIconIndex = head.childNodes.findIndex(
    (node) =>
      isElementNode(node) &&
      node.tagName === "link" &&
      node.attrs.some((attr) => attr.name === "rel" && attr.value === "icon"),
  )

  if (existingIconIndex >= 0) {
    head.childNodes.splice(existingIconIndex, 1, iconElement)
    iconElement.parentNode = head
    return
  }

  head.childNodes.push(iconElement)
  iconElement.parentNode = head
}

function replaceRootContent(root, html) {
  const replacementRoot = parseFragment(
    `<div id="root">${html}</div>`,
  ).childNodes.find(
    (node) =>
      isElementNode(node) &&
      node.tagName === "div" &&
      getAttrValue(node, "id") === "root",
  )

  if (!replacementRoot || !isElementNode(replacementRoot)) {
    throw new Error("Unable to create SSR root content for built artifact.")
  }

  root.childNodes = replacementRoot.childNodes
  for (const child of root.childNodes) {
    child.parentNode = root
  }
}

function createElementNode(
  tagName,
  textContent,
  attrs = {},
  selfClosing = false,
) {
  const [element] = parseFragment(
    selfClosing
      ? `<${tagName}${formatAttrs(attrs)}>`
      : `<${tagName}${formatAttrs(attrs)}>${escapeHtml(textContent ?? "")}</${tagName}>`,
  ).childNodes

  if (!element || !isElementNode(element)) {
    throw new Error(`Unable to create ${tagName} element for built artifact.`)
  }

  return element
}

function formatAttrs(attrs) {
  const entries = Object.entries(attrs)

  if (entries.length === 0) {
    return ""
  }

  return ` ${entries
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ")}`
}

function findElementById(node, id) {
  return walkElements(node).find(
    (element) => getAttrValue(element, "id") === id,
  )
}

function findFirstElementByTag(node, tagName) {
  return walkElements(node).find((element) => element.tagName === tagName)
}

function walkElements(node) {
  if (!node || typeof node !== "object") {
    return []
  }

  const childNodes = Array.isArray(node.childNodes) ? node.childNodes : []
  const elements = []

  for (const child of childNodes) {
    if (isElementNode(child)) {
      elements.push(child)
    }

    elements.push(...walkElements(child))
  }

  return elements
}

function isElementNode(node) {
  return Boolean(node && typeof node === "object" && "tagName" in node)
}

function getAttrValue(node, name) {
  return node.attrs.find((attr) => attr.name === name)?.value
}

function getTextContent(node) {
  const childNodes = Array.isArray(node.childNodes) ? node.childNodes : []

  return childNodes
    .map((child) => {
      if (child.nodeName === "#text") {
        return child.value
      }

      return getTextContent(child)
    })
    .join("")
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
