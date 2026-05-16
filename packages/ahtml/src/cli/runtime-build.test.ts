/// <reference types="node" />
// @vitest-environment node

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe("runtime build html patching", () => {
  it("replaces the root html, title, and icon link using structured html updates", async () => {
    const tempDir = await mkdtemp(
      path.join(tmpdir(), "agent-html-runtime-build-"),
    )
    const outputDir = path.join(tempDir, "artifact")
    const indexPath = path.join(outputDir, "index.html")

    temporaryDirectories.push(tempDir)
    await mkdir(outputDir, { recursive: true })
    await writeFile(
      indexPath,
      [
        "<!doctype html>",
        "<html>",
        "  <head>",
        '    <meta charset="UTF-8">',
        "    <title>Old title</title>",
        '    <link rel="icon" href="./old.ico">',
        "  </head>",
        "  <body>",
        '    <div id="root"></div>',
        "  </body>",
        "</html>",
      ].join("\n"),
    )

    const { patchBuiltIndexHtml } = await importRuntimeBuildModule()
    await patchBuiltIndexHtml({
      html: "<main><h1>Managed Runtime</h1><p>Built by managed runtime.</p></main>",
      outputDir,
    })

    const next = await readFile(indexPath, "utf8")
    expect(next).toContain("<title>Managed Runtime</title>")
    expect(next).toContain(
      '<link rel="icon" type="image/svg+xml" href="./ghost.svg">',
    )
    expect(next).toContain(
      '<div id="root"><main><h1>Managed Runtime</h1><p>Built by managed runtime.</p></main></div>',
    )
    expect(next).not.toContain("Old title")
    expect(next).not.toContain("./old.ico")
  })

  it("falls back to the default artifact title when the SSR html has no h1", async () => {
    const tempDir = await mkdtemp(
      path.join(tmpdir(), "agent-html-runtime-build-"),
    )
    const outputDir = path.join(tempDir, "artifact")
    const indexPath = path.join(outputDir, "index.html")

    temporaryDirectories.push(tempDir)
    await mkdir(outputDir, { recursive: true })
    await writeFile(
      indexPath,
      [
        "<!doctype html>",
        "<html>",
        "  <head></head>",
        "  <body>",
        '    <div id="root"></div>',
        "  </body>",
        "</html>",
      ].join("\n"),
    )

    const { patchBuiltIndexHtml } = await importRuntimeBuildModule()
    await patchBuiltIndexHtml({
      html: "<main><p>No heading</p></main>",
      outputDir,
    })

    const next = await readFile(indexPath, "utf8")
    expect(next).toContain("<title>agent-html artifact</title>")
  })
})

async function importRuntimeBuildModule() {
  const moduleUrl = pathToFileURL(
    path.join(
      process.cwd(),
      "packages",
      "ahtml",
      "src",
      "cli",
      "runtime-build.mjs",
    ),
  ).href

  return import(moduleUrl) as Promise<{
    readonly patchBuiltIndexHtml: (input: {
      readonly html: string
      readonly outputDir: string
    }) => Promise<void>
  }>
}
