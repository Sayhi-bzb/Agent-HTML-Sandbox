/// <reference types="node" />
// @vitest-environment node
// @ts-nocheck

import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { getRuntimePaths } from "./runtime-paths.mjs"
import {
  deleteStyleProfile,
  loadUserStyleProfilesById,
  readCurrentStyleProfileReference,
  saveUserStyleProfile,
  writeCurrentStyleProfileReference,
} from "./style-profile-storage.mjs"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.allSettled(
    tempDirs.splice(0).map(async (directory) => {
      const { rm } = await import("node:fs/promises")
      await rm(directory, { force: true, recursive: true })
    }),
  )
})

describe("style profile storage", () => {
  it("saves and overwrites user profiles", async () => {
    const runtimeHome = await createRuntimeHome()
    const paths = getRuntimePaths({ AHTML_HOME: runtimeHome })
    const firstProfile = createProfile("team-ops", "#0f766e")

    const firstSave = await saveUserStyleProfile(paths, firstProfile)
    const savedSource = await readFile(firstSave.path, "utf8")
    const loadedProfiles = await loadUserStyleProfilesById(paths)

    expect(firstSave.overwritten).toBe(false)
    expect(savedSource).toContain('"id": "team-ops"')
    expect(loadedProfiles.get("team-ops")?.globalStyle.tokenSets.light.primary).toBe(
      "#0f766e",
    )

    const overwriteSave = await saveUserStyleProfile(
      paths,
      createProfile("team-ops", "#0b5fff"),
      { overwrite: true },
    )

    expect(overwriteSave.overwritten).toBe(true)
    expect(
      (await loadUserStyleProfilesById(paths)).get("team-ops")?.globalStyle
        .tokenSets.light.primary,
    ).toBe("#0b5fff")
  })

  it("persists and falls back current style ids", async () => {
    const runtimeHome = await createRuntimeHome()
    const paths = getRuntimePaths({ AHTML_HOME: runtimeHome })

    await saveUserStyleProfile(paths, createProfile("report-default", "#0f766e"), {
      overwrite: true,
    })
    await writeCurrentStyleProfileReference(paths, "report-default")

    expect(await readCurrentStyleProfileReference(paths)).toBe("report-default")

    await saveUserStyleProfile(paths, createProfile("team-ops", "#0f766e"))
    await writeCurrentStyleProfileReference(paths, "team-ops")

    expect(await readCurrentStyleProfileReference(paths)).toBe("team-ops")

    const deletion = await deleteStyleProfile(paths, "team-ops")
    expect(deletion.deleted).toBe(true)
    expect(deletion.currentStyleProfileId).toBe("report-default")
    expect(await readCurrentStyleProfileReference(paths)).toBe("report-default")
  })

  it("rejects invalid ids", async () => {
    const runtimeHome = await createRuntimeHome()
    const paths = getRuntimePaths({ AHTML_HOME: runtimeHome })

    await expect(
      saveUserStyleProfile(paths, createProfile("TeamOps", "#0f766e")),
    ).rejects.toThrow("style profile ids must use lowercase kebab-case")
  })
})

async function createRuntimeHome() {
  const directory = await mkdtemp(path.join(tmpdir(), "ahtml-style-profiles-"))
  tempDirs.push(directory)
  return directory
}

function createProfile(id: string, primary: string) {
  return {
    id,
    globalStyle: {
      tokenSets: {
        light: {
          background: "#fcfbf8",
          foreground: "#1f2933",
          card: "#ffffff",
          cardForeground: "#1f2933",
          popover: "#ffffff",
          popoverForeground: "#1f2933",
          primary,
          primaryForeground: "#f8fafc",
          secondary: "#f2f7f6",
          secondaryForeground: "#1f2933",
          muted: "#eef4f3",
          mutedForeground: "#52606d",
          accent: "#dff5f2",
          accentForeground: "#134e4a",
          destructive: "#be123c",
          border: "#d9e2ec",
          input: "#bcccdc",
          ring: primary,
        },
        dark: {
          background: "oklch(0.18 0.02 190)",
          foreground: "oklch(0.96 0.01 190)",
          card: "oklch(0.24 0.02 190)",
          cardForeground: "oklch(0.96 0.01 190)",
          popover: "oklch(0.24 0.02 190)",
          popoverForeground: "oklch(0.96 0.01 190)",
          primary: "oklch(0.74 0.11 190)",
          primaryForeground: "oklch(0.2 0.02 190)",
          secondary: "oklch(0.3 0.02 190)",
          secondaryForeground: "oklch(0.96 0.01 190)",
          muted: "oklch(0.28 0.02 190)",
          mutedForeground: "oklch(0.78 0.01 190)",
          accent: "oklch(0.32 0.03 190)",
          accentForeground: "oklch(0.96 0.01 190)",
          destructive: "oklch(0.62 0.2 20)",
          border: "oklch(1 0 0 / 12%)",
          input: "oklch(1 0 0 / 18%)",
          ring: "oklch(0.74 0.11 190)",
        },
      },
      radiusScale: {
        base: "0.9rem",
        sm: "calc(var(--radius) * 0.6)",
        md: "calc(var(--radius) * 0.8)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) * 1.4)",
        "2xl": "calc(var(--radius) * 1.8)",
        "3xl": "calc(var(--radius) * 2.2)",
        "4xl": "calc(var(--radius) * 2.6)",
      },
      typography: {
        fontSans:
          '"Inter Variable", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif',
        fontHeading: "var(--font-sans)",
      },
      cssVariableMap: {
        background: "--background",
        foreground: "--foreground",
        card: "--card",
        cardForeground: "--card-foreground",
        popover: "--popover",
        popoverForeground: "--popover-foreground",
        primary: "--primary",
        primaryForeground: "--primary-foreground",
        secondary: "--secondary",
        secondaryForeground: "--secondary-foreground",
        muted: "--muted",
        mutedForeground: "--muted-foreground",
        accent: "--accent",
        accentForeground: "--accent-foreground",
        destructive: "--destructive",
        border: "--border",
        input: "--input",
        ring: "--ring",
        radius: "--radius",
        fontSans: "--font-sans",
        fontHeading: "--font-heading",
      },
    },
    componentStyle: {
      treatments: {
        alert: "ops-alert",
        badge: "ops-badge",
        card: "ops-card",
        input: "ops-field",
        table: "ops-table",
        tabs: "ops-tabs",
        textarea: "ops-field",
      },
    },
  }
}
