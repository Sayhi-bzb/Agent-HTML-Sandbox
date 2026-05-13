import { readFile } from "node:fs/promises"
import path from "node:path"

import { cliDefaults } from "../config/defaults.mjs"
import { getCliSchemaOutput } from "./schema.mjs"
import { buildRuntimeArtifact } from "./runtime-build.mjs"
import {
  bootstrapManagedRuntime,
  getRuntimeStatus,
  writeGeneratedDocument,
} from "./runtime-status.mjs"
import { nativeRuntimeSetup, resolveRuntimeSetup } from "./runtime-setup.mjs"
import { validateAgentHtmlSource } from "./validate.mjs"
import { parseJson, printDiagnostics, writeJsonFile } from "./cli-io.mjs"

export function createArtifactWorkflow({
  userRoot,
  defaultOutputDir,
  packageRoot,
  runtimePaths,
  readPackageVersion,
}) {
  async function buildArtifact(inputPath, outputPath) {
    const source = await readFile(path.resolve(userRoot, inputPath), "utf8")
    const validation = await validateAgentHtmlSource(source)

    if (validation.diagnostics.length > 0) {
      printDiagnostics(validation.diagnostics)
      process.exitCode = 1
      return undefined
    }

    const packageVersion = await readPackageVersion()
    await ensureManagedRuntime(packageVersion)
    await writeGeneratedDocument(validation.document, runtimePaths)

    const outputDir = path.resolve(userRoot, outputPath ?? defaultOutputDir)
    await buildRuntimeArtifact({
      outputDir,
      packageRoot,
      paths: runtimePaths,
    })
    await writeJsonFile(
      path.join(outputDir, "agent-html.inspect.json"),
      createInspection(validation.document),
    )
    return outputDir
  }

  async function ensureManagedRuntime(packageVersion) {
    const status = await getRuntimeStatus({
      packageVersion,
      outputDir: defaultOutputDir,
      paths: runtimePaths,
    })

    if (status.ready) {
      return
    }

    await bootstrapManagedRuntime({
      packageRoot,
      packageVersion,
      paths: runtimePaths,
      setup: await resolveRuntimeSetup({
        options: {
          ui: nativeRuntimeSetup.uiLibrary,
          "component-source": nativeRuntimeSetup.componentSource,
          preset: nativeRuntimeSetup.preset,
          components: nativeRuntimeSetup.components,
          yes: true,
        },
        interactive: false,
      }),
      schema: await getCliSchemaOutput(),
    })
  }

  async function inspectDocument(inputPath) {
    const source = await readFile(path.resolve(userRoot, inputPath), "utf8")
    const validation = await validateAgentHtmlSource(source)

    if (validation.diagnostics.length > 0) {
      printDiagnostics(validation.diagnostics)
      process.exit(1)
    }

    return createInspection(validation.document)
  }

  async function inspectArtifactDir(dirPath) {
    const metadataPath = path.join(
      path.resolve(userRoot, dirPath),
      "agent-html.inspect.json",
    )
    const source = await readFile(metadataPath, "utf8")
    return parseJson(source, "agent-html.inspect.json must be valid JSON.")
  }

  return {
    buildArtifact,
    ensureManagedRuntime,
    inspectArtifactDir,
    inspectDocument,
  }
}

export function createInspection(document) {
  if (!document) {
    throw new Error("Cannot inspect an invalid agent-html document.")
  }

  return {
    kind: "agent-html-inspection",
    config: document.meta,
    components: countComponents(document.components),
  }
}

export function formatInspectionSummary(inspection) {
  const lines = [
    "agent-html inspection",
    ...Object.entries(inspection.config).map(
      ([key, value]) => `${key}: ${value}`,
    ),
    "components:",
  ]

  if (inspection.components.length === 0) {
    lines.push("- none")
  } else {
    for (const component of inspection.components) {
      lines.push(`- ${component.name}: ${component.count}`)
    }
  }

  return `${lines.join("\n")}\n`
}

function countComponents(nodes, counts = {}) {
  for (const node of nodes) {
    if (node.type !== "component") {
      continue
    }

    counts[node.name] = (counts[node.name] ?? 0) + 1
    countComponents(node.children, counts)
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function getDefaultOutputDir(userRoot) {
  return path.join(userRoot, ...cliDefaults.outputDir.split("/"))
}
