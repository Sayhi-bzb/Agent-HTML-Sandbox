/// <reference types="node" />
// @vitest-environment node

import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  assertNoProjectScaffold,
  expectCliFailure,
  expectFile,
  expectFileMissingText,
  importRenderCapabilitiesModule,
  parseJson,
  removeTempDir,
  startPackageVersionServer,
  useShadcnCliHarness,
} from "./cli-test-helpers"

const { runCliWithServer } = useShadcnCliHarness()

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
    expect(doctor.stdout).toContain("ok runtime:style-profile-manifest")
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
      path.join(runtimeHome, "config", "runtime.json"),
      '"styleProfileManifest"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "runtime.json"),
      '"builtinStyleProfiles"',
    )
    await expectFile(
      path.join(runtimeHome, "config", "prompt-ui.manifest.json"),
      "ahtml-prompt-ui-manifest",
    )
    await expectFile(
      path.join(runtimeHome, "config", "style-profiles.manifest.json"),
      "ahtml-style-profile-manifest",
    )
    await expectFile(
      path.join(
        runtimeHome,
        "config",
        "style-profiles",
        "builtin",
        "ops-compact.json",
      ),
      '"id": "ops-compact"',
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
    expect(stdout).toContain("ok runtime:style-profile-manifest")
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
        (check) =>
          check.category === "runtime" && check.name === "style-profile-manifest",
      ),
    ).toBe(true)
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
    await removeTempDir(tempDir)
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
      throw new Error(
        "Expected card verification entry in runtime verification data.",
      )
    }

    card.slots.push({ name: "actions", children: [] })
    await writeFile(
      verificationPath,
      `${JSON.stringify(runtimeVerificationState, null, 2)}\n`,
    )

    await expectCliFailure(
      runCliWithServer(["doctor"], { AHTML_HOME: runtimeHome }, tempDir),
      "fail runtime:verification-data-parity runtime verification data card slots does not match schema runtime contract verification data card slots.",
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
      "fail runtime:renderer-mapping-parity runtime renderer verification mapping card slots does not match schema runtime contract renderer mapping card slots.",
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
})
