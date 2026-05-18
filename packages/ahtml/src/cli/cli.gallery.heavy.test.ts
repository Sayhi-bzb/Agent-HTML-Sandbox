/// <reference types="node" />
// @vitest-environment node

import { spawn } from "node:child_process"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  cliPath,
  createCliEnv,
  removeTempDir,
  useShadcnCliHarness,
  waitForPreviewUrl,
  waitForProcessExit,
} from "./cli-test-helpers"

const { getRegistryUrl } = useShadcnCliHarness()

describe("agent-html CLI heavy gallery flows", () => {
  it("serves a built-in style gallery preview", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const outputDir = path.join(tempDir, "gallery")

    const preview = spawn(
      process.execPath,
      [
        cliPath,
        "gallery",
        "--style-ref",
        "report-default",
        "--out",
        outputDir,
        "--port",
        "0",
      ],
      {
        cwd: tempDir,
        env: createCliEnv(
          {
            AHTML_HOME: runtimeHome,
          },
          getRegistryUrl(),
        ),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )

    try {
      const url = await waitForPreviewUrl(preview)
      const response = await fetch(url)
      const body = await response.text()

      expect(body).toContain("<h1>report-default</h1>")
      expect(body).toContain("AHTML Gallery")
      expect(body).toContain("Full component index")
      expect(body).toContain("Light Tokens")
      expect(body).toContain("Dark Tokens")
      expect(body).toContain("Save As")
      expect(body).toContain('data-style-profile="report-default"')
      expect(body).toContain('class="ahtml-gallery-shell"')
      expect(body).toContain('data-slot="tabs"')
      expect(body).toContain('data-slot="table"')
      expect(body).toContain("Create-style customizer on the left")
      expect(body).toContain("report-card")
    } finally {
      preview.kill("SIGTERM")
      await waitForProcessExit(preview)
      await removeTempDir(tempDir)
    }
  }, 120000)

  it("serves user style galleries from AHTML_HOME storage", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const outputDir = path.join(tempDir, "gallery")

    await writeCustomStyleProfile(runtimeHome)

    const preview = spawn(
      process.execPath,
      [
        cliPath,
        "gallery",
        "--style-ref",
        "team-ops",
        "--out",
        outputDir,
        "--port",
        "0",
      ],
      {
        cwd: tempDir,
        env: createCliEnv(
          {
            AHTML_HOME: runtimeHome,
          },
          getRegistryUrl(),
        ),
        stdio: ["ignore", "pipe", "pipe"],
      },
    )

    try {
      const url = await waitForPreviewUrl(preview)
      const response = await fetch(url)
      const body = await response.text()

      expect(body).toContain("<h1>team-ops</h1>")
      expect(body).toContain('data-style-profile="team-ops"')
      expect(body).toContain('data-ahtml-treatment="review-card"')
      expect(body).toContain(":root{--background:#fcfbf8;--foreground:#1f2933;")
      expect(body).toContain("User profile loaded.")
    } finally {
      preview.kill("SIGTERM")
      await waitForProcessExit(preview)
      await removeTempDir(tempDir)
    }
  }, 120000)
})

async function writeCustomStyleProfile(runtimeHome: string) {
  const profileDir = path.join(
    runtimeHome,
    "config",
    "style-profiles",
    "user",
  )
  const profilePath = path.join(profileDir, "team-ops.json")

  await mkdir(profileDir, { recursive: true })
  await writeFile(
    profilePath,
    `${JSON.stringify(createCustomStyleProfile(), null, 2)}\n`,
  )
}

function createCustomStyleProfile() {
  return {
    id: "team-ops",
    globalStyle: {
      tokenSets: {
        light: {
          background: "#fcfbf8",
          foreground: "#1f2933",
          card: "#ffffff",
          cardForeground: "#1f2933",
          popover: "#ffffff",
          popoverForeground: "#1f2933",
          primary: "#0f766e",
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
          ring: "#0f766e",
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
        card: "review-card",
        input: "ops-field",
        table: "ops-table",
        tabs: "ops-tabs",
        textarea: "ops-field",
      },
    },
  }
}
