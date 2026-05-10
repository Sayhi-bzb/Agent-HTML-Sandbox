import path from "node:path"
import { fileURLToPath } from "node:url"

import { createServer } from "vite"

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)

const sanitizerLoaders = new Map()

export async function validateAgentHtmlSource(source, root = packageRoot) {
  const sanitizeAgentHtml = await loadSanitizeAgentHtml(root)
  const result = sanitizeAgentHtml(source)

  return { diagnostics: result.diagnostics, document: result.document }
}

export function validateRenderConfig(config, values) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false
  }

  return (
    Object.keys(config).every((key) => key in values) &&
    Object.entries(values).every(
      ([key, allowedValues]) =>
        typeof config[key] === "string" && allowedValues.includes(config[key]),
    )
  )
}

async function loadSanitizeAgentHtml(root) {
  const resolvedRoot = path.resolve(root)
  let loader = sanitizerLoaders.get(resolvedRoot)

  if (!loader) {
    loader = loadSanitizeAgentHtmlFromVite(resolvedRoot)
    sanitizerLoaders.set(resolvedRoot, loader)
  }

  return loader
}

async function loadSanitizeAgentHtmlFromVite(root) {
  const server = await createServer({
    appType: "custom",
    configFile: false,
    logLevel: "error",
    optimizeDeps: {
      noDiscovery: true,
    },
    root,
    resolve: {
      alias: {
        "@": path.join(root, "src"),
      },
    },
    server: {
      hmr: false,
      middlewareMode: true,
      watch: null,
    },
  })

  try {
    const module = await server.ssrLoadModule(
      "/src/agent-html/parse/sanitize-agent-html.ts",
    )

    if (typeof module.sanitizeAgentHtml !== "function") {
      throw new Error("Cannot load sanitizeAgentHtml from canonical parser.")
    }

    return module.sanitizeAgentHtml
  } finally {
    await server.close()
  }
}
