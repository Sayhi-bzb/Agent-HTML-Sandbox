import { createHash } from "node:crypto"
import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

import { requiredShadcnRuntimeExports } from "../config/render-capabilities.mjs"
import { parseJson } from "./cli-io.mjs"

const requiredCssImports = [
  "tailwindcss",
  "tw-animate-css",
  "shadcn/tailwind.css",
]
const requiredCssTokens = ["--background", "--foreground", "--border"]
const requiredAliasKeys = ["components", "ui", "lib", "utils"]
const managedRuntimeProofAlgorithm = "sha256"
const managedRuntimeShellSource = "shadcn-official-template"
const managedRuntimeTemplateOverrideSource = "shadcn-template-override"
const supportedManagedRuntimeShellSources = new Set([
  managedRuntimeShellSource,
  managedRuntimeTemplateOverrideSource,
])
const managedRuntimeOwnedFiles = [
  "vite.ahtml.config.mjs",
  "src/app.tsx",
  "src/main.tsx",
  "src/ssr.tsx",
  "src/renderer/elements.tsx",
  "src/renderer/kinds.ts",
  "src/renderer/parity.ts",
  "src/renderer/render-node.tsx",
  "src/renderer/types.ts",
]

export async function createShadcnRuntimeSurface({
  paths,
  shellSource = managedRuntimeShellSource,
  setup,
  runtimeBase,
}) {
  const componentsJson = await readRuntimeComponentsJson(paths)
  const cssPath = componentsJson.cssPath

  await stat(path.join(paths.runtimeDir, cssPath))

  return {
    source: "shadcn-init",
    template: "vite",
    preset: setup.preset,
    style: componentsJson.style,
    base: runtimeBase,
    iconLibrary: componentsJson.iconLibrary,
    shellSource,
    initSource: "shadcn-cli",
    tailwindVersion: await readRuntimeTailwindVersion(paths),
    tailwindCss: cssPath,
    cssPath,
    componentsJson: "components.json",
    aliases: componentsJson.aliases,
    baseLayerExpectation: {
      cssVariables: componentsJson.tailwind.cssVariables,
      imports: requiredCssImports,
      tokens: requiredCssTokens,
    },
    registryItems: setup.components,
    requiredRegistryItems: setup.components,
    requiredFiles: createRequiredRuntimeFiles({
      components: setup.components,
      cssPath,
    }),
    requiredExports: createRequiredRuntimeExports(setup.components),
  }
}

export async function recordManagedRuntimeProof({ paths, surface }) {
  return {
    ...surface,
    managedRuntimeProof: await createManagedRuntimeProof(paths),
  }
}

export async function createManagedRuntimeProof(paths) {
  const files = {}

  for (const relativePath of managedRuntimeOwnedFiles) {
    const absolutePath = path.join(
      paths.runtimeDir,
      relativePath.replaceAll("/", path.sep),
    )
    const source = await readFile(absolutePath, "utf8")

    files[relativePath] = createContentHash(source)
  }

  return {
    algorithm: managedRuntimeProofAlgorithm,
    files,
  }
}

