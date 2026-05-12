import os from "node:os"
import { execFile } from "node:child_process"
import { createRequire } from "node:module"
import {
  access,
  constants,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

export const runtimeManifestName = "runtime.json"
export const runtimeRenderer = "shadcn-runtime"

const execFileAsync = promisify(execFile)
const runtimeVersion = 1
const runtimePackageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)

export function getRuntimePaths(env = process.env) {
  const runtimeRoot = path.resolve(
    env.AHTML_HOME || path.join(os.homedir(), ".ahtml"),
  )

  return {
    runtimeRoot,
    runtimeDir: path.join(runtimeRoot, "runtime"),
    cacheDir: path.join(runtimeRoot, "cache"),
    logsDir: path.join(runtimeRoot, "logs"),
    configDir: path.join(runtimeRoot, "config"),
    manifestPath: path.join(runtimeRoot, "config", runtimeManifestName),
    runtimePackageJsonPath: path.join(runtimeRoot, "runtime", "package.json"),
    runtimeViteConfigPath: path.join(runtimeRoot, "runtime", "vite.config.mjs"),
    runtimeSsrDir: path.join(runtimeRoot, "runtime", ".ahtml-ssr"),
    runtimeSrcDir: path.join(runtimeRoot, "runtime", "src"),
    runtimeComponentsDir: path.join(
      runtimeRoot,
      "runtime",
      "src",
      "components",
      "ui",
    ),
    generatedDocumentPath: path.join(
      runtimeRoot,
      "runtime",
      "document.generated.json",
    ),
  }
}

export async function bootstrapManagedRuntime({
  packageVersion = "0.0.0",
  packageRoot = runtimePackageRoot,
  paths = getRuntimePaths(),
} = {}) {
  await mkdir(paths.runtimeDir, { recursive: true })
  await mkdir(paths.cacheDir, { recursive: true })
  await mkdir(paths.logsDir, { recursive: true })
  await mkdir(paths.configDir, { recursive: true })
  await writeRuntimeTemplate({ packageRoot, paths })

  const manifest = {
    kind: "ahtml-managed-runtime",
    version: runtimeVersion,
    renderer: runtimeRenderer,
    packageVersion,
    paths: {
      runtime: paths.runtimeDir,
      cache: paths.cacheDir,
      logs: paths.logsDir,
      config: paths.configDir,
    },
  }

  await writeJsonFile(paths.manifestPath, manifest)
  return manifest
}

export async function readRuntimeManifest(paths = getRuntimePaths()) {
  const source = await readFile(paths.manifestPath, "utf8")
  const manifest = JSON.parse(source)

  if (
    manifest?.kind !== "ahtml-managed-runtime" ||
    manifest?.renderer !== runtimeRenderer ||
    manifest?.version !== runtimeVersion
  ) {
    throw new Error(`${runtimeManifestName} was not written by ahtml.`)
  }

  return manifest
}

export async function getRuntimeStatus({
  packageVersion = "0.0.0",
  outputDir,
  paths = getRuntimePaths(),
} = {}) {
  const checks = {
    root: await pathExists(paths.runtimeRoot),
    runtime: await pathExists(paths.runtimeDir),
    cache: await pathExists(paths.cacheDir),
    logs: await pathExists(paths.logsDir),
    config: await pathExists(paths.configDir),
    manifest: false,
    rendererAdapter: await pathExists(
      path.join(paths.runtimeSrcDir, "main.tsx"),
    ),
    shadcnCard: await pathExists(
      path.join(paths.runtimeComponentsDir, "card.tsx"),
    ),
    viteConfig: await pathExists(paths.runtimeViteConfigPath),
    outputWritable: false,
  }
  let manifest
  let manifestError = ""

  try {
    manifest = await readRuntimeManifest(paths)
    checks.manifest = true
  } catch (error) {
    manifestError = error instanceof Error ? error.message : String(error)
  }

  if (outputDir) {
    checks.outputWritable = await probeOutputPath(outputDir)
  }

  const ready =
    checks.root &&
    checks.runtime &&
    checks.cache &&
    checks.logs &&
    checks.config &&
    checks.manifest &&
    checks.rendererAdapter &&
    checks.shadcnCard &&
    checks.viteConfig

  return {
    ready,
    checks,
    manifest,
    manifestError,
    packageVersion,
    paths,
  }
}

