/// <reference types="node" />
// @vitest-environment node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { afterEach, describe, expect, it } from "vitest"

import {
  assertConformanceResultMatchesFixture,
  createConformanceFixtures,
  runAhtmlConformanceFixture,
  runCoreConformanceFixture,
} from "./agent-html-conformance.mjs"

const root = process.cwd()
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.allSettled(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe("agent-html conformance", () => {
  for (const fixture of createConformanceFixtures()) {
    it(`keeps core and ahtml aligned for ${fixture.name}`, async () => {
      const runtimePaths = await createRuntimePaths()
      const [coreResult, ahtmlResult] = await Promise.all([
        runCoreConformanceFixture(root, fixture),
        runAhtmlConformanceFixture(root, fixture, runtimePaths),
      ])

      expect(ahtmlResult).toEqual(coreResult)
      assertConformanceResultMatchesFixture(fixture.expect, coreResult)
      assertConformanceResultMatchesFixture(fixture.expect, ahtmlResult)
    })
  }
})

async function createRuntimePaths() {
  const runtimeHome = await mkdtemp(path.join(tmpdir(), "ahtml-conformance-"))
  temporaryDirectories.push(runtimeHome)

  const runtimePathsModule = await importRuntimePathsModule()
  const paths = runtimePathsModule.getRuntimePaths({ AHTML_HOME: runtimeHome })

  await writeStyleProfileState(paths.styleProfileStatePath)
  return paths
}

async function importRuntimePathsModule() {
  const moduleUrl = pathToFileURL(
    path.join(root, "packages", "ahtml", "src", "cli", "runtime-paths.mjs"),
  ).href

  return import(moduleUrl)
}

async function writeStyleProfileState(styleProfileStatePath: string) {
  await mkdir(path.dirname(styleProfileStatePath), { recursive: true })
  await writeFile(
    styleProfileStatePath,
    `${JSON.stringify(
      {
        kind: "ahtml-style-profile-state",
        version: 1,
        currentStyleProfileId: "report-default",
      },
      null,
      2,
    )}\n`,
  )
}
