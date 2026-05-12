import { execFile } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const packageName = "@agent-html/ahtml"
const packagePath = path.join(process.cwd(), "package.json")
const lockPath = path.join(process.cwd(), "package-lock.json")

const current = JSON.parse(await readFile(packagePath, "utf8"))
const baseVersion = getBaseVersion(current.version)
const publishedVersions = await getPublishedVersions()
const nextVersion = getNextAlphaVersion(baseVersion, publishedVersions)

await writeJson(packagePath, { ...current, version: nextVersion })

try {
  const lock = JSON.parse(await readFile(lockPath, "utf8"))
  lock.version = nextVersion

  if (lock.packages?.[""]) {
    lock.packages[""].version = nextVersion
  }

  await writeJson(lockPath, lock)
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error
  }
}

process.stdout.write(`${nextVersion}\n`)

function getBaseVersion(version) {
  const match = /^(\d+\.\d+\.\d+)(?:-.+)?$/.exec(version)

  if (!match) {
    throw new Error(`Cannot derive alpha base from version "${version}".`)
  }

  return match[1]
}

async function getPublishedVersions() {
  try {
    const { stdout } = await execFileAsync("npm", [
      "view",
      packageName,
      "versions",
      "--json",
    ])
    const parsed = JSON.parse(stdout)

    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (error) {
    const stderr = String(error?.stderr ?? "")

    if (stderr.includes("E404")) {
      return []
    }

    throw error
  }
}

function getNextAlphaVersion(baseVersion, versions) {
  const prefix = `${baseVersion}-alpha.`
  const latest = versions.reduce((max, version) => {
    if (typeof version !== "string" || !version.startsWith(prefix)) {
      return max
    }

    const numericSuffix = Number(version.slice(prefix.length))
    return Number.isInteger(numericSuffix) ? Math.max(max, numericSuffix) : max
  }, -1)

  return `${prefix}${latest + 1}`
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
