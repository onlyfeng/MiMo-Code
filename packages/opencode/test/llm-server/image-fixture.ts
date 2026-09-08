import { createServer, request, type IncomingMessage, type ServerResponse } from "node:http"
import type { RequestOptions } from "node:https"
import { createServer as createSocketServer, type Socket } from "node:net"
import type { ImageTransport } from "../../src/llm-server/images"

export const imageBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
  "base64",
)

export async function closedImagePort() {
  const server = createSocketServer()
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  try {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing closed image fixture port")
    return address.port
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

export async function imageFixture<T>(
  fn: (input: { transport: ImageTransport; seen: IncomingMessage[]; dialed: RequestOptions[] }) => Promise<T>,
  handle: (request: IncomingMessage, response: ServerResponse) => void = (_, response) => {
    response.setHeader("content-type", "image/png")
    response.end(imageBytes)
  },
) {
  const seen: IncomingMessage[] = []
  const dialed: RequestOptions[] = []
  const server = createServer((request, response) => {
    seen.push(request)
    handle(request, response)
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Missing image fixture port")
  try {
    return await fn({
      seen,
      dialed,
      transport: {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        request(input) {
          dialed.push(input)
          return request({ ...input, protocol: "http:", hostname: "127.0.0.1", port: address.port })
        },
      },
    })
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

// Use a real socket for disconnect assertions: Bun's node:http server shim does
// not consistently emit ServerResponse.close when its client disconnects.
export async function imageSocketFixture<T>(
  fn: (transport: ImageTransport) => Promise<T>,
  handle: (socket: Socket) => void,
) {
  const sockets = new Set<Socket>()
  const server = createSocketServer((socket) => {
    sockets.add(socket)
    socket.on("close", () => sockets.delete(socket))
    socket.on("error", () => {})
    socket.once("data", () => handle(socket))
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Missing image socket port")
  try {
    return await fn({
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      request: (options) => request({ ...options, hostname: "127.0.0.1", port: address.port }),
    })
  } finally {
    sockets.forEach((socket) => socket.destroy())
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
