/// <reference types="node" />
// @vitest-environment node

import { spawn } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

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

describe("agent-html CLI heavy runtime flows", () => {
  it("bootstraps managed runtime from status without creating project scaffold files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const { requiredShadcnRuntimeComponents } =
      await importRenderCapabilitiesModule()

    const missingStatus = await runCliWithServer(
      ["status"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    expect(missingStatus.stdout).toContain("ready: yes")
    expect(missingStatus.stdout).toContain("runtime manifest: ok")
    expect(missingStatus.stdout).toContain("ui library: shadcn")
    expect(missingStatus.stdout).toContain("component source: shadcn-cli")
    expect(missingStatus.stdout).toContain("runtime base: radix")
    expect(missingStatus.stdout).toContain("runtime surface: shadcn-init")
    expect(missingStatus.stdout).toContain("runtime shell: ahtml-managed-shell")
    expect(missingStatus.stdout).toContain("runtime init: shadcn-cli")
    expect(missingStatus.stdout).toContain("tailwind version:")
    expect(missingStatus.stdout).toContain("runtime provenance: partial")
    expect(missingStatus.stdout).toContain("runtime preset: nova")
    expect(missingStatus.stdout).toContain(
      `installed ui components: ${requiredShadcnRuntimeComponents.join(", ")}`,
    )
    expect(missingStatus.stdout).toContain("renderable agent components:")
    expect(missingStatus.stdout).toContain("components.json: ok")
    expect(missingStatus.stdout).toContain("shadcn css entry: ok")
    expect(missingStatus.stdout).toContain("shadcn css imports: ok")
    expect(missingStatus.stdout).toContain("shadcn css base: ok")
    expect(missingStatus.stdout).toContain("shadcn surface: ok")
    expect(missingStatus.stdout).toContain("prompt-ui manifest: ok")
    expect(missingStatus.stdout).toContain("runtime verification data: ok")
    expect(missingStatus.stdout).toContain(
      "Next: ahtml build --input artifact.agent.html --out dist/html",
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      "ahtml-managed-runtime",
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      "ahtml-prompt-ui-manifest",
    )
    await expectFile(
      path.join(runtimeHome, "runtime", "render-capabilities.generated.json"),
      "ahtml-runtime-render-capabilities",
    )
    const runtimeCapabilities = parseJson<{
      renderableAgentComponents: string[]
    }>(
      await readFile(
        path.join(runtimeHome, "runtime", "render-capabilities.generated.json"),
        "utf8",
      ),
    )
    expect(runtimeCapabilities.renderableAgentComponents).toContain("tab")
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
    await assertNoProjectScaffold(tempDir)
    await expectFileMissingText(
      path.join(runtimeHome, "config", "runtime.json"),
      "agent-html.project.json",
    )
    await rm(tempDir, { force: true, recursive: true })
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
    await rm(tempDir, { force: true, recursive: true })
  })

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
      ["build", "--input", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      consumerDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Managed Runtime")
    await expectFile(path.join(outputDir, "index.html"), "Overview")
    await expectFile(
      path.join(outputDir, "index.html"),
      "Built by managed runtime.",
    )
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="tabs"')
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="table"')
    await expectFile(
      path.join(outputDir, "index.html"),
      'data-slot="accordion"',
    )
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
      '<noscript><section class="ahtml-section"><section class="ahtml-section"><h2 class="ahtml-section-title">Details</h2>',
    )
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), "ahtml-card")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".flex")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".gap-6")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".rounded-lg")
    await expectFile(path.join(outputDir, "assets", "ahtml.css"), ".border")
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
      path.join(runtimeHome, "runtime", "render-capabilities.generated.json"),
      '"verificationData"',
    )
    await assertNoProjectScaffold(consumerDir)
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

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
          '<separator />',
          "</card>",
          "</tab>",
          '<tab value="details" label="Details">',
          '<accordion>',
          '<accordion-item value="runtime" title="Runtime">',
          '<list><item>Portable output</item><item>Readable content</item></list>',
          '<table>',
          '<row kind="header"><cell>Layer</cell><cell>Status</cell></row>',
          '<row><cell>Renderer</cell><cell>Ready</cell></row>',
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
      ["build", "--input", inputPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    await expectFile(path.join(outputDir, "index.html"), "Generic Artifact")
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
    await expectFile(path.join(outputDir, "index.html"), 'data-slot="separator"')
    await expectFile(
      path.join(outputDir, "index.html"),
      '<ul data-agent-html-component="list" class="ahtml-list">',
    )
    await expectFile(path.join(outputDir, "index.html"), "<li>Portable output</li>")
    await expectFile(
      path.join(outputDir, "index.html"),
      "Built from semantic syntax.",
    )
    await expectFile(path.join(outputDir, "index.html"), ">Ready</span>")
    await rm(tempDir, { force: true, recursive: true })
  })

  it("fails build when runtime renderer mapping drifts from verification data", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, "runtime-home")
    const inputPath = path.join(tempDir, "artifact.agent.html")
    const outputDir = path.join(tempDir, "html")
    const capabilitiesPath = path.join(
      runtimeHome,
      "runtime",
      "render-capabilities.generated.json",
    )

    await runCliWithServer(["status"], { AHTML_HOME: runtimeHome }, tempDir)
    await writeFile(
      inputPath,
      '<page title="Drift"><card title="Summary">Slot drift.</card></page>',
    )

    const capabilities = parseJson<{
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
    }>(await readFile(capabilitiesPath, "utf8"))
    const card = capabilities.rendererMapping.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card renderer spec in runtime capabilities.")
    }

    card.kind = "primitive"
    await writeFile(
      capabilitiesPath,
      `${JSON.stringify(capabilities, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(
        ["build", "--input", inputPath, "--out", outputDir],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "error: runtime-renderer-parity at /runtime: Runtime renderer registry does not match runtime verification data. Kind mismatch: card kind: primitive expected compound",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("validates, reads config defaults, and inspects artifacts", async () => {
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

    const validation = await runCliWithServer(
      ["validate", "--input", documentPath],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(validation.stdout).toContain("agent-html valid")

    await runCliWithServer(
      ["build", "--input", documentPath, "--out", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )

    const documentInspection = await runCliWithServer(
      ["inspect", "--input", documentPath, "--format", "json"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(documentInspection.stdout).toContain('"profile": "ops-compact"')
    expect(documentInspection.stdout).toContain('"density": "compact"')
    expect(documentInspection.stdout).toContain('"name": "card"')

    const artifactInspection = await runCliWithServer(
      ["inspect", "--dir", outputDir],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(artifactInspection.stdout).toContain("profile: ops-compact")
    expect(artifactInspection.stdout).toContain("- density: compact")
    expect(artifactInspection.stdout).toContain("- card: 1")

    const config = await runCliWithServer(
      ["config", "get"],
      { AHTML_HOME: runtimeHome },
      tempDir,
    )
    expect(config.stdout).toContain('"report-default"')
    await expectCliFailure(
      runCliWithServer(
        ["config", "set", "density", "compact"],
        { AHTML_HOME: runtimeHome },
        tempDir,
      ),
      "config accepts only get",
    )
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

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
    expect(stdout).toContain("warn runtime:shadcn-provenance")
    expect(stdout).toContain("ok runtime:shadcn-components")
    expect(stdout).toContain("ok runtime:prompt-ui-manifest")
    expect(stdout).toContain("ok runtime:verification-data")
    expect(stdout).toContain("ok runtime:verification-data-parity")
    expect(stdout).toContain("ok runtime:renderer-mapping-parity")
    expect(stdout).toContain("ok runtime:renderer-registry-parity")
    expect(stdout).toContain("ok runtime:vite-config")
    expect(stdout).toContain("ok artifact:output-dir")
    expect(stdout).toContain("skip artifact:built-css")
    expect(stdout).not.toContain("project-config")
    await rm(tempDir, { force: true, recursive: true })
  }, 60000)

  it("repairs managed runtime when managed runtime proof drifts from runtime files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const appPath = path.join(runtimeHome, "runtime", "src", "app.tsx")

    await runCliWithServer(["status"], { AHTML_HOME: runtimeHome }, tempDir)
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
    const capabilitiesPath = path.join(
      runtimeHome,
      "runtime",
      "render-capabilities.generated.json",
    )

    await runCliWithServer(["status"], { AHTML_HOME: runtimeHome }, tempDir)

    const capabilities = parseJson<{
      verificationData: {
        components: {
          name: string
          slots: { name: string; children: string[] }[]
        }[]
      }
    }>(await readFile(capabilitiesPath, "utf8"))
    const card = capabilities.verificationData.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card capability in runtime capabilities.")
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      capabilitiesPath,
      `${JSON.stringify(capabilities, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:verification-data-parity runtime verification data ui capabilities card slots does not match schema verificationData card slots.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("fails doctor when runtime renderer mapping drifts from schema", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const capabilitiesPath = path.join(
      runtimeHome,
      "runtime",
      "render-capabilities.generated.json",
    )

    await runCliWithServer(["status"], { AHTML_HOME: runtimeHome }, tempDir)

    const capabilities = parseJson<{
      rendererMapping: {
        components: {
          name: string
          slots: { name: string; children: string[] }[]
        }[]
      }
    }>(await readFile(capabilitiesPath, "utf8"))
    const card = capabilities.rendererMapping.components.find(
      (component) => component.name === "card",
    )

    if (!card) {
      throw new Error("Expected card renderer spec in runtime capabilities.")
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      capabilitiesPath,
      `${JSON.stringify(capabilities, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:renderer-mapping-parity runtime renderer mapping spec card slots does not match schema rendererMapping card slots.",
    )
    await rm(tempDir, { force: true, recursive: true })
  })

  it("shows cached global update guidance in status and doctor", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0")

    try {
      await runCliWithServer(["status"], { AHTML_HOME: runtimeHome }, tempDir)

      const status = await runCliWithServer(
        ["status"],
        {
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "0",
          AHTML_UPDATE_CHECK_CACHE_DIR: cacheDir,
          AHTML_UPDATE_REGISTRY_URL: registry.url,
          CI: "false",
        },
        tempDir,
      )

      expect(status.stdout).toContain(
        "update: 99.0.0 available. Run: npm install -g @agent-html/ahtml@latest",
      )
      expect(registry.requests()).toBe(1)

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
      await rm(tempDir, { force: true, recursive: true })
    }
  })

  it("skips or soft-fails package update checks without breaking diagnostics", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "agent-html-cli-"))
    const runtimeHome = path.join(tempDir, ".ahtml")
    const cacheDir = path.join(tempDir, "cache")
    const registry = await startPackageVersionServer("99.0.0", 500)

    try {
      await runCliWithServer(["status"], { AHTML_HOME: runtimeHome }, tempDir)

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
      await rm(tempDir, { force: true, recursive: true })
    }
  })

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
      [
        cliPath,
        "preview",
        "--input",
        inputPath,
        "--out",
        outputDir,
        "--port",
        "0",
      ],
      {
        cwd: tempDir,
        env: {
          ...process.env,
          AHTML_HOME: runtimeHome,
          AHTML_NO_UPDATE_CHECK: "1",
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
    } finally {
      preview.kill("SIGTERM")
      await waitForProcessExit(preview)
      await rm(tempDir, { force: true, recursive: true })
    }
  }, 60000)
})
