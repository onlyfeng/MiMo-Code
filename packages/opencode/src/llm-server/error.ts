import type { ContentfulStatusCode } from "hono/utils/http-status"

export class RequestError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
    readonly type = "invalid_request_error",
    readonly code?: string,
  ) {
    super(message)
    this.name = "RequestError"
  }
}
