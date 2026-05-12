import { createRequire } from "node:module"
import { cp, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const templateDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-template",
)

export async function writeRuntimeTemplate({ packageRoot, paths }) {
  const dependencies = resolveRuntimeDependencies(packageRoot)

  await cp(templateDir, paths.runtimeDir, { recursive: true })
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
