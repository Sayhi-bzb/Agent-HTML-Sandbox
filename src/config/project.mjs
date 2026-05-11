import { readFile, stat } from "node:fs/promises"
import path from "node:path"

export async function detectUserProject({
  userRoot,
  components,
  preset,
  template,
}) {
  const packageManager = await detectPackageManager(userRoot)
  const packageJsonPath = path.join(userRoot, "package.json")
  const componentsJsonPath = path.join(userRoot, "components.json")
  const packageJson = await readJsonIfExists(packageJsonPath)
  const componentsJson = await readJsonIfExists(componentsJsonPath)
  const packageJsonExists = Boolean(packageJson)
  const viteConfig = await findFirstExisting(userRoot, [
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.js",
    "vite.config.mjs",
  ])
  const tailwindCss =
    typeof componentsJson?.tailwind?.css === "string"
      ? componentsJson.tailwind.css
      : await findFirstExisting(userRoot, [
          "src/index.css",
          "src/app/global.css",
        ])
  const detected = Boolean(componentsJson)
  const componentDir = resolveShadcnComponentDir(userRoot, componentsJson)
  const missingComponents = await getMissingComponentNames(
    components,
    componentDir,
  )
  const initStep = createShadcnStep(packageManager, [
    "init",
    "--template",
    template,
    "--preset",
    preset,
  ])
  const addStep = createShadcnStep(packageManager, ["add", ...components])
  const steps = detected ? [addStep] : [initStep, addStep]
  const diagnostics = createProjectDiagnostics({
    componentsJson,
    detected,
    packageJsonExists,
    tailwindCss,
    viteConfig,
  })

  return {
    kind: "agent-html-project",
    version: 1,
    integration: "vite-shadcn",
    status: "configured",
    root: userRoot,
    packageManager,
    packageName: typeof packageJson?.name === "string" ? packageJson.name : "",
    template,
    preset,
    paths: {
      packageJson: relativePathOrEmpty(
        userRoot,
        packageJsonPath,
        packageJsonExists,
      ),
      componentsJson: relativePathOrEmpty(
        userRoot,
        componentsJsonPath,
        detected,
      ),
      componentDir: path.relative(userRoot, componentDir),
      tailwindCss: tailwindCss ?? "",
      viteConfig: viteConfig ?? "",
    },
    diagnostics,
    shadcn: {
      detected,
      components,
      missingComponents,
      commands: steps.map((step) => step.command),
      steps,
    },
  }
}

export async function readProjectConfigForDoctor({
  userRoot,
  projectConfigPath,
  defaults,
}) {
  try {
    const source = await readFile(projectConfigPath, "utf8")
    const config = parseJson(
      source,
      "agent-html.project.json must be valid JSON.",
    )

    assertProjectConfigForDoctor(config)
    return config
  } catch (error) {
    if (error?.code === "ENOENT") {
      const detected = await detectUserProject({
        userRoot,
        components: defaults.shadcnComponents,
        preset: defaults.shadcnPreset,
        template: defaults.shadcnTemplate,
      })

      return {
        ...detected,
        status: "missing",
      }
    }

    throw error
  }
}

export async function readProjectConfigIfExists({ projectConfigPath }) {
  const config = await readJsonIfExists(projectConfigPath)

  if (!config) {
    return undefined
  }

  assertProjectConfig(config)
  return config
}

export async function getMissingShadcnComponents({ userRoot, config }) {
  const configuredDir =
    typeof config?.paths?.componentDir === "string" &&
    config.paths.componentDir.length > 0
      ? path.resolve(userRoot, config.paths.componentDir)
      : resolveShadcnComponentDir(userRoot, undefined)

  return getMissingComponentNames(config.shadcn.components, configuredDir)
}

function assertProjectConfig(config) {
  if (
    config?.kind !== "agent-html-project" ||
    config?.integration !== "vite-shadcn"
  ) {
    throw new Error("agent-html.project.json must be written by ahtml init.")
  }
}

function assertProjectConfigForDoctor(config) {
  if (
    config?.kind !== "agent-html-project" ||
    config?.integration !== "vite-shadcn" ||
    !config?.shadcn ||
    !Array.isArray(config.shadcn.components)
  ) {
    throw new Error("agent-html.project.json must be written by ahtml init.")
  }
}

async function readJsonIfExists(filePath) {
  try {
    return parseJson(
      await readFile(filePath, "utf8"),
      `${filePath} JSON invalid.`,
    )
  } catch (error) {
    if (error?.code === "ENOENT") {
      return undefined
    }

    throw error
  }
}

