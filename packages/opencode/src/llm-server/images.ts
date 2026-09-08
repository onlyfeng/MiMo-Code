import { lookup } from "node:dns/promises"
import { request as httpRequest, type ClientRequest, type IncomingMessage } from "node:http"
import { request as httpsRequest, type RequestOptions } from "node:https"
import { BlockList, isIP } from "node:net"

const MAX_IMAGE = 5 * 1024 * 1024
const MAX_MEDIA = 25 * 1024 * 1024
export const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/

export class ImageError extends Error {
  constructor(
    readonly status: 400 | 413 | 502,
    message: string,
  ) {
    super(message)
    this.name = "ImageError"
  }
}

export type Image = { bytes: Uint8Array; mediaType: string }
type Address = { address: string; family: number }
// Narrow transport dependencies: neither callers nor provider settings can add
// headers, credentials, proxies, redirects or a private-address exception.
export type ImageTransport = {
  lookup?: (hostname: string) => Promise<Address[]>
  request?: (options: RequestOptions) => ClientRequest
}

export function acceptableImage(value: string) {
  if (!value.startsWith("data:")) {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
  }
  const match = DATA_URL.exec(value)
  if (!match || match[2].length > Math.ceil(MAX_IMAGE / 3) * 4) return false
  const bytes = Buffer.from(match[2], "base64")
  return bytes.length <= MAX_IMAGE && bytes.toString("base64") === match[2]
}

const blocked = new BlockList()
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4")
// Admit direct global unicast IPv6 only, excluding protocol assignments,
// documentation and 6to4. This also refuses mapped IPv4 and NAT64 addresses.
const globalIPv6 = new BlockList()
globalIPv6.addSubnet("2000::", 3, "ipv6")
blocked.addSubnet("2001::", 23, "ipv6")
blocked.addSubnet("2001:db8::", 32, "ipv6")
blocked.addSubnet("2002::", 16, "ipv6")
blocked.addSubnet("3fff::", 20, "ipv6")

function publicAddress(value: Address) {
  const family = isIP(value.address)
  if (family !== value.family || !family) return false
  if (family === 4) return !blocked.check(value.address, "ipv4")
  return globalIPv6.check(value.address, "ipv6") && !blocked.check(value.address, "ipv6")
}

async function addresses(hostname: string, abort: AbortSignal, transport: ImageTransport) {
  abort.throwIfAborted()
  if (isIP(hostname)) return [{ address: hostname, family: isIP(hostname) }]
  // OS DNS lookup is not cancellable. Stop waiting promptly and never dial when
  // its eventual result arrives after cancellation; consume late rejections too.
  const pending = Promise.withResolvers<Address[]>()
  const cancel = () => pending.reject(abort.reason)
  abort.addEventListener("abort", cancel, { once: true })
  try {
    abort.throwIfAborted()
    void (transport.lookup ?? ((host) => lookup(host, { all: true })))(hostname).then(pending.resolve, pending.reject)
    return await pending.promise
  } finally {
    abort.removeEventListener("abort", cancel)
  }
}

function signature(bytes: Buffer, mediaType: string) {
  if (mediaType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mediaType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (mediaType === "image/gif") return ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))
  return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
}

