import { mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

export async function scaffoldUserProject({ userRoot, template }) {
  if (template !== "vite") {
    throw new Error("init --scaffold currently supports only --template vite.")
  }

  const packageName = path.basename(userRoot) || "agent-html-app"
  await writeTextFileIfMissing(
    path.join(userRoot, "package.json"),
    `${JSON.stringify(createScaffoldPackageJson(packageName), null, 2)}\n`,
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "index.html"),
    [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      "    <title>agent-html</title>",
      "  </head>",
      "  <body>",
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      "  </body>",
      "</html>",
      "",
    ].join("\n"),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "main.tsx"),
    createMainSource(),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "vite-env.d.ts"),
    createViteEnvSource(),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "index.css"),
    ['@import "tailwindcss";', '@import "tw-animate-css";', ""].join("\n"),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "lib", "utils.ts"),
    [
      'import { clsx, type ClassValue } from "clsx"',
      'import { twMerge } from "tailwind-merge"',
      "",
      "export function cn(...inputs: ClassValue[]) {",
      "  return twMerge(clsx(inputs))",
      "}",
      "",
    ].join("\n"),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "vite.config.ts"),
    createViteConfigSource(),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "tsconfig.json"),
    `${JSON.stringify(createScaffoldTsConfig(), null, 2)}\n`,
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "tsconfig.app.json"),
    `${JSON.stringify(createScaffoldTsConfigApp(), null, 2)}\n`,
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "components.json"),
    `${JSON.stringify(createScaffoldComponentsJson(), null, 2)}\n`,
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "agent-html", "renderer-adapter.tsx"),
    createRendererAdapterSource(),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "agent-html", "document.generated.ts"),
    createInitialDocumentSource(),
  )
}

export async function scaffoldAgentHtmlIntegration({
  userRoot,
  overwriteEntry = false,
}) {
  const mainPath = path.join(userRoot, "src", "main.tsx")
  const writeEntry = overwriteEntry ? writeTextFile : writeTextFileIfMissing

  await writeEntry(mainPath, createMainSource())
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "vite-env.d.ts"),
    createViteEnvSource(),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "agent-html", "renderer-adapter.tsx"),
    createRendererAdapterSource(),
  )
  await writeTextFileIfMissing(
    path.join(userRoot, "src", "agent-html", "document.generated.ts"),
    createInitialDocumentSource(),
  )
}

function createScaffoldPackageJson(packageName) {
  return {
    name: packageName.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc -b && vite build",
      preview: "vite preview",
    },
    dependencies: {
      "@tailwindcss/vite": "^4.3.0",
      "@vitejs/plugin-react": "^4.6.0",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "lucide-react": "^1.14.0",
      react: "latest",
      "react-dom": "latest",
      "tailwind-merge": "^3.5.0",
      tailwindcss: "^4.3.0",
      "tw-animate-css": "^1.4.0",
      vite: "^6.3.5",
    },
    devDependencies: {
      typescript: "latest",
      "@types/node": "^25.0.0",
      "@types/react": "^19.2.14",
      "@types/react-dom": "^19.2.3",
    },
  }
}

function createScaffoldTsConfig() {
  return {
    files: [],
    compilerOptions: {
      paths: {
        "@/*": ["./src/*"],
      },
    },
    references: [{ path: "./tsconfig.app.json" }],
  }
}

function createScaffoldTsConfigApp() {
  return {
    compilerOptions: {
      target: "ES2022",
      useDefineForClassFields: true,
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      allowImportingTsExtensions: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      skipLibCheck: true,
      paths: {
        "@/*": ["./src/*"],
      },
    },
    include: ["src"],
  }
}

function createScaffoldComponentsJson() {
  return {
    style: "new-york",
    rsc: false,
    tsx: true,
    tailwind: {
      config: "",
      css: "src/index.css",
      baseColor: "neutral",
      cssVariables: true,
      prefix: "",
    },
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      lib: "@/lib",
      hooks: "@/hooks",
    },
    iconLibrary: "lucide",
  }
}

