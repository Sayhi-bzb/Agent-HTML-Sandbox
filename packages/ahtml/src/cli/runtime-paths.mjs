import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const runtimeManifestName = "runtime.json"
export const runtimeRenderer = "shadcn-runtime"
export const runtimeVersion = 1
export const runtimePackageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)

export function getRuntimePaths(env = process.env) {
  const runtimeRoot = path.resolve(
    env.AHTML_HOME || path.join(os.homedir(), ".ahtml"),
  )

  return {
    runtimeRoot,
    runtimeDir: path.join(runtimeRoot, "runtime"),
    cacheDir: path.join(runtimeRoot, "cache"),
    logsDir: path.join(runtimeRoot, "logs"),
    configDir: path.join(runtimeRoot, "config"),
    manifestPath: path.join(runtimeRoot, "config", runtimeManifestName),
    promptUiManifestPath: path.join(
      runtimeRoot,
      "config",
      "prompt-ui.manifest.json",
    ),
    runtimePackageJsonPath: path.join(runtimeRoot, "runtime", "package.json"),
    runtimeCapabilitiesPath: path.join(
      runtimeRoot,
      "runtime",
      "render-capabilities.generated.json",
    ),
    runtimeViteConfigPath: path.join(
      runtimeRoot,
      "runtime",
      "vite.ahtml.config.mjs",
    ),
    runtimeSsrDir: path.join(runtimeRoot, "runtime", ".ahtml-ssr"),
    runtimeSrcDir: path.join(runtimeRoot, "runtime", "src"),
    runtimeComponentsDir: path.join(
      runtimeRoot,
      "runtime",
      "src",
      "components",
      "ui",
    ),
    generatedDocumentPath: path.join(
      runtimeRoot,
      "runtime",
      "document.generated.json",
    ),
  }
}
