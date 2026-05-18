/// <reference types="node" />
// @vitest-environment node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { describe, expect, it, vi } from "vitest"

import { useTemporaryDirectories } from "./cli-test-helpers"

const temporaryDirectories = useTemporaryDirectories()

type CliSchemaOutput = {
  readonly components: readonly { readonly name: string }[]
  readonly verificationData: unknown
  readonly rendererMapping: unknown
}

type RuntimePaths = {
  readonly runtimeRoot: string
  readonly runtimeDir: string
  readonly cacheDir: string
  readonly logsDir: string
  readonly configDir: string
  readonly styleProfilesDir: string
  readonly builtinStyleProfilesDir: string
  readonly userStyleProfilesDir: string
  readonly manifestPath: string
  readonly styleProfileManifestPath: string
  readonly promptUiManifestPath: string
  readonly runtimeVerificationPath: string
  readonly runtimeViteConfigPath: string
  readonly runtimeSrcDir: string
  readonly runtimeComponentsDir: string
}

type LoadedModules = {
  readonly createShadcnBaseLayerExpectation: (cssVariables: boolean) => {
    readonly cssVariables: boolean
    readonly imports: readonly string[]
    readonly tokens: readonly string[]
  }
  readonly requiredShadcnRuntimeExports: Record<string, readonly string[]>
  readonly supportedRuntimeBase: string
  readonly runDoctorCommand: (input: {
    readonly defaultOutputDir: string
    readonly ensureManagedRuntime: (packageVersion: string) => Promise<void>
    readonly format?: string
    readonly packageRoot: string
    readonly readPackageVersion: () => Promise<string>
    readonly runtimePaths: RuntimePaths
  }) => Promise<{ readonly status: string }>
  readonly getRuntimePaths: (env?: Record<string, string>) => RuntimePaths
  readonly runtimeRenderer: string
  readonly runtimeVersion: number
  readonly createPromptUiManifest: (input: {
    readonly packageVersion: string
    readonly setup: NativeRuntimeSetup
    readonly schema: CliSchemaOutput
  }) => unknown
  readonly createManagedRuntimeManifest: (input: {
    readonly componentSource: string
    readonly components: readonly string[]
    readonly installMode: string
    readonly packageVersion: string
    readonly paths: RuntimePaths
    readonly preset: string
    readonly renderer: string
    readonly runtimeBase: string
    readonly runtimeContract: {
      readonly renderableAgentComponents: readonly string[]
    }
    readonly runtimeSurface: Record<string, unknown>
    readonly uiLibrary: string
    readonly version: number
  }) => RuntimeManifest
  readonly createAhtmlGlueProof: (paths: RuntimePaths) => Promise<{
    readonly algorithm: string
    readonly files: Record<string, string>
  }>
  readonly createManagedRuntimeUiProof: (
    components: readonly string[],
  ) => Promise<{
    readonly algorithm: string
    readonly files: Record<string, string>
  }>
  readonly getManagedRuntimeUiOverrideEntries: (
    components: readonly string[],
  ) => readonly {
    readonly component: string
    readonly fileName: string
    readonly runtimeRelativePath: string
    readonly sourcePath: string
  }[]
  readonly createRuntimeVerificationState: (input: {
    readonly components: readonly string[]
    readonly runtimeBase: string
    readonly runtimeContract: {
      readonly renderableAgentComponents: readonly string[]
      readonly verificationData: unknown
      readonly rendererMapping: unknown
    }
    readonly runtimeSurface: Record<string, unknown>
    readonly version: number
  }) => {
    readonly kind: string
    readonly version: number
    readonly runtimeBase: string
    readonly shadcnRuntimeSurface: Record<string, unknown>
    readonly installedUiComponents: readonly string[]
    readonly renderableAgentComponents: readonly string[]
    readonly verificationData: unknown
    readonly rendererMapping: unknown
  }
  readonly nativeRuntimeSetup: NativeRuntimeSetup
  readonly assertBuiltArtifactCss: (outputDir: string) => Promise<string>
  readonly assertRuntimeSurface: (input: {
    readonly manifest: RuntimeManifest
    readonly paths: RuntimePaths
  }) => Promise<string>
  readonly getShadcnRuntimeProvenanceState: (
    surface: Record<string, unknown>,
  ) => {
    readonly state: string
    readonly detail: string
  }
  readonly getRuntimeStatus: (input: {
    readonly packageVersion: string
    readonly outputDir: string
    readonly paths: RuntimePaths
  }) => Promise<{
    readonly checks: Record<string, boolean>
    readonly ready: boolean
    readonly runtimeDetail: string
  }>
  readonly createRuntimeContract: (
    components?: readonly { readonly name: string }[],
  ) => {
    readonly renderableAgentComponents: readonly string[]
    readonly verificationData: unknown
    readonly rendererMapping: unknown
  }
  readonly getCliSchemaOutput: (root?: string) => Promise<CliSchemaOutput>
  readonly writeStyleProfileStorage: (paths: RuntimePaths) => Promise<unknown>
}

