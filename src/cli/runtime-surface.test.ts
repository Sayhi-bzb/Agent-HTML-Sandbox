/// <reference types="node" />
// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

import { afterEach, describe, expect, it, vi } from "vitest"

const temporaryDirectories: string[] = []

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
  readonly manifestPath: string
  readonly promptUiManifestPath: string
  readonly runtimeCapabilitiesPath: string
  readonly runtimeViteConfigPath: string
  readonly runtimeSrcDir: string
  readonly runtimeComponentsDir: string
}

type LoadedModules = {
  readonly supportedRuntimeBase: string
  readonly runDoctorCommand: (input: {
    readonly commandArgs: readonly string[]
    readonly defaultOutputDir: string
    readonly ensureManagedRuntime: (packageVersion: string) => Promise<void>
    readonly packageRoot: string
    readonly readPackageVersion: () => Promise<string>
    readonly runtimePaths: RuntimePaths
  }) => Promise<void>
  readonly getRuntimePaths: (env?: Record<string, string>) => RuntimePaths
  readonly runtimeRenderer: string
  readonly runtimeVersion: number
  readonly createPromptUiManifest: (input: {
    readonly packageVersion: string
    readonly setup: NativeRuntimeSetup
    readonly schema: CliSchemaOutput
  }) => unknown
  readonly createManagedRuntimeProof: (paths: RuntimePaths) => Promise<{
    readonly algorithm: string
    readonly files: Record<string, string>
  }>
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
  readonly getCliSchemaOutput: (root?: string) => Promise<CliSchemaOutput>
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

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

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
    expect(status.checks.shadcnSurface).toBe(true)
    expect(status.ready).toBe(false)
    expect(status.runtimeDetail).toContain(
      "shadcn CSS entry is missing required imports",
    )
  })

  it("fails doctor on missing shadcn css imports and skips built css when no artifact exists", async () => {
    const { runDoctorCommand } = await loadModules()
    const fixture = await createRuntimeFixture({ includeCssImports: false })
    const { output, exitCode } = await captureStdout(async () => {
      await runDoctorCommand({
        commandArgs: [],
        defaultOutputDir: fixture.outputDir,
        ensureManagedRuntime: async () => {},
        packageRoot: process.cwd(),
        readPackageVersion: async () => "0.0.0",
        runtimePaths: fixture.runtimePaths,
      })
    })

    expect(output).toContain("ok runtime:components-json")
    expect(output).toContain(
      "fail runtime:shadcn-css-imports shadcn CSS entry is missing required imports: tw-animate-css, shadcn/tailwind.css.",
    )
    expect(output).toContain(
      "skip artifact:built-css No built artifact CSS found",
    )
    expect(exitCode).toBe(1)
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

  it("rejects managed runtime proof drift between manifest and runtime files", async () => {
    const { assertRuntimeSurface } = await loadModules()
    const fixture = await createRuntimeFixture()
    const manifest = {
      ...fixture.manifest,
      shadcnRuntimeSurface: {
        ...fixture.manifest.shadcnRuntimeSurface,
        managedRuntimeProof: {
          ...fixture.manifest.shadcnRuntimeSurface.managedRuntimeProof,
          files: {
            ...fixture.manifest.shadcnRuntimeSurface.managedRuntimeProof.files,
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
      "surface managedRuntimeProof src/app.tsx does not match runtime file hash",
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
})

async function createRuntimeFixture({
  includeCssImports = true,
  surfaceOverrides = {},
  builtCssSource,
}: {
  includeCssImports?: boolean
  surfaceOverrides?: Record<string, unknown>
  builtCssSource?: string
} = {}) {
  const {
    supportedRuntimeBase,
    createManagedRuntimeProof,
    createPromptUiManifest,
    getCliSchemaOutput,
    getRuntimePaths,
    nativeRuntimeSetup,
    runtimeRenderer,
    runtimeVersion,
  } = await loadModules()
  const runtimeRoot = await mkdtemp(path.join(tmpdir(), "ahtml-runtime-"))
  temporaryDirectories.push(runtimeRoot)
  const runtimePaths = getRuntimePaths({ AHTML_HOME: runtimeRoot })
  const schema = await getCliSchemaOutput(process.cwd())
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
    baseLayerExpectation: {
      cssVariables: true,
      imports: ["tailwindcss", "tw-animate-css", "shadcn/tailwind.css"],
      tokens: ["--background", "--foreground", "--border"],
    },
    registryItems: [...nativeRuntimeSetup.components],
    requiredRegistryItems: [...nativeRuntimeSetup.components],
    requiredFiles: [
      "components.json",
      "src/styles.css",
      ...nativeRuntimeSetup.components.map(
        (component) => `src/components/ui/${component}.tsx`,
      ),
    ],
    requiredExports: Object.fromEntries(
      nativeRuntimeSetup.components.map((component) => [
        component,
        getRequiredComponentExports(component),
      ]),
    ),
    ...surfaceOverrides,
  }

  await mkdir(runtimePaths.runtimeComponentsDir, { recursive: true })
  await mkdir(runtimePaths.configDir, { recursive: true })
  await mkdir(runtimePaths.cacheDir, { recursive: true })
  await mkdir(runtimePaths.logsDir, { recursive: true })
  await mkdir(runtimePaths.runtimeSrcDir, { recursive: true })
  await mkdir(path.dirname(runtimePaths.runtimeCapabilitiesPath), {
    recursive: true,
  })
  await writeFile(
    path.join(runtimePaths.runtimeDir, "components.json"),
    `${JSON.stringify(componentsJson, null, 2)}\n`,
  )
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
    'export const runtimeRendererKinds = ["collection","compound","interactive-collection","primitive","table","tabs"] as const\nexport type RendererKind = (typeof runtimeRendererKinds)[number]\n',
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
    const exports = getRequiredComponentExports(component)
    await writeFile(
      path.join(runtimePaths.runtimeComponentsDir, `${component}.tsx`),
      createComponentModule(exports),
    )
  }

  const shadcnRuntimeSurface = {
    ...baseRuntimeSurface,
    managedRuntimeProof: await createManagedRuntimeProof(runtimePaths),
  }
  const manifest = {
    kind: "ahtml-managed-runtime",
    version: runtimeVersion,
    renderer: runtimeRenderer,
    packageVersion: "0.0.0",
    uiLibrary: nativeRuntimeSetup.uiLibrary,
    componentSource: nativeRuntimeSetup.componentSource,
    runtimeBase: supportedRuntimeBase,
    shadcnRuntimeSurface,
    installMode: nativeRuntimeSetup.installMode,
    preset: nativeRuntimeSetup.preset,
    components: [...nativeRuntimeSetup.components],
    installedUiComponents: [...nativeRuntimeSetup.components],
    renderableAgentComponents: schema.components.map(
      (component) => component.name,
    ),
    paths: {
      runtime: runtimePaths.runtimeDir,
      cache: runtimePaths.cacheDir,
      logs: runtimePaths.logsDir,
      config: runtimePaths.configDir,
    },
  }
  const runtimeCapabilities = {
    kind: "ahtml-runtime-render-capabilities",
    version: 1,
    runtimeBase: supportedRuntimeBase,
    shadcnRuntimeSurface,
    installedUiComponents: [...nativeRuntimeSetup.components],
    renderableAgentComponents: [...manifest.renderableAgentComponents],
    verificationData: schema.verificationData,
    rendererMapping: schema.rendererMapping,
  }
  await writeFile(
    runtimePaths.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await writeFile(
    runtimePaths.promptUiManifestPath,
    `${JSON.stringify(promptUiManifest, null, 2)}\n`,
  )
  await writeFile(
    runtimePaths.runtimeCapabilitiesPath,
    `${JSON.stringify(runtimeCapabilities, null, 2)}\n`,
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

function createComponentModule(exports: string[]) {
  return exports
    .map((exportName) => `export function ${exportName}() { return null }`)
    .join("\n")
}

function getRequiredComponentExports(component: string) {
  const exportMap: Record<string, string[]> = {
    accordion: [
      "Accordion",
      "AccordionContent",
      "AccordionItem",
      "AccordionTrigger",
    ],
    alert: ["Alert", "AlertDescription", "AlertTitle"],
    badge: ["Badge"],
    card: ["Card", "CardContent", "CardHeader", "CardTitle"],
    separator: ["Separator"],
    table: [
      "Table",
      "TableBody",
      "TableCell",
      "TableHead",
      "TableHeader",
      "TableRow",
    ],
    tabs: ["Tabs", "TabsContent", "TabsList", "TabsTrigger"],
  }
  const exports = exportMap[component]

  if (!exports) {
    throw new Error(`No test export map defined for ${component}.`)
  }

  return exports
}

async function captureStdout(callback: () => Promise<void>) {
  let output = ""
  const originalExitCode = process.exitCode
  const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    output += String(chunk)
    return true
  }) as typeof process.stdout.write)

  process.exitCode = 0
  try {
    await callback()
    return { output, exitCode: process.exitCode }
  } finally {
    writeSpy.mockRestore()
    process.exitCode = originalExitCode
  }
}

async function loadModules(): Promise<LoadedModules> {
  const root = process.cwd()
  const [
    renderCapabilitiesModule,
    doctorChecksModule,
    runtimePathsModule,
    runtimeSetupModule,
    runtimeSurfaceModule,
    runtimeStatusModule,
    schemaModule,
  ] = await Promise.all([
    import(
      pathToFileURL(path.join(root, "src", "config", "render-capabilities.mjs"))
        .href
    ),
    import(
      pathToFileURL(path.join(root, "src", "cli", "doctor-checks.mjs")).href
    ),
    import(
      pathToFileURL(path.join(root, "src", "cli", "runtime-paths.mjs")).href
    ),
    import(
      pathToFileURL(path.join(root, "src", "cli", "runtime-setup.mjs")).href
    ),
    import(
      pathToFileURL(path.join(root, "src", "cli", "runtime-surface.mjs")).href
    ),
    import(
      pathToFileURL(path.join(root, "src", "cli", "runtime-status.mjs")).href
    ),
    import(pathToFileURL(path.join(root, "src", "cli", "schema.mjs")).href),
  ])

  return {
    supportedRuntimeBase: renderCapabilitiesModule.supportedRuntimeBase,
    runDoctorCommand: doctorChecksModule.runDoctorCommand,
    getRuntimePaths: runtimePathsModule.getRuntimePaths,
    runtimeRenderer: runtimePathsModule.runtimeRenderer,
    runtimeVersion: runtimePathsModule.runtimeVersion,
    createPromptUiManifest: runtimeSetupModule.createPromptUiManifest,
    createManagedRuntimeProof: runtimeSurfaceModule.createManagedRuntimeProof,
    nativeRuntimeSetup: runtimeSetupModule.nativeRuntimeSetup,
    assertBuiltArtifactCss: runtimeSurfaceModule.assertBuiltArtifactCss,
    assertRuntimeSurface: runtimeSurfaceModule.assertRuntimeSurface,
    getShadcnRuntimeProvenanceState:
      runtimeSurfaceModule.getShadcnRuntimeProvenanceState,
    getRuntimeStatus: runtimeStatusModule.getRuntimeStatus,
    getCliSchemaOutput: schemaModule.getCliSchemaOutput,
  }
}
