import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { cp, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const managedRuntimeUiProofAlgorithm = "sha256"
const managedRuntimeUiSourceDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "runtime-template",
  "src",
  "components",
  "ui",
)

export function getManagedRuntimeUiOverrideEntries(components = []) {
  return [...new Set(components)]
    .map((component) => {
      const fileName = `${component}.tsx`
      const sourcePath = path.join(managedRuntimeUiSourceDir, fileName)

      if (!existsSync(sourcePath)) {
        return undefined
      }

      return {
        component,
        fileName,
        runtimeRelativePath: `src/components/ui/${fileName}`,
        sourcePath,
      }
    })
    .filter(Boolean)
}

export async function applyManagedRuntimeUiOverrides({ components = [], paths }) {
  const entries = getManagedRuntimeUiOverrideEntries(components)

  if (entries.length === 0) {
    return []
  }

  await mkdir(paths.runtimeComponentsDir, { recursive: true })

  for (const entry of entries) {
    await cp(entry.sourcePath, path.join(paths.runtimeComponentsDir, entry.fileName))
  }

  return entries
}

export async function createManagedRuntimeUiProof(components = []) {
  const files = {}

  for (const entry of getManagedRuntimeUiOverrideEntries(components)) {
    files[entry.runtimeRelativePath] = createContentHash(
      await readFile(entry.sourcePath, "utf8"),
    )
  }

  return {
    algorithm: managedRuntimeUiProofAlgorithm,
    files,
  }
}

function createContentHash(source) {
  return createHash(managedRuntimeUiProofAlgorithm).update(source).digest("hex")
}
