import http from "node:http"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"

export function parsePort(value) {
  const port = Number(value)

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("preview --port must be an integer from 0 to 65535.")
  }

  return port
}

export async function serveDirectory(directory, port) {
  const root = path.resolve(directory)
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost")
      const pathname = decodeURIComponent(requestUrl.pathname)
      const requestedPath =
        pathname === "/"
          ? path.join(root, "index.html")
          : path.join(root, pathname)
      const resolvedPath = path.resolve(requestedPath)

      if (
        resolvedPath !== root &&
        !resolvedPath.startsWith(`${root}${path.sep}`)
      ) {
        response.writeHead(403)
        response.end("Forbidden")
        return
      }

      const fileStat = await stat(resolvedPath)
      const filePath = fileStat.isDirectory()
        ? path.join(resolvedPath, "index.html")
        : resolvedPath
      const body = await readFile(filePath)

      response.writeHead(200, {
        "content-type": getContentType(filePath),
      })
      response.end(body)
    } catch {
      response.writeHead(404)
      response.end("Not found")
    }
  })

  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, "127.0.0.1", resolve)
  })

  const address = server.address()
  const actualPort =
    typeof address === "object" && address ? address.port : port
  process.stdout.write(`Preview: http://127.0.0.1:${actualPort}\n`)

  await new Promise((resolve) => {
    const close = () => server.close(resolve)
    process.once("SIGINT", close)
    process.once("SIGTERM", close)
  })
}

function getContentType(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8"
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8"
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8"
  }

  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8"
  }

  return "application/octet-stream"
}