type NativeRuntimeSetup = {
  readonly uiLibrary: string
  readonly componentSource: string
  readonly installMode: string
  readonly preset: string
  readonly components: readonly string[]
}

type RuntimeManifest = {
  readonly kind: string
  readonly version: number
  readonly renderer: string
  readonly packageVersion: string
  readonly uiLibrary: string
  readonly componentSource: string
  readonly runtimeBase: string
  readonly shadcnRuntimeSurface: Record<string, unknown>
  readonly installMode: string
  readonly preset: string
  readonly components: readonly string[]
  readonly installedUiComponents: readonly string[]
  readonly renderableAgentComponents: readonly string[]
  readonly paths: Record<string, string>
}

type RuntimeSurfaceWithProofs = Record<string, unknown> & {
  readonly ahtmlGlueProof: {
    readonly files: Record<string, string>
  }
  readonly ahtmlManagedUiProof: {
    readonly files: Record<string, string>
  }
}

describe("runtime surface completeness", () => {
  it("marks runtime status incomplete when shadcn css imports are missing", async () => {
    const { getRuntimeStatus } = await loadModules()
    const fixture = await createRuntimeFixture({ includeCssImports: false })

    const status = await getRuntimeStatus({
      packageVersion: "0.0.0",
      outputDir: fixture.outputDir,
      paths: fixture.runtimePaths,
    })

    expect(status.checks.componentsJson).toBe(true)
    expect(status.checks.shadcnCssEntry).toBe(true)
    expect(status.checks.shadcnCssImports).toBe(false)
    expect(status.checks.shadcnCssBase).toBe(true)
    expect(status.checks.shadcnTemplateViteConfig).toBe(true)
    expect(status.checks.shadcnSurface).toBe(true)
    expect(status.ready).toBe(false)
    expect(status.runtimeDetail).toContain(
      "shadcn CSS entry is missing required imports",
    )
  })

  it("marks runtime surface incomplete when shadcn template vite config is missing", async () => {
    const { getRuntimeStatus } = await loadModules()
    const fixture = await createRuntimeFixture({
      includeTemplateViteConfig: false,
    })

    const status = await getRuntimeStatus({
      packageVersion: "0.0.0",
      outputDir: fixture.outputDir,
      paths: fixture.runtimePaths,
    })

    expect(status.checks.shadcnTemplateViteConfig).toBe(false)
    expect(status.checks.shadcnSurface).toBe(false)
    expect(status.ready).toBe(false)
    expect(status.runtimeDetail).toContain(
      "Runtime required file is missing: vite.config.ts.",
    )
  })

  it("accepts shadcn template vite config that uses __dirname for src alias resolution", async () => {
    const { assertRuntimeSurface } = await loadModules()
    const fixture = await createRuntimeFixture({
      templateViteConfigStyle: "dirname",
    })

    await expect(
      assertRuntimeSurface({
        manifest: fixture.manifest,
        paths: fixture.runtimePaths,
      }),
    ).resolves.toContain("shadcn-init/vite")
  })

  it("fails doctor on missing shadcn css imports and skips built css when no artifact exists", async () => {
    const { runDoctorCommand } = await loadModules()
    const fixture = await createRuntimeFixture({ includeCssImports: false })
    const { output, result } = await captureStdout(async () =>
      runDoctorCommand({
        defaultOutputDir: fixture.outputDir,
        ensureManagedRuntime: async () => {},
        format: "text",
        packageRoot: process.cwd(),
        readPackageVersion: async () => "0.0.0",
        runtimePaths: fixture.runtimePaths,
      }),
    )

    expect(output).toContain("ok runtime:components-json")
    expect(output).toContain("ok runtime:shadcn-template-vite-config")
    expect(output).toContain(
      "fail runtime:shadcn-css-imports shadcn CSS entry is missing required imports: tw-animate-css, shadcn/tailwind.css.",
    )
    expect(output).toContain(
      "skip artifact:built-css No built artifact CSS found",
    )
    expect(result.status).toBe("fail")
  })

  it("rejects runtime surface drift between manifest and components.json", async () => {
    const { assertRuntimeSurface } = await loadModules()
    const fixture = await createRuntimeFixture({
      surfaceOverrides: { iconLibrary: "lucide" },
    })

    await expect(
      assertRuntimeSurface({
        manifest: fixture.manifest,
        paths: fixture.runtimePaths,
      }),
    ).rejects.toThrow(
      "surface iconLibrary does not match components.json iconLibrary",
    )
  })

  it("rejects ahtml glue proof drift between manifest and runtime files", async () => {
    const { assertRuntimeSurface } = await loadModules()
    const fixture = await createRuntimeFixture()
    const runtimeSurface = fixture.manifest
      .shadcnRuntimeSurface as RuntimeSurfaceWithProofs
    const manifest = {
      ...fixture.manifest,
      shadcnRuntimeSurface: {
        ...runtimeSurface,
        ahtmlGlueProof: {
          ...runtimeSurface.ahtmlGlueProof,
          files: {
            ...runtimeSurface.ahtmlGlueProof.files,
            "src/app.tsx": "drifted-proof",
          },
        },
      },
    }

    await expect(
      assertRuntimeSurface({
        manifest,
        paths: fixture.runtimePaths,
      }),
    ).rejects.toThrow(
      "surface ahtmlGlueProof src/app.tsx does not match runtime file hash",
    )
  })

  it("rejects managed UI proof drift between manifest and checked-in override source", async () => {
    const { assertRuntimeSurface } = await loadModules()
    const fixture = await createRuntimeFixture()
    const runtimeSurface = fixture.manifest
      .shadcnRuntimeSurface as RuntimeSurfaceWithProofs
    const manifest = {
      ...fixture.manifest,
      shadcnRuntimeSurface: {
        ...runtimeSurface,
        ahtmlManagedUiProof: {
          ...runtimeSurface.ahtmlManagedUiProof,
          files: {
            ...runtimeSurface.ahtmlManagedUiProof.files,
            "src/components/ui/progress.tsx": "drifted-proof",
          },
        },
      },
    }

    await expect(
      assertRuntimeSurface({
        manifest,
        paths: fixture.runtimePaths,
      }),
    ).rejects.toThrow(
      "surface ahtmlManagedUiProof src/components/ui/progress.tsx does not match checked-in managed UI source hash",
    )
  })

  it("rejects runtime managed UI files that drift from checked-in override source", async () => {
    const { assertRuntimeSurface } = await loadModules()
    const fixture = await createRuntimeFixture()

    await writeFile(
      path.join(
        fixture.runtimePaths.runtimeComponentsDir,
        "progress.tsx",
      ),
      'export function Progress() { return "drift" }\n',
    )

    await expect(
      assertRuntimeSurface({
        manifest: fixture.manifest,
        paths: fixture.runtimePaths,
      }),
    ).rejects.toThrow(
      "runtime managed UI file src/components/ui/progress.tsx does not match checked-in managed UI source hash",
    )
  })

  it("verifies built artifact css contains compiled shadcn base surface", async () => {
    const { assertBuiltArtifactCss } = await loadModules()
    const fixture = await createRuntimeFixture({
      builtCssSource: [
        ":root{--background:oklch(1 0 0);--foreground:oklch(0.145 0 0);--border:oklch(0.922 0 0)}",
        "body{margin:0;min-height:100vh;background-color:var(--background);color:var(--foreground)}",
      ].join(""),
    })

    await expect(assertBuiltArtifactCss(fixture.outputDir)).resolves.toBe(
      "assets/ahtml.css",
    )
  })

  it("reports official shell provenance as complete", async () => {
    const { getShadcnRuntimeProvenanceState } = await loadModules()
    const fixture = await createRuntimeFixture()

    expect(
      getShadcnRuntimeProvenanceState(fixture.manifest.shadcnRuntimeSurface),
    ).toMatchObject({
      state: "complete",
    })
  })

  it("accepts template override shell provenance for test fixtures", async () => {
    const { assertRuntimeSurface, getShadcnRuntimeProvenanceState } =
      await loadModules()
    const fixture = await createRuntimeFixture({
      surfaceOverrides: {
        shellSource: "shadcn-template-override",
      },
    })

    await expect(
      assertRuntimeSurface({
        manifest: fixture.manifest,
        paths: fixture.runtimePaths,
      }),
    ).resolves.toContain("shadcn-init/vite")
    expect(
      getShadcnRuntimeProvenanceState(fixture.manifest.shadcnRuntimeSurface),
    ).toMatchObject({
      state: "complete",
      detail: expect.stringContaining("shadcn-template-override"),
    })
  })
})