export async function readRuntimeComponentsJson(paths) {
  const componentsJsonPath = path.join(paths.runtimeDir, "components.json")
  const source = await readFile(componentsJsonPath, "utf8")
  const componentsJson = parseJson(
    source,
    "components.json must be valid JSON.",
  )
  const style = requireNonEmptyString(
    componentsJson?.style,
    "components.json style must be a non-empty string.",
  )
  const iconLibrary = requireNonEmptyString(
    componentsJson?.iconLibrary,
    "components.json iconLibrary must be a non-empty string.",
  )
  const tailwind = requireObject(
    componentsJson?.tailwind,
    "components.json tailwind must be an object.",
  )
  const cssPath = normalizeRuntimeRelativePath(
    requireNonEmptyString(
      tailwind.css,
      "components.json tailwind.css must be a non-empty string.",
    ),
  )
  requireNonEmptyString(
    tailwind.baseColor,
    "components.json tailwind.baseColor must be a non-empty string.",
  )
  requireBoolean(
    tailwind.cssVariables,
    "components.json tailwind.cssVariables must be a boolean.",
  )

  const aliases = requireObject(
    componentsJson?.aliases,
    "components.json aliases must be an object.",
  )
  const missingAliases = requiredAliasKeys.filter(
    (aliasKey) =>
      typeof aliases[aliasKey] !== "string" || aliases[aliasKey].trim() === "",
  )

  if (missingAliases.length > 0) {
    throw new Error(
      `components.json aliases must include non-empty strings for: ${missingAliases.join(", ")}.`,
    )
  }

  return {
    raw: componentsJson,
    style,
    iconLibrary,
    cssPath,
    tailwind,
    aliases,
  }
}

export async function assertRuntimeComponentsJson({ manifest, paths }) {
  const componentsJson = await readRuntimeComponentsJson(paths)
  const surface = manifest?.shadcnRuntimeSurface

  if (surface?.componentsJson && surface.componentsJson !== "components.json") {
    throw new Error(
      `Runtime manifest components.json path does not match actual file. Actual: components.json Expected: ${surface.componentsJson}.`,
    )
  }

  if (surface?.style && surface.style !== componentsJson.style) {
    throw new Error(
      `Runtime manifest style does not match components.json style. Actual: ${componentsJson.style} Expected: ${surface.style}.`,
    )
  }

  if (
    surface?.iconLibrary &&
    surface.iconLibrary !== componentsJson.iconLibrary
  ) {
    throw new Error(
      `Runtime manifest iconLibrary does not match components.json iconLibrary. Actual: ${componentsJson.iconLibrary} Expected: ${surface.iconLibrary}.`,
    )
  }

  if (surface?.cssPath && surface.cssPath !== componentsJson.cssPath) {
    throw new Error(
      `Runtime manifest cssPath does not match components.json tailwind.css. Actual: ${componentsJson.cssPath} Expected: ${surface.cssPath}.`,
    )
  }

  return `components.json ${componentsJson.style}/${componentsJson.iconLibrary} ${componentsJson.cssPath}`
}

export async function assertRuntimeCssEntry({ manifest, paths }) {
  const componentsJson = await readRuntimeComponentsJson(paths)
  const cssPath =
    manifest?.shadcnRuntimeSurface?.cssPath ?? componentsJson.cssPath

  if (
    manifest?.shadcnRuntimeSurface?.cssPath &&
    cssPath !== componentsJson.cssPath
  ) {
    throw new Error(
      `Runtime manifest cssPath does not match components.json tailwind.css. Actual: ${componentsJson.cssPath} Expected: ${manifest.shadcnRuntimeSurface.cssPath}.`,
    )
  }

  await stat(path.join(paths.runtimeDir, cssPath))
  return cssPath
}

export async function runtimeCssEntryExists({ manifest, paths }) {
  try {
    await assertRuntimeCssEntry({ manifest, paths })
    return true
  } catch {
    return false
  }
}

export async function assertRuntimeTemplateViteConfig(paths) {
  const templateConfigPath = path.join(paths.runtimeDir, "vite.config.ts")
  let source

  try {
    source = await readFile(templateConfigPath, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Runtime required file is missing: vite.config.ts.")
    }

    throw error
  }
  const missing = []

  if (!source.includes("defineConfig")) {
    missing.push("defineConfig")
  }

  if (!source.includes("@vitejs/plugin-react")) {
    missing.push("@vitejs/plugin-react")
  }

  if (!source.includes("@tailwindcss/vite")) {
    missing.push("@tailwindcss/vite")
  }

  if (
    !source.includes('path.resolve(rootDir, "./src")') &&
    !source.includes("path.resolve(rootDir, './src')") &&
    !source.includes('path.resolve(__dirname, "./src")') &&
    !source.includes("path.resolve(__dirname, './src')")
  ) {
    missing.push("path.resolve(rootDir, './src') or path.resolve(__dirname, './src')")
  }

  if (missing.length > 0) {
    throw new Error(
      `shadcn template vite config is incomplete. Missing: ${missing.join(", ")}.`,
    )
  }

  return "vite.config.ts"
}

