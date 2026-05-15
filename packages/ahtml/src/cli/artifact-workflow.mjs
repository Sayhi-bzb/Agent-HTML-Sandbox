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
import { getRuntimeRenderDiagnostics } from "./runtime-renderability.mjs"
import { validateAgentHtmlSource } from "./validate.mjs"
import { parseJson, printDiagnostics, writeJsonFile } from "./cli-io.mjs"

export function createArtifactWorkflow({
  userRoot,
  defaultOutputDir,
  packageRoot,
  runtimePaths,
  readPackageVersion,
}) {
  async function buildArtifact(inputPath, outputPath, options = {}) {
    const inputFilePath = path.resolve(userRoot, inputPath)
    const outputDir = path.resolve(userRoot, outputPath ?? defaultOutputDir)
    const source = await readFile(inputFilePath, "utf8")
    const validation = await validateAgentHtmlSource(source)

    if (validation.diagnostics.length > 0) {
      if (options.printDiagnostics !== false) {
        printDiagnostics(validation.diagnostics)
      }
      process.exitCode = 1
      return createBuildResult({
        diagnostics: validation.diagnostics,
        inputPath: inputFilePath,
        ok: false,
        outputDir,
        stage: "validation",
      })
    }

    const packageVersion = await readPackageVersion()
    const schema = await getCliSchemaOutput()
    await ensureManagedRuntime(packageVersion, schema)
    const runtimeDiagnostics = await getRuntimeRenderDiagnostics({
      document: validation.document,
      runtimePaths,
      schema,
    })

    if (runtimeDiagnostics.length > 0) {
      if (options.printDiagnostics !== false) {
        printDiagnostics(runtimeDiagnostics)
      }
      process.exitCode = 1
      return createBuildResult({
        diagnostics: runtimeDiagnostics,
        inputPath: inputFilePath,
        ok: false,
        outputDir,
        stage: "runtime-renderability",
      })
    }

    await writeGeneratedDocument(validation.document, runtimePaths)

    await buildRuntimeArtifact({
      outputDir,
      packageRoot,
      paths: runtimePaths,
    })
    const inspection = createInspection(validation.document)
    const inspectionPath = path.join(outputDir, "agent-html.inspect.json")
    await writeJsonFile(inspectionPath, inspection)
    return createBuildResult({
      inputPath: inputFilePath,
      inspection,
      inspectionPath,
      ok: true,
      outputDir,
    })
  }

  async function ensureManagedRuntime(packageVersion, schema) {
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
      schema: schema ?? (await getCliSchemaOutput()),
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

  async function validateDocument(inputPath, options = {}) {
    const inputFilePath = path.resolve(userRoot, inputPath)
    const source = await readFile(inputFilePath, "utf8")
    const validation = await validateAgentHtmlSource(source)

    if (validation.diagnostics.length > 0) {
      if (options.printDiagnostics !== false) {
        printDiagnostics(validation.diagnostics)
      }
      process.exitCode = 1
      return createValidationResult({
        diagnostics: validation.diagnostics,
        inputPath: inputFilePath,
        ok: false,
      })
    }

    return createValidationResult({
      inputPath: inputFilePath,
      inspection: createInspection(validation.document),
      ok: true,
    })
  }

  return {
    buildArtifact,
    ensureManagedRuntime,
    inspectArtifactDir,
    inspectDocument,
    validateDocument,
  }
}

export function createInspection(document) {
  if (!document) {
    throw new Error("Cannot inspect an invalid agent-html document.")
  }

  const { profile, ...resolvedConfig } = document.meta

  return {
    kind: "agent-html-inspection",
    config: {
      profile,
    },
    resolvedConfig,
    components: countComponents(document.components),
  }
}

function createBuildResult({
  diagnostics = [],
  inputPath,
  inspection,
  inspectionPath,
  ok,
  outputDir,
  stage,
}) {
  return {
    kind: "agent-html-build-result",
    version: 1,
    ok,
    inputPath,
    outputDir,
    ...(inspection ? { inspection, inspectionPath } : {}),
    ...(diagnostics.length > 0 ? { diagnostics, stage } : {}),
  }
}

function createValidationResult({ diagnostics = [], inputPath, inspection, ok }) {
  return {
    kind: "agent-html-validation-result",
    version: 1,
    ok,
    inputPath,
    ...(inspection ? { inspection } : {}),
    ...(diagnostics.length > 0 ? { diagnostics } : {}),
  }
}

export function formatInspectionSummary(inspection) {
  const lines = [
    "agent-html inspection",
    ...Object.entries(inspection.config).map(
      ([key, value]) => `${key}: ${value}`,
    ),
    ...(inspection.resolvedConfig
      ? [
          "resolved tokens:",
          ...Object.entries(inspection.resolvedConfig).map(
            ([key, value]) => `- ${key}: ${value}`,
          ),
        ]
      : []),
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
