import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export async function writeOrPrint(
  output,
  outputPath,
  userRoot = process.cwd(),
) {
  if (!outputPath) {
    process.stdout.write(output)
    return
  }

  await writeTextFile(path.resolve(userRoot, outputPath), output)
}

export async function writeJsonFile(filePath, value) {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export async function writeTextFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, value)
}

export async function readPackageVersion(packageRoot) {
  const manifest = parseJson(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
    "package.json must be valid JSON.",
  )
  return typeof manifest.version === "string" ? manifest.version : "0.0.0"
}

export function parseJson(source, message) {
  try {
    return JSON.parse(source)
  } catch {
    throw new Error(message)
  }
}

export function printDiagnostics(diagnostics) {
  for (const diagnostic of diagnostics) {
    console.error(
      `${diagnostic.severity}: ${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`,
    )
  }
}
