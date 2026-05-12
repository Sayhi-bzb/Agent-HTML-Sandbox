import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const packageName = "@agent-html/ahtml"
const cacheTtlMs = 24 * 60 * 60 * 1000
const requestTimeoutMs = 1500

export async function checkForPackageUpdate({
  currentVersion,
  packageManager,
  now = Date.now(),
} = {}) {
  if (isUpdateCheckDisabled()) {
    return { status: "skipped", reason: "disabled" }
  }

  const installedVersion = currentVersion ?? (await readInstalledVersion())
  const cached = await readCachedUpdateCheck(now)

  if (cached) {
    return createUpdateResult(installedVersion, cached.latestVersion, {
      packageManager,
    })
  }

  try {
    const latestVersion = await fetchLatestVersion()
    await writeCachedUpdateCheck({ latestVersion, checkedAt: now })
    return createUpdateResult(installedVersion, latestVersion, {
      packageManager,
    })
  } catch {
    return { status: "skipped", reason: "unavailable" }
  }
}

function isUpdateCheckDisabled() {
  return process.env.CI === "true" || process.env.AHTML_NO_UPDATE_CHECK === "1"
}

async function readInstalledVersion() {
  const packageJsonPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "package.json",
  )
  const source = await readFile(packageJsonPath, "utf8")
  const manifest = JSON.parse(source)

  return manifest.version
}

async function fetchLatestVersion() {
  const registryUrl =
    process.env.AHTML_UPDATE_REGISTRY_URL ??
    "https://registry.npmjs.org/@agent-html%2Fahtml/latest"
  const response = await fetch(registryUrl, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  })

  if (!response.ok) {
    throw new Error(`registry responded with ${response.status}`)
  }

  const body = await response.json()

  if (typeof body?.version !== "string" || body.version.length === 0) {
    throw new Error("registry response did not include a version")
  }

  return body.version
}

async function readCachedUpdateCheck(now) {
  try {
    const source = await readFile(getCachePath(), "utf8")
    const cached = JSON.parse(source)

    if (
      typeof cached?.latestVersion === "string" &&
      Number.isFinite(cached.checkedAt) &&
      now - cached.checkedAt < cacheTtlMs
    ) {
      return cached
    }
  } catch {
    return undefined
  }

  return undefined
}

async function writeCachedUpdateCheck(value) {
  try {
    const cachePath = getCachePath()
    await mkdir(path.dirname(cachePath), { recursive: true })
    await writeFile(cachePath, `${JSON.stringify(value, null, 2)}\n`)
  } catch {
    // Cache failures should never affect CLI diagnostics.
  }
}

function getCachePath() {
  const cacheRoot =
    process.env.AHTML_UPDATE_CHECK_CACHE_DIR ??
    process.env.XDG_CACHE_HOME ??
    process.env.LOCALAPPDATA ??
    process.env.APPDATA ??
    path.join(os.homedir(), ".cache")

  return path.join(cacheRoot, "ahtml", "update-check.json")
}

function createUpdateResult(currentVersion, latestVersion, { packageManager }) {
  if (compareSemver(latestVersion, currentVersion) > 0) {
    return {
      status: "available",
      currentVersion,
      latestVersion,
      command: getPackageUpdateCommand(packageManager),
    }
  }

  return { status: "current", currentVersion, latestVersion }
}

function getPackageUpdateCommand(packageManager) {
  if (packageManager === "pnpm") {
    return `pnpm add -g ${packageName}@latest`
  }

  if (packageManager === "yarn") {
    return `yarn global add ${packageName}@latest`
  }

  if (packageManager === "bun") {
    return `bun add -g ${packageName}@latest`
  }

  return `npm install -g ${packageName}@latest`
}

function compareSemver(left, right) {
  const parsedLeft = parseSemver(left)
  const parsedRight = parseSemver(right)

  if (!parsedLeft || !parsedRight) {
    return left.localeCompare(right)
  }

  for (const key of ["major", "minor", "patch"]) {
    const delta = parsedLeft[key] - parsedRight[key]

    if (delta !== 0) {
      return delta
    }
  }

  if (!parsedLeft.prerelease && parsedRight.prerelease) {
    return 1
  }

  if (parsedLeft.prerelease && !parsedRight.prerelease) {
    return -1
  }

  if (!parsedLeft.prerelease && !parsedRight.prerelease) {
    return 0
  }

  return comparePrerelease(parsedLeft.prerelease, parsedRight.prerelease)
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/)

  if (!match) {
    return undefined
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  }
}

function comparePrerelease(left = "", right = "") {
  const leftParts = left.split(".")
  const rightParts = right.split(".")
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index++) {
    const leftPart = leftParts[index]
    const rightPart = rightParts[index]

    if (leftPart === undefined) {
      return -1
    }

    if (rightPart === undefined) {
      return 1
    }

    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : undefined
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : undefined

    if (leftNumber !== undefined && rightNumber !== undefined) {
      const delta = leftNumber - rightNumber

      if (delta !== 0) {
        return delta
      }

      continue
    }

    if (leftNumber !== undefined) {
      return -1
    }

    if (rightNumber !== undefined) {
      return 1
    }

    const delta = leftPart.localeCompare(rightPart)

    if (delta !== 0) {
      return delta
    }
  }

  return 0
}
