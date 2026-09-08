import { expect, test } from "bun:test"
import { createServer as createTLSServer, type TLSSocket } from "node:tls"
import { request as httpsRequest } from "node:https"
import { readFile } from "node:fs/promises"
import { prepareImages } from "../../src/llm-server/images"
import { imageBytes, imageFixture, imageSocketFixture } from "./image-fixture"

const signal = () => new AbortController().signal
const url = "http://images.example/pixel.png?signature=public"
const inline = (bytes: Uint8Array) => `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`

async function deadline<T>(promise: Promise<T>) {
  const pending = Promise.withResolvers<T>()
  const timer = setTimeout(() => pending.reject(new Error("Image cancellation did not converge")), 1000)
  return Promise.race([promise, pending.promise]).finally(() => clearTimeout(timer))
}

test("downloads through the validated address while preserving Host and omitting credentials", () =>
  imageFixture(async ({ transport, seen, dialed }) => {
    const images = await prepareImages([url], signal(), transport)
    expect(images.get(url)).toEqual({ bytes: imageBytes, mediaType: "image/png" })
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toBe("/pixel.png?signature=public")
    expect(seen[0].headers.host).toBe("images.example")
    expect(seen[0].headers.authorization).toBeUndefined()
    expect(seen[0].headers.cookie).toBeUndefined()
    expect(seen[0].headers["accept-encoding"]).toBe("identity")
    expect(dialed).toMatchObject([{ hostname: "93.184.216.34", port: 80, servername: "images.example", agent: false }])
  }))

test.each([
  "http://127.0.0.1/a",
  "http://2130706433/a",
  "http://0x7f000001/a",
  "http://0.0.0.0/a",
  "http://10.1.2.3/a",
  "http://172.16.1.1/a",
  "http://192.168.1.1/a",
  "http://169.254.169.254/a",
  "http://100.64.0.1/a",
  "http://192.0.2.1/a",
  "http://198.18.0.1/a",
  "http://224.0.0.1/a",
  "http://255.255.255.255/a",
  "http://[::]/a",
  "http://[::1]/a",
  "http://[::ffff:127.0.0.1]/a",
  "http://[fe80::1]/a",
  "http://[fc00::1]/a",
  "http://[ff02::1]/a",
  "http://[2001:db8::1]/a",
  "http://[2002:7f00:1::]/a",
  "file:///tmp/picture.png",
  "https://user:secret@images.example/a",
])("rejects unsafe image targets before opening a socket: %s", (target) =>
  imageFixture(async ({ transport, dialed }) => {
    await expect(prepareImages([target], signal(), transport)).rejects.toMatchObject({ status: 400 })
    expect(dialed).toHaveLength(0)
  }),
)

