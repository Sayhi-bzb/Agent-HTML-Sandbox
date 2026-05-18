import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  BUILTIN_STYLE_PROFILES_BY_REFERENCE,
  DEFAULT_STYLE_PROFILE_REFERENCE,
  StyleProfileSchema,
  STYLE_PROFILE_STORAGE_VERSION,
} from "../config/internal-core-bridge.mjs"

export const styleProfileManifestKind = "ahtml-style-profile-manifest"
export const styleProfileGeneratorKind = "ahtml-style-profile-registry"
export const styleProfileStateKind = "ahtml-style-profile-state"
const styleProfileIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
  await writeCurrentStyleProfileReference(paths, DEFAULT_STYLE_PROFILE_REFERENCE)
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

export async function createStyleProfileResolver(paths) {
  const userProfilesById = await loadUserStyleProfilesById(paths)
  const currentStyleReference = await readCurrentStyleProfileReference(paths)

  return (documentStyleConfigReference) =>
    documentStyleConfigReference
      ? userProfilesById.get(documentStyleConfigReference)
      : userProfilesById.get(currentStyleReference)
}

export async function resolveStyleProfileByReference(paths, styleReference) {
  if (BUILTIN_STYLE_PROFILES_BY_REFERENCE[styleReference]) {
    return BUILTIN_STYLE_PROFILES_BY_REFERENCE[styleReference]
  }

  const userProfilesById = await loadUserStyleProfilesById(paths)
  return userProfilesById.get(styleReference)
}

export function getStyleProfileSource(styleReference) {
  return BUILTIN_STYLE_PROFILES_BY_REFERENCE[styleReference]
    ? "builtin"
    : "user"
}

export function isBuiltinStyleProfileReference(styleReference) {
  return Boolean(BUILTIN_STYLE_PROFILES_BY_REFERENCE[styleReference])
}

export async function listStyleProfileReferences(paths) {
  const userProfilesById = await loadUserStyleProfilesById(paths)

  return [
    ...Object.keys(BUILTIN_STYLE_PROFILES_BY_REFERENCE),
    ...userProfilesById.keys(),
  ].sort((left, right) => left.localeCompare(right))
}

export async function loadUserStyleProfilesById(paths) {
  if (!(await pathExists(paths.userStyleProfilesDir))) {
    return new Map()
  }

  const entries = await readdir(paths.userStyleProfilesDir, {
    withFileTypes: true,
  })
  const userProfilesById = new Map()

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name) !== ".json") {
      continue
    }

    const profilePath = path.join(paths.userStyleProfilesDir, entry.name)
    const profileId = path.basename(entry.name, ".json")

    try {
      const source = await readFile(profilePath, "utf8")
      const parsedProfile = StyleProfileSchema.safeParse(JSON.parse(source))

      if (!parsedProfile.success || parsedProfile.data.id !== profileId) {
        continue
      }

      userProfilesById.set(profileId, parsedProfile.data)
    } catch {
      continue
    }
  }

  return userProfilesById
}

export async function saveUserStyleProfile(paths, profile, options = {}) {
  const profileId = profile?.id

  if (!styleProfileIdPattern.test(profileId ?? "")) {
    throw new Error(
      "style profile ids must use lowercase kebab-case, for example team-ops.",
    )
  }

  const parsedProfile = StyleProfileSchema.parse(profile)
  const existingProfile = await resolveStyleProfileByReference(paths, profileId)
  const exists = Boolean(existingProfile)
  const targetPath = isBuiltinStyleProfileReference(profileId)
    ? path.join(paths.builtinStyleProfilesDir, `${profileId}.json`)
    : path.join(paths.userStyleProfilesDir, `${profileId}.json`)

  if (exists && options.overwrite !== true) {
    throw new Error(
      `Style profile "${profileId}" already exists. Pass overwrite to replace it.`,
    )
  }

  await writeJsonFile(targetPath, parsedProfile)

  return {
    id: profileId,
    path: targetPath,
    source: getStyleProfileSource(profileId),
    overwritten: exists,
    profile: parsedProfile,
  }
}

export async function readCurrentStyleProfileReference(paths) {
  try {
    const source = await readFile(paths.styleProfileStatePath, "utf8")
    const state = JSON.parse(source)
    const styleReference = state?.currentStyleProfileId

    if (!styleProfileIdPattern.test(styleReference ?? "")) {
      return DEFAULT_STYLE_PROFILE_REFERENCE
    }

    const profile = await resolveStyleProfileByReference(paths, styleReference)
    return profile ? styleReference : DEFAULT_STYLE_PROFILE_REFERENCE
  } catch (error) {
    if (error?.code === "ENOENT") {
      return DEFAULT_STYLE_PROFILE_REFERENCE
    }

    throw error
  }
}

export async function writeCurrentStyleProfileReference(paths, styleReference) {
  const nextStyleReference = (await resolveStyleProfileByReference(paths, styleReference))
    ? styleReference
    : DEFAULT_STYLE_PROFILE_REFERENCE

  await writeJsonFile(paths.styleProfileStatePath, {
    kind: styleProfileStateKind,
    version: STYLE_PROFILE_STORAGE_VERSION,
    currentStyleProfileId: nextStyleReference,
  })

  return nextStyleReference
}

export async function deleteStyleProfile(paths, styleReference) {
  const targetPath = isBuiltinStyleProfileReference(styleReference)
    ? path.join(paths.builtinStyleProfilesDir, `${styleReference}.json`)
    : path.join(paths.userStyleProfilesDir, `${styleReference}.json`)

  try {
    const { unlink } = await import("node:fs/promises")
    await unlink(targetPath)
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        deleted: false,
        currentStyleProfileId: await readCurrentStyleProfileReference(paths),
      }
    }

    throw error
  }

  const currentStyleProfileId = await readCurrentStyleProfileReference(paths)
  const nextCurrentStyleProfileId =
    currentStyleProfileId === styleReference
      ? await writeCurrentStyleProfileReference(
          paths,
          DEFAULT_STYLE_PROFILE_REFERENCE,
        )
      : currentStyleProfileId

  return {
    deleted: true,
    currentStyleProfileId: nextCurrentStyleProfileId,
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false
    }

    throw error
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
