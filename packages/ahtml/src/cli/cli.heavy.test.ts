/// <reference types="node" />
// @vitest-environment node

import { spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { setTimeout as delay } from "node:timers/promises"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  type ShadcnTestServer,
  assertNoProjectScaffold,
  cliPath,
  expectCliFailure,
  expectFile,
  expectFileMissingText,
  importRenderCapabilitiesModule,
  parseJson,
  root,
  runCli,
  shadcnTemplateFixtureDir,
  startPackageVersionServer,
  startShadcnTestServer,
  waitForPreviewUrl,
  waitForProcessExit,
} from "./cli-test-helpers"

let shadcnTestServer: ShadcnTestServer | undefined

beforeAll(async () => {
  shadcnTestServer = await startShadcnTestServer()
})

afterAll(async () => {
  await shadcnTestServer?.close()
})

function runCliWithServer(
  args: readonly string[],
  env: NodeJS.ProcessEnv = {},
  cwd = root,
) {
  return runCli(args, env, cwd, shadcnTestServer?.registryUrl)
}

async function removeTempDir(directory: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(directory, { force: true, recursive: true })
      return
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "EBUSY" || error.code === "ENOTEMPTY")
      ) {
        await delay(250 * (attempt + 1))
        continue
      }

      throw error
    }
  }
}