test("rejects every DNS answer including a private second result", () =>
  imageFixture(async ({ transport, dialed }) => {
    await expect(
      prepareImages([url], signal(), {
        ...transport,
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(dialed).toHaveLength(0)
  }))

test("does not perform a second DNS lookup when opening the socket", () =>
  imageFixture(async ({ transport, seen, dialed }) => {
    let lookups = 0
    await prepareImages([url], signal(), {
      ...transport,
      lookup: async () =>
        ++lookups === 1 ? [{ address: "93.184.216.34", family: 4 }] : [{ address: "127.0.0.1", family: 4 }],
    })
    expect(lookups).toBe(1)
    expect(seen).toHaveLength(1)
    expect(dialed[0].hostname).toBe("93.184.216.34")
  }))

test("revalidates redirect DNS and retires the previous response", () => {
  const closed = Promise.withResolvers<void>()
  let requests = 0
  return imageSocketFixture(
    async (transport) => {
      await expect(
        prepareImages([url], signal(), {
          ...transport,
          lookup: async (host) => [
            { address: host === "images.example" ? "93.184.216.34" : "169.254.169.254", family: 4 },
          ],
        }),
      ).rejects.toMatchObject({ status: 400 })
      expect(requests).toBe(1)
      await deadline(closed.promise)
    },
    (socket) => {
      requests++
      socket.on("close", () => closed.resolve())
      socket.write(
        "HTTP/1.1 302 Found\r\nLocation: http://redirect.example/secret\r\nTransfer-Encoding: chunked\r\n\r\n4\r\nbody\r\n",
      )
    },
  )
})

test("follows at most five redirects and resolves relative locations", () =>
  imageFixture(
    async ({ transport, seen }) => {
      await expect(prepareImages([url], signal(), transport)).rejects.toMatchObject({ status: 400 })
      expect(seen).toHaveLength(6)
      expect(seen[1].url).toBe("/again")
    },
    (_, response) => {
      response.writeHead(302, { location: "/again" })
      response.end()
    },
  ))

test.each([
  { "content-type": "text/html" },
  { "content-type": "image/png", "content-encoding": "gzip" },
  { "content-type": "image/png", "content-length": String(5 * 1024 * 1024 + 1) },
])("rejects invalid image response headers: %j", (headers) =>
  imageFixture(
    async ({ transport }) => {
      await expect(prepareImages([url], signal(), transport)).rejects.toMatchObject({
        status: headers["content-length"] ? 413 : 400,
      })
    },
    (_, response) => {
      response.writeHead(200, headers)
      response.write(imageBytes)
    },
  ),
)

test("rejects content that is not an image despite its MIME", () =>
  imageFixture(
    async ({ transport }) => {
      await expect(prepareImages([url], signal(), transport)).rejects.toMatchObject({ status: 400 })
    },
    (_, response) => {
      response.writeHead(200, { "content-type": "image/png" })
      response.end("<html>not an image</html>")
    },
  ))

test("bounds chunked image bytes without relying on Content-Length", () =>
  imageFixture(
    async ({ transport }) => {
      await expect(prepareImages([url], signal(), transport)).rejects.toMatchObject({ status: 413 })
    },
    (_, response) => {
      response.writeHead(200, { "content-type": "image/png" })
      response.write(imageBytes)
      response.end(Buffer.alloc(5 * 1024 * 1024))
    },
  ))

test("counts inline and remote images against one decoded 25 MiB budget", () =>
  imageFixture(async ({ transport, seen }) => {
    await expect(
      prepareImages([...Array(5).fill(inline(Buffer.alloc(5 * 1024 * 1024))), url], signal(), transport),
    ).rejects.toMatchObject({ status: 413 })
    expect(seen).toHaveLength(0)
  }))

test.each(["headers", "body"])("cancellation closes an image socket while waiting for %s", (stage) => {
  const received = Promise.withResolvers<void>()
  const closed = Promise.withResolvers<void>()
  return imageSocketFixture(
    async (transport) => {
      const controller = new AbortController()
      const result = prepareImages([url], controller.signal, transport)
      await received.promise
      controller.abort(new DOMException("cancelled", "AbortError"))
      await expect(deadline(result)).rejects.toMatchObject({ name: "AbortError" })
      await deadline(closed.promise)
    },
    (socket) => {
      socket.on("close", () => closed.resolve())
      if (stage === "body") {
        socket.write("HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nTransfer-Encoding: chunked\r\n\r\n4\r\nbody\r\n")
      }
      received.resolve()
    },
  )
})

test("cancellation while resolving DNS returns promptly and never dials later", () =>
  imageFixture(async ({ transport, dialed }) => {
    const pending = Promise.withResolvers<Array<{ address: string; family: number }>>()
    const started = Promise.withResolvers<void>()
    const controller = new AbortController()
    const result = prepareImages([url], controller.signal, {
      ...transport,
      lookup: () => {
        started.resolve()
        return pending.promise
      },
    })
    await started.promise
    controller.abort(new DOMException("cancelled", "AbortError"))
    await expect(deadline(result)).rejects.toMatchObject({ name: "AbortError" })
    pending.resolve([{ address: "93.184.216.34", family: 4 }])
    await Promise.resolve()
    expect(dialed).toHaveLength(0)
  }))

test("an abort during request creation is consumed and does not initiate the HTTP request", () =>
  imageFixture(async ({ transport, seen }) => {
    const controller = new AbortController()
    await expect(
      deadline(
        prepareImages([url], controller.signal, {
          ...transport,
          request(options) {
            const request = transport.request!(options)
            controller.abort(new DOMException("cancelled before end", "AbortError"))
            return request
          },
        }),
      ),
    ).rejects.toMatchObject({ name: "AbortError" })
    expect(seen).toHaveLength(0)
  }))

test("remote images share a total budget even when an identical URL is reused", () =>
  imageFixture(
    async ({ transport, seen }) => {
      await expect(prepareImages(Array(6).fill(url), signal(), transport)).rejects.toMatchObject({ status: 413 })
      expect(seen).toHaveLength(1)
    },
    (_, response) => {
      response.writeHead(200, { "content-type": "image/png" })
      response.end(Buffer.concat([imageBytes, Buffer.alloc(5 * 1024 * 1024 - imageBytes.length)]))
    },
  ))

test.each(["images.example", "different.example"])(
  "TLS validates the original hostname when dialing a pinned IP: %s",
  async (hostname) => {
    // Public test-only key and self-signed certificate, never a production secret.
    const cert = await readFile(new URL("./image-test-cert.pem", import.meta.url))
    const key = await readFile(new URL("./image-test-key.pem", import.meta.url))
    const sockets = new Set<TLSSocket>()
    const names: string[] = []
    const server = createTLSServer({ cert, key }, (socket) => {
      sockets.add(socket)
      socket.on("close", () => sockets.delete(socket))
      socket.on("error", () => {})
      socket.once("data", () => {
        if ("servername" in socket && typeof socket.servername === "string") names.push(socket.servername)
        socket.end(
          Buffer.concat([
            Buffer.from(
              `HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: ${imageBytes.length}\r\nConnection: close\r\n\r\n`,
            ),
            imageBytes,
          ]),
        )
      })
    })
    server.on("tlsClientError", () => {})
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing TLS fixture port")
    try {
      const result = prepareImages([`https://${hostname}/image.png`], signal(), {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        request(options) {
          expect(options.hostname).toBe("93.184.216.34")
          expect(options.servername).toBe(hostname)
          expect(options.rejectUnauthorized).toBe(true)
          return httpsRequest({ ...options, hostname: "127.0.0.1", port: address.port, ca: cert })
        },
      })
      if (hostname === "images.example") {
        expect((await result).get(`https://${hostname}/image.png`)?.bytes).toEqual(imageBytes)
        expect(names).toEqual(["images.example"])
        return
      }
      await expect(result).rejects.toMatchObject({ status: 502, message: "Image download failed" })
      expect(names).toHaveLength(0)
    } finally {
      sockets.forEach((socket) => socket.destroy())
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  },
)
