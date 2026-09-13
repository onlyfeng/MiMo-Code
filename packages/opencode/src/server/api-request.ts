import { RequestError } from "@/llm-server/completions"

const MAX_BODY = 25 * 1024 * 1024

export async function readBody(req: Request, signal: AbortSignal) {
  if (Number(req.headers.get("content-length")) > MAX_BODY) {
    await req.body?.cancel().catch(() => {})
    throw new RequestError(413, "Request body exceeds 25 MiB", "invalid_request_error")
  }
  const reader = req.body?.getReader()
  if (!reader) throw new RequestError(400, "Request body is required", "invalid_request_error")
  const chunks: Uint8Array[] = []
  let length = 0
  const cancel = () => void reader.cancel().catch(() => {})
  signal.addEventListener("abort", cancel, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const next = await reader.read()
      signal.throwIfAborted()
      if (next.done) return Buffer.concat(chunks, length)
      length += next.value.byteLength
      if (length > MAX_BODY) {
        await reader.cancel()
        throw new RequestError(413, "Request body exceeds 25 MiB", "invalid_request_error")
      }
      chunks.push(next.value)
    }
  } finally {
    signal.removeEventListener("abort", cancel)
    reader.releaseLock()
  }
}
