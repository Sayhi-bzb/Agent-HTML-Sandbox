import { access, constants, mkdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import ts from "typescript"

import {
  requiredShadcnRuntimeExports,
  supportedRuntimeBase,
} from "../config/render-capabilities.mjs"
import { getCliSchemaOutput } from "./schema.mjs"
import {
  assertRuntimeComponentsJson,
  assertRuntimeCssBase,
  assertRuntimeCssEntry,
  formatShadcnRuntimeSurface,
} from "./runtime-surface.mjs"
import { checkForPackageUpdate } from "./update-check.mjs"
import { readRuntimeManifest } from "./runtime-status.mjs"
import { parseJson } from "./cli-io.mjs"

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
      return assertRuntimeComponentsJson(runtimePaths)
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "shadcn-css-entry", async () => {
      const manifest = await readRuntimeManifest(runtimePaths)
      return assertRuntimeCssEntry({ manifest, paths: runtimePaths })
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
      return formatShadcnRuntimeSurface(manifest.shadcnRuntimeSurface)
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
    await runDoctorCheck("runtime", "render-capabilities", async () => {
      await stat(runtimePaths.runtimeCapabilitiesPath)
      return runtimePaths.runtimeCapabilitiesPath
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "render-capability-parity", async () => {
      const schema = await getCliSchemaOutput()
      const runtimeCapabilities = await readRuntimeCapabilities(runtimePaths)

      assertUiCapabilitiesParity({
        actual: runtimeCapabilities.uiCapabilities,
        actualName: "runtime render capabilities",
        expected: schema.uiCapabilities,
        expectedName: "schema uiCapabilities",
      })

      return `${runtimeCapabilities.uiCapabilities.components.length} ui capabilities`
    }),
  )
  checks.push(
    await runDoctorCheck("runtime", "renderer-spec-parity", async () => {
      const schema = await getCliSchemaOutput()
      const runtimeCapabilities = await readRuntimeCapabilities(runtimePaths)

      assertRendererSpecParity({
        actual: runtimeCapabilities.rendererSpec,
        actualName: "runtime renderer spec",
        expected: schema.rendererSpec,
        expectedName: "schema rendererSpec",
      })

      return `${runtimeCapabilities.rendererSpec.components.length} renderer specs`
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

async function readRuntimeCapabilities(paths) {
  return parseJson(
    await readFile(paths.runtimeCapabilitiesPath, "utf8"),
    "render-capabilities.generated.json must be valid JSON.",
  )
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

function assertSameStringSet({ actual, actualName, expected, expectedName }) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const missing = expected.filter((item) => !actualSet.has(item))
  const extra = actual.filter((item) => !expectedSet.has(item))

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      [
        `${actualName} does not match ${expectedName}.`,
        missing.length > 0 ? `Missing: ${missing.join(", ")}` : "",
        extra.length > 0 ? `Extra: ${extra.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
  }
}

function assertUiCapabilitiesParity({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualComponents = actual?.components ?? []
  const expectedComponents = expected?.components ?? []

  assertSameStringSet({
    actual: actualComponents.map((component) => component.name),
    actualName: `${actualName} components`,
    expected: expectedComponents.map((component) => component.name),
    expectedName: `${expectedName} components`,
  })

  for (const expectedComponent of expectedComponents) {
    const actualComponent = actualComponents.find(
      (component) => component.name === expectedComponent.name,
    )

    if (!actualComponent) {
      continue
    }

    assertSameStringSet({
      actual: actualComponent.props ?? [],
      actualName: `${actualName} ${expectedComponent.name} props`,
      expected: expectedComponent.props ?? [],
      expectedName: `${expectedName} ${expectedComponent.name} props`,
    })
    assertSameValue({
      actual: actualComponent.renderKind,
      actualName: `${actualName} ${expectedComponent.name} renderKind`,
      expected: expectedComponent.renderKind,
      expectedName: `${expectedName} ${expectedComponent.name} renderKind`,
    })
    assertSameStringSet({
      actual: (actualComponent.slots ?? []).map((slot) => slot.name),
      actualName: `${actualName} ${expectedComponent.name} slots`,
      expected: (expectedComponent.slots ?? []).map((slot) => slot.name),
      expectedName: `${expectedName} ${expectedComponent.name} slots`,
    })

    for (const expectedSlot of expectedComponent.slots ?? []) {
      const actualSlot = (actualComponent.slots ?? []).find(
        (slot) => slot.name === expectedSlot.name,
      )

      if (!actualSlot) {
        continue
      }

      assertSameStringSet({
        actual: actualSlot.props ?? [],
        actualName: `${actualName} ${expectedComponent.name}.${expectedSlot.name} props`,
        expected: expectedSlot.props ?? [],
        expectedName: `${expectedName} ${expectedComponent.name}.${expectedSlot.name} props`,
      })
      assertSameStringSet({
        actual: actualSlot.children ?? [],
        actualName: `${actualName} ${expectedComponent.name}.${expectedSlot.name} children`,
        expected: expectedSlot.children ?? [],
        expectedName: `${expectedName} ${expectedComponent.name}.${expectedSlot.name} children`,
      })
    }
  }
}

function assertRendererSpecParity({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualComponents = actual?.components ?? []
  const expectedComponents = expected?.components ?? []

  assertSameStringSet({
    actual: actualComponents.map((component) => component.name),
    actualName: `${actualName} components`,
    expected: expectedComponents.map((component) => component.name),
    expectedName: `${expectedName} components`,
  })

  for (const expectedComponent of expectedComponents) {
    const actualComponent = actualComponents.find(
      (component) => component.name === expectedComponent.name,
    )

    if (!actualComponent) {
      continue
    }

    assertSameValue({
      actual: actualComponent.renderKind,
      actualName: `${actualName} ${expectedComponent.name} renderKind`,
      expected: expectedComponent.renderKind,
      expectedName: `${expectedName} ${expectedComponent.name} renderKind`,
    })
    assertSameStringSet({
      actual: (actualComponent.slots ?? []).map((slot) => slot.name),
      actualName: `${actualName} ${expectedComponent.name} slots`,
      expected: (expectedComponent.slots ?? []).map((slot) => slot.name),
      expectedName: `${expectedName} ${expectedComponent.name} slots`,
    })
  }
}

function assertSameValue({ actual, actualName, expected, expectedName }) {
  if (actual !== expected) {
    throw new Error(
      `${actualName} does not match ${expectedName}. Actual: ${String(actual)} Expected: ${String(expected)}.`,
    )
  }
}

async function runDoctorCheck(category, name, check) {
  try {
    const detail = await check()
    return { category, name, status: "ok", detail }
  } catch (error) {
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
