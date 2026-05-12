import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const templateDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-template",
)

export async function writeRuntimeTemplate({ packageRoot, paths, setup }) {
  const dependencies = resolveRuntimeDependencies(packageRoot)

  await cp(templateDir, paths.runtimeDir, { recursive: true })
  if (setup?.componentSource === "shadcn-cli") {
    if (setup.preset && setup.preset !== "custom") {
      await applyShadcnPreset({ preset: setup.preset, paths })
    }
    await installShadcnComponents({ components: setup.components, paths })
  }
  await renderViteConfig({ dependencies, paths })
}

export function resolveRuntimeDependencies(packageRoot) {
  const packageRequire = createRequire(path.join(packageRoot, "package.json"))

  return {
    viteBin: path.join(
      path.dirname(packageRequire.resolve("vite/package.json")),
      "bin",
      "vite.js",
    ),
    reactRoot: path.dirname(packageRequire.resolve("react/package.json")),
    reactJsxRuntime: packageRequire.resolve("react/jsx-runtime"),
    reactDomRoot: path.dirname(
      packageRequire.resolve("react-dom/package.json"),
    ),
    reactDomClient: packageRequire.resolve("react-dom/client"),
    reactDomServer: packageRequire.resolve("react-dom/server"),
    clsxRoot: packageRequire.resolve("clsx"),
    tailwindMergeRoot: packageRequire.resolve("tailwind-merge"),
  }
}

async function renderViteConfig({ dependencies, paths }) {
  const templatePath = path.join(templateDir, "vite.config.mjs.template")
  const source = await readFile(templatePath, "utf8")
  const rendered = source.replace(
    "__AHTML_RUNTIME_DEPENDENCIES__",
    JSON.stringify(normalizeDependencyPaths(dependencies), null, 2),
  )

  await mkdir(path.dirname(paths.runtimeViteConfigPath), { recursive: true })
  await writeFile(paths.runtimeViteConfigPath, rendered)
}

function normalizeDependencyPaths(dependencies) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([key, value]) => [
      key,
      value.replaceAll("\\", "/"),
    ]),
  )
}

async function installShadcnComponents({ components, paths }) {
  const selectedComponents = components.length > 0 ? components : ["card"]
  await rm(paths.runtimeComponentsDir, { force: true, recursive: true })
  await runShadcnCli(["add", ...selectedComponents, "--overwrite"], paths)
}

async function applyShadcnPreset({ preset, paths }) {
  await runShadcnCli(["apply", preset, "--only", "theme", "--yes"], paths)
}

async function runShadcnCli(args, paths) {
  await execFileAsync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["shadcn@latest", ...args],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_SHADCN_RUNTIME: "1",
      },
      shell: process.platform === "win32",
    },
  )
}