export async function assertRuntimeCssImports({ manifest, paths }) {
  const cssPath = await assertRuntimeCssEntry({ manifest, paths })
  const css = await readFile(path.join(paths.runtimeDir, cssPath), "utf8")
  const missingImports = requiredCssImports.filter(
    (specifier) => !hasCssImport(css, specifier),
  )

  if (missingImports.length > 0) {
    throw new Error(
      `shadcn CSS entry is missing required imports: ${missingImports.join(", ")}.`,
    )
  }

  return cssPath
}

export async function assertRuntimeCssBase({ manifest, paths }) {
  const cssPath = await assertRuntimeCssEntry({ manifest, paths })
  const css = await readFile(path.join(paths.runtimeDir, cssPath), "utf8")
  const missingTokens = requiredCssTokens.filter(
    (token) => !css.includes(token),
  )
  const hasBaseBorder =
    css.includes("border-border") || css.includes("border-color: var(--border)")
  const hasBaseBody =
    (css.includes("bg-background") && css.includes("text-foreground")) ||
    (css.includes("var(--background)") && css.includes("var(--foreground)"))

  if (missingTokens.length > 0 || !hasBaseBorder || !hasBaseBody) {
    throw new Error(
      [
        "shadcn CSS base surface is incomplete.",
        missingTokens.length > 0
          ? `Missing tokens: ${missingTokens.join(", ")}.`
          : "",
        !hasBaseBorder ? "Missing border base." : "",
        !hasBaseBody ? "Missing body color base." : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
  }

  return cssPath
}

export async function assertRuntimeSurface({ manifest, paths }) {
  const surface = manifest?.shadcnRuntimeSurface

  if (!surface) {
    throw new Error("Runtime manifest does not record shadcn surface.")
  }

  const componentsJson = await readRuntimeComponentsJson(paths)
  const tailwindVersion = await readRuntimeTailwindVersion(paths)
  const expectedRequiredFiles = createRequiredRuntimeFiles({
    components: manifest.installedUiComponents ?? manifest.components ?? [],
    cssPath: componentsJson.cssPath,
  })
  const issues = []

  if (surface.source !== "shadcn-init") {
    issues.push(
      `surface source must be shadcn-init, got ${String(surface.source)}.`,
    )
  }

  if (surface.template !== "vite") {
    issues.push(
      `surface template must be vite, got ${String(surface.template)}.`,
    )
  }

  if (surface.preset !== manifest.preset) {
    issues.push(
      `surface preset does not match manifest preset. Actual: ${String(surface.preset)} Expected: ${String(manifest.preset)}.`,
    )
  }

  if (surface.base !== manifest.runtimeBase) {
    issues.push(
      `surface base does not match manifest runtimeBase. Actual: ${String(surface.base)} Expected: ${String(manifest.runtimeBase)}.`,
    )
  }

  if (surface.style !== componentsJson.style) {
    issues.push(
      `surface style does not match components.json style. Actual: ${componentsJson.style} Expected: ${String(surface.style)}.`,
    )
  }

  if (surface.iconLibrary !== componentsJson.iconLibrary) {
    issues.push(
      `surface iconLibrary does not match components.json iconLibrary. Actual: ${componentsJson.iconLibrary} Expected: ${String(surface.iconLibrary)}.`,
    )
  }

  if (surface.cssPath !== componentsJson.cssPath) {
    issues.push(
      `surface cssPath does not match components.json tailwind.css. Actual: ${componentsJson.cssPath} Expected: ${String(surface.cssPath)}.`,
    )
  }

  if (surface.tailwindCss && surface.tailwindCss !== componentsJson.cssPath) {
    issues.push(
      `surface tailwindCss does not match components.json tailwind.css. Actual: ${componentsJson.cssPath} Expected: ${String(surface.tailwindCss)}.`,
    )
  }

  if (surface.componentsJson !== "components.json") {
    issues.push(
      `surface componentsJson must be components.json, got ${String(surface.componentsJson)}.`,
    )
  }

  if (!supportedManagedRuntimeShellSources.has(surface.shellSource)) {
    issues.push(
      `surface shellSource must be one of ${Array.from(supportedManagedRuntimeShellSources).join(", ")}, got ${String(surface.shellSource)}.`,
    )
  }

  if (surface.initSource !== "shadcn-cli") {
    issues.push(
      `surface initSource must be shadcn-cli, got ${String(surface.initSource)}.`,
    )
  }

  if (surface.tailwindVersion !== tailwindVersion) {
    issues.push(
      `surface tailwindVersion does not match runtime package. Actual: ${tailwindVersion} Expected: ${String(surface.tailwindVersion)}.`,
    )
  }

  assertSameAliasMap({
    actual: surface.aliases,
    actualName: "surface aliases",
    expected: componentsJson.aliases,
    expectedName: "components.json aliases",
  })
  assertBaseLayerExpectation({
    surface,
    componentsJson,
  })
  assertSameStringSet({
    actual: surface.registryItems ?? [],
    actualName: "surface registryItems",
    expected: manifest.installedUiComponents ?? manifest.components ?? [],
    expectedName: "manifest installedUiComponents",
  })
  assertSameStringSet({
    actual: surface.requiredRegistryItems ?? [],
    actualName: "surface requiredRegistryItems",
    expected: manifest.installedUiComponents ?? manifest.components ?? [],
    expectedName: "manifest installedUiComponents",
  })
  assertSameStringSet({
    actual: surface.requiredFiles ?? [],
    actualName: "surface requiredFiles",
    expected: expectedRequiredFiles,
    expectedName: "expected runtime requiredFiles",
  })
  await assertRuntimeRequiredFiles({
    paths,
    requiredFiles: expectedRequiredFiles,
  })
  assertSameNestedStringMap({
    actual: surface.requiredExports ?? {},
    actualName: "surface requiredExports",
    expected: createRequiredRuntimeExports(
      manifest.installedUiComponents ?? manifest.components ?? [],
    ),
    expectedName: "expected runtime requiredExports",
  })
  await assertManagedRuntimeProof({ paths, surface })

  if (issues.length > 0) {
    throw new Error(
      `Runtime shadcn surface is inconsistent. ${issues.join(" ")}`,
    )
  }

  return formatShadcnRuntimeSurface(surface)
}

export function formatShadcnRuntimeSurface(surface) {
  if (!surface) {
    throw new Error("Runtime manifest does not record shadcn surface.")
  }

  return `${surface.source}/${surface.template}/${surface.style}/${surface.base}/${surface.iconLibrary}`
}

export function formatShadcnRuntimeProvenance(surface) {
  if (!surface) {
    throw new Error("Runtime manifest does not record shadcn surface.")
  }

  const proofCount = Object.keys(
    surface.managedRuntimeProof?.files ?? {},
  ).length

  return `${String(surface.shellSource ?? "missing")}/${String(surface.initSource ?? "missing")}/${String(surface.tailwindVersion ?? "missing")} files:${proofCount}`
}

export function getShadcnRuntimeProvenanceState(surface) {
  if (!surface) {
    throw new Error("Runtime manifest does not record shadcn surface.")
  }

  return {
    state: "complete",
    detail: formatShadcnRuntimeProvenance(surface),
  }
}

export class MissingBuiltArtifactCssError extends Error {
  constructor(outputDir) {
    super(
      `No built artifact CSS found under ${outputDir}. Run ahtml build first.`,
    )
    this.name = "MissingBuiltArtifactCssError"
  }
}

export async function assertBuiltArtifactCss(outputDir) {
  const cssPath = await findBuiltArtifactCss(outputDir)
  const css = await readFile(cssPath, "utf8")
  const normalized = normalizeCssForComparison(css)
  const missingTokens = requiredCssTokens.filter(
    (token) => !css.includes(token),
  )
  const hasBodyBase = hasBuiltBodyBase({
    backgroundPattern: /(?:background-color|background):var\(--background\)/,
    colorPattern: /color:var\(--foreground\)/,
    normalizedCss: normalized,
  })

  if (missingTokens.length > 0 || !hasBodyBase) {
    throw new Error(
      [
        "Built artifact CSS is missing compiled shadcn base surface.",
        missingTokens.length > 0
          ? `Missing tokens: ${missingTokens.join(", ")}.`
          : "",
        !hasBodyBase
          ? "Missing body background/color rules compiled from shadcn base."
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
  }

  return path.relative(outputDir, cssPath).replaceAll("\\", "/")
}

function hasBuiltBodyBase({ backgroundPattern, colorPattern, normalizedCss }) {
  const bodyRulePattern = /body\{([^}]*)\}/g
  let match

  while ((match = bodyRulePattern.exec(normalizedCss)) !== null) {
    const bodyRule = match[1]

    if (backgroundPattern.test(bodyRule) && colorPattern.test(bodyRule)) {
      return true
    }
  }

  return false
}

function normalizeRuntimeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.?\//, "")
}

async function readRuntimeTailwindVersion(paths) {
  const packageJson = parseJson(
    await readFile(path.join(paths.runtimeDir, "package.json"), "utf8"),
    "runtime package.json must be valid JSON.",
  )
  const version =
    packageJson?.devDependencies?.tailwindcss ??
    packageJson?.dependencies?.tailwindcss

  return requireNonEmptyString(
    version,
    "runtime package.json must record a tailwindcss version.",
  )
}

function requireNonEmptyString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message)
  }

  return value
}

