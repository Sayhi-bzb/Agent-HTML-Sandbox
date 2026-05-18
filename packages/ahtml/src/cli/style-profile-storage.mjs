import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  BUILTIN_STYLE_PROFILES_BY_REFERENCE,
  DEFAULT_STYLE_PROFILE_REFERENCE,
  STYLE_PROFILE_STORAGE_VERSION,
} from "../config/internal-core-bridge.mjs"

export const styleProfileManifestKind = "ahtml-style-profile-manifest"
export const styleProfileGeneratorKind = "ahtml-style-profile-registry"

export function createStyleProfileStorageManifest(paths) {
  return {
    kind: styleProfileManifestKind,
    version: STYLE_PROFILE_STORAGE_VERSION,
    defaultStyleProfileId: DEFAULT_STYLE_PROFILE_REFERENCE,
    directories: {
      root: paths.styleProfilesDir,
      builtin: paths.builtinStyleProfilesDir,
      user: paths.userStyleProfilesDir,
    },
    generator: {
      kind: styleProfileGeneratorKind,
      profileFormat: "json",
      inheritance: "none",
      readDirectories: [
        paths.builtinStyleProfilesDir,
        paths.userStyleProfilesDir,
      ],
      writeDirectory: paths.userStyleProfilesDir,
    },
    profiles: Object.entries(BUILTIN_STYLE_PROFILES_BY_REFERENCE).map(
      ([id, profile]) => ({
        id,
        source: "builtin",
        path: path.join(paths.builtinStyleProfilesDir, `${id}.json`),
        profile,
      }),
    ),
  }
}

export async function writeStyleProfileStorage(paths) {
  const manifest = createStyleProfileStorageManifest(paths)

  await mkdir(paths.styleProfilesDir, { recursive: true })
  await mkdir(paths.builtinStyleProfilesDir, { recursive: true })
  await mkdir(paths.userStyleProfilesDir, { recursive: true })

  for (const profileEntry of manifest.profiles) {
    await writeJsonFile(profileEntry.path, profileEntry.profile)
  }

  await writeJsonFile(paths.styleProfileManifestPath, manifest)
  return manifest
}

export async function readStyleProfileManifest(paths) {
  const source = await readFile(paths.styleProfileManifestPath, "utf8")
  const manifest = JSON.parse(source)

  if (
    manifest?.kind !== styleProfileManifestKind ||
    manifest?.version !== STYLE_PROFILE_STORAGE_VERSION
  ) {
    throw new Error("style profile manifest was not written by ahtml.")
  }

  return manifest
}

export async function assertStyleProfileStorage(paths) {
  const manifest = await readStyleProfileManifest(paths)

  await stat(paths.styleProfilesDir)
  await stat(paths.builtinStyleProfilesDir)
  await stat(paths.userStyleProfilesDir)

  for (const profileEntry of manifest.profiles ?? []) {
    await stat(profileEntry.path)
  }

  return `${manifest.profiles.length} builtin profiles -> ${paths.userStyleProfilesDir}`
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