async function createRuntimeFixture({
  includeCssImports = true,
  includeTemplateViteConfig = true,
  templateViteConfigStyle = "rootDir",
  surfaceOverrides = {},
  builtCssSource,
}: {
  includeCssImports?: boolean
  includeTemplateViteConfig?: boolean
  templateViteConfigStyle?: "rootDir" | "dirname"
  surfaceOverrides?: Record<string, unknown>
  builtCssSource?: string
} = {}) {
  const {
    createShadcnBaseLayerExpectation,
    createManagedRuntimeManifest,
    createRuntimeContract,
    createRuntimeVerificationState,
    requiredShadcnRuntimeExports,
    supportedRuntimeBase,
    createAhtmlGlueProof,
    createManagedRuntimeUiProof,
    createPromptUiManifest,
    getCliSchemaOutput,
    getManagedRuntimeUiOverrideEntries,
    getRuntimePaths,
    nativeRuntimeSetup,
    runtimeRenderer,
    runtimeVersion,
    writeStyleProfileStorage,
  } = await loadModules()
  const runtimeRoot = await temporaryDirectories.create("ahtml-runtime-")
  const runtimePaths = getRuntimePaths({ AHTML_HOME: runtimeRoot })
  const schema = await getCliSchemaOutput(process.cwd())
  const runtimeContract = createRuntimeContract(schema.components)
  const promptUiManifest = createPromptUiManifest({
    packageVersion: "0.0.0",
    setup: nativeRuntimeSetup,
    schema,
  })
  const componentsJson = {
    $schema: "https://ui.shadcn.com/schema.json",
    style: "new-york",
    rsc: false,
    tsx: true,
    tailwind: {
      config: "",
      css: "src/styles.css",
      baseColor: "neutral",
      cssVariables: true,
    },
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      lib: "@/lib",
      hooks: "@/hooks",
    },
    iconLibrary: "radix",
    rtl: false,
    menuColor: "default",
    menuAccent: "subtle",
    registries: {},
  }
  const baseRuntimeSurface = {
    source: "shadcn-init",
    template: "vite",
    preset: nativeRuntimeSetup.preset,
    style: componentsJson.style,
    base: supportedRuntimeBase,
    iconLibrary: componentsJson.iconLibrary,
    shellSource: "shadcn-official-template",
    initSource: "shadcn-cli",
    tailwindVersion: "^4.3.0",
    tailwindCss: "src/styles.css",
    cssPath: "src/styles.css",
    componentsJson: "components.json",
    aliases: componentsJson.aliases,
    baseLayerExpectation: createShadcnBaseLayerExpectation(
      componentsJson.tailwind.cssVariables,
    ),
    registryItems: [...nativeRuntimeSetup.components],
    requiredRegistryItems: [...nativeRuntimeSetup.components],
    requiredFiles: [
      "components.json",
      "vite.config.ts",
      "src/styles.css",
      ...nativeRuntimeSetup.components.map(
        (component) => `src/components/ui/${component}.tsx`,
      ),
    ],
    requiredExports: Object.fromEntries(
      nativeRuntimeSetup.components.map((component) => [
        component,
        getRequiredComponentExports(requiredShadcnRuntimeExports, component),
      ]),
    ),
    ...surfaceOverrides,
  }

  await mkdir(runtimePaths.runtimeComponentsDir, { recursive: true })
  await mkdir(runtimePaths.configDir, { recursive: true })
  await mkdir(runtimePaths.cacheDir, { recursive: true })
  await mkdir(runtimePaths.logsDir, { recursive: true })
  await mkdir(runtimePaths.runtimeSrcDir, { recursive: true })
  await mkdir(path.dirname(runtimePaths.runtimeVerificationPath), {
    recursive: true,
  })
  await writeFile(
    path.join(runtimePaths.runtimeDir, "components.json"),
    `${JSON.stringify(componentsJson, null, 2)}\n`,
  )
  await writeStyleProfileStorage(runtimePaths)
  await writeFile(
    path.join(runtimePaths.runtimeDir, "package.json"),
    `${JSON.stringify(
      {
        name: "ahtml-runtime",
        dependencies: {
          react: "^19.2.3",
          "react-dom": "^19.2.3",
        },
        devDependencies: {
          vite: "^7.3.0",
          tailwindcss: "^4.3.0",
          typescript: "latest",
        },
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(runtimePaths.runtimeViteConfigPath, "export default {}\n")
  if (includeTemplateViteConfig) {
    await writeFile(
      path.join(runtimePaths.runtimeDir, "vite.config.ts"),
      createRuntimeTemplateViteConfigSource(templateViteConfigStyle),
    )
  }
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "app.tsx"),
    "export function App() { return null }\n",
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "main.tsx"),
    "export {}\n",
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "ssr.tsx"),
    "export {}\n",
  )
  await mkdir(path.join(runtimePaths.runtimeSrcDir, "renderer"), {
    recursive: true,
  })
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "renderer", "elements.tsx"),
    "export function resolveElement(name) { return name }\n",
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "renderer", "kinds.ts"),
    'export const runtimeRendererKinds = ["accordion","choice-group","choice-inline","combobox-input","collection","compound","primitive","range-field","select-overlay","slider-field","table","tabs","text-field","toggle-field"] as const\nexport type RendererKind = (typeof runtimeRendererKinds)[number]\n',
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "renderer", "parity.ts"),
    "export const parity = true\n",
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "renderer", "render-node.tsx"),
    "export function createRendererNode() { return null }\n",
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "renderer", "types.ts"),
    "export type RendererSpecComponent = {}\n",
  )
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "styles.css"),
    createRuntimeCssSource(includeCssImports),
  )
  await mkdir(path.join(runtimePaths.runtimeSrcDir, "lib"), { recursive: true })
  await writeFile(
    path.join(runtimePaths.runtimeSrcDir, "lib", "utils.ts"),
    "export function cn(...values) { return values.filter(Boolean).join(' ') }\n",
  )

  for (const component of nativeRuntimeSetup.components) {
    const exports = getRequiredComponentExports(
      requiredShadcnRuntimeExports,
      component,
    )
    const managedOverride = getManagedRuntimeUiOverrideEntries(
      nativeRuntimeSetup.components,
    ).find((entry) => entry.component === component)
    await writeFile(
      path.join(runtimePaths.runtimeComponentsDir, `${component}.tsx`),
      managedOverride
        ? await readFile(managedOverride.sourcePath, "utf8")
        : createComponentModule(exports),
    )
  }

  const shadcnRuntimeSurface = {
    ...baseRuntimeSurface,
    ahtmlGlueProof: await createAhtmlGlueProof(runtimePaths),
    ahtmlManagedUiProof: await createManagedRuntimeUiProof(
      nativeRuntimeSetup.components,
    ),
  }
  const manifest = createManagedRuntimeManifest({
    componentSource: nativeRuntimeSetup.componentSource,
    components: [...nativeRuntimeSetup.components],
    installMode: nativeRuntimeSetup.installMode,
    packageVersion: "0.0.0",
    paths: runtimePaths,
    preset: nativeRuntimeSetup.preset,
    renderer: runtimeRenderer,
    runtimeBase: supportedRuntimeBase,
    runtimeContract,
    runtimeSurface: shadcnRuntimeSurface,
    uiLibrary: nativeRuntimeSetup.uiLibrary,
    version: runtimeVersion,
  })
  const runtimeVerificationState = createRuntimeVerificationState({
    components: [...nativeRuntimeSetup.components],
    runtimeBase: supportedRuntimeBase,
    runtimeContract,
    runtimeSurface: shadcnRuntimeSurface,
    version: 1,
  })
  await writeFile(
    runtimePaths.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await writeFile(
    runtimePaths.promptUiManifestPath,
    `${JSON.stringify(promptUiManifest, null, 2)}\n`,
  )
  await writeFile(
    runtimePaths.runtimeVerificationPath,
    `${JSON.stringify(runtimeVerificationState, null, 2)}\n`,
  )

  const outputDir = path.join(runtimeRoot, "dist", "html")
  if (builtCssSource) {
    await mkdir(path.join(outputDir, "assets"), { recursive: true })
    await writeFile(path.join(outputDir, "assets", "ahtml.css"), builtCssSource)
  }

  return {
    manifest,
    outputDir,
    runtimePaths,
  }
}

function createRuntimeCssSource(includeCssImports: boolean) {
  const imports = includeCssImports
    ? [
        '@import "tailwindcss";',
        '@import "tw-animate-css";',
        '@import "shadcn/tailwind.css";',
      ]
    : ['@import "tailwindcss";']

  return [
    ...imports,
    "",
    ":root {",
    "  --background: oklch(1 0 0);",
    "  --foreground: oklch(0.145 0 0);",
    "  --border: oklch(0.922 0 0);",
    "}",
    "",
    "body {",
    "  background-color: var(--background);",
    "  color: var(--foreground);",
    "}",
    "",
    ".border-border {",
    "  border-color: var(--border);",
    "}",
    "",
  ].join("\n")
}

function createRuntimeTemplateViteConfigSource(
  style: "rootDir" | "dirname" = "rootDir",
) {
  const aliasTarget =
    style === "dirname"
      ? '      "@": path.resolve(__dirname, "./src"),'
      : '      "@": path.resolve(rootDir, "./src"),'

  return [
    'import path from "node:path"',
    'import { fileURLToPath } from "node:url"',
    "",
    'import react from "@vitejs/plugin-react"',
    'import tailwindcss from "@tailwindcss/vite"',
    'import { defineConfig } from "vite"',
    "",
    "const rootDir = path.dirname(fileURLToPath(import.meta.url))",
    "",
    "export default defineConfig({",
    "  plugins: [react(), tailwindcss()],",
    "  resolve: {",
    "    alias: {",
    aliasTarget,
    "    },",
    "  },",
    "})",
    "",
  ].join("\n")
}

function createComponentModule(exports: string[]) {
  return exports
    .map((exportName) => `export function ${exportName}() { return null }`)
    .join("\n")
}

function getRequiredComponentExports(
  requiredShadcnRuntimeExports: Record<string, readonly string[]>,
  component: string,
) {
  const exports = requiredShadcnRuntimeExports[component]

  if (!exports) {
    throw new Error(`No test export map defined for ${component}.`)
  }

  return [...exports]
}

async function captureStdout<T>(callback: () => Promise<T>) {
  let output = ""
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    output += String(chunk)
    return true
  }) as typeof process.stdout.write)

  try {
    const result = await callback()
    return { output, result }
  } finally {
    writeSpy.mockRestore()
  }
}

async function loadModules(): Promise<LoadedModules> {
  const root = process.cwd()
  const [
    renderCapabilitiesModule,
    doctorChecksModule,
    runtimeManagedUiModule,
    runtimePathsModule,
    runtimeContractModule,
    runtimeSetupModule,
    runtimeSurfaceModule,
    runtimeStatusModule,
    schemaModule,
    styleProfileStorageModule,
  ] = await Promise.all([
    import(
      pathToFileURL(
        path.join(
          root,
          "packages",
          "ahtml",
          "src",
          "config",
          "render-capabilities.mjs",
        ),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(root, "packages", "ahtml", "src", "cli", "doctor-checks.mjs"),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(
          root,
          "packages",
          "ahtml",
          "src",
          "cli",
          "runtime-managed-ui.mjs",
        ),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(root, "packages", "ahtml", "src", "cli", "runtime-paths.mjs"),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(
          root,
          "packages",
          "ahtml",
          "src",
          "config",
          "runtime-contract.mjs",
        ),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(root, "packages", "ahtml", "src", "cli", "runtime-setup.mjs"),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(
          root,
          "packages",
          "ahtml",
          "src",
          "cli",
          "runtime-surface.mjs",
        ),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(
          root,
          "packages",
          "ahtml",
          "src",
          "cli",
          "runtime-status.mjs",
        ),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(root, "packages", "ahtml", "src", "cli", "schema.mjs"),
      ).href
    ),
    import(
      pathToFileURL(
        path.join(
          root,
          "packages",
          "ahtml",
          "src",
          "cli",
          "style-profile-storage.mjs",
        ),
      ).href
    ),
  ])

  return {
    requiredShadcnRuntimeExports:
      renderCapabilitiesModule.requiredShadcnRuntimeExports,
    createShadcnBaseLayerExpectation:
      runtimeSurfaceModule.createShadcnBaseLayerExpectation,
    supportedRuntimeBase: renderCapabilitiesModule.supportedRuntimeBase,
    runDoctorCommand: doctorChecksModule.runDoctorCommand,
    getRuntimePaths: runtimePathsModule.getRuntimePaths,
    runtimeRenderer: runtimePathsModule.runtimeRenderer,
    runtimeVersion: runtimePathsModule.runtimeVersion,
    createPromptUiManifest: runtimeSetupModule.createPromptUiManifest,
    createManagedRuntimeManifest:
      runtimeContractModule.createManagedRuntimeManifest,
    createAhtmlGlueProof: runtimeSurfaceModule.createAhtmlGlueProof,
    createManagedRuntimeUiProof: runtimeManagedUiModule.createManagedRuntimeUiProof,
    createRuntimeVerificationState:
      runtimeContractModule.createRuntimeVerificationState,
    getManagedRuntimeUiOverrideEntries:
      runtimeManagedUiModule.getManagedRuntimeUiOverrideEntries,
    nativeRuntimeSetup: runtimeSetupModule.nativeRuntimeSetup,
    assertBuiltArtifactCss: runtimeSurfaceModule.assertBuiltArtifactCss,
    assertRuntimeSurface: runtimeSurfaceModule.assertRuntimeSurface,
    createRuntimeContract: runtimeContractModule.createRuntimeContract,
    getShadcnRuntimeProvenanceState:
      runtimeSurfaceModule.getShadcnRuntimeProvenanceState,
    getRuntimeStatus: runtimeStatusModule.getRuntimeStatus,
    getCliSchemaOutput: schemaModule.getCliSchemaOutput,
    writeStyleProfileStorage: styleProfileStorageModule.writeStyleProfileStorage,
  }
}
