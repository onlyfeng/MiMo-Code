import { describe, expect, test } from "bun:test"
import { renderActorNotification, renderInboxRow } from "../../src/inbox/render"

describe("inbox.render", () => {
  test("applies blank fallbacks before the model-visible byte cap", () => {
    const row = {
      content: { text: " ".repeat(60 * 1024) },
      sender_session_id: null,
      sender_actor_id: null,
      created_at: Date.now(),
    }

    expect(renderInboxRow({ ...row, type: "actor_notification" } as any)).toBe("(no notification body)")
    expect(renderInboxRow({ ...row, type: "text" } as any)).toContain("\n(empty)\n")
  })

  test("caps actor notification rows before model-visible rendering", () => {
    const longResult = "x".repeat(60 * 1024)
    const rendered = renderInboxRow({
      type: "actor_notification",
      content: { text: renderActorNotification({ actorID: "actor-1", description: "large", status: "completed", result: longResult }) },
      sender_session_id: null,
      sender_actor_id: null,
      created_at: Date.now(),
    } as any)

    expect(rendered.length).toBeLessThan(longResult.length)
    expect(rendered).toContain("inbox content truncated before model injection")
  })

  test("preserves actor notification wrapper when cap is applied", () => {
    const longResult = "x".repeat(60 * 1024)
    const rendered = renderInboxRow({
      type: "actor_notification",
      content: { text: renderActorNotification({ actorID: "actor-1", description: "large", status: "completed", result: longResult }) },
      sender_session_id: null,
      sender_actor_id: null,
      created_at: Date.now(),
    } as any)

    expect(rendered).toStartWith("<actor-notification>")
    expect(rendered).toEndWith("</actor-notification>")
  })

  test("caps inbox text without splitting UTF-8 characters", () => {
    const longText = "界".repeat(20 * 1024)
    const rendered = renderInboxRow({
      type: "text",
      content: { text: longText },
      sender_session_id: null,
      sender_actor_id: null,
      created_at: Date.now(),
    } as any)

    expect(rendered).toContain("inbox content truncated before model injection")
    expect(rendered).not.toContain("\uFFFD")
  })
})