function requireObject(value, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message)
  }

  return value
}

function requireBoolean(value, message) {
  if (typeof value !== "boolean") {
    throw new Error(message)
  }
}

function assertSameAliasMap({ actual, actualName, expected, expectedName }) {
  const actualObject = requireObject(actual, `${actualName} must be an object.`)
  const expectedObject = requireObject(
    expected,
    `${expectedName} must be an object.`,
  )

  assertSameStringSet({
    actual: Object.keys(actualObject),
    actualName: `${actualName} keys`,
    expected: Object.keys(expectedObject),
    expectedName: `${expectedName} keys`,
  })

  for (const key of Object.keys(expectedObject)) {
    if (actualObject[key] !== expectedObject[key]) {
      throw new Error(
        `${actualName}.${key} does not match ${expectedName}.${key}. Actual: ${String(actualObject[key])} Expected: ${String(expectedObject[key])}.`,
      )
    }
  }
}

function assertBaseLayerExpectation({ surface, componentsJson }) {
  const expectation = requireObject(
    surface.baseLayerExpectation,
    "surface baseLayerExpectation must be an object.",
  )

  if (expectation.cssVariables !== componentsJson.tailwind.cssVariables) {
    throw new Error(
      `surface baseLayerExpectation.cssVariables does not match components.json tailwind.cssVariables. Actual: ${String(componentsJson.tailwind.cssVariables)} Expected: ${String(expectation.cssVariables)}.`,
    )
  }

  assertSameStringSet({
    actual: expectation.imports ?? [],
    actualName: "surface baseLayerExpectation imports",
    expected: requiredCssImports,
    expectedName: "required css imports",
  })
  assertSameStringSet({
    actual: expectation.tokens ?? [],
    actualName: "surface baseLayerExpectation tokens",
    expected: requiredCssTokens,
    expectedName: "required css tokens",
  })
}

