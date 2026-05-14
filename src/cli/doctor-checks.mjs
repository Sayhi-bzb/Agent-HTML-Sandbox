import { access, constants, mkdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import ts from "typescript"

import {
  requiredShadcnRuntimeExports,
  supportedRuntimeBase,
} from "../config/render-capabilities.mjs"
import { getCliSchemaOutput } from "./schema.mjs"
import {
  assertBuiltArtifactCss,
  assertRuntimeComponentsJson,
  assertRuntimeCssBase,
  assertRuntimeCssEntry,
  assertRuntimeCssImports,
  getShadcnRuntimeProvenanceState,
  assertRuntimeSurface,
  formatShadcnRuntimeSurface,
  MissingBuiltArtifactCssError,
} from "./runtime-surface.mjs"
import {
  assertRendererSpecParity,
  assertRuntimeRendererRegistryParity,
  assertSameStringSet,
  assertUiCapabilitiesParity,
  readRuntimeCapabilities,
} from "./runtime-renderability.mjs"
import { checkForPackageUpdate } from "./update-check.mjs"
import { readRuntimeManifest } from "./runtime-status.mjs"

export async function runDoctorCommand({
  commandArgs,
  defaultOutputDir,
  ensureManagedRuntime,
  packageRoot,
  readPackageVersion,
  runtimePaths,
}) {
  if (commandArgs.length > 0) {
    throw new Error("doctor does not accept arguments.")
  }

  const packageVersion = await readPackageVersion()
  await ensureManagedRuntime(packageVersion)
  const checks = []

  checks.push(
    await runDoctorCheck("environment", "node", async () => process.version),
  )
  checks.push(
    await runDoctorCheck("environment", "package-root", async () => {
      await stat(packageRoot)
      return packageRoot
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "root", async () => {
      await stat(runtimePaths.runtimeRoot)
      return runtimePaths.runtimeRoot
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "manifest", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return `${manifest.renderer} v${manifest.version} ${manifest.uiLibrary}/${manifest.componentSource}/${manifest.preset}`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "base", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)

      if (manifest.runtimeBase !== supportedRuntimeBase) {
        throw new Error(
          `Unsupported runtime base "${manifest.runtimeBase}". Supported: ${supportedRuntimeBase}.`,
        )
      }

      return manifest.runtimeBase
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "schema-renderer-parity", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      const schema = await getCliSchemaOutput()
      const schemaComponents = schema.components.map(
        (component) => component.name,
      )

      assertSameStringSet({
        actual: manifest.renderableAgentComponents,
        actualName: "runtime manifest renderableAgentComponents",
        expected: schemaComponents,
        expectedName: "schema components",
      })

      return `${manifest.renderableAgentComponents.length} components`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "renderer-adapter", async () => {
      await stat(path.join(runtimePaths.runtimeSrcDir, "app.tsx"))
      await stat(path.join(runtimePaths.runtimeSrcDir, "main.tsx"))
      await stat(path.join(runtimePaths.runtimeSrcDir, "ssr.tsx"))
      return "React adapter ready"
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "components-json", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return assertRuntimeComponentsJson({ manifest, paths: runtimePaths })
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-css-entry", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return assertRuntimeCssEntry({ manifest, paths: runtimePaths })
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-css-imports", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return assertRuntimeCssImports({ manifest, paths: runtimePaths })
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-css-base", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return assertRuntimeCssBase({ manifest, paths: runtimePaths })
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-surface", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      await assertRuntimeSurface({ manifest, paths: runtimePaths })
      return formatShadcnRuntimeSurface(manifest.shadcnRuntimeSurface)
    }),
  )
  checks.push(
    await runDoctorProvenanceCheck(async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      await assertRuntimeSurface({ manifest, paths: runtimePaths })
      return getShadcnRuntimeProvenanceState(manifest.shadcnRuntimeSurface)
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-components", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      const componentPaths = manifest.installedUiComponents.map((component) =>
        path.join(runtimePaths.runtimeComponentsDir, `${component}.tsx`),
      )

      for (const [index, componentPath] of componentPaths.entries()) {
        await stat(componentPath)
        await assertRuntimeComponentExports({
          component: manifest.installedUiComponents[index],
          componentPath,
        })
      }

      return manifest.installedUiComponents.join(", ")
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "prompt-ui-manifest", async () => {
      await stat(runtimePaths.promptUiManifestPath)
      return runtimePaths.promptUiManifestPath
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "verification-data", async () => {
      await stat(runtimePaths.runtimeCapabilitiesPath)
      return runtimePaths.runtimeCapabilitiesPath
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "verification-data-parity", async () => {
      const schema = await getCliSchemaOutput()
      const runtimeCapabilities = await readRuntimeCapabilities(runtimePaths)

      assertUiCapabilitiesParity({
        actual: runtimeCapabilities.verificationData,
        actualName: "runtime verification data ui capabilities",
        expected: schema.verificationData,
        expectedName: "schema verificationData",
      })

      return `${runtimeCapabilities.verificationData.components.length} ui capabilities`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "renderer-mapping-parity", async () => {
      const schema = await getCliSchemaOutput()
      const runtimeCapabilities = await readRuntimeCapabilities(runtimePaths)

      assertRendererSpecParity({
        actual: runtimeCapabilities.rendererMapping,
        actualName: "runtime renderer mapping spec",
        expected: schema.rendererMapping,
        expectedName: "schema rendererMapping",
      })

      return `${runtimeCapabilities.rendererMapping.components.length} renderer specs`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "renderer-registry-parity", async () => {
      const runtimeCapabilities = await readRuntimeCapabilities(runtimePaths)
      assertRuntimeRendererRegistryParity(runtimeCapabilities)
      return `${runtimeCapabilities.rendererMapping.components.length} renderer entries`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "vite-config", async () => {
      await stat(runtimePaths.runtimeViteConfigPath)
      return runtimePaths.runtimeViteConfigPath
    }),
  )
  checks.push(
    await runDoctorCheck("artifact", "output-dir", async () => {
      await mkdir(defaultOutputDir, { recursive: true })
      await access(defaultOutputDir, constants.W_OK)
      return defaultOutputDir
    }),
  )
  checks.push(
    await runDoctorCheck(
      "artifact",
      "built-css",
      async () => assertBuiltArtifactCss(defaultOutputDir),
      {
        skip: (error) => error instanceof MissingBuiltArtifactCssError,
      },
    ),
  )
  checks.push(await runDoctorUpdateCheck(packageVersion))

  for (const check of checks) {
    process.stdout.write(
      `${check.status} ${check.category}:${check.name} ${check.detail}\n`,
    )
  }

  if (checks.some((check) => check.status === "fail")) {
    process.exitCode = 1
  }
}

async function assertRuntimeComponentExports({ component, componentPath }) {
  const expectedExports = requiredShadcnRuntimeExports[component] ?? []

  if (expectedExports.length === 0) {
    return
  }

  const source = await readFile(componentPath, "utf8")
  const missingExports = expectedExports.filter(
    (exportName) => !hasNamedExport(source, exportName),
  )

  if (missingExports.length > 0) {
    throw new Error(
      `${componentPath} is missing exports: ${missingExports.join(", ")}`,
    )
  }
}

function hasNamedExport(source, exportName) {
  const sourceFile = ts.createSourceFile(
    "runtime-component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let found = false

  visit(sourceFile)
  return found

  function visit(node) {
    if (found) {
      return
    }

    if (
      isExportedDeclaration(node) &&
      getDeclarationName(node) === exportName
    ) {
      found = true
      return
    }

    if (ts.isExportDeclaration(node) && node.exportClause) {
      const clause = node.exportClause
      const elements = ts.isNamedExports(clause) ? clause.elements : []

      found = elements.some(
        (element) => (element.propertyName ?? element.name).text === exportName,
      )
      if (found) {
        return
      }
    }

    ts.forEachChild(node, visit)
  }
}

function isExportedDeclaration(node) {
  return Boolean(
    ts.canHaveModifiers(node) &&
    ts
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  )
}

function getDeclarationName(node) {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    return node.name.text
  }

  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0]

    if (declaration && ts.isIdentifier(declaration.name)) {
      return declaration.name.text
    }
  }

  return undefined
}

async function runDoctorCheck(category, name, check, options = {}) {
  try {
    const detail = await check()
    return { category, name, status: "ok", detail }
  } catch (error) {
    if (options.skip?.(error)) {
      return {
        category,
        name,
        status: "skip",
        detail: error instanceof Error ? error.message : String(error),
      }
    }

    return {
      category,
      name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runDoctorUpdateCheck(packageVersion) {
  const update = await checkForPackageUpdate({ packageManager: "npm" })

  if (update.status === "available") {
    return {
      category: "package",
      name: "update",
      status: "warn",
      detail: `latest is ${update.latestVersion}. Run: ${update.command}`,
    }
  }

  if (update.status === "current") {
    return {
      category: "package",
      name: "update",
      status: "ok",
      detail: `current ${packageVersion}`,
    }
  }

  return {
    category: "package",
    name: "update",
    status: "skip",
    detail: update.reason,
  }
}

async function runDoctorProvenanceCheck(check) {
  try {
    const result = await check()
    return {
      category: "runtime",
      name: "shadcn-provenance",
      status: result.state === "complete" ? "ok" : "warn",
      detail: result.detail,
    }
  } catch (error) {
    return {
      category: "runtime",
      name: "shadcn-provenance",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}