describe("agent-html CLI heavy runtime flows", () => {
  it("bootstraps managed runtime from doctor without creating project scaffold files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const { requiredShadcnRuntimeComponents } =
      await importRenderCapabilitiesModule()

    const doctor = await runCliWithServer(
      ["doctor"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(doctor.stdout).toContain("ok runtime:manifest")
    expect(doctor.stdout).toContain("ok runtime:base radix")
    expect(doctor.stdout).toContain(
      `ok runtime:shadcn-components ${requiredShadcnRuntimeComponents.join(", ")}`,
    )
    expect(doctor.stdout).toContain("ok runtime:shadcn-template-vite-config")
    expect(doctor.stdout).toContain("ok runtime:prompt-ui-manifest")
    expect(doctor.stdout).toContain("ok runtime:verification-data")
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      "ahtml-managed-runtime",
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      "shadcn-template-override",
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      "ahtml-prompt-ui-manifest",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "render-verification.generated.json"),
      "ahtml-runtime-render-verification",
    )
    const runtimeVerificationState = parseJson<{
      renderableAgentComponents: string[]
    }>(
      await readFile(
        path.join(runtimeHome, "runtime", "render-verification.generated.json"),
        "utf8",
      ),
    )
    expect(runtimeVerificationState.renderableAgentComponents).toContain("tab")
    await expectFile(
      path.join(runtimeHome, "runtime", "src", "renderer", "elements.tsx"),
      'from "@/components/ui/tabs"',
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "src", "renderer", "kinds.ts"),
      "runtimeRendererKinds",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "src", "renderer", "elements.tsx"),
      "TabsTrigger,",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "src", "renderer", "elements.tsx"),
      'article: "article"',
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "vite.config.ts"),
      "defineConfig",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "vite.ahtml.config.mjs"),
      "vite.config.ts",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "vite.ahtml.config.mjs"),
      "mergeConfig",
    )
    await assertNoProjectScaffold(tempDir)
    await expectFileMissingText(
      path.join(runtimeHome, "config", "runtime.json"),
      "agent-html.project.json",
    )
    await removeTempDir(tempDir)
  }, 120000)

  it("sets up the managed shadcn runtime explicitly", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const { requiredShadcnRuntimeComponents } =
      await importRenderCapabilitiesModule()

    const setup = await runCliWithServer(
      [
        "setup",
        "--yes",
        "--component-source",
        "shadcn-cli",
        "--preset",
        "custom",
        "--components",
        "1",
      ],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(setup.stdout).toContain("ahtml runtime ready")
    expect(setup.stdout).toContain("ui library: shadcn")
    expect(setup.stdout).toContain("component source: shadcn-cli")
    expect(setup.stdout).toContain("runtime base: radix")
    expect(setup.stdout).toContain("runtime surface: shadcn-init")
    expect(setup.stdout).toContain("preset: custom")
    expect(setup.stdout).toContain(
      `components: ${requiredShadcnRuntimeComponents.join(", ")}`,
    )
    expect(setup.stdout).toContain("renderable agent components:")
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"preset": "custom"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"runtimeBase": "radix"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"installedUiComponents"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"renderableAgentComponents"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      '"uiLibrary": "shadcn"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      '"componentSource": "shadcn-cli"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      '"name": "table"',
    )

    const secondSetup = await runCliWithServer(
      ["setup", "--yes"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(secondSetup.stdout).toContain("ahtml runtime already ready")
    await removeTempDir(tempDir)
  }, 120000)

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
        '<meta-agent profile="ops-compact" />',
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
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="select"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="input"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="slider"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="switch"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="alert"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="badge"')
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
    await expectFile(
      path.join(outputDir, "index.html"),
      "Today (selected)",
    )
    await expectFile(path.join(outputDir, "index.html"), "<datalist")
    await expectFile(
      path.join(outputDir, "index.html"),
      "Ops reviewer (selected)",
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
        '<meta-agent profile="report-default" />',
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

  it("prints the prompt and inspects artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const documentPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      documentPath,
      [
        '<meta-agent profile="ops-compact" />',
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
    expect(documentInspection.stdout).toContain('"profile": "ops-compact"')
    expect(documentInspection.stdout).toContain('"resolvedProfileTokens"')
    expect(documentInspection.stdout).toContain('"density": "compact"')
    expect(documentInspection.stdout).not.toContain('"resolvedConfig"')
    expect(documentInspection.stdout).toContain('"name": "card"')

    const artifactInspection = await runCliWithServer(
      ["inspect", "--dir", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(artifactInspection.stdout).toContain("profile: ops-compact")
    expect(artifactInspection.stdout).toContain("resolved profile tokens:")
    expect(artifactInspection.stdout).not.toContain("resolved config")
    expect(artifactInspection.stdout).toContain("- density: compact")
    expect(artifactInspection.stdout).toContain("- card: 1")

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
        '<meta-agent profile="ops-compact" />',
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
        config: { profile: string }
        resolvedProfileTokens: { density: string }
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
    expect(result.inspection.config.profile).toBe("ops-compact")
    expect(result.inspection.resolvedProfileTokens.density).toBe("compact")
    expect(result.inspection.components).toEqual([
      { name: "card", count: 1 },
      { name: "page", count: 1 },
    ])
    await removeTempDir(tempDir)
  }, 120000)

  it("runs managed runtime doctor checks", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    const { stdout } = await runCliWithServer(
      ["doctor"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(stdout).toContain("ok environment:node")
    expect(stdout).toContain("ok runtime:root")
    expect(stdout).toContain("ok runtime:manifest shadcn-runtime")
    expect(stdout).toContain("ok runtime:base radix")
    expect(stdout).toContain("ok runtime:schema-renderer-parity")
    expect(stdout).toContain("ok runtime:renderer-adapter")
    expect(stdout).toContain("ok runtime:components-json")
    expect(stdout).toContain("ok runtime:shadcn-css-entry")
    expect(stdout).toContain("ok runtime:shadcn-css-imports")
    expect(stdout).toContain("ok runtime:shadcn-css-base")
    expect(stdout).toContain("ok runtime:shadcn-surface")
    expect(stdout).toContain("ok runtime:shadcn-provenance")
    expect(stdout).toContain("ok runtime:shadcn-components")
    expect(stdout).toContain("ok runtime:shadcn-template-vite-config")
    expect(stdout).toContain("ok runtime:prompt-ui-manifest")
    expect(stdout).toContain("ok runtime:verification-data")
    expect(stdout).toContain("ok runtime:verification-data-parity")
    expect(stdout).toContain("ok runtime:renderer-mapping-parity")
    expect(stdout).toContain("ok runtime:renderer-registry-parity")
    expect(stdout).toContain("ok runtime:vite-config")
    expect(stdout).toContain("ok artifact:output-dir")
    expect(stdout).toContain("skip artifact:built-css")
    expect(stdout).not.toContain("project-config")
    await removeTempDir(tempDir)
  }, 120000)

  it("prints machine-readable doctor reports for app integrations", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")

    const { stdout } = await runCliWithServer(
      ["doctor", "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    const report = parseJson<{
      kind: string
      status: string
      counts: {
        ok: number
        warn: number
        skip: number
        fail: number
      }
      checks: {
        category: string
        name: string
        status: string
        detail: string
      }[]
    }>(stdout)

    expect(report.kind).toBe("agent-html-doctor-report")
    expect(report.status).toBe("ok")
    expect(report.counts.fail).toBe(0)
    expect(report.checks.some((check) => check.name === "manifest")).toBe(true)
    expect(
      report.checks.some(
        (check) => check.category === "artifact" && check.name === "output-dir",
      ),
    ).toBe(true)
    await removeTempDir(tempDir)
  }, 120000)

  it("repairs managed runtime when ahtml glue proof drifts from runtime files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const appPath = path.join(runtimeHome, "runtime", "src", "app.tsx")

    await runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir)
    await writeFile(appPath, "export function App() { return 'drifted' }\n")

    const doctor = await runCliWithServer(
      ["doctor"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(doctor.stdout).toContain("ok runtime:shadcn-surface")
    expect(await readFile(appPath, "utf8")).not.toContain("drifted")
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

  it("fails doctor when runtime capabilities drift from schema", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const verificationPath = path.join(
      runtimeHome,
      "runtime",
      "render-verification.generated.json",
    )

    await runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir)

    const runtimeVerificationState = parseJson<{
      verificationData: {
        components: {
          name: string
          slots: { name: string; children: string[] }[]
        }[]
      }
    }>(await readFile(verificationPath, "utf8"))
    const card = runtimeVerificationState.verificationData.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card verification entry in runtime verification data.")
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      verificationPath,
      `${JSON.stringify(runtimeVerificationState, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:verification-data-parity runtime verification data card slots does not match schema verification data card slots.",
    )
    await removeTempDir(tempDir)
  }, 120000)

  it("fails doctor when runtime renderer mapping drifts from schema", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const verificationPath = path.join(
      runtimeHome,
      "runtime",
      "render-verification.generated.json",
    )

    await runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir)

    const runtimeVerificationState = parseJson<{
      rendererMapping: {
        components: {
          name: string
          slots: { name: string; children: string[] }[]
        }[]
      }
    }>(await readFile(verificationPath, "utf8"))
    const card = runtimeVerificationState.rendererMapping.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card renderer verification mapping entry.")
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      verificationPath,
      `${JSON.stringify(runtimeVerificationState, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:renderer-mapping-parity runtime renderer verification mapping card slots does not match schema renderer verification mapping card slots.",
    )
    await removeTempDir(tempDir)
  }, 60000)

  it("shows cached global update guidance in doctor", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0")

    try {
      await runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir)

      const doctor = await runCliWithServer(
        ["doctor"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "0",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(doctor.stdout).toContain(
        "warn package:update latest is 99.0.0. Run: npm install -g @agent-html/ahtml@latest",
      )
      expect(registry.requests()).toBe(1)
    } finally {
      await registry.close()
      await removeTempDir(tempDir)
    }
  }, 60000)

  it("skips or soft-fails package update checks without breaking diagnostics", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0", 500)

    try {
      await runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir)

      const disabled = await runCliWithServer(
        ["doctor"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "1",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(disabled.stdout).toContain("skip package:update disabled")

      const unavailable = await runCliWithServer(
        ["doctor"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "0",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(unavailable.stdout).toContain("skip package:update unavailable")
    } finally {
      await registry.close()
      await removeTempDir(tempDir)
    }
  }, 60000)

  it("serves a preview from the generated static output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")

    await writeFile(
      inputPath,
      '<page title="CLI Preview"><card>Preview by CLI</card></page>',
    )

    const preview = spawn(
      process.execPath,
      [cliPath, "preview", inputPath, "--out", outputDir, "--port", "0"],
      {
        cwd: tempDir,
        env: {
          ...process.env,
          AHTML_ALLOW_SHADCN_TEMPLATE_OVERRIDE: "1",
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "1",
          AHTML_SHADCN_TEMPLATE_DIR: shadcnTemplateFixtureDir,
          ...(shadcnTestServer
            ? { REGISTRY_URL: shadcnTestServer.registryUrl }
            : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    )

    try {
      const url = await waitForPreviewUrl(preview)
      const response = await fetch(url)
      const body = await response.text()

      expect(body).toContain("Preview by CLI")
      expect(body).toContain(
        'rel="icon" type="image/svg+xml" href="./ghost.svg"',
      )
    } finally {
      preview.kill("SIGTERM")
      await waitForProcessExit(preview)
      await removeTempDir(tempDir)
    }
  }, 60000)
})