function createRendererAdapterSource() {
  return [
    'import type { ReactNode } from "react"',
    "",
    "export type SanitizedAgentHtml = {",
    "  readonly meta: {",
    "    readonly theme: string",
    "    readonly density: string",
    "    readonly tone: string",
    "    readonly width: string",
    "  }",
    "  readonly components: readonly SanitizedAgentHtmlNode[]",
    "}",
    "",
    "export type SanitizedAgentHtmlNode =",
    '  | { readonly type: "text"; readonly value: string }',
    "  | {",
    '      readonly type: "component"',
    "      readonly name: string",
    "      readonly props: Readonly<Record<string, string>>",
    "      readonly children: readonly SanitizedAgentHtmlNode[]",
    "    }",
    "",
    "export function createAgentHtmlRendererAdapter(agentDocument: SanitizedAgentHtml) {",
    "  return function AgentHtmlRendererAdapter() {",
    "    return (",
    '      <main data-agent-html-theme={agentDocument.meta.theme} className="min-h-screen bg-background text-foreground">',
    '        <div className="mx-auto w-full max-w-4xl px-6 py-10">',
    "          {agentDocument.components.map((node, index) => renderNode(node, index))}",
    "        </div>",
    "      </main>",
    "    )",
    "  }",
    "}",
    "",
    "function renderNode(node: SanitizedAgentHtmlNode, key: number): ReactNode {",
    '  if (node.type === "text") {',
    "    return node.value",
    "  }",
    "  const children = node.children.map((child, index) => renderNode(child, index))",
    "  const title = node.props.title",
    "",
    '  if (node.name === "page") {',
    "    return (",
    '      <article key={key} data-agent-html-component={node.name} className="space-y-6">',
    '        {title ? <h1 className="text-3xl font-semibold tracking-tight">{title}</h1> : null}',
    "        {children}",
    "      </article>",
    "    )",
    "  }",
    "",
    '  if (node.name === "card") {',
    "    return (",
    '      <section key={key} data-agent-html-component={node.name} className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">',
    '        {title ? <h2 className="mb-3 text-xl font-semibold">{title}</h2> : null}',
    '        <div className="space-y-3 leading-7">{children}</div>',
    "      </section>",
    "    )",
    "  }",
    "",
    "  return (",
    '    <section key={key} data-agent-html-component={node.name} className="space-y-3">',
    '      {title ? <h2 className="text-xl font-semibold">{title}</h2> : null}',
    "      {children}",
    "    </section>",
    "  )",
    "}",
    "",
  ].join("\n")
}

function createMainSource() {
  return [
    'import React from "react"',
    'import { createRoot } from "react-dom/client"',
    'import agentDocument from "./agent-html/document.generated"',
    'import { createAgentHtmlRendererAdapter } from "./agent-html/renderer-adapter"',
    'import "./index.css"',
    "",
    "const Adapter = createAgentHtmlRendererAdapter(agentDocument)",
    "",
    'createRoot(document.getElementById("root")!).render(',
    "  <React.StrictMode>",
    "    <Adapter />",
    "  </React.StrictMode>,",
    ")",
    "",
  ].join("\n")
}

function createViteEnvSource() {
  return '/// <reference types="vite/client" />\n'
}

function createViteConfigSource() {
  return [
    'import react from "@vitejs/plugin-react"',
    'import tailwindcss from "@tailwindcss/vite"',
    'import { fileURLToPath, URL } from "node:url"',
    'import { defineConfig } from "vite"',
    "",
    "export default defineConfig({",
    "  plugins: [react(), tailwindcss()],",
    "  resolve: {",
    "    alias: {",
    '      "@": fileURLToPath(new URL("./src", import.meta.url)),',
    "    },",
    "  },",
    "})",
    "",
  ].join("\n")
}

function createInitialDocumentSource() {
  return [
    "export default {",
    "  meta: {",
    '    theme: "neutral",',
    '    density: "comfortable",',
    '    tone: "dashboard",',
    '    width: "dashboard",',
    "  },",
    "  components: [],",
    "} as const",
    "",
  ].join("\n")
}

async function writeTextFileIfMissing(filePath, value) {
  if (await fileExistsAt(filePath)) {
    return
  }

  await writeTextFile(filePath, value)
}

async function writeTextFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, value)
}

async function fileExistsAt(filePath) {
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
