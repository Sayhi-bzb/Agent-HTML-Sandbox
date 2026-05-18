/// <reference types="node" />
// @vitest-environment node

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  assertNoProjectScaffold,
  expectCliFailure,
  expectFile,
  expectFileMissingText,
  parseJson,
  removeTempDir,
  useShadcnCliHarness,
} from "./cli-test-helpers"

const { runCliWithServer } = useShadcnCliHarness()

describe("agent-html CLI heavy build flows", () => {
  it("builds from an empty consumer directory and writes runtime state outside the project", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const consumerDir = path.join(tempDir, "consumer")
    const inputPath = path.join(consumerDir, "artifact.agent.html")
    const outputDir = path.join(consumerDir, "dist", "html")

    await mkdir(consumerDir, { recursive: true })
    await writeFile(
      inputPath,
      [
        '<meta-agent style-ref="ops-compact" />',
        [
          '<page title="Managed Runtime">',
          '<card title="Overview">',
          "Built by managed runtime.",
          '<alert title="State" tone="danger">Needs attention.</alert>',
          '<badge tone="success">Ready</badge>',
          "<separator />",
          '<switch label="Live Sync" checked="true" description="Immediate preference toggle." />',
          '<slider label="Review strictness" value="70" description="Read-only numeric field." />',
          '<combobox label="Owner" value="Ops reviewer" description="Searchable single-select field."><option value="Ops reviewer" label="Ops reviewer">Current reviewer.</option><option value="Security reviewer" label="Security reviewer">Escalation reviewer.</option></combobox>',
          '<select label="Deployment Window" value="today" description="Choose a release window."><option value="today" label="Today">Ship in the current window.</option><option value="tomorrow" label="Tomorrow">Wait for the next window.</option></select>',
          '<table><row kind="header"><cell>Name</cell><cell>Status</cell></row><row><cell>Runtime</cell><cell>Ready</cell></row></table>',
          '<list variant="unordered"><item>Portable output</item><item>Readable content</item></list>',
          '<tabs default="summary"><tab value="summary" label="Summary"><card title="Tab card">Tab content.</card></tab></tabs>',
          '<accordion><accordion-item value="details" title="Details">Accordion content.</accordion-item></accordion>',
          "</card>",
          "</page>",
        ].join(""),
      ].join("\n"),
    )

    await runCliWithServer(
      ["build", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      consumerDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Managed Runtime")
    await expectFile(path.join(outputDir, "index.html"), "Overview")
    await expectFile(
      path.join(outputDir, "index.html"),
      "Built by managed runtime.",
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'rel="icon" type="image/svg+xml" href="./ghost.svg"',
    )
    await expectFile(
      path.join(outputDir, "ghost.svg"),
      "lucide lucide-ghost-icon lucide-ghost",
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="tabs"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="table"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="accordion"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="select-trigger"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="input-group"',
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="slider"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="switch"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="alert"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="badge"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-ahtml-treatment="ops-card"',
    )
    await expectFileMissingText(
      path.join(outputDir, "index.html"),
      'class="ahtml-section" data-agent-html-component="tab"',
    )
    await expectFileMissingText(
      path.join(outputDir, "index.html"),
      'class="ahtml-section" data-agent-html-component="accordion-item"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      '<noscript><section class="grid gap-3"><section class="grid gap-3"><h2 class="m-0 text-lg font-medium leading-7">Details</h2>',
    )
    await expectFile(path.join(outputDir, "index.html"), "Today (selected)")
    await expectFileMissingText(path.join(outputDir, "index.html"), "<datalist")
    await expectFile(
      path.join(outputDir, "index.html"),
      "Ops reviewer (selected)",
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-style-profile="ops-compact"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      "max-w-4xl gap-6 px-4 py-10 sm:px-6 items-stretch",
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      ":root{--background:#f7f7f4;--foreground:#26251e;",
    )
    await expectFile(
      path.join(outputDir, "assets", "ahtml.css"),
      "background-color:var(--background)",
    )
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".rounded-lg")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".shadow-sm")
    await expectFile(
      path.join(outputDir, "agent-html.inspect.json"),
      "agent-html-inspection",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "document.generated.json"),
      "Managed Runtime",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "render-verification.generated.json"),
      '"verificationData"',
    )
    await assertNoProjectScaffold(consumerDir)
    await removeTempDir(tempDir)
  }, 120000)

  it("builds semantic agent-html into real shadcn/native artifact structure", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      [
        '<meta-agent style-ref="report-default" />',
        [
          '<page title="Generic Artifact">',
          '<tabs default="summary">',
          '<tab value="summary" label="Summary">',
          '<card title="Overview">',
          '<alert title="State">Built from semantic syntax.</alert>',
          '<badge tone="success">Ready</badge>',
          "<separator />",
          "</card>",
          "</tab>",
          '<tab value="details" label="Details">',
          "<accordion>",
          '<accordion-item value="runtime" title="Runtime">',
          "<list><item>Portable output</item><item>Readable content</item></list>",
          "<table>",
          '<row kind="header"><cell>Layer</cell><cell>Status</cell></row>',
          "<row><cell>Renderer</cell><cell>Ready</cell></row>",
          "</table>",
          "</accordion-item>",
          "</accordion>",
          "</tab>",
          "</tabs>",
          "</page>",
        ].join(""),
      ].join("\n"),
    )

    await runCliWithServer(
      ["build", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Generic Artifact")
    await expectFile(
      path.join(outputDir, "index.html"),
      'rel="icon" type="image/svg+xml" href="./ghost.svg"',
    )
    await expectFile(
      path.join(outputDir, "ghost.svg"),
      "lucide lucide-ghost-icon lucide-ghost",
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="tabs"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="tabs-trigger"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="accordion"',
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="table"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="alert"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="badge"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="separator"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      '<ul data-agent-html-component="list" class="space-y-2 pl-5 marker:text-muted-foreground">',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      "<li>Portable output</li>",
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      "Built from semantic syntax.",
    )
    await expectFile(path.join(outputDir, "index.html"), ">Ready</span>")
    await expectFile(
      path.join(outputDir, "index.html"),
      "@media (prefers-color-scheme: dark){:root{--background:oklch(0.145 0 0);",
    )
    await removeTempDir(tempDir)
  }, 120000)

  it("builds artifacts from user style profiles stored under AHTML_HOME", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "team-ops.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeCustomStyleProfile(runtimeHome)
    await writeFile(
      inputPath,
      [
        '<meta-agent style-ref="team-ops" />',
        '<page title="Team Ops"><card title="Summary">Custom profile.</card></page>',
      ].join("\n"),
    )

    await runCliWithServer(
      ["build", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Team Ops")
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-style-profile="team-ops"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-ahtml-treatment="review-card"',
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      "max-w-4xl gap-6 px-4 py-10 sm:px-6 items-stretch",
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      ":root{--background:#fcfbf8;--foreground:#1f2933;",
    )
    await expectFile(
      path.join(outputDir, "index.html"),
      "@media (prefers-color-scheme: dark){:root{--background:oklch(0.18 0.02 190);",
    )
    await expectFile(
      path.join(outputDir, "agent-html.inspect.json"),
      '"documentStyleConfigReference": "team-ops"',
    )
    await removeTempDir(tempDir)
  }, 120000)

  it("fails build when runtime renderer mapping drifts from verification data", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")
    const verificationPath = path.join(
      runtimeHome,
      "runtime",
      "render-verification.generated.json",
    )

    await runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir)
    await writeFile(
      inputPath,
      '<page title="Drift"><card title="Summary">Slot drift.</card></page>',
    )

    const runtimeVerificationState = parseJson<{
      rendererMapping: {
        components: {
          name: string
          kind: string
        }[]
      }
      rendererSpec: {
        components: {
          name: string
          kind: string
        }[]
      }
    }>(await readFile(verificationPath, "utf8"))
    const card = runtimeVerificationState.rendererMapping.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card renderer verification mapping entry.")
    }

    card.kind = "primitive"
    await writeFile(
      verificationPath,
      `${JSON.stringify(runtimeVerificationState, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(
        ["build", inputPath, "--out", outputDir],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "error: runtime-renderer-parity at /runtime: Runtime renderer registry does not match runtime verification data. Kind mismatch: card kind: primitive expected compound",
    )
    await removeTempDir(tempDir)
  }, 120000)

  it("prints machine-readable build results for app integrations", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const documentPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      documentPath,
      [
        '<meta-agent style-ref="ops-compact" />',
        '<page title="CLI Artifact"><card title="Overview">Written as agent-html.</card></page>',
      ].join("\n"),
    )

    const { stdout } = await runCliWithServer(
      ["build", documentPath, "--out", outputDir, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const result = parseJson<{
      kind: string
      ok: boolean
      outputDir: string
      inspectionPath: string
      inspection: {
        configModel: string
        config: { documentStyleConfigReference: string }
        components: { name: string; count: number }[]
      }
    }>(stdout)

    expect(result.kind).toBe("agent-html-build-result")
    expect(result.ok).toBe(true)
    expect(result.outputDir).toBe(outputDir)
    expect(result.inspectionPath).toBe(
      path.join(outputDir, "agent-html.inspect.json"),
    )
    expect(stdout).not.toContain("resolvedConfig")
    expect(result.inspection.configModel).toBe(
      "document-style-config-reference",
    )
    expect(result.inspection.config.documentStyleConfigReference).toBe(
      "ops-compact",
    )
    expect(stdout).not.toContain("resolvedDocumentStyleTokens")
    expect(result.inspection.components).toEqual([
      { name: "card", count: 1 },
      { name: "page", count: 1 },
    ])
    await removeTempDir(tempDir)
  }, 120000)

  it("prints the prompt and inspects artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const documentPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      documentPath,
      [
        '<meta-agent style-ref="ops-compact" />',
        '<page title="CLI Artifact"><card title="Overview">Written as agent-html.</card></page>',
      ].join("\n"),
    )

    const prompt = await runCliWithServer(
      ["prompt", "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(prompt.stdout).toContain('"kind": "agent-html-cli-schema"')

    await runCliWithServer(
      ["build", documentPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    const documentInspection = await runCliWithServer(
      ["inspect", "--input", documentPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(documentInspection.stdout).toContain(
      '"documentStyleConfigReference": "ops-compact"',
    )
    expect(documentInspection.stdout).toContain(
      '"configModel": "document-style-config-reference"',
    )
    expect(documentInspection.stdout).not.toContain(
      '"resolvedDocumentStyleTokens"',
    )
    expect(documentInspection.stdout).not.toContain('"resolvedConfig"')
    expect(documentInspection.stdout).toContain('"name": "card"')

    const artifactInspection = await runCliWithServer(
      ["inspect", "--dir", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(artifactInspection.stdout).toContain(
      "config model: document-style-config-reference",
    )
    expect(artifactInspection.stdout).toContain(
      "documentStyleConfigReference: ops-compact",
    )
    expect(artifactInspection.stdout).not.toContain(
      "resolved document style tokens:",
    )
    expect(artifactInspection.stdout).not.toContain("resolved config")
    expect(artifactInspection.stdout).toContain("- card: 1")

    await removeTempDir(tempDir)
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