async function download(
  value: string,
  remaining: number,
  abort: AbortSignal,
  transport: ImageTransport,
): Promise<Image> {
  let url = new URL(value)
  redirect: for (let redirects = 0; redirects <= 5; redirects++) {
    abort.throwIfAborted()
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      throw new ImageError(400, "Image URLs require HTTP(S) without credentials")
    const hostname = url.hostname.replace(/^\[|\]$/g, "")
    const found = await addresses(hostname, abort, transport)
    abort.throwIfAborted()
    if (!found.length || !found.every(publicAddress))
      throw new ImageError(400, "Image URL must resolve to public addresses")
    for (const address of found) {
      abort.throwIfAborted()
      // Use the numeric address as the actual request target: Bun's node:http
      // ignores Agent.createConnection, so an agent override cannot pin its dial.
      const request = (transport.request ?? (url.protocol === "https:" ? httpsRequest : httpRequest))({
        protocol: url.protocol,
        hostname: address.address,
        port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
        path: url.pathname + url.search,
        agent: false,
        method: "GET",
        servername: isIP(hostname) ? undefined : hostname,
        rejectUnauthorized: true,
        headers: {
          host: url.host,
          accept: "image/png,image/jpeg,image/webp,image/gif",
          "accept-encoding": "identity",
          connection: "close",
        },
      })
      const closed = new Promise<void>((resolve) => request.once("close", resolve))
      const response = Promise.withResolvers<IncomingMessage>()
      // An abort can win before we await this promise; retain an error consumer.
      void response.promise.catch(() => {})
      request.once("response", response.resolve)
      request.on("error", response.reject)
      let incoming: IncomingMessage | undefined
      let sent = false
      const cancel = () => {
        response.reject(abort.reason)
        incoming?.destroy(new Error("Image request cancelled"))
        request.destroy(new Error("Image request cancelled"))
      }
      abort.addEventListener("abort", cancel, { once: true })
      try {
        abort.throwIfAborted()
        sent = true
        request.end()
        incoming = await response.promise.catch((error: unknown) => {
          abort.throwIfAborted()
          // Only advance on explicit dial failures. Bun omits syscall, including
          // on post-send resets, so an arbitrary pre-response error is not safe.
          if (
            error instanceof Error &&
            "code" in error &&
            ["ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "EADDRNOTAVAIL"].includes(String(error.code)) &&
            (!("syscall" in error) || error.syscall === "connect")
          )
            return undefined
          throw error
        })
        if (!incoming) continue
        try {
          abort.throwIfAborted()
          if ([301, 302, 303, 307, 308].includes(incoming.statusCode ?? 0)) {
            if (!incoming.headers.location || redirects === 5)
              throw new ImageError(400, "Image redirect limit or invalid location")
            url = new URL(incoming.headers.location, url)
            continue redirect
          }
          if (incoming.statusCode !== 200) throw new ImageError(502, "Image download failed")
          if (incoming.headers["content-encoding"] && incoming.headers["content-encoding"] !== "identity")
            throw new ImageError(400, "Encoded image responses are not supported")
          const mediaType = incoming.headers["content-type"]?.split(";")[0].trim().toLowerCase()
          if (!mediaType || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mediaType))
            throw new ImageError(400, "Unsupported image content type")
          const limit = Math.min(MAX_IMAGE, remaining)
          if (Number(incoming.headers["content-length"]) > limit)
            throw new ImageError(413, "Image media limit exceeded")
          const chunks: Buffer[] = []
          let size = 0
          for await (const chunk of incoming) {
            abort.throwIfAborted()
            size += chunk.length
            if (size > limit) throw new ImageError(413, "Image media limit exceeded")
            chunks.push(chunk)
          }
          abort.throwIfAborted()
          const bytes = Buffer.concat(chunks, size)
          if (!signature(bytes, mediaType)) throw new ImageError(400, "Image content does not match its type")
          return { bytes, mediaType }
        } finally {
          request.destroy()
          incoming.destroy()
        }
      } finally {
        abort.removeEventListener("abort", cancel)
        request.destroy()
        // Bun allocates its real transport at end() and emits no close event for
        // a request destroyed before then. Node may already own a socket here.
        if (sent || !process.versions.bun) await closed
      }
    }
    throw new ImageError(502, "Image download failed")
  }
  throw new ImageError(400, "Image redirect limit exceeded")
}

/** Resolve remote references to bytes before the SDK can see any image URL. */
export async function prepareImages(
  urls: string[],
  abort: AbortSignal,
  transport: ImageTransport = {},
  audioBytes = 0,
) {
  const images = new Map<string, Image>()
  let total = audioBytes
  try {
    abort.throwIfAborted()
    // Account for every inline occurrence before starting any external request.
    for (const url of urls) {
      if (!acceptableImage(url)) throw new ImageError(400, "Invalid image URL")
      const match = DATA_URL.exec(url)
      if (match) total += Buffer.byteLength(match[2], "base64")
    }
    if (total > MAX_MEDIA) throw new ImageError(413, "Image media limit exceeded")
    for (const url of urls) {
      if (url.startsWith("data:")) continue
      if (total >= MAX_MEDIA) throw new ImageError(413, "Image media limit exceeded")
      const image = images.get(url) ?? (await download(url, MAX_MEDIA - total, abort, transport))
      total += image.bytes.byteLength
      if (total > MAX_MEDIA) throw new ImageError(413, "Image media limit exceeded")
      images.set(url, image)
    }
    return images
  } catch (error) {
    abort.throwIfAborted()
    if (error instanceof ImageError) throw error
    throw new ImageError(502, "Image download failed")
  }
}