export async function writeGeneratedDocument(
  document,
  paths = getRuntimePaths(),
) {
  await mkdir(path.dirname(paths.generatedDocumentPath), { recursive: true })
  await writeJsonFile(paths.generatedDocumentPath, document)
}

export async function buildRuntimeArtifact({
  outputDir,
  packageRoot = runtimePackageRoot,
  paths = getRuntimePaths(),
}) {
  await rm(outputDir, { force: true, recursive: true })
  await mkdir(outputDir, { recursive: true })

  const { viteBin } = resolveRuntimeDependencies(packageRoot)
  await execFileAsync(
    process.execPath,
    [
      viteBin,
      "build",
      "--config",
      paths.runtimeViteConfigPath,
      "--outDir",
      outputDir,
    ],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_RUNTIME_PACKAGE_ROOT: packageRoot,
      },
    },
  )
  await rm(paths.runtimeSsrDir, { force: true, recursive: true })
  await execFileAsync(
    process.execPath,
    [
      viteBin,
      "build",
      "--config",
      paths.runtimeViteConfigPath,
      "--ssr",
      path.join(paths.runtimeSrcDir, "ssr.tsx"),
      "--outDir",
      paths.runtimeSsrDir,
    ],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_RUNTIME_PACKAGE_ROOT: packageRoot,
      },
    },
  )

  const ssr = await execFileAsync(
    process.execPath,
    [await findSsrEntrypoint(paths.runtimeSsrDir)],
    {
      cwd: paths.runtimeDir,
      env: {
        ...process.env,
        AHTML_RUNTIME_PACKAGE_ROOT: packageRoot,
      },
    },
  )
  await patchBuiltIndexHtml({
    html: ssr.stdout.trim(),
    outputDir,
  })
}