async function assertManagedRuntimeProof({ paths, surface }) {
  const proof = requireObject(
    surface.managedRuntimeProof,
    "surface managedRuntimeProof must be an object.",
  )

  if (proof.algorithm !== managedRuntimeProofAlgorithm) {
    throw new Error(
      `surface managedRuntimeProof algorithm must be ${managedRuntimeProofAlgorithm}, got ${String(proof.algorithm)}.`,
    )
  }

  const expectedProof = await createManagedRuntimeProof(paths)

  assertSameStringSet({
    actual: Object.keys(proof.files ?? {}),
    actualName: "surface managedRuntimeProof files",
    expected: Object.keys(expectedProof.files),
    expectedName: "expected managedRuntimeProof files",
  })

  for (const relativePath of Object.keys(expectedProof.files)) {
    if (proof.files[relativePath] !== expectedProof.files[relativePath]) {
      throw new Error(
        `surface managedRuntimeProof ${relativePath} does not match runtime file hash. Actual: ${String(proof.files[relativePath])} Expected: ${String(expectedProof.files[relativePath])}.`,
      )
    }
  }
}

async function assertRuntimeRequiredFiles({ paths, requiredFiles }) {
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(
      paths.runtimeDir,
      relativePath.replaceAll("/", path.sep),
    )

    try {
      await stat(absolutePath)
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`Runtime required file is missing: ${relativePath}.`)
      }

      throw error
    }
  }
}

