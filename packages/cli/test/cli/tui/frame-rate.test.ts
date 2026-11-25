import { describe, expect, test } from "bun:test"
import { frameRates } from "../../../src/cli/cmd/tui/util/frame-rate"

// DC-RESOURCE-001: `fps` sets both opentui rates; unset keeps the inherited defaults.
describe("tui frame rates", () => {
  test("unset keeps 60 for a full terminal and 10/15 for a plain one", () => {
    expect(frameRates(undefined, false)).toEqual({ targetFps: 60, maxFps: 60 })
    expect(frameRates(undefined, true)).toEqual({ targetFps: 10, maxFps: 15 })
  })

  test("a configured fps caps animation and on-demand redraws alike", () => {
    expect(frameRates(20, false)).toEqual({ targetFps: 20, maxFps: 20 })
  })

  test("a plain terminal never exceeds its fixed rates", () => {
    expect(frameRates(20, true)).toEqual({ targetFps: 10, maxFps: 15 })
    expect(frameRates(5, true)).toEqual({ targetFps: 5, maxFps: 5 })
  })
})
