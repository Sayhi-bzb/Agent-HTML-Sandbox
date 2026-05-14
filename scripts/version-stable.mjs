import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const packagePath = path.join(process.cwd(), "package.json")
const lockPath = path.join(process.cwd(), "package-lock.json")

const current = JSON.parse(await readFile(packagePath, "utf8"))
const nextVersion = getStableVersion(current.version)

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

function getStableVersion(version) {
  const match = /^(\d+\.\d+\.\d+)(?:-.+)?$/.exec(version)

  if (!match) {
    throw new Error(`Cannot derive stable version from "${version}".`)
  }

  if (match[1] === version) {
    throw new Error(`Version "${version}" is already stable.`)
  }

  return match[1]
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
