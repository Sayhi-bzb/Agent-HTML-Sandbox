import { execFile } from "node:child_process"
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

import { getRuntimePaths, runtimePackageRoot } from "./runtime-paths.mjs"
import { resolveRuntimeDependencies } from "./runtime-template.mjs"

const execFileAsync = promisify(execFile)

export async function buildRuntimeArtifact({
  outputDir,
  packageRoot = runtimePackageRoot,
  paths = getRuntimePaths(),
}) {
  await rm(outputDir, { force: true, recursive: true })
  await mkdir(outputDir, { recursive: true })

  const { viteBin } = resolveRuntimeDependencies(packageRoot)
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
}

async function patchBuiltIndexHtml({ html, outputDir }) {
  const indexPath = path.join(outputDir, "index.html")
  const source = await readFile(indexPath, "utf8")
  const escapedTitle = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]
  const titleTag = escapedTitle
    ? `    <title>${escapedTitle}</title>\n`
    : "    <title>agent-html artifact</title>\n"
  const withTitle = source.includes("<title>")
    ? source.replace(/[ ]{4}<title>.*?<\/title>\n/s, titleTag)
    : source.replace("  </head>", `${titleTag}  </head>`)
  const next = withTitle.replace(
    '<div id="root"></div>',
    `<div id="root">${html}</div>`,
  )

  await writeFile(indexPath, next)
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
