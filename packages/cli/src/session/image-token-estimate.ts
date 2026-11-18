import type { ModelMessage } from "ai"
import { imageDimensions } from "@/provider/image"
import { sniffAttachmentMime } from "@/util/media"
import { isRecord } from "@/util/record"
import { estimate } from "@/util/token"

const MAX_IMAGE_TOKENS = 8_192
const JPEG_HEADER_BYTES = 128 * 1024

function imageHeader(data: unknown, limit: number): Buffer | undefined {
  if (data instanceof URL) data = data.href
  if (typeof data === "string") {
    // Slice before decoding. A JPEG frame may follow EXIF segments, while the
    // other supported formats store dimensions in the first 30 bytes.
    let start = 0
    if (data.startsWith("data:")) {
      const comma = data.indexOf(",")
      if (comma < 0 || data.slice(comma - 7, comma).toLowerCase() !== ";base64") return
      start = comma + 1
    }
    return Buffer.from(data.slice(start, start + Math.ceil(limit / 3) * 4), "base64")
  }
  if (data instanceof ArrayBuffer) data = new Uint8Array(data)
  if (data instanceof Uint8Array) return Buffer.from(data.buffer, data.byteOffset, Math.min(limit, data.byteLength))
}

function imageTokens(data: unknown, mediaType?: string) {
  const header = imageHeader(data, 32)
  if (!header) return MAX_IMAGE_TOKENS
  const mime = sniffAttachmentMime(header, mediaType ?? "")
  const bytes = mime === "image/jpeg" ? imageHeader(data, JPEG_HEADER_BYTES) : header
  const dimensions = bytes && imageDimensions(mime, bytes)
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) return MAX_IMAGE_TOKENS

  // Providers resize and tile differently. Round up each 256px edge and allow
  // 64 tokens per tile plus 128 per image: 1920x1080 costs 2,688 here versus
  // roughly 2,500 observed. Use the cap for unreadable or remote images too.
  const tiles = Math.ceil(dimensions.width / 256) * Math.ceil(dimensions.height / 256)
  return Math.min(MAX_IMAGE_TOKENS, 128 + 64 * tiles)
}

function imageMime(mime: unknown): mime is string {
  return typeof mime === "string" && /^image\//i.test(mime)
}

export function estimateTextTokens(text: string) {
  return Math.max(estimate(text), Math.round(Buffer.byteLength(text, "utf8") / 3))
}

// One instance per serialized estimate. Keep each attachment's descriptor and
// count its payload once per occurrence, including repeated references.
export class ImageTokenEstimate {
  private tokens = 0

  private payload(data: unknown, mime?: string) {
    this.tokens += imageTokens(data, mime)
    return ""
  }

  modelMessage(message: ModelMessage): unknown {
    if (!Array.isArray(message.content)) return message
    const before = this.tokens
    const content = message.content.map((part) => {
      if (part.type === "file" && imageMime(part.mediaType))
        return { ...part, data: this.payload(part.data, part.mediaType) }
      if (part.type === "image") return { ...part, image: this.payload(part.image, part.mediaType) }
      if (part.type !== "tool-result" || part.output.type !== "content") return part
      const beforeOutput = this.tokens
      const value = part.output.value.map((item) => {
        if (
          (item.type === "image-data" || item.type === "file-data" || item.type === "media") &&
          imageMime(item.mediaType)
        )
          return { ...item, data: this.payload(item.data, item.mediaType) }
        if (item.type === "image-url") return { ...item, url: this.payload(item.url) }
        if (item.type === "image-file-id") this.tokens += MAX_IMAGE_TOKENS
        return item
      })
      return beforeOutput === this.tokens ? part : { ...part, output: { ...part.output, value } }
    })
    return before === this.tokens ? message : { ...message, content }
  }

  private storedFile(part: unknown) {
    if (isRecord(part) && part.type === "file" && imageMime(part.mime) && typeof part.url === "string")
      return { ...part, url: this.payload(part.url, part.mime) }
    return part
  }

  storedPart(part: unknown): unknown {
    if (!isRecord(part) || part.type !== "tool") return this.storedFile(part)
    const state = part.state
    if (!isRecord(state) || !Array.isArray(state.attachments)) return part
    const before = this.tokens
    const attachments = state.attachments.map((file) => this.storedFile(file))
    return before === this.tokens ? part : { ...part, state: { ...state, attachments } }
  }

  serialized(value: unknown, estimateText = estimateTextTokens) {
    return estimateText(JSON.stringify(value)) + this.tokens
  }
}