async function probeWritableDirectory(directory) {
  try {
    await mkdir(directory, { recursive: true })
    await access(directory, constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function probeOutputPath(directory) {
  try {
    if (await pathExists(directory)) {
      return probeWritableDirectory(directory)
    }

    const parent = await findExistingAncestor(
      path.dirname(path.resolve(directory)),
    )
    await access(parent, constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function findExistingAncestor(directory) {
  let current = path.resolve(directory)

  while (!(await pathExists(current))) {
    const parent = path.dirname(current)

    if (parent === current) {
      throw new Error(`No existing parent directory for ${directory}.`)
    }

    current = parent
  }

  return current
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

async function patchBuiltIndexHtml({ html, outputDir }) {
  const indexPath = path.join(outputDir, "index.html")
  const source = await readFile(indexPath, "utf8")
  const escapedTitle = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]
  const titleTag = escapedTitle
    ? `    <title>${escapedTitle}</title>\n`
    : "    <title>agent-html artifact</title>\n"
  const withTitle = source.includes("<title>")
    ? source.replace(/[ ]{4}<title>.*?<\/title>\n/s, titleTag)
    : source.replace("  </head>", `${titleTag}  </head>`)
  const next = withTitle.replace(
    '<div id="root"></div>',
    `<div id="root">${html}</div>`,
  )

  await writeFile(indexPath, next)
}

async function findSsrEntrypoint(directory) {
  const entries = await readdir(directory, { recursive: true })
  const entry = entries
    .map((item) => String(item))
    .find(
      (item) =>
        item.endsWith("ssr.mjs") ||
        item.endsWith("ssr.js") ||
        item.endsWith(".mjs") ||
        item.endsWith(".js"),
    )

  if (!entry) {
    throw new Error(`SSR renderer entry was not built in ${directory}.`)
  }

  return path.join(directory, entry)
}

async function writeRuntimeTemplate({ packageRoot, paths }) {
  const dependencies = resolveRuntimeDependencies(packageRoot)

  await mkdir(paths.runtimeComponentsDir, { recursive: true })
  await mkdir(path.join(paths.runtimeSrcDir, "lib"), { recursive: true })
  await writeJsonFile(paths.runtimePackageJsonPath, {
    private: true,
    type: "module",
    scripts: {
      build: "vite build",
    },
    dependencies: {},
    devDependencies: {},
  })
  await writeJsonFile(path.join(paths.runtimeDir, "components.json"), {
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
  })
  await writeFile(
    path.join(paths.runtimeDir, "index.html"),
    [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      "  </head>",
      "  <body>",
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      "  </body>",
      "</html>",
      "",
    ].join("\n"),
  )
  await writeFile(
    paths.runtimeViteConfigPath,
    createViteConfigSource({ dependencies }),
  )
  await writeFile(
    path.join(paths.runtimeDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          useDefineForClassFields: true,
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          allowJs: false,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          module: "ESNext",
          moduleResolution: "Bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          baseUrl: ".",
          paths: {
            "@/*": ["./src/*"],
          },
        },
        include: ["src"],
      },
      null,
      2,
    ) + "\n",
  )
  await writeFile(path.join(paths.runtimeSrcDir, "main.tsx"), mainTsxSource)
  await writeFile(path.join(paths.runtimeSrcDir, "app.tsx"), appTsxSource)
  await writeFile(path.join(paths.runtimeSrcDir, "ssr.tsx"), ssrTsxSource)
  await writeFile(path.join(paths.runtimeSrcDir, "styles.css"), stylesSource)
  await writeFile(
    path.join(paths.runtimeComponentsDir, "card.tsx"),
    cardTsxSource,
  )
  await writeFile(
    path.join(paths.runtimeSrcDir, "lib", "utils.ts"),
    utilsSource,
  )
}

function createViteConfigSource({ dependencies }) {
  return `import path from "node:path"
import { fileURLToPath } from "node:url"

const runtimeRoot = path.dirname(fileURLToPath(import.meta.url))
const dependencies = ${JSON.stringify(normalizeDependencyPaths(dependencies), null, 2)}

export default {
  root: runtimeRoot,
  resolve: {
    alias: {
      "@": path.join(runtimeRoot, "src"),
      "react": dependencies.reactRoot,
      "react/jsx-runtime": dependencies.reactJsxRuntime,
      "react-dom": dependencies.reactDomRoot,
      "react-dom/client": dependencies.reactDomClient,
      "react-dom/server": dependencies.reactDomServer,
      "clsx": dependencies.clsxRoot,
      "tailwind-merge": dependencies.tailwindMergeRoot
    }
  },
  ssr: {
    noExternal: true
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/ahtml.js",
        chunkFileNames: "assets/ahtml-[hash].js",
        assetFileNames: "assets/ahtml.[ext]"
      }
    }
  }
}
`
}

function resolveRuntimeDependencies(packageRoot) {
  const packageRequire = createRequire(path.join(packageRoot, "package.json"))

  return {
    viteBin: path.join(
      path.dirname(packageRequire.resolve("vite/package.json")),
      "bin",
      "vite.js",
    ),
    reactRoot: path.dirname(packageRequire.resolve("react/package.json")),
    reactJsxRuntime: packageRequire.resolve("react/jsx-runtime"),
    reactDomRoot: path.dirname(
      packageRequire.resolve("react-dom/package.json"),
    ),
    reactDomClient: packageRequire.resolve("react-dom/client"),
    reactDomServer: packageRequire.resolve("react-dom/server"),
    clsxRoot: packageRequire.resolve("clsx"),
    tailwindMergeRoot: packageRequire.resolve("tailwind-merge"),
  }
}

function normalizeDependencyPaths(dependencies) {
  return Object.fromEntries(
    Object.entries(dependencies).map(([key, value]) => [
      key,
      value.replaceAll("\\", "/"),
    ]),
  )
}

const mainTsxSource = `import React from "react"
import { createRoot } from "react-dom/client"
import { App } from "./app"
import "./styles.css"

createRoot(window.document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`

const appTsxSource = `import React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import generatedDocument from "../document.generated.json"

type AgentTextNode = {
  type: "text"
  value: string
}

type AgentComponentNode = {
  type: "component"
  name: string
  props: Record<string, string>
  children: AgentNode[]
}

type AgentNode = AgentTextNode | AgentComponentNode

type AgentDocument = {
  meta: {
    theme: string
    density: string
    tone: string
    width: string
  }
  components: AgentNode[]
}

const agentDocument = generatedDocument as AgentDocument

export function App() {
  const title = getDocumentTitle(agentDocument)

  React.useEffect(() => {
    if (title && typeof window !== "undefined") {
      window.document.title = title
    }
  }, [title])

  return (
    <main
      className="ahtml-shell"
      data-theme={agentDocument.meta.theme}
      data-density={agentDocument.meta.density}
      data-tone={agentDocument.meta.tone}
      data-width={agentDocument.meta.width}
    >
      {agentDocument.components.map((node, index) => (
        <RendererNode key={index} node={node} />
      ))}
    </main>
  )
}

function RendererNode({ node }: { node: AgentNode }) {
  if (node.type === "text") {
    return <p className="ahtml-text">{node.value}</p>
  }

  if (node.name === "page") {
    return (
      <article className="ahtml-page" data-agent-html-component={node.name}>
        {node.props.title ? (
          <h1 className="ahtml-page-title">{node.props.title}</h1>
        ) : null}
        {renderChildren(node)}
      </article>
    )
  }

  if (node.name === "card") {
    return (
      <Card data-agent-html-component={node.name}>
        {node.props.title ? (
          <CardHeader>
            <CardTitle>{node.props.title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent>{renderChildren(node)}</CardContent>
      </Card>
    )
  }

  return (
    <section className="ahtml-section" data-agent-html-component={node.name}>
      {node.props.title ? (
        <h2 className="ahtml-section-title">{node.props.title}</h2>
      ) : null}
      {renderChildren(node)}
    </section>
  )
}

function renderChildren(node: AgentComponentNode) {
  return node.children.map((child, index) => (
    <RendererNode key={index} node={child} />
  ))
}

function getDocumentTitle(agentDocument: AgentDocument) {
  const page = agentDocument.components.find(
    (node): node is AgentComponentNode =>
      node.type === "component" && node.name === "page",
  )

  return page?.props.title
}
`

const ssrTsxSource = `import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { App } from "./app"

process.stdout.write(renderToStaticMarkup(<App />))
`

const cardTsxSource = `import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-lg border py-6 shadow-sm ahtml-card",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold ahtml-card-title", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 ahtml-content", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardContent }
`

const utilsSource = `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`

const stylesSource = `:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f7f7f5;
  color: #1f2933;
  --card: #ffffff;
  --card-foreground: #111827;
  --border: #d9ddd6;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #f7f7f5;
}

.ahtml-shell {
  width: min(calc(100% - 32px), 1120px);
  margin: 0 auto;
  padding: 40px 0;
  display: grid;
  gap: 24px;
}

.ahtml-shell[data-width="article"] {
  max-width: 860px;
}

.ahtml-shell[data-width="wide"] {
  max-width: 1440px;
}

.ahtml-shell[data-density="compact"] {
  gap: 16px;
}

.ahtml-page {
  display: grid;
  gap: 20px;
}

.ahtml-page-title {
  margin: 0;
  font-size: 2rem;
  line-height: 1.15;
  font-weight: 700;
  color: #111827;
}

.bg-card {
  background-color: var(--card);
}

.text-card-foreground {
  color: var(--card-foreground);
}

.ahtml-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
}

.ahtml-card-title {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.35;
  font-weight: 650;
  color: #111827;
}

.ahtml-section {
  display: grid;
  gap: 12px;
}

.ahtml-section-title {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.35;
  font-weight: 650;
  color: #111827;
}

.ahtml-content {
  display: grid;
  gap: 12px;
  line-height: 1.7;
}

.ahtml-text {
  margin: 0;
  white-space: pre-wrap;
}
`