async function findFirstExisting(userRoot, fileNames) {
  for (const fileName of fileNames) {
    try {
      await stat(path.join(userRoot, fileName))
      return fileName
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error
      }
    }
  }

  return undefined
}

async function detectPackageManager(userRoot) {
  const packageJson = await readJsonIfExists(
    path.join(userRoot, "package.json"),
  )

  if (
    typeof packageJson?.packageManager === "string" &&
    packageJson.packageManager.length > 0
  ) {
    return packageJson.packageManager.split("@")[0]
  }

  if (await fileExists(userRoot, "pnpm-lock.yaml")) {
    return "pnpm"
  }

  if (await fileExists(userRoot, "bun.lockb")) {
    return "bun"
  }

  if (await fileExists(userRoot, "yarn.lock")) {
    return "yarn"
  }

  return "npm"
}

async function fileExists(userRoot, fileName) {
  try {
    await stat(path.join(userRoot, fileName))
    return true
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false
    }

    throw error
  }
}

function getPackageRunner(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return "pnpm dlx"
    case "bun":
      return "bunx --bun"
    case "yarn":
      return "yarn dlx"
    case "npm":
    default:
      return "npx"
  }
}

function createShadcnStep(packageManager, commandArgs) {
  const executable = getPackageExecutable(packageManager)
  const prefixArgs = getPackageRunnerArgs(packageManager)
  const args = [...prefixArgs, "shadcn@latest", ...commandArgs]
  return {
    executable,
    args,
    command: [getPackageRunner(packageManager), "shadcn@latest", ...commandArgs]
      .filter(Boolean)
      .join(" "),
  }
}

function getPackageExecutable(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return "pnpm"
    case "bun":
      return "bunx"
    case "yarn":
      return "yarn"
    case "npm":
    default:
      return "npx"
  }
}

function getPackageRunnerArgs(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return ["dlx"]
    case "bun":
      return ["--bun"]
    case "yarn":
      return ["dlx"]
    case "npm":
    default:
      return []
  }
}

function createProjectDiagnostics({
  componentsJson,
  detected,
  packageJsonExists,
  tailwindCss,
  viteConfig,
}) {
  const diagnostics = []

  if (!packageJsonExists) {
    diagnostics.push({
      severity: "warning",
      code: "missing-package-json",
      message: "package.json was not found in the current directory.",
    })
  }

  if (!viteConfig) {
    diagnostics.push({
      severity: "warning",
      code: "missing-vite-config",
      message: "Vite config was not found in the current directory.",
    })
  }

  if (!detected) {
    diagnostics.push({
      severity: "info",
      code: "missing-components-json",
      message: "components.json was not found; shadcn init is required.",
    })
  } else if (!componentsJson?.aliases?.ui) {
    diagnostics.push({
      severity: "warning",
      code: "missing-shadcn-ui-alias",
      message: "components.json does not define aliases.ui.",
    })
  }

  if (!tailwindCss) {
    diagnostics.push({
      severity: "warning",
      code: "missing-tailwind-css",
      message: "Tailwind CSS entry was not found.",
    })
  }

  return diagnostics
}

function resolveShadcnComponentDir(userRoot, componentsJson) {
  const alias = componentsJson?.aliases?.ui

  if (typeof alias !== "string" || alias.length === 0) {
    return path.join(userRoot, "src", "components", "ui")
  }

  return path.resolve(userRoot, alias.replace(/^@\//, "src/"))
}

async function getMissingComponentNames(components, componentDir) {
  const missing = []

  for (const component of components) {
    if (!(await hasComponentFile(componentDir, component))) {
      missing.push(component)
    }
  }

  return missing
}

async function hasComponentFile(componentDir, component) {
  return (
    (await fileExistsAt(path.join(componentDir, `${component}.tsx`))) ||
    (await fileExistsAt(path.join(componentDir, `${component}.ts`))) ||
    (await fileExistsAt(path.join(componentDir, component, "index.tsx"))) ||
    (await fileExistsAt(path.join(componentDir, component, "index.ts")))
  )
}

async function fileExistsAt(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false
    }

    throw error
  }
}

function relativePathOrEmpty(userRoot, filePath, include) {
  return include ? path.relative(userRoot, filePath) : ""
}

function parseJson(source, message) {
  try {
    return JSON.parse(source)
  } catch {
    throw new Error(message)
  }
}
