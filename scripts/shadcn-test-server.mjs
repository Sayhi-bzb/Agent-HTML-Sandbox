import { createServer } from "node:http"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "shadcn-test-fixtures",
)
const styleNames = ["nova", "vega", "maia", "lyra", "mira", "luma", "sera"]
const registryComponentMetadata = {
  combobox: {
    registryDependencies: ["button", "input-group"],
  },
  field: {
    registryDependencies: ["label", "separator"],
  },
  "input-group": {
    registryDependencies: ["button", "input", "textarea"],
  },
}

export async function startShadcnTestServer() {
  const fixtures = await loadFixtures()
  const server = createServer((request, response) => {
    try {
      if (!request.url) {
        respondJson(response, 400, { error: "missing-url" })
        return
      }

      const url = new URL(request.url, "http://127.0.0.1")
      if (process.env.AHTML_DEBUG_SHADCN_TEST_SERVER === "1") {
        console.log(`[shadcn-test-server] ${url.pathname}${url.search}`)
      }
      const presetMatch = url.pathname === "/init"
      const rootIndexMatch = url.pathname === "/r/index.json"
      const baseColorMatch = url.pathname === "/r/colors/neutral.json"
      const styleIndexMatch = url.pathname === "/r/styles/index.json"
      const styleComponentIndexMatch = url.pathname.match(
        /^\/r\/styles\/([^/]+)\/index\.json$/,
      )
      const componentMatch = url.pathname.match(
        /^\/r\/styles\/([^/]+)\/([^/]+)\.json$/,
      )

      if (presetMatch) {
        const style = url.searchParams.get("style") ?? "nova"
        respondJson(response, 200, createPresetItem({ fixtures, style }))
        return
      }

      if (rootIndexMatch) {
        respondJson(response, 200, createRegistryIndex(fixtures))
        return
      }

      if (styleIndexMatch) {
        respondJson(
          response,
          200,
          styleNames.map((name) => ({
            name,
            label: capitalize(name),
          })),
        )
        return
      }

      if (baseColorMatch) {
        respondJson(response, 200, createNeutralBaseColor())
        return
      }

      if (styleComponentIndexMatch) {
        respondJson(response, 200, createStyleComponentIndex(fixtures))
        return
      }

      if (componentMatch) {
        const componentName = componentMatch[2]
        const componentSource = fixtures.components[componentName]

        if (!componentSource) {
          respondJson(response, 404, { error: "missing-component" })
          return
        }

        respondJson(
          response,
          200,
          createComponentItem({ componentName, componentSource }),
        )
        return
      }

      respondJson(response, 404, { error: "not-found" })
    } catch (error) {
      console.error("shadcn-test-server request failed", request.url, error)
      respondJson(response, 500, { error: "internal-server-error" })
    }
  })

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve)
  })

  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0

  return {
    registryUrl: `http://127.0.0.1:${port}/r`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }
}

async function loadFixtures() {
  const componentsDir = path.join(fixtureRoot, "components", "ui")
  const componentNames = (await readdir(componentsDir))
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => name.replace(/\.tsx$/, ""))
    .sort()
  const [baseCss, utilsSource, componentEntries] = await Promise.all([
    readFile(path.join(fixtureRoot, "base", "index.css"), "utf8"),
    readFile(path.join(fixtureRoot, "lib", "utils.ts"), "utf8"),
    Promise.all(
      componentNames.map(async (name) => [
        name,
        await readFile(
          path.join(componentsDir, `${name}.tsx`),
          "utf8",
        ),
      ]),
    ),
  ])

  return {
    baseCss,
    utilsSource,
    components: Object.fromEntries(componentEntries),
  }
}

function createPresetItem({ fixtures, style }) {
  return {
    name: `ahtml-${style}`,
    type: "registry:base",
    title: "AHTML test preset",
    extends: "none",
    config: {
      style,
      rsc: false,
      tsx: true,
      tailwind: {
        css: "src/index.css",
        baseColor: "neutral",
        cssVariables: true,
        prefix: "",
      },
      aliases: {
        components: "@/components",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
        utils: "@/lib/utils",
      },
    },
    files: [
      {
        path: "src/index.css",
        target: "src/index.css",
        type: "registry:file",
        content: fixtures.baseCss,
      },
      {
        path: "src/lib/utils.ts",
        target: "src/lib/utils.ts",
        type: "registry:file",
        content: fixtures.utilsSource,
      },
    ],
  }
}

function createRegistryIndex(fixtures) {
  return styleNames.map((style) => createPresetItem({ fixtures, style }))
}

function createComponentItem({ componentName, componentSource }) {
  return {
    name: componentName,
    type: "registry:ui",
    title: componentName,
    ...(registryComponentMetadata[componentName] ?? {}),
    files: [
      {
        path: `ui/${componentName}.tsx`,
        target: `src/components/ui/${componentName}.tsx`,
        type: "registry:ui",
        content: componentSource,
      },
    ],
  }
}

function createStyleComponentIndex(fixtures) {
  return Object.keys(fixtures.components)
    .sort()
    .map((name) => ({
      name,
      type: "registry:ui",
      title: name,
    }))
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function createNeutralBaseColor() {
  const light = {
    background: "#f7f7f5",
    foreground: "#111827",
    card: "#ffffff",
    "card-foreground": "#111827",
    popover: "#ffffff",
    "popover-foreground": "#111827",
    primary: "#111827",
    "primary-foreground": "#ffffff",
    secondary: "#eef2f7",
    "secondary-foreground": "#111827",
    muted: "#eef2f7",
    "muted-foreground": "#64748b",
    accent: "#eef2f7",
    "accent-foreground": "#111827",
    destructive: "#b42318",
    border: "#d9ddd6",
    input: "#d9ddd6",
    ring: "#94a3b8",
  }
  const dark = {
    background: "#0f172a",
    foreground: "#f8fafc",
    card: "#111827",
    "card-foreground": "#f8fafc",
    popover: "#111827",
    "popover-foreground": "#f8fafc",
    primary: "#f8fafc",
    "primary-foreground": "#0f172a",
    secondary: "#1f2937",
    "secondary-foreground": "#f8fafc",
    muted: "#1f2937",
    "muted-foreground": "#94a3b8",
    accent: "#1f2937",
    "accent-foreground": "#f8fafc",
    destructive: "#ef4444",
    border: "#334155",
    input: "#334155",
    ring: "#64748b",
  }

  return {
    cssVars: {
      light,
      dark,
    },
    cssVarsV4: {
      light,
      dark,
    },
    inlineColors: {
      light,
      dark,
    },
    inlineColorsTemplate: "",
    cssVarsTemplate: "",
  }
}

function respondJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json" })
  response.end(`${JSON.stringify(body, null, 2)}\n`)
}
