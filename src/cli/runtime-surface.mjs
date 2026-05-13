import { readFile, stat } from "node:fs/promises"
import path from "node:path"

export async function createShadcnRuntimeSurface({
  paths,
  setup,
  runtimeBase,
}) {
  const componentsJsonPath = path.join(paths.runtimeDir, "components.json")
  const componentsJson = await readJsonFile(componentsJsonPath)
  const cssPath = normalizeRuntimeRelativePath(
    componentsJson?.tailwind?.css ?? "src/styles.css",
  )

  await stat(path.join(paths.runtimeDir, cssPath))

  return {
    source: "shadcn-init",
    template: "vite",
    preset: setup.preset,
    style: componentsJson?.style ?? "unknown",
    base: runtimeBase,
    iconLibrary: componentsJson?.iconLibrary ?? "lucide",
    tailwindCss: cssPath,
    cssPath,
    componentsJson: "components.json",
    registryItems: setup.components,
  }
}

export async function assertRuntimeComponentsJson(paths) {
  await stat(path.join(paths.runtimeDir, "components.json"))
  return "components.json"
}

export async function assertRuntimeCssEntry({ manifest, paths }) {
  const cssPath = manifest.shadcnRuntimeSurface?.cssPath

  if (!cssPath) {
    throw new Error("Runtime manifest does not record shadcn CSS path.")
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

export async function assertRuntimeCssBase({ manifest, paths }) {
  const cssPath = await assertRuntimeCssEntry({ manifest, paths })
  const css = await readFile(path.join(paths.runtimeDir, cssPath), "utf8")
  const requiredTokens = ["--background", "--foreground", "--border"]
  const missingTokens = requiredTokens.filter((token) => !css.includes(token))
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

export function formatShadcnRuntimeSurface(surface) {
  if (!surface) {
    throw new Error("Runtime manifest does not record shadcn surface.")
  }

  return `${surface.source}/${surface.template}/${surface.style}/${surface.base}/${surface.iconLibrary}`
}

async function readJsonFile(filePath) {
  const source = await readFile(filePath, "utf8")
  return JSON.parse(source)
}

function normalizeRuntimeRelativePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.?\//, "")
}