function hasCssImport(css, specifier) {
  const escapedSpecifier = specifier.replaceAll("/", "\\/")
  const expression = new RegExp(`@import\\s+["']${escapedSpecifier}["'];?`, "m")
  return expression.test(css)
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

function assertSameNestedStringMap({
  actual,
  actualName,
  expected,
  expectedName,
}) {
  const actualObject = requireObject(actual, `${actualName} must be an object.`)
  const expectedObject = requireObject(
    expected,
    `${expectedName} must be an object.`,
  )

  assertSameStringSet({
    actual: Object.keys(actualObject),
    actualName: `${actualName} keys`,
    expected: Object.keys(expectedObject),
    expectedName: `${expectedName} keys`,
  })

  for (const key of Object.keys(expectedObject)) {
    assertSameStringSet({
      actual: actualObject[key] ?? [],
      actualName: `${actualName}.${key}`,
      expected: expectedObject[key] ?? [],
      expectedName: `${expectedName}.${key}`,
    })
  }
}

function createRequiredRuntimeFiles({ components, cssPath }) {
  return [
    "components.json",
    "vite.config.ts",
    normalizeRuntimeRelativePath(cssPath),
    ...components.map((component) =>
      normalizeRuntimeRelativePath(
        path.join("src", "components", "ui", `${component}.tsx`),
      ),
    ),
  ]
}

function createRequiredRuntimeExports(components) {
  return Object.fromEntries(
    components.map((component) => [
      component,
      requiredShadcnRuntimeExports[component] ?? [],
    ]),
  )
}

async function findBuiltArtifactCss(outputDir) {
  try {
    const assetsDir = path.join(outputDir, "assets")
    const entries = await readdir(assetsDir, { recursive: true })
    const cssEntry = entries
      .map((entry) => String(entry))
      .find((entry) => entry.endsWith(".css"))

    if (!cssEntry) {
      throw new MissingBuiltArtifactCssError(outputDir)
    }

    return path.join(assetsDir, cssEntry)
  } catch (error) {
    if (
      error?.code === "ENOENT" ||
      error instanceof MissingBuiltArtifactCssError
    ) {
      throw new MissingBuiltArtifactCssError(outputDir)
    }

    throw error
  }
}

function normalizeCssForComparison(css) {
  return css.replace(/\s+/g, "")
}

function createContentHash(source) {
  return createHash(managedRuntimeProofAlgorithm).update(source).digest("hex")
}
