import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const distPath = path.resolve(root, getOptionValue("--dir") ?? "dist")
const indexPath = path.join(distPath, "index.html")

let html = await readFile(indexPath, "utf8")

html = await inlineStylesheets(html)
html = await inlineModuleScripts(html)

await writeFile(indexPath, html)

async function inlineStylesheets(source) {
  const linkPattern =
    /<link\s+rel="stylesheet"\s+crossorigin\s+href="\.\/([^"]+)"\s*\/?>/g

  return replaceAsync(source, linkPattern, async (_match, assetPath) => {
    const css = await readFile(path.join(distPath, assetPath), "utf8")
    const rewrittenCss = rewriteRelativeAssetUrls(css, path.dirname(assetPath))
    return `<style>\n${escapeHtmlClosingTag(rewrittenCss, "style")}\n</style>`
  })
}

async function inlineModuleScripts(source) {
  const scriptPattern =
    /<script\s+type="module"\s+crossorigin\s+src="\.\/([^"]+)"><\/script>/g

  return replaceAsync(source, scriptPattern, async (_match, assetPath) => {
    const js = await readFile(path.join(distPath, assetPath), "utf8")
    return `<script type="module">\n${escapeHtmlClosingTag(js, "script")}\n</script>`
  })
}

function escapeHtmlClosingTag(source, tagName) {
  return source.replaceAll(new RegExp(`</${tagName}`, "gi"), `<\\/${tagName}`)
}

function rewriteRelativeAssetUrls(source, assetDir) {
  if (assetDir === ".") {
    return source
  }

  return source.replaceAll(
    /url\((["']?)\.\/([^"')]+)\1\)/g,
    (_match, quote, assetPath) =>
      `url(${quote}./${assetDir}/${assetPath}${quote})`,
  )
}

async function replaceAsync(source, pattern, replacer) {
  const replacements = await Promise.all(
    [...source.matchAll(pattern)].map(async (match) => ({
      match: match[0],
      replacement: await replacer(...match),
    })),
  )

  return replacements.reduce(
    (current, { match, replacement }) =>
      current.replace(match, () => replacement),
    source,
  )
}

function getOptionValue(name) {
  const index = process.argv.indexOf(name)

  if (index === -1) {
    return undefined
  }

  return process.argv[index + 1]
}
